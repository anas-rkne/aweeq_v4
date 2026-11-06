import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ThreeweeqRepository,
  type Locale,
} from "../../../lib/threeweeq/repository"
import { resolveRequestLocale } from "../../../lib/threeweeq/locale"

function resolveLocale(req: MedusaRequest): Locale {
  return resolveRequestLocale(req)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const repository = new ThreeweeqRepository(req.scope)
  const locale = resolveLocale(req)
  const civilizations = await repository.listCivilizations(locale)

  res.json({
    civilizations,
    count: civilizations.length,
    locale,
  })
}
