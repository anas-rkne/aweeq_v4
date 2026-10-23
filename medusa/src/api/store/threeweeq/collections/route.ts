import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { resolveLocale } from "../../../../lib/threeweeq/catalog"
import { ThreeweeqRepository } from "../../../../lib/threeweeq/repository"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const locale = resolveLocale(req)
  const repository = new ThreeweeqRepository(req.scope)
  const collections = await repository.getCatalogCollections(locale)

  res.json({
    collections,
    count: collections.length,
    locale,
  })
}
