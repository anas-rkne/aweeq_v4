import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { catalogAdminService } from "../../../../../../lib/threeweeq/admin-route"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = catalogAdminService(req)
  const productId = String(req.params.id ?? "")
  res.json(await service.publishProduct(productId))
}
