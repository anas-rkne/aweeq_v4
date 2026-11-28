import {
  AbstractPaymentProvider,
  BigNumber,
  MedusaError,
} from "@medusajs/framework/utils"
import { createHash } from "node:crypto"
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { verifyStripeSignature } from "../../lib/payments/signatures"

type Options = {
  apiKey: string
  webhookSecret?: string
  baseUrl?: string
}

type StripePaymentIntent = {
  id: string
  status?: string
  amount?: number
  amount_received?: number
  amount_refunded?: number
  currency?: string
  client_secret?: string
  metadata?: Record<string, string>
  [key: string]: unknown
}

type StripeCheckoutSession = {
  id: string
  url?: string | null
  client_secret?: string | null
  ui_mode?: string | null
  status?: string | null
  expires_at?: number | null
  payment_status?: string
  payment_intent?: string | null
  amount_total?: number
  currency?: string
  payment_method_types?: string[]
  metadata?: Record<string, string>
  [key: string]: unknown
}

/* Pinned so `ui_mode=elements` is always accepted and the response shape does
   not drift with the account default. */
const STRIPE_API_VERSION =
  process.env.STRIPE_API_VERSION ?? "2026-11-18.endive"

/* `elements` renders the payment form inside 3WEEQ (the only mode that works in
   Instagram/Facebook in-app webviews). `hosted_page` is the rollback. */
function checkoutUiMode() {
  return process.env.STRIPE_CHECKOUT_UI === "hosted_page"
    ? "hosted_page"
    : "elements"
}

class StripePaymentProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "stripe"

  protected logger_: Logger
  protected options_: Options

  constructor(container: Record<string, unknown>, options: Options) {
    super(container, options)

    this.logger_ = container.logger as Logger
    this.options_ = options
  }

  private get baseUrl() {
    return this.options_.baseUrl ?? "https://api.stripe.com/v1"
  }

  private toMinorUnits(value: unknown) {
    return Math.round(Number(new BigNumber(value as any).numeric) * 100)
  }

  private async request<T>(
    path: string,
    method: "GET" | "POST",
    form?: URLSearchParams,
    idempotencyKey?: string
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.options_.apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": STRIPE_API_VERSION,
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: method === "POST" ? (form ?? new URLSearchParams()).toString() : undefined,
    })

    const text = await response.text()
    let data: Record<string, unknown> = {}

    if (text) {
      try {
        data = JSON.parse(text) as Record<string, unknown>
      } catch {
        data = { raw: text }
      }
    }

    if (!response.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Stripe request failed with status ${response.status}: ${JSON.stringify(
          data
        )}`
      )
    }

    return data as T
  }

  private mapStatus(status?: string) {
    switch (status) {
      case "succeeded":
        return "captured" as const
      case "requires_capture":
        return "authorized" as const
      case "canceled":
        return "canceled" as const
      case "requires_payment_method":
      case "requires_confirmation":
      case "requires_action":
        return "pending" as const
      default:
        return "pending" as const
    }
  }

  private metadataFrom(data: Record<string, unknown>) {
    const metadata: Record<string, string> = {}

    for (const key of [
      "session_id",
      "cart_id",
      "order_id",
      "payment_id",
    ]) {
      const value = data[key]
      if (value !== undefined && value !== null) {
        metadata[key] = String(value)
      }
    }

    return metadata
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>
    const customer = (input.context?.customer ?? {}) as Record<string, unknown>
    const locale = data.locale === "en" ? "en" : "ar"
    const storefrontUrl = (
      process.env.MEDUSA_STOREFRONT_URL || "http://localhost:3000"
    ).replace(/\/+$/, "")

    const form = new URLSearchParams()
    form.set("mode", "payment")
    form.set("locale", locale)
    // Stripe no longer accepts `payment_method_types` when creating a Checkout
    // Session (dynamic payment methods): the session resolves its methods from
    // Dashboard -> Settings -> Payment methods. Card-only is therefore a
    // Dashboard setting, and we assert the outcome on the created session below.
    form.set(
      "line_items[0][price_data][currency]",
      input.currency_code.toLowerCase()
    )
    form.set(
      "line_items[0][price_data][unit_amount]",
      String(this.toMinorUnits(input.amount))
    )
    form.set("line_items[0][price_data][product_data][name]", "3WEEQ Order")
    form.set("line_items[0][quantity]", "1")

    const uiMode = checkoutUiMode()
    if (uiMode === "elements") {
      /* The customer never leaves 3WEEQ. Stripe's Payment Element is the path
         that keeps working inside Instagram/Facebook in-app webviews, where
         the hosted checkout page fails to initialise its payment form. */
      form.set("ui_mode", "elements")
      form.set(
        "return_url",
        `${storefrontUrl}/${locale}/checkout/callback?session_id={CHECKOUT_SESSION_ID}`
      )
    } else {
      form.set(
        "success_url",
        `${storefrontUrl}/${locale}/checkout/callback?session_id={CHECKOUT_SESSION_ID}`
      )
      form.set("cancel_url", `${storefrontUrl}/${locale}/checkout`)
    }

    const customerEmail = String(customer.email || data.email || "").trim()
    if (customerEmail) {
      form.set("customer_email", customerEmail)
      // Stripe creates a receipt for every successful payment but only emails
      // it when the Dashboard's automatic-receipts toggle is on. Supplying the
      // address on the PaymentIntent makes delivery deterministic even if that
      // toggle is off (Stripe docs: receipts#specify-a-receipt-email-address).
      form.set("payment_intent_data[receipt_email]", customerEmail)
    }

    for (const [key, value] of Object.entries(this.metadataFrom(data))) {
      form.set(`metadata[${key}]`, value)
    }

    /* A network drop after Stripe accepted the request must not produce a
       second payable page. The key is derived from the cart, the amount and the
       session we are replacing, so an identical retry returns the same Stripe
       session, a changed cart gets a fresh one, and a deliberate replacement
       never collides with the page it replaced. */
    const stableId = String(data.cart_id ?? data.session_id ?? "").trim()
    const previousSessionId = String(
      data.previous_checkout_session_id ?? ""
    ).trim()
    const idempotencyKey = stableId
      ? createHash("sha256")
          .update(
            [
              "checkout",
              stableId,
              previousSessionId || "0",
              this.toMinorUnits(input.amount),
              input.currency_code.toLowerCase(),
            ].join(":")
          )
          .digest("hex")
      : undefined

    /* The page we are about to replace stays payable for 24 hours unless it is
       expired first, and a payment on it would land on a session Medusa no
       longer knows. Expiring is best-effort — an already-expired session
       answers 410 — but a page that is already *paid* must stop checkout
       entirely, or the same cart could be charged twice. */
    if (previousSessionId.startsWith("cs_")) {
      try {
        await this.request(
          `/checkout/sessions/${previousSessionId}/expire`,
          "POST",
          new URLSearchParams(),
          `expire:${previousSessionId}`
        )
      } catch (error) {
        const previous = await this.request<StripeCheckoutSession>(
          `/checkout/sessions/${previousSessionId}`,
          "GET"
        ).catch(() => null)

        if (
          previous?.status === "complete" ||
          previous?.payment_status === "paid"
        ) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "This cart already has a completed payment page. Do not pay again — the order is being finalised."
          )
        }

        this.logger_.warn(
          `stripe: could not expire previous checkout session ${previousSessionId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
    }

    /* A pinned API version should always accept `ui_mode=elements`. If the
       account is pinned to an older version anyway, fall back to the hosted
       page rather than breaking checkout for every customer. The storefront
       sees the returned `payment_ui` and uses the redirect path. */
    let actualUiMode = uiMode
    let session: StripeCheckoutSession
    try {
      session = await this.request<StripeCheckoutSession>(
        "/checkout/sessions",
        "POST",
        form,
        idempotencyKey
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (
        uiMode !== "elements" ||
        !/ui_mode|unknown parameter|not supported/i.test(message)
      ) {
        throw error
      }

      this.logger_.warn(
        "stripe: the account rejected ui_mode=elements; falling back to the hosted checkout page"
      )
      actualUiMode = "hosted_page"
      form.delete("ui_mode")
      form.delete("return_url")
      form.set(
        "success_url",
        `${storefrontUrl}/${locale}/checkout/callback?session_id={CHECKOUT_SESSION_ID}`
      )
      form.set("cancel_url", `${storefrontUrl}/${locale}/checkout`)
      session = await this.request<StripeCheckoutSession>(
        "/checkout/sessions",
        "POST",
        form,
        idempotencyKey
      )
    }

    // The store accepts cards only. Dynamic payment methods mean Stripe now
    // ignores any method list we send, so make it loud when the Dashboard still
    // exposes something else at Checkout.
    const nonCardMethods = (session.payment_method_types ?? []).filter(
      (method) => method !== "card"
    )
    if (nonCardMethods.length) {
      this.logger_.warn(
        `stripe: checkout session ${session.id} exposes non-card payment methods (${nonCardMethods.join(
          ", "
        )}). Disable them in Dashboard -> Settings -> Payment methods.`
      )
    }

    return {
      id: session.id,
      data: {
        ...session,
        redirect_url: session.url,
        payment_ui: actualUiMode,
        session_id: data.session_id,
        cart_id: data.cart_id,
        order_id: data.order_id,
        payment_id: data.payment_id,
      },
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const id = input.data?.id as string | undefined
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Stripe checkout session id is missing"
      )
    }

    const session = await this.request<StripeCheckoutSession>(
      `/checkout/sessions/${id}`,
      "GET"
    )

    return {
      data: {
        ...input.data,
        ...session,
      },
      status: session.payment_status === "paid" ? "captured" : "pending",
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    // Checkout Sessions capture immediately on completion; there is nothing
    // left to capture, so this is a no-op that preserves the session data.
    return {
      data: input.data ?? {},
    }
  }

  /**
   * Checkout Sessions are refunded/cancelled through their PaymentIntent.
   * `data.id` is the session (`cs_...`) because `authorizePayment` spreads the
   * session object over the input, so using it as a PaymentIntent id makes
   * Stripe answer "No such payment_intent". Older payments may only carry the
   * session id, hence the fallback.
   */
  private paymentIntentId(data?: Record<string, unknown>) {
    const intent = data?.payment_intent
    if (typeof intent === "string" && intent.startsWith("pi_")) {
      return intent
    }

    const id = data?.id
    if (typeof id === "string" && id.startsWith("pi_")) {
      return id
    }

    return null
  }

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    const id = this.paymentIntentId(input.data)
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Stripe PaymentIntent id is missing; refund this checkout session from the Stripe Dashboard"
      )
    }

    const form = new URLSearchParams()
    form.set("payment_intent", id)
    const requested = this.toMinorUnits(input.amount)
    form.set("amount", String(requested))

    /* A refund made from the Stripe Dashboard never reaches Medusa, so the
       order can still look paid here. Reading the PaymentIntent first means
       reconciling that refund never moves money twice. */
    const intent = await this.request<StripePaymentIntent>(
      `/payment_intents/${id}`,
      "GET"
    )
    const alreadyRefunded = Number(intent.amount_refunded ?? 0)

    if (alreadyRefunded >= requested) {
      this.logger_.info(
        `stripe: ${id} already refunded ${alreadyRefunded} of ${requested}; recording it without a second refund`
      )
      return {
        data: input.data ?? {},
      }
    }

    await this.request(
      "/refunds",
      "POST",
      form,
      `refund:${id}:${requested}`
    )

    return {
      data: input.data ?? {},
    }
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    const id = this.paymentIntentId(input.data)
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Stripe PaymentIntent id is missing; cancel this checkout session from the Stripe Dashboard"
      )
    }

    await this.request(
      `/payment_intents/${id}/cancel`,
      "POST",
      new URLSearchParams(),
      `cancel:${id}`
    )

    return {
      data: input.data ?? {},
    }
  }

  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    return {
      data: input.data ?? {},
    }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const id = input.data?.id as string | undefined
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Stripe checkout session id is missing"
      )
    }

    const session = await this.request<StripeCheckoutSession>(
      `/checkout/sessions/${id}`,
      "GET"
    )

    return {
      status: session.payment_status === "paid" ? "captured" : "pending",
    }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    const id = input.data?.id as string | undefined
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Stripe checkout session id is missing"
      )
    }

    const session = await this.request<StripeCheckoutSession>(
      `/checkout/sessions/${id}`,
      "GET"
    )

    return {
      data: session as unknown as Record<string, unknown>,
    }
  }

  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    const id = input.data?.id as string | undefined
    if (!id) {
      // Nothing was created on the provider side yet; keep the session data.
      return { data: input.data ?? {} }
    }

    const session = await this.request<StripeCheckoutSession>(
      `/checkout/sessions/${id}`,
      "GET"
    )

    return {
      data: {
        ...input.data,
        ...session,
      },
    }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const data = payload.data as Record<string, unknown>
    const rawBody = Buffer.isBuffer(payload.rawData)
      ? payload.rawData.toString("utf8")
      : String(payload.rawData)

    if (
      !verifyStripeSignature(
        rawBody,
        payload.headers as Record<string, unknown>,
        this.options_.webhookSecret
      )
    ) {
      return {
        action: "failed",
        data: {
          session_id: "",
          amount: new BigNumber(0),
        },
      }
    }

    const eventData = (data.data ?? {}) as Record<string, unknown>
    const object = (eventData.object ?? {}) as Record<string, unknown>
    const metadata = (object.metadata ?? {}) as Record<string, unknown>
    const type = String(data.type ?? "")
    const sessionId = String(metadata.session_id ?? "")
    const amountInMinor = Number(
      object.amount_received ?? object.amount ?? object.amount_total ?? 0
    )
    const amount = new BigNumber(amountInMinor / 100)

    if (type === "checkout.session.completed") {
      return {
        action: "authorized",
        data: { session_id: sessionId, amount },
      }
    }

    if (type === "payment_intent.succeeded") {
      return {
        action: "captured",
        data: { session_id: sessionId, amount },
      }
    }

    if (type === "payment_intent.amount_capturable_updated") {
      return {
        action: "authorized",
        data: { session_id: sessionId, amount },
      }
    }

    if (
      type === "payment_intent.payment_failed" ||
      type === "payment_intent.canceled"
    ) {
      return {
        action: "failed",
        data: { session_id: sessionId, amount },
      }
    }

    return {
      action: "not_supported",
      data: { session_id: sessionId, amount },
    }
  }
}

export default StripePaymentProviderService
