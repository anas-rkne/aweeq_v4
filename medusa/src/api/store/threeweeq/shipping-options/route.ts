import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { listShippingOptionsForCartWithPricingWorkflow } from "@medusajs/medusa/core-flows"
import { getCartId, loadCart } from "../../../../lib/threeweeq/cart"

function unwrap(value: any) {
  return value?.result ?? value
}

function toAmount(value: unknown) {
  if (value === undefined || value === null) {
    return null
  }

  if (typeof value === "object" && "numeric" in (value as object)) {
    return Number((value as { numeric: number }).numeric)
  }

  return Number(value)
}

function priceOf(option: any) {
  return toAmount(
    option?.amount ??
      option?.calculated_price?.calculated_amount ??
      option?.prices?.[0]?.amount
  )
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cartId = getCartId(req)

  if (!cartId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "cart_id is required"
    )
  }

  const cart = await loadCart(req.scope, cartId)

  if (!cart) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Cart not found")
  }

  const result = await listShippingOptionsForCartWithPricingWorkflow(
    req.scope
  ).run({
    input: { cart_id: cartId },
  })
  const options = unwrap(result) as any[]

  if (!Array.isArray(options)) {
    res.status(200).json({ shipping_options: [] })
    return
  }

  res.status(200).json({
    shipping_options: options.map((option) => ({
      id: option.id,
      name: option.name,
      price_type: option.price_type ?? null,
      provider_id: option.provider_id ?? null,
      amount: priceOf(option),
      currency_code:
        option.currency_code ??
        option.prices?.[0]?.currency_code ??
        cart.currency_code ??
        null,
    })),
  })
}
