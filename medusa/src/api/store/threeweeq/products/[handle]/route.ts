import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  buildCatalogProducts,
  fetchCatalogProducts,
  resolveCurrencyCode,
  resolveLocale,
} from "../../../../../lib/threeweeq/catalog"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const locale = resolveLocale(req)
  const currencyCode = resolveCurrencyCode(req)
  const handle = String(req.params.handle ?? "").trim()

  if (!handle) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A product handle is required"
    )
  }

  const coreProducts = await fetchCatalogProducts(req.scope, {
    handle,
  })
  const products = await buildCatalogProducts(req.scope, coreProducts, {
    locale,
    currencyCode,
  })
  const product = products[0]

  if (!product) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Product not found")
  }

  res.json({
    product,
    locale,
    currency_code: currencyCode,
  })
}
