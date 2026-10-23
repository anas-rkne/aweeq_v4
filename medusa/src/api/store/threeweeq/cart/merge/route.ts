import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  addToCartWorkflow,
  updateCartWorkflow,
} from "@medusajs/medusa/core-flows"
import { resolveLocale } from "../../../../../lib/threeweeq/catalog"
import {
  assertCartItemRules,
  getCartId,
  getOrCreateCartId,
  loadCart,
  serializeCart,
  setCartCookie,
} from "../../../../../lib/threeweeq/cart"

type MergeCartBody = {
  source_cart_id?: string
  target_cart_id?: string
  customer_id?: string
  email?: string
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as MergeCartBody
  const locale = resolveLocale(req)
  const sourceId = body.source_cart_id ?? getCartId(req, body)
  const actorId = (req as any).auth_context?.actor_id as string | undefined
  const customerId = actorId ?? body.customer_id

  if (!sourceId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A source cart is required"
    )
  }

  const source = await loadCart(req.scope, sourceId)

  if (!source) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Source cart not found")
  }

  if (source.completed_at) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The source cart has already been completed"
    )
  }

  const targetId =
    body.target_cart_id ??
    (customerId
      ? await getOrCreateCartId(req.scope, {
          customerId,
          locale,
        })
      : null)

  if (!targetId || targetId === source.id) {
    if (customerId || body.email) {
      await updateCartWorkflow(req.scope).run({
        input: {
          id: source.id,
          ...(customerId ? { customer_id: customerId } : {}),
          ...(body.email ? { email: body.email } : {}),
        },
      })
    }

    const updated = await loadCart(req.scope, source.id)
    setCartCookie(res, source.id)

    res.status(200).json({
      cart: updated
        ? await serializeCart(req.scope, updated, locale)
        : null,
      merged: false,
      locale,
    })
    return
  }

  const target = await loadCart(req.scope, targetId)

  if (!target) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Target cart not found")
  }

  if (target.completed_at) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The target cart has already been completed"
    )
  }

  const targetQuantities = (target.items ?? []).reduce<
    Record<string, number>
  >((result, item) => {
    if (item.variant_id) {
      result[item.variant_id] =
        (result[item.variant_id] ?? 0) + Number(item.quantity ?? 0)
    }
    return result
  }, {})

  for (const item of source.items ?? []) {
    if (!item.variant_id || Number(item.quantity) <= 0) {
      continue
    }

    await assertCartItemRules(req.scope, {
      cart: target,
      variantId: item.variant_id,
      requestedQuantity:
        (targetQuantities[item.variant_id] ?? 0) + Number(item.quantity),
    })

    await addToCartWorkflow(req.scope).run({
      input: {
        cart_id: target.id,
        items: [
          {
            variant_id: item.variant_id,
            quantity: Number(item.quantity),
          },
        ],
      },
    })

    targetQuantities[item.variant_id] =
      (targetQuantities[item.variant_id] ?? 0) + Number(item.quantity)
  }

  const updated = await loadCart(req.scope, target.id)
  setCartCookie(res, target.id)

  res.status(200).json({
    cart: updated
      ? await serializeCart(req.scope, updated, locale)
      : null,
    merged: true,
    locale,
  })
}
