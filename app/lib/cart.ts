import { DEFAULT_LOCALE } from "./config"
import { MedusaApiError, medusaFetch } from "./medusa-fetch"
import type { Cart, CartResponse } from "@/types"

const CART_STORAGE_KEY = "threeweeq_cart_id"

export function readStoredCartId() {
  if (typeof window === "undefined") {
    return null
  }

  try {
    return window.localStorage.getItem(CART_STORAGE_KEY)
  } catch {
    return null
  }
}

export function storeCartId(cartId: string) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(CART_STORAGE_KEY, cartId)
  } catch {}
}

export function forgetCartId() {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.removeItem(CART_STORAGE_KEY)
  } catch {}
}

function cartQuery(cartId?: string | null) {
  const params = new URLSearchParams({ locale: DEFAULT_LOCALE })

  if (cartId) {
    params.set("cart_id", cartId)
  }

  return params.toString()
}

export async function fetchCart(cartId?: string | null) {
  return medusaFetch<CartResponse>(
    `/store/threeweeq/cart?${cartQuery(cartId)}`
  )
}

export async function createCart(cartId?: string | null) {
  return medusaFetch<CartResponse>("/store/threeweeq/cart", {
    method: "POST",
    body: JSON.stringify(cartId ? { cart_id: cartId } : {}),
  })
}

export async function addCartItem(
  cartId: string,
  variantId: string,
  quantity: number
) {
  return medusaFetch<CartResponse>("/store/threeweeq/cart/items", {
    method: "POST",
    body: JSON.stringify({
      cart_id: cartId,
      variant_id: variantId,
      quantity,
    }),
  })
}

export async function updateCartItem(
  cartId: string,
  itemId: string,
  quantity: number
) {
  return medusaFetch<CartResponse>(
    `/store/threeweeq/cart/items/${encodeURIComponent(itemId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ cart_id: cartId, quantity }),
    }
  )
}

export async function removeCartItem(cartId: string, itemId: string) {
  return medusaFetch<CartResponse>(
    `/store/threeweeq/cart/items/${encodeURIComponent(
      itemId
    )}?cart_id=${encodeURIComponent(cartId)}&locale=${DEFAULT_LOCALE}`,
    { method: "DELETE" }
  )
}

export function cartErrorMessage(error: unknown) {
  if (!(error instanceof MedusaApiError)) {
    return "تعذر الاتصال بالمتجر. تأكد من تشغيل الخادم ثم حاول مرة أخرى."
  }

  const message = error.message.replace(
    /^Medusa API error \(\d+\):\s*/,
    ""
  )

  const limit = message.match(/purchase limit for this item is (\d+)/i)
  if (limit) {
    return `الحد الأقصى للشراء من هذه القطعة هو ${limit[1]} قطعة.`
  }

  if (
    /requested quantity is no longer available/i.test(message) ||
    /insufficient/i.test(message)
  ) {
    return "الكمية المطلوبة لم تعد متاحة. جرّب كمية أقل."
  }

  if (/limited drop is not open/i.test(message)) {
    return "هذا الإصدار المحدود غير متاح للشراء حالياً."
  }

  if (/cart has already been completed/i.test(message)) {
    return "انتهت صلاحية هذه السلة. أعد إضافة القطعة من جديد."
  }

  if (/cart not found/i.test(message)) {
    return "تعذر العثور على السلة. أعد المحاولة."
  }

  if (/variant is required|not available for the 3weeq store/i.test(message)) {
    return "هذه القطعة غير متاحة للشراء حالياً."
  }

  if (error.status === 401 || error.status === 403) {
    return "تعذر التحقق من صلاحية المتجر. راجع إعدادات مفتاح Medusa."
  }

  return "تعذر تحديث السلة. حاول مرة أخرى."
}

export function findCartItem(cart: Cart | null, itemId: string) {
  return cart?.items.find((item) => item.id === itemId) ?? null
}

export function cartItemLimit(item: Cart["items"][number]) {
  const limits = [
    item.max_per_customer,
    item.product_profile?.max_per_customer,
    item.available_serial_units,
  ].filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value)
  )

  return limits.length > 0 ? Math.max(1, Math.min(...limits)) : 10
}
