import "server-only"
import { medusaFetch, MedusaApiError } from "@/shared/lib/medusa"
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/shared/lib/config"
import type { Product, ProductListResponse, ProductResponse } from "@/types"

export type StoreLocale = "ar" | "en"

export type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E; status?: number }

function buildQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.append(key, String(value))
    }
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}

export async function fetchProductsRepository(params?: {
  limit?: number
  offset?: number
  civilization?: string
  collection?: string
  product_type?: string
  q?: string
  order?: "newest" | "price_asc" | "price_desc"
  locale?: StoreLocale
  currency_code?: string
}): Promise<Result<ProductListResponse>> {
  const endpoint = `/store/threeweeq/products${buildQuery({
    limit: params?.limit ?? 12,
    offset: params?.offset ?? 0,
    civilization: params?.civilization,
    collection: params?.collection,
    product_type: params?.product_type,
    q: params?.q,
    order: params?.order,
    locale: params?.locale ?? DEFAULT_LOCALE,
    currency_code: params?.currency_code ?? DEFAULT_CURRENCY,
  })}`

  try {
    const data = await medusaFetch<ProductListResponse>(endpoint, {
      next: { tags: ["products"], revalidate: 300 },
    })
    return { ok: true, data }
  } catch (error) {
    const status = error instanceof MedusaApiError ? error.status : 500
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unavailable",
      status,
    }
  }
}

export async function fetchProductByHandleRepository(
  handle: string,
  options?: { locale?: StoreLocale; currency_code?: string }
): Promise<Result<Product | null>> {
  const endpoint = `/store/threeweeq/products/${encodeURIComponent(
    handle
  )}${buildQuery({
    locale: options?.locale ?? DEFAULT_LOCALE,
    currency_code: options?.currency_code ?? DEFAULT_CURRENCY,
  })}`

  try {
    const data = await medusaFetch<ProductResponse>(endpoint, {
      next: { tags: [`product:${handle}`, "products"], revalidate: 600 },
    })
    return { ok: true, data: data.product }
  } catch (error) {
    if (error instanceof MedusaApiError && error.status === 404) {
      return { ok: true, data: null }
    }
    const status = error instanceof MedusaApiError ? error.status : 500
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unavailable",
      status,
    }
  }
}
