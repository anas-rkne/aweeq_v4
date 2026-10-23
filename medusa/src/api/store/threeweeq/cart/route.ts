import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { createCartWorkflow } from "@medusajs/medusa/core-flows"
import { resolveLocale } from "../../../../lib/threeweeq/catalog"
import {
  clearCartCookie,
  extractCart,
  getCartId,
  loadCart,
  resolveRegionId,
  resolveSalesChannelId,
  serializeCart,
  setCartCookie,
} from "../../../../lib/threeweeq/cart"

type CreateCartBody = {
  cart_id?: string
  region_id?: string
  sales_channel_id?: string
  email?: string
  customer_id?: string
  metadata?: Record<string, unknown>
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const locale = resolveLocale(req)
  const cartId = getCartId(req)

  if (!cartId) {
    res.json({ cart: null, locale })
    return
  }

  const cart = await loadCart(req.scope, cartId)

  if (!cart) {
    clearCartCookie(res)
    res.json({ cart: null, locale })
    return
  }

  setCartCookie(res, cart.id)
  res.json({
    cart: await serializeCart(req.scope, cart, locale),
    locale,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as CreateCartBody
  const locale = resolveLocale(req)
  const existingId = getCartId(req, body)

  if (existingId) {
    const existing = await loadCart(req.scope, existingId)

    if (existing && !existing.completed_at) {
      setCartCookie(res, existing.id)
      res.status(200).json({
        cart: await serializeCart(req.scope, existing, locale),
        locale,
      })
      return
    }
  }

  const regionId = await resolveRegionId(req.scope, body.region_id)
  const salesChannelId = await resolveSalesChannelId(
    req.scope,
    body.sales_channel_id
  )
  const actorId = (req as any).auth_context?.actor_id as string | undefined
  const customerId = actorId ?? body.customer_id

  const result = await createCartWorkflow(req.scope).run({
    input: {
      region_id: regionId,
      ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
      ...(customerId ? { customer_id: customerId } : {}),
      ...(body.email ? { email: body.email } : {}),
      ...(body.metadata ? { metadata: body.metadata } : {}),
    },
  })

  const created = extractCart(result)

  if (!created?.id) {
    res.status(500).json({
      code: "cart_creation_failed",
      message: "The cart could not be created",
    })
    return
  }

  const cart = await loadCart(req.scope, created.id)
  setCartCookie(res, created.id)

  res.status(201).json({
    cart: cart ? await serializeCart(req.scope, cart, locale) : created,
    locale,
  })
}
