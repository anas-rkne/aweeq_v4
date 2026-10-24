import {
  fetchProductsRepository,
  fetchProductByHandleRepository,
  type StoreLocale,
} from "@/entities/product/api/product.repository"
import { fetchCollectionsRepository } from "@/entities/collection/api/collection.repository"
import { fetchCivilizationsRepository } from "@/entities/civilization/api/civilization.repository"
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/shared/lib/config"
import type { Product, CollectionProfile, CivilizationProfile, ProductListResponse } from "@/types"

export type { StoreLocale }

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
  const result = await fetchProductsRepository(params)
  if (result.ok) {
    return result.data
  }

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

export async function getProductByHandle(
  handle: string,
  options?: { locale?: StoreLocale; currency_code?: string }
): Promise<Product | null> {
  const result = await fetchProductByHandleRepository(handle, options)
  if (result.ok) {
    return result.data
  }
  return null
}

export async function getCollections(locale: StoreLocale = "ar"): Promise<CollectionProfile[]> {
  const result = await fetchCollectionsRepository(locale)
  if (result.ok) {
    return result.data
  }
  return []
}

export async function getCivilizations(locale: StoreLocale = "ar"): Promise<CivilizationProfile[]> {
  const result = await fetchCivilizationsRepository(locale)
  if (result.ok) {
    return result.data
  }
  return []
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

  const data = await getProducts({ ...filters, limit: limit + 1 })
  return data.products
    .filter((item) => item.id !== product.id)
    .slice(0, limit)
}
