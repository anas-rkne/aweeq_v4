import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { ThreeweeqRepository } from "../../../../lib/threeweeq/repository"
import {
  normalizePaymentWebhook,
  type NormalizedPaymentWebhook,
} from "../../../../lib/payments/normalize"
import {
  verifyStripeSignature,
  verifyTapSignature,
} from "../../../../lib/payments/signatures"
import { resolveOrderId } from "../../../../lib/threeweeq/orders"
import {
  findOrderByCart,
  getCartPaymentCollection,
  isSessionAuthorized,
  pickPaymentSession,
} from "../../../../lib/threeweeq/checkout"
import { authorizeCartPaymentWorkflow } from "../../../../workflows/authorize-cart-payment"
import sendOrderConfirmationWorkflow from "../../../../workflows/send-order-confirmation"

function resolveProvider(req: MedusaRequest, body: Record<string, unknown>) {
  const queryProvider =
    typeof req.query.provider === "string" ? req.query.provider : undefined
  const headerProvider = req.headers["x-payment-provider"]
  const bodyProvider = body.provider
  const value = queryProvider ?? headerProvider ?? bodyProvider

  if (value) {
    return String(value).toLowerCase()
  }

  if (body.type && body.data) {
    return "stripe"
  }

  if (body.status) {
    return "tap"
  }

  return ""
}

function readBody(req: MedusaRequest) {
  const raw =
    (req as any).rawBody ??
    (Buffer.isBuffer(req.body) ? req.body : undefined)

  if (Buffer.isBuffer(raw)) {
    const rawBody = raw.toString("utf8")
    return {
      rawBody,
      body: JSON.parse(rawBody) as Record<string, unknown>,
    }
  }

  if (typeof raw === "string") {
    return {
      rawBody: raw,
      body: JSON.parse(raw) as Record<string, unknown>,
    }
  }

  if (typeof req.body === "string") {
    return {
      rawBody: req.body,
      body: JSON.parse(req.body) as Record<string, unknown>,
    }
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  return {
    rawBody: JSON.stringify(body),
    body,
  }
}

async function resolveSession(
  container: MedusaRequest["scope"],
  event: NormalizedPaymentWebhook
) {
  if (event.sessionId) {
    return { id: event.sessionId } as const
  }

  if (!event.cartId) {
    return null
  }

  const collection = await getCartPaymentCollection(container, event.cartId)

  return pickPaymentSession(collection, {
    providerId:
      event.provider === "stripe" ? "pp_stripe_stripe" : undefined,
  })
}

async function authorizeSession(
  container: MedusaRequest["scope"],
  event: NormalizedPaymentWebhook
) {
  const session = await resolveSession(container, event)

  if (!session?.id) {
    return
  }

  if (event.cartId) {
    const collection = await getCartPaymentCollection(container, event.cartId)
    const current = pickPaymentSession(collection, { sessionId: session.id })

    if (current && isSessionAuthorized(current)) {
      return
    }
  }

  try {
    await authorizeCartPaymentWorkflow(container).run({
      input: { id: session.id },
    })
  } catch (error) {
    if (!event.cartId) {
      throw error
    }

    const collection = await getCartPaymentCollection(container, event.cartId)
    const current = pickPaymentSession(collection, { sessionId: session.id })

    if (!current || !isSessionAuthorized(current)) {
      throw error
    }
  }
}

async function handlePaymentEvent(
  container: MedusaRequest["scope"],
  event: NormalizedPaymentWebhook
) {
  if (event.action === "authorized") {
    await authorizeSession(container, event)
    return
  }

  if (event.action !== "captured") {
    return
  }

  let orderId = await resolveOrderId(container, {
    orderId: event.orderId,
    paymentId: event.paymentId,
  })

  if (!orderId && event.cartId) {
    const order = await findOrderByCart(container, event.cartId)
    orderId = order?.id ? String(order.id) : null
  }

  if (!orderId && event.orderId) {
    orderId = String(event.orderId)
  }

  if (orderId) {
    await sendOrderConfirmationWorkflow(container).run({
      input: { order_id: orderId },
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  let parsed: { rawBody: string; body: Record<string, unknown> }

  try {
    parsed = readBody(req)
  } catch {
    res.status(400).json({
      code: "invalid_json",
      message: "Webhook body must be valid JSON",
    })
    return
  }

  const { rawBody, body } = parsed
  const provider = resolveProvider(req, body)

  if (provider !== "tap" && provider !== "stripe") {
    res.status(400).json({
      code: "unsupported_provider",
      message: "A supported payment provider is required",
    })
    return
  }

  const headers = req.headers as Record<string, unknown>
  const verified =
    provider === "stripe"
      ? verifyStripeSignature(
          rawBody,
          headers,
          process.env.STRIPE_WEBHOOK_SECRET
        )
      : verifyTapSignature(
          rawBody,
          headers,
          process.env.TAP_WEBHOOK_SECRET,
          body
        )

  if (!verified) {
    res.status(401).json({
      code: "invalid_signature",
      message: "Webhook signature verification failed",
    })
    return
  }

  const normalized = normalizePaymentWebhook(provider, body)
  if (!normalized) {
    res.status(400).json({
      code: "invalid_payload",
      message: "Webhook payload could not be normalized",
    })
    return
  }

  const repository = new ThreeweeqRepository(req.scope)
  const record = await repository.recordWebhookEvent({
    provider,
    externalId: normalized.externalId,
    eventType: normalized.eventType,
    payload: body,
    headers,
  })

  if (record.duplicate) {
    res.status(200).json({ received: true, duplicate: true })
    return
  }

  const eventId = record.event.id as string

  try {
    await repository.markWebhookProcessing(eventId)
    await handlePaymentEvent(req.scope, normalized)
    await repository.markWebhookProcessed(eventId)

    res.status(200).json({ received: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed"
    await repository.markWebhookFailed(eventId, message)

    const logger = req.scope.resolve<any>(ContainerRegistrationKeys.LOGGER)
    logger.error(
      `Payment webhook ${provider}/${normalized.eventType} failed: ${message}`
    )

    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, message)
  }
}
