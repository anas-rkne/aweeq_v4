import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  listShippingOptionsForCartWithPricingWorkflow,
  updateCartWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  getCartId,
  loadCart,
  serializeCart,
  setCartCookie,
  type CartLike,
} from "../../../../../lib/threeweeq/cart"
import type { Locale } from "../../../../../lib/threeweeq/repository"

type PrepareCheckoutBody = {
  cart_id?: string
  email?: string | null
  shipping_address?: Record<string, unknown> | null
  billing_address?: Record<string, unknown> | null
  locale?: Locale | null
  metadata?: Record<string, unknown> | null
  gift_message?: string | null
  packaging_code?: string | null
  drop_id?: string | null
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function resolveLocale(value: unknown): Locale {
  return typeof value === "string" && value.toLowerCase().startsWith("en")
    ? "en"
    : "ar"
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

function shapeOption(option: any) {
  return {
    id: String(option.id),
    name: String(option.name ?? ""),
    price_type: option.price_type ?? null,
    provider_id: option.provider_id ?? null,
    amount: toAmount(
      option.amount ??
        option.calculated_price?.calculated_amount ??
        option.prices?.[0]?.amount
    ),
    currency_code:
      option.currency_code ??
      option.calculated_price?.currency_code ??
      option.prices?.[0]?.currency_code ??
      null,
  }
}

/**
 * Step 1 of checkout: persist email + address on the cart, *then* ask Medusa
 * for shipping options. Listing options before the address exists is why the
 * old flow could return an empty list for UAE addresses.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as PrepareCheckoutBody
  const cartId = getCartId(req, body)

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

  if (cart.completed_at) {
    res.status(409).json({
      code: "cart_completed",
      message: "This cart has already been completed",
    })
    return
  }

  const email = body.email?.trim() || cart.email || ""
  if (!EMAIL_PATTERN.test(email)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A valid email is required before shipping options"
    )
  }

  const address = body.shipping_address
  if (!address || typeof address !== "object") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "shipping_address is required"
    )
  }

  const countryCode = String(address.country_code ?? "").toLowerCase()
  if (countryCode !== "ae") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Shipping is currently available inside the UAE only"
    )
  }

  const required = ["first_name", "last_name", "address_1", "city"] as const
  for (const field of required) {
    if (!String(address[field] ?? "").trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `shipping_address.${field} is required`
      )
    }
  }

  const locale = resolveLocale(body.locale ?? cart.metadata?.locale)
  const metadata: Record<string, unknown> = {
    ...(cart.metadata ?? {}),
    ...(body.metadata ?? {}),
    locale,
  }

  if (body.drop_id !== undefined) metadata.drop_id = body.drop_id
  if (body.gift_message !== undefined) {
    metadata.gift_message = body.gift_message
  }
  if (body.packaging_code !== undefined) {
    metadata.packaging_code = body.packaging_code
  }

  await updateCartWorkflow(req.scope).run({
    input: {
      id: cartId,
      email,
      metadata,
      locale,
      shipping_address: address,
      ...(body.billing_address ? { billing_address: body.billing_address } : {}),
    } as any,
  })

  const result = await listShippingOptionsForCartWithPricingWorkflow(
    req.scope
  ).run({ input: { cart_id: cartId } })
  const rawOptions = (result?.result ?? result) as any[]
  const shippingOptions = Array.isArray(rawOptions)
    ? rawOptions.map(shapeOption)
    : []

  setCartCookie(res, cartId)

  const refreshed = (await loadCart(req.scope, cartId)) as CartLike

  res.json({
    cart_id: cartId,
    locale,
    shipping_options: shippingOptions,
    cart: await serializeCart(req.scope, refreshed, locale),
  })
}
