import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { CatalogAdminService } from "../../../../../lib/threeweeq/admin-service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = new CatalogAdminService(req.scope)
  const productId = String(req.params.id ?? "")
  res.json(await service.publishProduct(productId))
}
