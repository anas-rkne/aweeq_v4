import type { MedusaContainer } from "@medusajs/framework/types"
import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import {
  ThreeweeqRepository,
  type Locale,
} from "./repository"

export const CART_COOKIE = "threeweeq_cart_id"

export type CartLike = {
  id: string
  email?: string | null
  customer_id?: string | null
  region_id?: string | null
  currency_code?: string | null
  completed_at?: string | null
  metadata?: Record<string, unknown> | null
  items?: Array<{
    id: string
    variant_id?: string | null
    product_id?: string | null
    quantity: number
    unit_price?: number | null
    total?: number | null
    title?: string | null
  }>
  [key: string]: unknown
}

export function readCookie(req: MedusaRequest, name: string) {
  const cookieHeader = req.headers.cookie
  if (!cookieHeader) {
    return null
  }

  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=")
    if (rawKey !== name) {
      continue
    }

    const value = rawValue.join("=")
    return value ? decodeURIComponent(value) : null
  }

  return null
}

export function getCartId(
  req: MedusaRequest,
  body?: Record<string, unknown> | null
) {
  const queryCartId =
    typeof req.query.cart_id === "string" ? req.query.cart_id : undefined
  const headerValue = req.headers["x-cart-id"]
  const headerCartId = Array.isArray(headerValue)
    ? headerValue[0]
    : headerValue
  const bodyCartId =
    typeof body?.cart_id === "string" ? body.cart_id : undefined

  return (
    bodyCartId?.trim() ||
    queryCartId?.trim() ||
    headerCartId?.trim() ||
    readCookie(req, CART_COOKIE)
  )
}

export function setCartCookie(res: MedusaResponse, cartId: string) {
  res.cookie(CART_COOKIE, cartId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  })
  res.setHeader("x-cart-id", cartId)
}

export function clearCartCookie(res: MedusaResponse) {
  res.clearCookie(CART_COOKIE, { path: "/" })
}

export function extractCart(result: any): CartLike | null {
  const output = result?.result ?? result

  if (!output) {
    return null
  }

  if (output.cart?.id) {
    return output.cart
  }

  if (output.id) {
    return output
  }

  return null
}

export async function loadCart(
  container: MedusaContainer,
  cartId: string
): Promise<CartLike | null> {
  const query = container.resolve<any>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "email",
      "customer_id",
      "region_id",
      "currency_code",
      "completed_at",
      "metadata",
      "created_at",
      "updated_at",
      "subtotal",
      "discount_total",
      "shipping_total",
      "tax_total",
      "total",
      "items.id",
      "items.variant_id",
      "items.product_id",
      "items.quantity",
      "items.unit_price",
      "items.total",
      "items.title",
      "items.metadata",
    ],
    filters: { id: cartId },
  })

  return data?.[0] ?? null
}

export async function serializeCart(
  container: MedusaContainer,
  cart: CartLike,
  locale: Locale
) {
  const repository = new ThreeweeqRepository(container)
  const items = cart.items ?? []
  const variantIds = Array.from(
    new Set(
      items
        .map((item) => item.variant_id)
        .filter((variantId): variantId is string => Boolean(variantId))
    )
  )
  const variantProfiles = await repository.getVariantProfiles(variantIds)
  const variantProfileByVariant = new Map(
    variantProfiles.map((profile: any) => [profile.variant_id, profile])
  )
  const productIds = Array.from(
    new Set(
      variantProfiles
        .map((profile: any) => profile.product_id)
        .filter(Boolean)
    )
  )
  const productProfiles = await repository.getProductProfiles(productIds)
  const productProfileByProduct = new Map(
    productProfiles.map((profile: any) => [profile.product_id, profile])
  )
  const serialAvailability = await repository.getSerialAvailability(variantIds)

  const enrichedItems = items.map((item) => {
    const variantProfile = item.variant_id
      ? variantProfileByVariant.get(item.variant_id)
      : null
    const productProfile = variantProfile?.product_id
      ? productProfileByProduct.get(variantProfile.product_id)
      : null
    const availableSerialUnits = variantProfile?.is_serialized
      ? (serialAvailability.get(item.variant_id as string) ?? 0)
      : null

    return {
      ...item,
      is_serialized: Boolean(variantProfile?.is_serialized),
      available_serial_units: availableSerialUnits,
      in_stock:
        availableSerialUnits == null
          ? true
          : availableSerialUnits >= Number(item.quantity ?? 0),
      max_per_customer: productProfile?.max_per_customer ?? null,
      variant_profile: variantProfile ?? null,
      product_profile: productProfile ?? null,
    }
  })

  const warnings: Array<Record<string, unknown>> = []

  for (const item of enrichedItems) {
    if (!item.in_stock) {
      warnings.push({
        code: "insufficient_serialized_stock",
        item_id: item.id,
        variant_id: item.variant_id,
        message: "The requested quantity is no longer available",
      })
    }
  }

  return {
    ...cart,
    items: enrichedItems,
    item_count: enrichedItems.reduce(
      (total, item) => total + Number(item.quantity ?? 0),
      0
    ),
    warnings,
    locale,
  }
}

