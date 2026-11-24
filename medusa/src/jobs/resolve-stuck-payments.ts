import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { refundPaymentWorkflow } from "@medusajs/medusa/core-flows"
import { ThreeweeqRepository } from "../lib/threeweeq/repository"
import { findOrderByCart, findPaymentBySession } from "../lib/threeweeq/checkout"

/**
 * The final decision on money that never became an order.
 *
 * `recover-paid-carts` retries every two minutes, and the completion endpoint
 * alerts the merchant on the first failure. If a day passes and the cart still
 * has no order, the shopper paid for nothing and nobody has acted. This job
 * closes that window: it alerts once and, when `STUCK_PAYMENT_AUTO_REFUND` is
 * `true`, refunds the payment through the same workflow the admin uses — the
 * provider itself refuses to refund twice, so a Dashboard refund made in the
 * meantime is recorded rather than repeated.
 *
 * With the flag unset it only alerts, which is the safe default.
 */

const STUCK_AFTER_MINUTES = 24 * 60
const BATCH_SIZE = 50

export default async function resolveStuckPaymentsJob(
  container: MedusaContainer
) {
  const logger = container.resolve<Logger>("logger")
  const repository = new ThreeweeqRepository(container)
  const autoRefund =
    String(process.env.STUCK_PAYMENT_AUTO_REFUND ?? "").toLowerCase() === "true"
  const notifyTo = String(process.env.ORDER_NOTIFICATION_EMAIL ?? "").trim()

  const candidates = await repository.listRecoverablePaidCarts(
    STUCK_AFTER_MINUTES,
    BATCH_SIZE
  )

  if (!candidates.length) {
    return
  }

  for (const candidate of candidates) {
    const cartId = candidate.cart_id

    try {
      const existing = await findOrderByCart(container, cartId)
      if (existing?.id) {
        continue
      }

      let refunded = false
      let outcome = "still unresolved after 24 hours"

      if (autoRefund && candidate.payment_session_id) {
        const payment = await findPaymentBySession(
          container,
          candidate.payment_session_id
        )

        if (payment?.id) {
          /* A refund made from the Dashboard (or a previous run of this job)
             never disappears from the cash list, so check what Medusa already
             recorded before asking for another one. */
          const paymentModule = container.resolve<any>(Modules.PAYMENT)
          const refunds = await paymentModule.listRefunds({
            payment_id: payment.id,
          })
          const refundedTotal = (refunds ?? []).reduce(
            (sum: number, refund: any) =>
              sum + Number(refund?.amount?.numeric ?? refund?.amount ?? 0),
            0
          )
          const paidAmount = Number(candidate.amount ?? 0)

          if (paidAmount > 0 && refundedTotal >= paidAmount - 0.01) {
            logger.info(
              `resolve-stuck-payments: cart ${cartId} is already refunded; nothing to do`
            )
            continue
          }

          try {
            await refundPaymentWorkflow(container).run({
              input: {
                payment_id: payment.id,
                amount: Number(candidate.amount ?? 0),
                note: "auto: paid but the order was never created (24h)",
                idempotency_key: `stuck:${cartId}`,
              },
            })
            refunded = true
            outcome = "refunded automatically after 24 hours"
          } catch (error) {
            outcome = `auto-refund failed: ${
              error instanceof Error ? error.message : "unknown error"
            }`
          }
        } else {
          outcome = "auto-refund failed: payment not found for the session"
        }
      }

      if (notifyTo) {
        await repository.enqueueOutboxOnce({
          aggregateType: "cart",
          aggregateId: cartId,
          eventType: "order.payment_stuck",
          payload: {
            email: notifyTo,
            cart_id: cartId,
            payment_session_id: candidate.payment_session_id ?? null,
            amount: Number(candidate.amount ?? 0),
            currency_code: candidate.currency_code ?? "aed",
            reason: outcome,
            created_at: new Date().toISOString(),
          },
        })
      }

      logger.warn(
        `resolve-stuck-payments: cart ${cartId} — ${outcome}${
          refunded ? "" : " — needs a human"
        }`
      )
    } catch (error) {
      logger.warn(
        `resolve-stuck-payments: cart ${cartId} error: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      )
    }
  }
}

export const config = {
  name: "resolve-stuck-payments",
  schedule: "0 * * * *",
}
