import type { MedusaContainer } from "@medusajs/framework/types"
import type { MedusaRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  ThreeweeqRepository,
  type Locale,
} from "./repository"

export const CATALOG_PRODUCT_FIELDS = [
  "id",
  "title",
  "handle",
  "description",
  "thumbnail",
  "status",
  "collection_id",
  "metadata",
  "created_at",
  "collection.id",
  "collection.title",
  "collection.handle",
  "images.id",
  "images.url",
  "images.rank",
  "variants.id",
  "variants.title",
  "variants.sku",
  "variants.manage_inventory",
  "variants.allow_backorder",
  "variants.metadata",
  "variants.prices.amount",
  "variants.prices.currency_code",
  "variants.prices.min_quantity",
  "variants.prices.max_quantity",
  "variants.prices.price_list_id",
]

type Price = {
  amount?: number | string | null
  currency_code?: string | null
  min_quantity?: number | null
  max_quantity?: number | null
  price_list_id?: string | null
}

export function resolveLocale(req: MedusaRequest): Locale {
  const queryLocale =
    typeof req.query.locale === "string" ? req.query.locale : undefined
  const headerValue = req.headers["x-locale"]
  const headerLocale = Array.isArray(headerValue)
    ? headerValue[0]
    : headerValue
  const value = queryLocale ?? headerLocale

  return typeof value === "string" && value.toLowerCase().startsWith("en")
    ? "en"
    : "ar"
}

export function resolveCurrencyCode(
  req: MedusaRequest,
  fallback = "aed"
): string {
  const queryCurrency =
    typeof req.query.currency_code === "string"
      ? req.query.currency_code
      : undefined
  const headerValue = req.headers["x-currency-code"]
  const headerCurrency = Array.isArray(headerValue)
    ? headerValue[0]
    : headerValue
  const value = (queryCurrency ?? headerCurrency ?? fallback)
    .trim()
    .toLowerCase()

  return /^[a-z]{3}$/.test(value) ? value : fallback
}

export function resolvePagination(req: MedusaRequest) {
  const rawLimit =
    typeof req.query.limit === "string" ? Number(req.query.limit) : 24
  const rawOffset =
    typeof req.query.offset === "string" ? Number(req.query.offset) : 0

  return {
    limit: Number.isFinite(rawLimit)
      ? Math.min(100, Math.max(1, Math.trunc(rawLimit)))
      : 24,
    offset: Number.isFinite(rawOffset)
      ? Math.max(0, Math.trunc(rawOffset))
      : 0,
  }
}

export async function fetchCatalogProducts(
  container: MedusaContainer,
  input: {
    productIds?: string[]
    handle?: string
    pagination?: { skip: number; take: number }
  }
) {
  if (input.productIds && !input.productIds.length) {
    return []
  }

  const query = container.resolve<any>(ContainerRegistrationKeys.QUERY)
  const filters: Record<string, unknown> = {
    status: "published",
  }

  if (input.productIds) {
    filters.id = input.productIds
  }

  if (input.handle) {
    filters.handle = input.handle
  }

  const { data } = await query.graph({
    entity: "product",
    fields: CATALOG_PRODUCT_FIELDS,
    filters,
    ...(input.pagination ? { pagination: input.pagination } : {}),
  })

  return data ?? []
}

function selectPrice(prices: Price[] | undefined, currencyCode: string) {
  const candidates = (prices ?? []).filter(
    (price) =>
      String(price.currency_code ?? "").toLowerCase() === currencyCode
  )

  if (!candidates.length) {
    return null
  }

  const sorted = [...candidates].sort((left, right) => {
    const leftList = left.price_list_id ? 1 : 0
    const rightList = right.price_list_id ? 1 : 0

    if (leftList !== rightList) {
      return leftList - rightList
    }

    return Number(left.min_quantity ?? 0) - Number(right.min_quantity ?? 0)
  })

  const selected = sorted[0]

  return {
    amount: Number(selected.amount ?? 0),
    currency_code: currencyCode,
    min_quantity: Number(selected.min_quantity ?? 1),
    max_quantity:
      selected.max_quantity == null ? null : Number(selected.max_quantity),
  }
}

function buildPriceRange(
  variants: Array<{ price: { amount: number } | null }>
) {
  const amounts = variants
    .map((variant) => variant.price?.amount)
    .filter((amount): amount is number => typeof amount === "number")

  if (!amounts.length) {
    return null
  }

  return {
    min: Math.min(...amounts),
    max: Math.max(...amounts),
  }
}

