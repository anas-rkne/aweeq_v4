import { createHash } from "crypto"
import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  capturePaymentWorkflow,
  completeCartWorkflow,
} from "@medusajs/medusa/core-flows"
import { authorizeCartPaymentWorkflow } from "../../../../workflows/authorize-cart-payment"
import {
  ThreeweeqRepository,
  type Locale,
} from "../../../../lib/threeweeq/repository"
import { sendPurchaseEvent } from "../../../../lib/meta/capi"
import { retrieveOrder } from "../../../../lib/threeweeq/orders"
import sendOrderConfirmationWorkflow from "../../../../workflows/send-order-confirmation"
import {
  findOrderByCart,
  findPaymentBySession,
  getCartPaymentCollection,
  isSessionAuthorized,
  pickPaymentSession,
} from "../../../../lib/threeweeq/checkout"

type CompleteCheckoutBody = {
  cart_id?: string
  idempotency_key?: string
  payment_session_id?: string
  provider_id?: string
  locale?: Locale
  drop_id?: string | null
  gift_message?: string | null
  packaging_code?: string | null
}

type CartItem = {
  id: string
  variant_id?: string | null
  quantity: number
}

async function countPurchasedQuantities(
  query: any,
  cart: Record<string, unknown>,
  variantIds: string[]
) {
  const filters: Record<string, unknown> = {}

  if (cart.customer_id) {
    filters.customer_id = cart.customer_id
  } else if (cart.email) {
    filters.email = cart.email
  } else {
    return {}
  }

  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "status", "items.variant_id", "items.quantity"],
    filters,
  })

  const quantities: Record<string, number> = {}

  for (const order of data ?? []) {
    if (order.status === "canceled") {
      continue
    }

    for (const item of order.items ?? []) {
      if (!item.variant_id || !variantIds.includes(item.variant_id)) {
        continue
      }

      quantities[item.variant_id] =
        (quantities[item.variant_id] ?? 0) + Number(item.quantity ?? 0)
    }
  }

  return quantities
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as CompleteCheckoutBody
  const cartId = body.cart_id?.trim()

  if (!cartId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "cart_id is required"
    )
  }

  const idempotencyKey = String(
    req.headers["x-idempotency-key"] ??
      body.idempotency_key ??
      `checkout:${cartId}`
  )
  const requestHash = createHash("sha256")
    .update(
      JSON.stringify({
        cart_id: cartId,
        locale: body.locale ?? null,
        drop_id: body.drop_id ?? null,
        gift_message: body.gift_message ?? null,
        packaging_code: body.packaging_code ?? null,
      })
    )
    .digest("hex")

  const repository = new ThreeweeqRepository(req.scope)
  const idempotency = await repository.beginIdempotency(
    idempotencyKey,
    "store.checkout.complete",
    requestHash
  )

  if (idempotency.state === "completed") {
    res
      .status(Number(idempotency.record?.response_status ?? 200))
      .json(idempotency.record?.response_body ?? {})
    return
  }

  if (idempotency.state === "in_progress") {
    res.status(409).json({
      code: "checkout_in_progress",
      message: "This checkout is already being processed",
    })
    return
  }

  if (idempotency.state === "conflict") {
    res.status(409).json({
      code: "idempotency_conflict",
      message: "The idempotency key was used with a different request",
    })
    return
  }

  const query = req.scope.resolve<any>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "email",
      "customer_id",
      "currency_code",
      "completed_at",
      "metadata",
      "total",
      "items.id",
      "items.variant_id",
      "items.quantity",
    ],
    filters: { id: cartId },
  })

  const cart = data?.[0]

  if (!cart) {
    await repository.failIdempotency(idempotencyKey, "cart_not_found")
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Cart not found")
  }

  if (cart.completed_at) {
    const existingOrder = await findOrderByCart(req.scope, cartId)

    if (existingOrder?.id) {
      const responseBody = {
        order_id: existingOrder.id,
        order: existingOrder,
        already_completed: true,
      }

      await repository.completeIdempotency(
        idempotencyKey,
        200,
        responseBody as unknown as Record<string, unknown>
      )

      res.status(200).json(responseBody)
      return
    }

    await repository.failIdempotency(idempotencyKey, "cart_already_completed")
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Cart has already been completed"
    )
  }

  const items: CartItem[] = (cart.items ?? [])
    .filter((item: CartItem) => item.variant_id && Number(item.quantity) > 0)
    .map((item: CartItem) => ({
      id: item.id,
      variant_id: item.variant_id,
      quantity: Number(item.quantity),
    }))

  if (!items.length) {
    await repository.failIdempotency(idempotencyKey, "empty_cart")
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Cart is empty")
  }

  const paymentCollection = await getCartPaymentCollection(req.scope, cartId)
  const paymentSession = pickPaymentSession(paymentCollection, {
    sessionId: body.payment_session_id,
    providerId: body.provider_id,
  })

  if (!paymentSession) {
    await repository.failIdempotency(idempotencyKey, "payment_session_missing")
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No payment session is associated with this cart. Start checkout first."
    )
  }

  if (
    paymentSession.status === "canceled" ||
    paymentSession.status === "error"
  ) {
    await repository.failIdempotency(idempotencyKey, "payment_session_invalid")
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The payment session is no longer valid. Start checkout again."
    )
  }

  const variantIds = Array.from(
    new Set(items.map((item) => item.variant_id as string))
  )
  const variantProfiles = (await repository.getVariantProfiles(
    variantIds
  )) as Array<Record<string, any>>
  const variantProfileByVariant = new Map<string, any>(
    variantProfiles.map((profile: any) => [profile.variant_id, profile])
  )
  const productIds = Array.from(
    new Set(
      variantProfiles
        .map((profile: any) => profile.product_id)
        .filter(Boolean)
    )
  ) as string[]
  const productProfiles = (await repository.getProductProfiles(
    productIds
  )) as Array<Record<string, any>>
  const civilizationId = productProfiles[0]?.civilization_id ?? null
  const drop = body.drop_id
    ? await repository.getDropById(body.drop_id)
    : await repository.findDropForVariants(variantIds)

  if (body.drop_id && !drop) {
    await repository.failIdempotency(idempotencyKey, "drop_not_found")
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Drop not found")
  }

  const dropVariantIds = drop
    ? (await repository.getDropAllocations(drop.id)).map(
        (allocation: any) => allocation.variant_id
      )
    : []

  if (drop) {
    const purchased = await countPurchasedQuantities(query, cart, variantIds)
    const cartQuantities = items.reduce<Record<string, number>>(
      (result, item) => {
        const variantId = item.variant_id as string
        result[variantId] = (result[variantId] ?? 0) + item.quantity
        return result
      },
      {}
    )

    for (const [variantId, quantity] of Object.entries(cartQuantities)) {
      if (!dropVariantIds.includes(variantId)) {
        continue
      }

      if (
        (purchased[variantId] ?? 0) + quantity >
        Number(drop.per_customer_limit)
      ) {
        await repository.failIdempotency(
          idempotencyKey,
          "customer_limit_exceeded"
        )
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Purchase limit exceeded for variant ${variantId}`
        )
      }
    }
  }

  let reservations: { serialByVariant: Record<string, string[]> } | undefined
  let finalized = false
  let orderPlaced = false

  try {
    if (!isSessionAuthorized(paymentSession)) {
      try {
        await authorizeCartPaymentWorkflow(req.scope).run({
          input: { id: paymentSession.id },
        })
      } catch (error) {
        const refreshed = await getCartPaymentCollection(req.scope, cartId)
        const refreshedSession = pickPaymentSession(refreshed, {
          sessionId: paymentSession.id,
        })

        if (!refreshedSession || !isSessionAuthorized(refreshedSession)) {
          throw error
        }
      }
    }

    /* The page was priced when it was created. If the cart changed in another
       tab while the customer was on Stripe, the money taken and the order total
       would disagree — refuse the order and let the merchant refund, instead of
       booking an underpaid order. */
    const rawSessionAmount = (paymentSession as any).amount
    const sessionAmount =
      rawSessionAmount &&
      typeof rawSessionAmount === "object" &&
      "numeric" in rawSessionAmount
        ? Number((rawSessionAmount as { numeric: number }).numeric)
        : Number(rawSessionAmount ?? 0)
    const cartTotal = Number((cart as any).total ?? 0)

    if (
      sessionAmount > 0 &&
      cartTotal > 0 &&
      Math.abs(sessionAmount - cartTotal) > 0.01
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The cart total changed after the payment page was created. Start checkout again so the amount charged matches the order."
      )
    }

    reservations = await repository.reserveCheckoutInventory({
      dropId: drop?.id ?? null,
      dropVariantIds,
      items: items.map((item) => ({
        variantId: item.variant_id as string,
        quantity: item.quantity,
        isSerialized: Boolean(
          variantProfileByVariant.get(item.variant_id as string)?.is_serialized
        ),
      })),
    })

    const completeResult = await completeCartWorkflow(req.scope).run({
      input: { id: cartId },
    })

    /* `completeCartWorkflow` answers `{ id }` — never a { type, order } or
       { type: "cart", error } envelope; that shape belongs to the store API
       route built on top of it. Reading it as an envelope made every real
       payment look like a failed completion after the order already existed. */
    const completed = (completeResult?.result ?? completeResult) as {
      id?: string
    } | null
    const completedOrderId = completed?.id

    if (!completedOrderId) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "The cart could not be completed. Confirm the payment session is authorized."
      )
    }

    /* The order exists from this point on: never release its reservations. */
    orderPlaced = true

    const order =
      (await findOrderByCart(req.scope, cartId)) ??
      (await retrieveOrder(req.scope, completedOrderId))

    if (!order?.id) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Order ${completedOrderId} was created but could not be read back`
      )
    }

    let paymentCaptured = false
    let paymentId: string | null = null

    try {
      const payment = await findPaymentBySession(req.scope, paymentSession.id)

      if (payment?.id) {
        paymentId = payment.id

        if (payment.captured_at) {
          paymentCaptured = true
        } else if (!payment.canceled_at) {
          await capturePaymentWorkflow(req.scope).run({
            input: { payment_id: payment.id },
          })
          paymentCaptured = true
        }
      }
    } catch (error) {
      const logger = req.scope.resolve<any>(ContainerRegistrationKeys.LOGGER)
      logger.warn(
        `Payment capture failed for order ${order.id}: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      )
    }

    const orderItems = (order.items ?? []).map((item: any) => ({
      id: item.id,
      variantId: item.variant_id ?? null,
      productId:
        variantProfileByVariant.get(item.variant_id)?.product_id ?? null,
      quantity: Number(item.quantity ?? 0),
    }))

    await repository.finalizeCheckout({
      orderId: order.id,
      customerId: order.customer_id ?? cart.customer_id ?? null,
      civilizationId,
      dropId: drop?.id ?? body.drop_id ?? null,
      locale:
        body.locale === "en" ||
        (cart.metadata as Record<string, unknown> | null)?.locale === "en"
          ? "en"
          : "ar",
      giftMessage: body.gift_message ?? null,
      packagingCode: body.packaging_code ?? null,
      orderItems,
      serialByVariant: reservations?.serialByVariant ?? {},
      dropVariantIds,
    })
    finalized = true

    /* The `payment_intent.succeeded` webhook is the usual sender, but Stripe
       fires it before the browser reaches this route, so the order often does
       not exist yet and the confirmation was silently dropped. Queuing it here
       is the reliable half; `enqueueOutboxOnce` keeps a late webhook from
       sending a second copy. */
    try {
      await sendOrderConfirmationWorkflow(req.scope).run({
        input: { order_id: order.id },
      })
    } catch (error) {
      req.scope
        .resolve<any>(ContainerRegistrationKeys.LOGGER)
        ?.warn?.(
          `checkout: order ${order.id} was created but its confirmation was not queued: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
    }

    /* Meta Conversions API: the reliable half of Purchase. The browser pixel
       sends the same event_id (the order id), so Meta deduplicates the two. */
    void (async () => {
      try {
        const query = req.scope.resolve<any>(ContainerRegistrationKeys.QUERY)
        const rawItems = (order.items ?? []) as Array<Record<string, any>>
        const variantIds = Array.from(
          new Set(
            rawItems
              .map((item) => item.variant_id)
              .filter((id): id is string => Boolean(id))
          )
        )

        const skuByVariant = new Map<string, string | null>()
        if (variantIds.length) {
          const { data } = await query.graph({
            entity: "product_variant",
            fields: ["id", "sku"],
            filters: { id: variantIds },
          })
          for (const row of data ?? []) {
            skuByVariant.set(row.id, row.sku ?? null)
          }
        }

        const metaItems = rawItems.flatMap((item) => {
          const sku = item.variant_id
            ? skuByVariant.get(item.variant_id)
            : null
          if (!sku) return []
          return [
            {
              sku,
              quantity: Number(item.quantity ?? 0),
              itemPrice: Number(item.unit_price ?? 0),
            },
          ]
        })

        const orderLocale =
          body.locale === "en" ||
          (cart.metadata as Record<string, unknown> | null)?.locale === "en"
            ? "en"
            : "ar"
        const storefrontUrl = (
          process.env.MEDUSA_STOREFRONT_URL ??
          process.env.STOREFRONT_URL ??
          ""
        ).replace(/\/+$/, "")

        const forwardedFor = req.headers["x-forwarded-for"]
        const clientIp =
          typeof forwardedFor === "string"
            ? forwardedFor.split(",")[0]?.trim() || null
            : null
        const userAgent =
          typeof req.headers["user-agent"] === "string"
            ? req.headers["user-agent"]
            : null
        const shippingPhone = (
          order.shipping_address as Record<string, unknown> | null
        )?.phone

        const metaResult = (await sendPurchaseEvent({
          orderId: order.id,
          value: Number(order.total ?? 0),
          currency: order.currency_code ?? cart.currency_code ?? "aed",
          items: metaItems,
          email: order.email ?? cart.email ?? null,
          phone: typeof shippingPhone === "string" ? shippingPhone : null,
          clientIp,
          userAgent,
          eventSourceUrl: storefrontUrl
            ? `${storefrontUrl}/${orderLocale}/order/${order.id}`
            : null,
        })) as {
          sent: boolean
          reason?: string
          status?: number
          body?: string
        }

        /* The return value used to be discarded, so a rejected or unconfigured
           CAPI call was invisible in the logs. Log the outcome only — never the
           token — so a real order can be traced end to end. */
        const metaLogger = req.scope.resolve<any>(
          ContainerRegistrationKeys.LOGGER
        )
        if (metaResult.sent) {
          metaLogger.info(`Meta CAPI purchase sent for order ${order.id}`)
        } else {
          metaLogger.warn(
            `Meta CAPI purchase not sent for order ${order.id}: ${
              metaResult.reason ?? "unknown"
            }${metaResult.status ? ` (HTTP ${metaResult.status})` : ""}${
              metaResult.body ? ` — ${metaResult.body.slice(0, 300)}` : ""
            }`
          )
        }
      } catch (error) {
        const logger = req.scope.resolve<any>(ContainerRegistrationKeys.LOGGER)
        logger.warn(
          `Meta CAPI purchase failed for order ${order.id}: ${
            error instanceof Error ? error.message : "unknown error"
          }`
        )
      }
    })()

    const responseBody = {
      order_id: order.id,
      order,
      payment_id: paymentId,
      payment_captured: paymentCaptured,
    }

    await repository.completeIdempotency(
      idempotencyKey,
      200,
      responseBody as unknown as Record<string, unknown>
    )

    res.status(200).json(responseBody)
  } catch (error) {
    if (!finalized && !orderPlaced) {
      const serialIds = Object.values(reservations?.serialByVariant ?? {}).flat()
      await repository.releaseSerialUnits(serialIds)

      if (drop) {
        for (const item of items) {
          if (dropVariantIds.includes(item.variant_id as string)) {
            await repository.releaseDropAllocation(
              drop.id,
              item.variant_id as string,
              item.quantity
            )
          }
        }
      }

      /* A failure here can happen after the card was charged. Staying silent
         is the worst outcome — the customer paid and nobody knows — so the
         merchant gets one alert per cart. Never let the alert mask the
         original failure. */
      try {
        const notifyTo = String(
          process.env.ORDER_NOTIFICATION_EMAIL ?? ""
        ).trim()

        if (notifyTo) {
          const settledCollection = await getCartPaymentCollection(
            req.scope,
            cartId
          )
          const settledSession = pickPaymentSession(settledCollection, {
            sessionId: paymentSession?.id,
          })

          if (settledSession && isSessionAuthorized(settledSession)) {
            const rawAmount = (settledSession as any).amount
            const amount =
              rawAmount && typeof rawAmount === "object" && "numeric" in rawAmount
                ? Number((rawAmount as { numeric: number }).numeric)
                : Number(rawAmount ?? 0)

            await repository.enqueueOutboxOnce({
              aggregateType: "cart",
              aggregateId: cartId,
              eventType: "order.payment_stuck",
              payload: {
                email: notifyTo,
                cart_id: cartId,
                payment_session_id: settledSession.id,
                amount: Number.isFinite(amount) ? amount : 0,
                currency_code:
                  (settledSession as any).currency_code ??
                  (cart as any).currency_code ??
                  "aed",
                reason:
                  error instanceof Error ? error.message : "checkout_failed",
                created_at: new Date().toISOString(),
              },
            })
          }
        }
      } catch (alertError) {
        req.scope
          .resolve<any>(ContainerRegistrationKeys.LOGGER)
          ?.warn?.(
            `checkout: could not raise the stuck-payment alert for ${cartId}: ${
              alertError instanceof Error ? alertError.message : String(alertError)
            }`
          )
      }
    }

    await repository.failIdempotency(
      idempotencyKey,
      error instanceof Error ? error.message : "checkout_failed"
    )

    throw error
  }
}
