import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  deleteLineItemsWorkflow,
  updateLineItemInCartWorkflow,
} from "@medusajs/medusa/core-flows"
import { resolveLocale } from "../../../../../../lib/threeweeq/catalog"
import {
  assertCartItemRules,
  getCartId,
  loadCart,
  serializeCart,
  setCartCookie,
} from "../../../../../../lib/threeweeq/cart"

type UpdateItemBody = {
  cart_id?: string
  quantity?: number
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as UpdateItemBody
  const locale = resolveLocale(req)
  const cartId = getCartId(req, body)
  const itemId = String(req.params.id ?? "").trim()
  const quantity = Number(body.quantity)

  if (!cartId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "cart_id is required"
    )
  }

  if (!itemId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A line item id is required"
    )
  }

  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "quantity must be a non-negative integer"
    )
  }

  const cart = await loadCart(req.scope, cartId)

  if (!cart) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Cart not found")
  }

  const item = (cart.items ?? []).find((line) => line.id === itemId)

  if (!item?.variant_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Cart line item not found"
    )
  }

  if (quantity === 0) {
    await deleteLineItemsWorkflow(req.scope).run({
      input: { cart_id: cartId, ids: [itemId] },
    })
  } else {
    const otherQuantity = (cart.items ?? [])
      .filter(
        (line) => line.variant_id === item.variant_id && line.id !== itemId
      )
      .reduce((total, line) => total + Number(line.quantity ?? 0), 0)

    await assertCartItemRules(req.scope, {
      cart,
      variantId: item.variant_id,
      requestedQuantity: otherQuantity + quantity,
    })

    await updateLineItemInCartWorkflow(req.scope).run({
      input: {
        cart_id: cartId,
        item_id: itemId,
        update: { quantity },
      },
    })
  }

  const updated = await loadCart(req.scope, cartId)
  setCartCookie(res, cartId)

  res.status(200).json({
    cart: updated
      ? await serializeCart(req.scope, updated, locale)
      : null,
    locale,
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const locale = resolveLocale(req)
  const cartId = getCartId(req)
  const itemId = String(req.params.id ?? "").trim()

  if (!cartId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "cart_id is required"
    )
  }

  if (!itemId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A line item id is required"
    )
  }

  const cart = await loadCart(req.scope, cartId)

  if (!cart) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Cart not found")
  }

  if (!(cart.items ?? []).some((item) => item.id === itemId)) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Cart line item not found"
    )
  }

  await deleteLineItemsWorkflow(req.scope).run({
    input: { cart_id: cartId, ids: [itemId] },
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