export async function buildCatalogProducts(
  container: MedusaContainer,
  products: any[],
  input: { locale: Locale; currencyCode: string }
) {
  if (!products.length) {
    return []
  }

  const repository = new ThreeweeqRepository(container)
  const productIds = products.map((product) => product.id)
  const profiles = (await repository.getCatalogProductProfiles(
    productIds,
    input.locale
  )) as Array<Record<string, any>>
  const profileByProduct = new Map<string, any>(
    profiles.map((profile: any) => [profile.product_id, profile])
  )
  const visibleProducts = products.filter((product) =>
    profileByProduct.has(product.id)
  )

  if (!visibleProducts.length) {
    return []
  }

  const visibleProductIds = visibleProducts.map((product) => product.id)
  const variantIds = visibleProducts.flatMap((product) =>
    (product.variants ?? []).map((variant: any) => variant.id)
  )
  const variantProfiles = (await repository.getVariantProfiles(
    variantIds
  )) as Array<Record<string, any>>
  const variantProfileByVariant = new Map<string, any>(
    variantProfiles.map((profile: any) => [profile.variant_id, profile])
  )
  const media = (await repository.getCatalogProductMedia(
    visibleProductIds,
    input.locale
  )) as Array<Record<string, any>>
  const mediaByProduct: Record<string, any[]> = {}
  for (const item of media) {
    mediaByProduct[item.product_id] = [
      ...(mediaByProduct[item.product_id] ?? []),
      item,
    ]
  }
  const serialAvailability = (await repository.getSerialAvailability(
    variantIds
  )) as Map<string, number>

  return visibleProducts.map((product) => {
    const profile = profileByProduct.get(product.id)
    const productMedia = mediaByProduct[product.id] ?? []
    const heroMedia =
      productMedia.find((item) => item.role === "hero") ?? productMedia[0]

    const variants = (product.variants ?? []).map((variant: any) => {
      const variantProfile = variantProfileByVariant.get(variant.id)
      const price = selectPrice(variant.prices, input.currencyCode)
      const isSerialized = Boolean(variantProfile?.is_serialized)
      const availableSerialUnits = isSerialized
        ? (serialAvailability.get(variant.id) ?? 0)
        : null

      return {
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        size_ml: variantProfile?.size_ml ?? null,
        concentration: variantProfile?.concentration ?? null,
        packaging: variantProfile?.packaging ?? null,
        is_serialized: isSerialized,
        edition_size: variantProfile?.edition_size ?? null,
        available_serial_units: availableSerialUnits,
        in_stock:
          availableSerialUnits == null ? true : availableSerialUnits > 0,
        manage_inventory: Boolean(variant.manage_inventory),
        allow_backorder: Boolean(variant.allow_backorder),
        price,
        metadata: {
          ...(variant.metadata ?? {}),
          ...(variantProfile?.metadata ?? {}),
        },
      }
    })

    return {
      id: product.id,
      handle: product.handle,
      title: profile?.title ?? product.title,
      subtitle: profile?.subtitle ?? null,
      short_description: profile?.short_description ?? null,
      description: profile?.description ?? product.description ?? null,
      story: profile?.story ?? null,
      ingredients: profile?.ingredients ?? null,
      ritual: profile?.ritual ?? null,
      seo_title: profile?.seo_title ?? null,
      seo_description: profile?.seo_description ?? null,
      status: product.status,
      thumbnail: heroMedia?.url ?? product.thumbnail ?? null,
      media: productMedia,
      images: product.images ?? [],
      civilization: profile?.civilization_id
        ? {
            id: profile.civilization_id,
            name: profile.civilization_name ?? null,
            subtitle: profile.civilization_subtitle ?? null,
          }
        : null,
      collection: profile?.collection_id
        ? {
            id: profile.collection_id,
            handle: profile.collection_handle ?? null,
            title:
              profile.collection_title ??
              product.collection?.title ??
              null,
            subtitle: profile.collection_subtitle ?? null,
          }
        : product.collection
          ? {
              id: product.collection.id,
              handle: product.collection.handle ?? null,
              title: product.collection.title ?? null,
              subtitle: null,
            }
          : null,
      product_type: profile?.product_type_id
        ? {
            id: profile.product_type_id,
            code: profile.product_type_code ?? null,
            name:
              input.locale === "en"
                ? profile.product_type_name_en
                : profile.product_type_name_ar,
          }
        : null,
      is_limited: Boolean(profile?.is_limited),
      is_serialized: Boolean(profile?.is_serialized),
      edition_size: profile?.edition_size ?? null,
      max_per_customer: profile?.max_per_customer ?? null,
      olfactory_pyramid: profile?.olfactory_pyramid ?? {},
      specifications: profile?.specifications ?? {},
      launch_at: profile?.launch_at ?? null,
      metadata: {
        ...(product.metadata ?? {}),
        ...(profile?.metadata ?? {}),
      },
      variants,
      price_range: buildPriceRange(variants),
      default_variant:
        variants.find((variant: any) => variant.in_stock) ??
        variants[0] ??
        null,
    }
  })
}
