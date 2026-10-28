import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { catalogAdminService } from "../../../../../../lib/threeweeq/admin-route"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = catalogAdminService(req)
  const productId = String(req.params.id ?? "")
  const body = (req.body ?? {}) as Record<string, unknown>

  res
    .status(201)
    .json(await service.addVariant(productId, body as Record<string, any>))
}
