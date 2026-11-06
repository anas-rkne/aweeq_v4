import type { MedusaRequest } from "@medusajs/framework/http"
import type { Locale } from "./repository"

/**
 * Medusa 2.2x installs an `applyLocale` middleware that *consumes*
 * `?locale=…`: it normalises the value onto `req.locale` and then deletes
 * `req.query.locale`. A route that reads `req.query.locale` after that moment
 * always sees `undefined`, which is why every `/en` storefront request was
 * silently served the Arabic catalogue. Resolution order here mirrors the
 * framework: normalised request locale → raw query (in case the middleware is
 * not mounted) → our own `x-locale` header.
 */
export function resolveRequestLocale(req: MedusaRequest): Locale {
  const requestLocale = (req as unknown as { locale?: unknown }).locale
  const queryLocale =
    typeof req.query.locale === "string" ? req.query.locale : undefined
  const headerValue = req.headers["x-locale"]
  const headerLocale = Array.isArray(headerValue) ? headerValue[0] : headerValue

  const value = [requestLocale, queryLocale, headerLocale].find(
    (candidate): candidate is string => typeof candidate === "string"
  )

  return value && value.toLowerCase().startsWith("en") ? "en" : "ar"
}
