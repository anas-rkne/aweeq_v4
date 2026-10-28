import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { catalogAdminService } from "../../../../lib/threeweeq/admin-route"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = catalogAdminService(req)
  res.json(await service.listProductTypesAdmin())
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = catalogAdminService(req)
  const body = (req.body ?? {}) as Record<string, unknown>
  res.status(201).json(await service.upsertProductType(body))
}