export async function getOrCreateCartId(
  container: MedusaContainer,
  input: {
    cartId?: string | null
    customerId?: string | null
    locale: Locale
  }
) {
  if (input.cartId) {
    const cart = await loadCart(container, input.cartId)
    if (cart && !cart.completed_at) {
      return cart.id
    }
  }

  if (!input.customerId) {
    return null
  }

  const query = container.resolve<any>(ContainerRegistrationKeys.QUERY)
  const { data: carts } = await query.graph({
    entity: "cart",
    fields: ["id", "completed_at"],
    filters: { customer_id: input.customerId },
    pagination: { skip: 0, take: 10 },
  })

  const active = (carts ?? []).find((cart: any) => !cart.completed_at)
  return active?.id ?? null
}

export async function resolveRegionId(
  container: MedusaContainer,
  requestedRegionId?: string | null
) {
  const query = container.resolve<any>(ContainerRegistrationKeys.QUERY)

  if (requestedRegionId) {
    return requestedRegionId
  }

  const { data } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
    pagination: { skip: 0, take: 1 },
  })

  const region = data?.[0]
  if (!region?.id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No region is configured. Create a region before starting a cart."
    )
  }

  return region.id
}

export async function resolveSalesChannelId(
  container: MedusaContainer,
  requestedSalesChannelId?: string | null
) {
  if (requestedSalesChannelId) {
    return requestedSalesChannelId
  }

  const query = container.resolve<any>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
    pagination: { skip: 0, take: 1 },
  })

  return data?.[0]?.id ?? null
}

function isDropOpen(drop: any) {
  const now = Date.now()
  const opensAt = drop.opens_at ? new Date(drop.opens_at).getTime() : null
  const closesAt = drop.closes_at ? new Date(drop.closes_at).getTime() : null

  if (opensAt != null && opensAt > now) {
    return false
  }

  if (closesAt != null && closesAt <= now) {
    return false
  }

  return true
}

export async function assertCartItemRules(
  container: MedusaContainer,
  input: {
    cart: CartLike
    variantId: string
    requestedQuantity: number
  }
) {
  const repository = new ThreeweeqRepository(container)
  const variantProfiles = await repository.getVariantProfiles([
    input.variantId,
  ])
  const variantProfile = variantProfiles[0]

  if (!variantProfile) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "This product variant is not available for the 3weeq store"
    )
  }

  const productProfiles = await repository.getProductProfiles([
    variantProfile.product_id,
  ])
  const productProfile = productProfiles[0]
  const drop = await repository.findDropForVariants([input.variantId])
  const dropVariantIds = drop
    ? (await repository.getDropAllocations(drop.id)).map(
        (allocation: any) => allocation.variant_id
      )
    : []

  let limit =
    productProfile?.max_per_customer == null
      ? null
      : Number(productProfile.max_per_customer)

  if (drop && dropVariantIds.includes(input.variantId)) {
    if (!isDropOpen(drop)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "This limited drop is not open for purchases"
      )
    }

    const dropLimit = Number(drop.per_customer_limit ?? 0)
    if (dropLimit > 0) {
      limit = limit == null ? dropLimit : Math.min(limit, dropLimit)
    }

    const allocations = await repository.getDropAllocations(drop.id)
    const allocation = allocations.find(
      (row: any) => row.variant_id === input.variantId
    )

    if (allocation) {
      const available =
        Number(allocation.quantity) -
        Number(allocation.reserved_quantity) -
        Number(allocation.sold_quantity)

      if (input.requestedQuantity > available) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "The requested quantity exceeds the remaining drop allocation"
        )
      }
    }
  }

  if (limit != null) {
    const purchased = await repository.countPurchasedQuantities({
      customerId: input.cart.customer_id,
      email: input.cart.email,
      variantIds: [input.variantId],
    })

    if (
      (purchased.get(input.variantId) ?? 0) + input.requestedQuantity >
      limit
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `The purchase limit for this item is ${limit}`
      )
    }
  }

  if (variantProfile.is_serialized) {
    const availability = await repository.getSerialAvailability([
      input.variantId,
    ])
    const available = availability.get(input.variantId) ?? 0

    if (input.requestedQuantity > available) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The requested quantity is no longer available"
      )
    }
  }
}
