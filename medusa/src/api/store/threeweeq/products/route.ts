import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  buildCatalogProducts,
  fetchCatalogProducts,
  resolveCurrencyCode,
  resolveLocale,
  resolvePagination,
} from "../../../../lib/threeweeq/catalog"
import { ThreeweeqRepository } from "../../../../lib/threeweeq/repository"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const repository = new ThreeweeqRepository(req.scope)
  const locale = resolveLocale(req)
  const currencyCode = resolveCurrencyCode(req)
  const { limit, offset } = resolvePagination(req)

  const civilizationParam =
    typeof req.query.civilization === "string"
      ? req.query.civilization
      : typeof req.query.civilization_id === "string"
        ? req.query.civilization_id
        : undefined
  const collectionParam =
    typeof req.query.collection === "string"
      ? req.query.collection
      : typeof req.query.collection_id === "string"
        ? req.query.collection_id
        : undefined
  const productTypeParam =
    typeof req.query.product_type === "string"
      ? req.query.product_type
      : typeof req.query.product_type_id === "string"
        ? req.query.product_type_id
        : undefined
  const search =
    typeof req.query.q === "string" ? req.query.q.trim() : undefined

  let civilizationId = civilizationParam
  if (civilizationParam && !civilizationParam.includes("-")) {
    civilizationId =
      (await repository.findCivilizationIdByCode(civilizationParam)) ??
      civilizationParam
  }

  let collectionId = collectionParam
  if (collectionParam) {
    collectionId =
      (await repository.findCollectionIdByHandle(collectionParam)) ??
      collectionParam
  }

  let productTypeId = productTypeParam
  if (productTypeParam) {
    productTypeId =
      (await repository.findProductTypeIdByCode(productTypeParam)) ??
      productTypeParam
  }

  const profiles = await repository.listCatalogProductProfiles({
    locale,
    civilizationId,
    collectionId,
    productTypeId,
    query: search,
    limit,
    offset,
  })

  const products = await buildCatalogProducts(
    req.scope,
    await fetchCatalogProducts(req.scope, {
      productIds: profiles.items.map((item: any) => item.product_id),
    }),
    { locale, currencyCode }
  )
  const productById = new Map(products.map((product) => [product.id, product]))
  const orderedProducts = profiles.items
    .map((item: any) => productById.get(item.product_id))
    .filter(Boolean)

  res.json({
    products: orderedProducts,
    count: profiles.count,
    limit,
    offset,
    locale,
    currency_code: currencyCode,
  })
}
