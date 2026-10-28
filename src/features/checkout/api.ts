import { medusaFetch } from "@/lib/medusa-fetch"

export type ShippingOption = {
  id: string
  name: string
  price_type: string | null
  provider_id: string | null
  amount: number | null
  currency_code: string | null
}

export type CheckoutInitInput = {
  cart_id: string
  email: string
  shipping_address: {
    first_name: string
    last_name: string
    address_1: string
    city: string
    country_code: string
    postal_code?: string
    phone?: string
  }
  billing_address?: Record<string, unknown>
  shipping_option_id: string
  provider_id?: string
  locale?: string
}

export type CheckoutInitResponse = {
  cart_id: string
  payment_collection_id: string
  payment_session_id: string
  provider_id: string | null
  client_secret: string | null
  amount: number | null
  currency_code: string | null
  authorized: boolean
  cart: unknown
}

export type CheckoutCompleteInput = {
  cart_id: string
  payment_session_id: string
  provider_id?: string
  locale?: string
  idempotency_key?: string
}

export type CheckoutCompleteResponse = {
  order_id: string
  order: unknown
  payment_id: string
  payment_captured: boolean
  already_completed?: boolean
}

export type GuestOrderItem = {
  id: string
  title: string | null
  variant_title: string | null
  thumbnail: string | null
  quantity: number
  unit_price: number | null
  total: number | null
}

export type GuestOrder = {
  id: string
  display_id: number | null
  status: string
  currency_code: string
  subtotal: number
  total: number
  tax_total: number
  shipping_total: number
  created_at: string
  shipping_address: Record<string, unknown> | null
  items: GuestOrderItem[]
}

export async function fetchShippingOptions(
  cartId: string,
  locale: string
): Promise<ShippingOption[]> {
  const response = await medusaFetch<{ shipping_options: ShippingOption[] }>(
    `/store/threeweeq/shipping-options?cart_id=${encodeURIComponent(
      cartId
    )}&locale=${encodeURIComponent(locale)}`
  )

  return response.shipping_options ?? []
}

export type CheckoutPrepareInput = {
  cart_id: string
  email: string
  shipping_address: {
    first_name: string
    last_name: string
    address_1: string
    city: string
    country_code: string
    postal_code?: string
    phone?: string
  }
  billing_address?: Record<string, unknown>
  locale?: string
}

export type CheckoutPrepareResponse = {
  cart_id: string
  locale: string
  shipping_options: ShippingOption[]
  cart: unknown
}

export async function prepareCheckout(
  input: CheckoutPrepareInput
): Promise<CheckoutPrepareResponse> {
  return medusaFetch<CheckoutPrepareResponse>(
    "/store/threeweeq/checkout/prepare",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  )
}

export async function initCheckout(
  input: CheckoutInitInput
): Promise<CheckoutInitResponse> {
  return medusaFetch<CheckoutInitResponse>("/store/threeweeq/checkout", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function completeCheckout(
  input: CheckoutCompleteInput
): Promise<CheckoutCompleteResponse> {
  return medusaFetch<CheckoutCompleteResponse>("/store/checkout/complete", {
    method: "POST",
    body: JSON.stringify(input),
    headers: input.idempotency_key
      ? { "x-idempotency-key": input.idempotency_key }
      : undefined,
  })
}

export async function fetchGuestOrder(
  orderId: string,
  email: string
): Promise<{ order: GuestOrder }> {
  return medusaFetch<{ order: GuestOrder }>(
    `/store/threeweeq/orders/${encodeURIComponent(
      orderId
    )}?email=${encodeURIComponent(email)}`
  )
}
