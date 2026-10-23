import { medusaFetch, MedusaApiError } from "@/lib/medusa"
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/lib/config"
import type {
  CollectionProfile,
  CollectionsResponse,
  CivilizationProfile,
  CivilizationsResponse,
  Product,
  ProductListResponse,
  ProductResponse,
} from "@/types"

export type StoreLocale = "ar" | "en"

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

export async function getProducts(params?: {
  limit?: number
  offset?: number
  civilization?: string
  collection?: string
  product_type?: string
  q?: string
  locale?: StoreLocale
  currency_code?: string
}) {
  const endpoint = `/store/threeweeq/products${buildQuery({
    limit: params?.limit ?? 12,
    offset: params?.offset ?? 0,
    civilization: params?.civilization,
    collection: params?.collection,
    product_type: params?.product_type,
    q: params?.q,
    locale: params?.locale ?? DEFAULT_LOCALE,
    currency_code: params?.currency_code ?? DEFAULT_CURRENCY,
  })}`

  try {
    return await medusaFetch<ProductListResponse>(endpoint)
  } catch (error) {
    console.error("Error fetching products:", error)
    return {
      products: [],
      count: 0,
      limit: params?.limit ?? 12,
      offset: params?.offset ?? 0,
      locale: params?.locale ?? DEFAULT_LOCALE,
      currency_code: params?.currency_code ?? DEFAULT_CURRENCY,
      error: "unavailable",
    } satisfies ProductListResponse
  }
}

export async function getProductByHandle(
  handle: string,
  options?: { locale?: StoreLocale; currency_code?: string }
): Promise<Product | null> {
  const endpoint = `/store/threeweeq/products/${encodeURIComponent(
    handle
  )}${buildQuery({
    locale: options?.locale ?? DEFAULT_LOCALE,
    currency_code: options?.currency_code ?? DEFAULT_CURRENCY,
  })}`

  try {
    const data = await medusaFetch<ProductResponse>(endpoint)
    return data.product
  } catch (error) {
    if (error instanceof MedusaApiError && error.status === 404) {
      return null
    }

    console.error("Error fetching product:", error)
    return null
  }
}

export async function getCollections(locale: StoreLocale = "ar") {
  try {
    const data = await medusaFetch<CollectionsResponse>(
      `/store/threeweeq/collections${buildQuery({ locale })}`
    )
    return data.collections
  } catch (error) {
    console.error("Error fetching collections:", error)
    return [] as CollectionProfile[]
  }
}

export async function getCivilizations(locale: StoreLocale = "ar") {
  try {
    const data = await medusaFetch<CivilizationsResponse>(
      `/store/civilizations${buildQuery({ locale })}`
    )
    return data.civilizations
  } catch (error) {
    console.error("Error fetching civilizations:", error)
    return [] as CivilizationProfile[]
  }
}

export async function getRelatedProducts(
  product: Product,
  limit = 4
): Promise<Product[]> {
  const filters = product.collection?.handle
    ? { collection: product.collection.handle }
    : product.civilization?.id
      ? { civilization: product.civilization.id }
      : {}

  try {
    const data = await getProducts({ ...filters, limit: limit + 1 })
    return data.products
      .filter((item) => item.id !== product.id)
      .slice(0, limit)
  } catch (error) {
    console.error("Error fetching related products:", error)
    return []
  }
}
