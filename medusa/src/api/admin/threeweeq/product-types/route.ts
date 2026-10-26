import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { CatalogAdminService } from "../../../../lib/threeweeq/admin-service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = new CatalogAdminService(req.scope)
  res.json(await service.listProductTypesAdmin())
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = new CatalogAdminService(req.scope)
  const body = (req.body ?? {}) as Record<string, unknown>
  res.status(201).json(await service.upsertProductType(body))
}
