import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { addToCartWorkflow } from "@medusajs/medusa/core-flows"
import { resolveLocale } from "../../../../../lib/threeweeq/catalog"
import {
  assertCartItemRules,
  getCartId,
  loadCart,
  serializeCart,
  setCartCookie,
} from "../../../../../lib/threeweeq/cart"

type AddItemBody = {
  cart_id?: string
  variant_id?: string
  quantity?: number
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as AddItemBody
  const locale = resolveLocale(req)
  const cartId = getCartId(req, body)
  const variantId = body.variant_id?.trim()
  const quantity = Number(body.quantity ?? 1)

  if (!cartId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "cart_id is required. Create a cart first."
    )
  }

  if (!variantId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "variant_id is required"
    )
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "quantity must be a positive integer"
    )
  }

  const cart = await loadCart(req.scope, cartId)

  if (!cart) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Cart not found")
  }

  if (cart.completed_at) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "This cart has already been completed"
    )
  }

  const existingQuantity = (cart.items ?? [])
    .filter((item) => item.variant_id === variantId)
    .reduce((total, item) => total + Number(item.quantity ?? 0), 0)

  await assertCartItemRules(req.scope, {
    cart,
    variantId,
    requestedQuantity: existingQuantity + quantity,
  })

  await addToCartWorkflow(req.scope).run({
    input: {
      cart_id: cartId,
      items: [{ variant_id: variantId, quantity }],
    },
  })

  const updated = await loadCart(req.scope, cartId)
  setCartCookie(res, cartId)

  res.status(200).json({
    cart: updated
      ? await serializeCart(req.scope, updated, locale)
      : null,
    locale,
  })
}
