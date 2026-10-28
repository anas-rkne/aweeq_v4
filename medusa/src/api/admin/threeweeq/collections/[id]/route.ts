import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { catalogAdminService } from "../../../../../lib/threeweeq/admin-route"

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const service = catalogAdminService(req)
  const id = String(req.params.id ?? "")
  const body = (req.body ?? {}) as Record<string, unknown>

  res.json(await service.upsertCollection({ ...body, id }))
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service = catalogAdminService(req)
  const id = String(req.params.id ?? "")

  res.json(await service.deleteCollection(id))
}
