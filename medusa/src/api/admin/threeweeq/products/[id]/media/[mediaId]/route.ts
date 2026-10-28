import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { catalogAdminService } from "../../../../../../../lib/threeweeq/admin-route"

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service = catalogAdminService(req)
  const productId = String(req.params.id ?? "")
  const mediaId = String(req.params.mediaId ?? "")
  const role =
    typeof req.query.role === "string" && req.query.role ? req.query.role : undefined

  res.json(await service.removeProductMedia(productId, mediaId, role))
}
