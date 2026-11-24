import type { ExecArgs } from "@medusajs/framework/types"

/**
 * Proves the live Stripe account still accepts the exact Checkout Session
 * payload the storefront sends.
 *
 * Stripe removed `payment_method_types` from that endpoint without warning and
 * live checkout started answering 500 in front of a real customer. This command
 * turns the next change of that kind into a failed deploy step instead of a
 * broken payment page.
 *
 * The session is created and expired straight away: nothing can be paid, and
 * creating a Checkout Session costs nothing.
 *
 *   npm run stripe:smoke
 */
const API = "https://api.stripe.com/v1"

type StripeSession = {
  id?: string
  url?: string
  amount_total?: number
  currency?: string
  payment_status?: string
  payment_method_types?: string[]
  error?: { message?: string; type?: string }
}

async function stripe<T>(
  path: string,
  method: "GET" | "POST",
  key: string,
  form?: URLSearchParams,
  idempotencyKey?: string
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: method === "POST" ? (form ?? new URLSearchParams()).toString() : undefined,
  })

  const text = await response.text()
  const data = text ? (JSON.parse(text) as T) : ({} as T)

  if (!response.ok) {
    const message =
      (data as StripeSession).error?.message ?? `HTTP ${response.status}`
    throw new Error(`${method} ${path} -> ${response.status}: ${message}`)
  }

  return data
}

/* Card, and the wallets that ride on a card. Anything else means the merchant
   enabled a payment method the shop does not support. */
const CARD_FAMILY = new Set(["card", "link", "apple_pay", "google_pay"])

export default async function stripeSmoke(_args: ExecArgs) {
  const key = String(process.env.STRIPE_SECRET_KEY ?? "").trim()

  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set")
  }

  console.log(`mode:   ${key.startsWith("sk_live") || key.startsWith("rk_live") ? "live" : "test"}`)
  console.log(
    `webhook secret: ${process.env.STRIPE_WEBHOOK_SECRET ? "set" : "MISSING"}`
  )

  const form = new URLSearchParams()
  form.set("mode", "payment")
  form.set("locale", "ar")
  form.set("line_items[0][price_data][currency]", "aed")
  form.set("line_items[0][price_data][unit_amount]", "19500")
  form.set("line_items[0][price_data][product_data][name]", "3WEEQ smoke test")
  form.set("line_items[0][quantity]", "1")
  form.set("success_url", "https://3weeq.ae/ar/checkout/callback?session_id={CHECKOUT_SESSION_ID}")
  form.set("cancel_url", "https://3weeq.ae/ar/checkout")
  form.set("customer_email", "smoke-test@3weeq.ae")
  form.set("payment_intent_data[receipt_email]", "smoke-test@3weeq.ae")
  form.set("metadata[smoke_test]", "1")

  /* A retried request must return the same page. Creating it twice with one
     Idempotency-Key is the cheapest proof that Stripe treats the call as one. */
  const smokeKey = `smoke:${Date.now()}`

  const session = await stripe<StripeSession>(
    "/checkout/sessions",
    "POST",
    key,
    form,
    smokeKey
  )

  const duplicate = await stripe<StripeSession>(
    "/checkout/sessions",
    "POST",
    key,
    form,
    smokeKey
  )

  const problems: string[] = []

  if (duplicate.id !== session.id) {
    problems.push(
      `idempotency is not honoured: ${session.id} then ${duplicate.id}`
    )
  }

  if (!session.id?.startsWith("cs_")) {
    problems.push(`unexpected session id: ${session.id ?? "(missing)"}`)
  }

  if (!session.url) {
    problems.push("session has no redirect url")
  }

  if (session.amount_total !== 19500) {
    problems.push(`amount_total is ${session.amount_total}, expected 19500`)
  }

  if (session.currency !== "aed") {
    problems.push(`currency is ${session.currency}, expected aed`)
  }

  const methods = session.payment_method_types ?? []
  const unexpected = methods.filter((method) => !CARD_FAMILY.has(method))
  if (unexpected.length) {
    problems.push(
      `non-card payment methods are live: ${unexpected.join(", ")} — turn them off in Dashboard -> Settings -> Payment methods`
    )
  }

  /* The refund reconciliation only runs if Stripe is allowed to send the event.
     Reading the endpoint list turns "remember to click Add events" into a
     deploy-time check. A restricted key that cannot read webhooks is only a
     warning — the endpoint itself is still verified from the Dashboard. */
  const requiredEvents = [
    "checkout.session.completed",
    "payment_intent.succeeded",
    "charge.refunded",
  ]
  let webhookStatus = "not checked"

  try {
    const endpoints = await stripe<{
      data?: Array<{ url?: string; enabled_events?: string[] }>
    }>("/webhook_endpoints?limit=100", "GET", key)

    const endpoint = (endpoints.data ?? []).find((entry) =>
      String(entry.url ?? "").includes("/api/webhooks/payments")
    )

    if (!endpoint) {
      webhookStatus = "MISSING"
      problems.push(
        "no Stripe webhook endpoint points at /api/webhooks/payments"
      )
    } else {
      const events = endpoint.enabled_events ?? []
      const wildcard = events.includes("*")
      const missing = wildcard
        ? []
        : requiredEvents.filter((name) => !events.includes(name))

      if (missing.length) {
        webhookStatus = `missing ${missing.join(", ")}`
        problems.push(`the Stripe endpoint does not send: ${missing.join(", ")}`)
      } else {
        webhookStatus = wildcard ? "all events" : requiredEvents.join(", ")
      }
    }
  } catch (error) {
    webhookStatus = `not checked (${
      error instanceof Error ? error.message : "unknown error"
    })`
  }

  if (session.id) {
    await stripe(`/checkout/sessions/${session.id}/expire`, "POST", key)
  }

  console.log(`session: ${session.id} (expired)`)
  console.log(`amount:  ${session.amount_total} ${session.currency}`)
  console.log(`methods: ${methods.join(", ") || "(none returned)"}`)
  console.log(`idempotent: ${duplicate.id === session.id ? "yes" : "NO"}`)
  console.log(`webhook events: ${webhookStatus}`)

  if (problems.length) {
    for (const problem of problems) console.log(`  FAIL  ${problem}`)
    throw new Error(`${problems.length} Stripe smoke-test problem(s)`)
  }

  console.log("\nStripe Checkout contract OK.")
}
