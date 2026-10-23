import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ThreeweeqRepository,
  type Locale,
} from "../../../../lib/threeweeq/repository"

function resolveLocale(req: MedusaRequest): Locale {
  const queryLocale =
    typeof req.query.locale === "string" ? req.query.locale : undefined
  const headerValue = req.headers["x-locale"]
  const headerLocale = Array.isArray(headerValue)
    ? headerValue[0]
    : headerValue
  const value = queryLocale ?? headerLocale

  return value === "en" ? "en" : "ar"
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const repository = new ThreeweeqRepository(req.scope)
  const locale = resolveLocale(req)
  const drop = await repository.getCurrentDrop(locale)

  res.json({
    drop,
    locale,
  })
}
