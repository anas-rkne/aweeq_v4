import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { ThreeweeqRepository } from "../lib/threeweeq/repository"
import { findOrderByCart } from "../lib/threeweeq/checkout"

/**
 * Last line of defence for paid checkouts.
 *
 * The order is created by the storefront callback (`/checkout/callback` →
 * `/store/checkout/complete`). If the shopper pays and closes the tab, or the
 * callback page never runs, Stripe has the money but Medusa has no order.
 *
 * This job looks for `checkout.session.completed` webhooks that were paid and
 * processed more than two minutes ago, and whose cart still has no order. It
 * then calls the same completion endpoint the callback uses — so inventory,
 * order creation and the Meta Purchase event all happen exactly once, through
 * the already-tested path. The endpoint is idempotent per cart, and the job
 * re-checks for an existing order before every call.
 *
 * It is additive: when the key is missing or nothing is pending it does
 * nothing, so it cannot affect normal checkouts.
 */

const OLDER_THAN_MINUTES = 2
const BATCH_SIZE = 20
const REQUEST_TIMEOUT_MS = 30_000

let warnedMissingKey = false
let loggedActive = false

export default async function recoverPaidCartsJob(container: MedusaContainer) {
  const logger = container.resolve<Logger>("logger")
  const publishableKey = process.env.MEDUSA_PUBLISHABLE_KEY

  if (!publishableKey) {
    if (!warnedMissingKey) {
      warnedMissingKey = true
      logger.warn(
        "recover-paid-carts: MEDUSA_PUBLISHABLE_KEY is not set; job is idle"
      )
    }
    return
  }

  const repository = new ThreeweeqRepository(container)

  if (!loggedActive) {
    loggedActive = true
    logger.info("recover-paid-carts: scheduler active (every 2 minutes)")
  }

  const candidates = await repository.listRecoverablePaidCarts(
    OLDER_THAN_MINUTES,
    BATCH_SIZE
  )

  if (!candidates.length) {
    return
  }

  const baseUrl = `http://127.0.0.1:${process.env.PORT ?? "9000"}`

  for (const candidate of candidates) {
    const cartId = candidate.cart_id

    try {
      const existing = await findOrderByCart(container, cartId)
      if (existing?.id) {
        continue
      }

      const response = await fetch(`${baseUrl}/store/checkout/complete`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-publishable-api-key": publishableKey,
          "x-idempotency-key": `recovery:${cartId}`,
        },
        body: JSON.stringify({ cart_id: cartId }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })

      const text = await response.text()
      let body: Record<string, unknown> | null = null
      try {
        body = JSON.parse(text) as Record<string, unknown>
      } catch {
        body = null
      }

      if (response.ok) {
        logger.info(
          `recover-paid-carts: completed cart ${cartId} as order ${
            body?.order_id ?? "unknown"
          }`
        )
        continue
      }

      if (response.status === 409) {
        logger.info(
          `recover-paid-carts: cart ${cartId} is still being completed; retrying next tick`
        )
        continue
      }

      logger.warn(
        `recover-paid-carts: cart ${cartId} failed with ${response.status}: ${text.slice(
          0,
          300
        )}`
      )
    } catch (error) {
      logger.warn(
        `recover-paid-carts: cart ${cartId} error: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      )
    }
  }
}

export const config = {
  name: "recover-paid-carts",
  schedule: "*/2 * * * *",
}
