export type PaymentAction =
  | "authorized"
  | "captured"
  | "failed"
  | "canceled"
  | "refunded"
  | "ignored"

export type NormalizedPaymentWebhook = {
  provider: "tap" | "stripe"
  externalId: string | null
  eventType: string
  action: PaymentAction
  sessionId?: string
  cartId?: string
  orderId?: string
  paymentId?: string
  paymentIntentId?: string
  refundId?: string
  refundedTotal?: number
  amount?: number
  currency?: string
  payload: Record<string, unknown>
}

function metadataOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {}
}

function stringValue(value: unknown) {
  return value === undefined || value === null ? undefined : String(value)
}

export function normalizePaymentWebhook(
  provider: string,
  body: Record<string, unknown>
): NormalizedPaymentWebhook | null {
  if (provider === "tap") {
    const metadata = metadataOf(body.metadata)
    const reference = metadataOf(body.reference)
    const status = String(body.status ?? "").toUpperCase()
    const action =
      status === "CAPTURED"
        ? "captured"
        : status === "AUTHORIZED"
          ? "authorized"
          : status === "DECLINED" || status === "CANCELLED"
            ? "failed"
            : "ignored"

    return {
      provider: "tap",
      externalId: body.id ? `${body.id}:${status}` : null,
      eventType: `charge.${status.toLowerCase() || "unknown"}`,
      action,
      sessionId:
        stringValue(metadata.session_id) ??
        stringValue(reference.order) ??
        stringValue(reference.transaction),
      cartId:
        stringValue(metadata.cart_id) ?? stringValue(reference.order),
      orderId: stringValue(metadata.order_id),
      paymentId: stringValue(metadata.payment_id),
      amount:
        body.amount === undefined ? undefined : Number(body.amount),
      currency: stringValue(body.currency),
      payload: body,
    }
  }

  if (provider === "stripe") {
    const data = metadataOf(body.data)
    const object = metadataOf(data.object)
    const metadata = metadataOf(object.metadata)
    const type = String(body.type ?? "")

    if (type === "checkout.session.completed") {
      return {
        provider: "stripe",
        externalId: stringValue(object.id) ?? null,
        eventType: type,
        action: "authorized",
        sessionId: stringValue(metadata.session_id),
        cartId: stringValue(metadata.cart_id),
        orderId: stringValue(metadata.order_id),
        paymentId: stringValue(metadata.payment_id),
        amount:
          object.amount_total === undefined
            ? undefined
            : Number(object.amount_total) / 100,
        currency: stringValue(object.currency),
        payload: body,
      }
    }

    /* A refund made from the Stripe Dashboard never passes through Medusa, so
       the order keeps saying "paid". The newest entry in `refunds.data` is the
       refund this event is about; `amount_refunded` is cumulative and would
       double-count when a payment is refunded in parts. */
    if (type === "charge.refunded") {
      const refundList = metadataOf(object.refunds)
      const refunds = Array.isArray(refundList.data)
        ? (refundList.data as Array<Record<string, unknown>>)
        : []
      const latest = refunds[0] ?? {}
      const refundedMinor =
        latest.amount !== undefined
          ? Number(latest.amount)
          : Number(object.amount_refunded ?? 0)

      return {
        provider: "stripe",
        externalId: stringValue(body.id) ?? null,
        eventType: type,
        action: "refunded",
        paymentIntentId: stringValue(object.payment_intent),
        refundId: stringValue(latest.id),
        refundedTotal: Number.isFinite(Number(object.amount_refunded))
          ? Number(object.amount_refunded) / 100
          : undefined,
        amount: Number.isFinite(refundedMinor) ? refundedMinor / 100 : undefined,
        currency: stringValue(object.currency),
        sessionId: stringValue(metadata.session_id),
        cartId: stringValue(metadata.cart_id),
        orderId: stringValue(metadata.order_id),
        paymentId: stringValue(metadata.payment_id),
        payload: body,
      }
    }

    const action =
      type === "payment_intent.amount_capturable_updated"
        ? "authorized"
        : type === "payment_intent.succeeded"
          ? "captured"
          : type === "payment_intent.payment_failed" ||
              type === "payment_intent.canceled"
            ? "failed"
            : "ignored"

    const amountInMinor =
      object.amount_received !== undefined
        ? Number(object.amount_received)
        : object.amount !== undefined
          ? Number(object.amount)
          : undefined

    return {
      provider: "stripe",
      externalId: stringValue(body.id) ?? null,
      eventType: type || "unknown",
      action,
      sessionId: stringValue(metadata.session_id),
      cartId: stringValue(metadata.cart_id),
      orderId: stringValue(metadata.order_id),
      paymentId: stringValue(metadata.payment_id),
      amount:
        amountInMinor === undefined ? undefined : amountInMinor / 100,
      currency: stringValue(object.currency),
      payload: body,
    }
  }

  return null
}
