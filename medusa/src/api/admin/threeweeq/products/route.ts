import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { catalogAdminService } from "../../../../lib/threeweeq/admin-route"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = catalogAdminService(req)

  const limit = Number(req.query.limit ?? 20)
  const offset = Number(req.query.offset ?? 0)

  const result = await service.listProductsAdmin({
    limit: Number.isFinite(limit) ? limit : 20,
    offset: Number.isFinite(offset) ? offset : 0,
    q: typeof req.query.q === "string" ? req.query.q : undefined,
    civilizationId:
      typeof req.query.civilization_id === "string"
        ? req.query.civilization_id
        : undefined,
    collectionId:
      typeof req.query.collection_id === "string"
        ? req.query.collection_id
        : undefined,
    status:
      typeof req.query.status === "string" ? req.query.status : undefined,
  })

  res.json(result)
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = catalogAdminService(req)
  const body = (req.body ?? {}) as Record<string, unknown>

  const product = await service.createProduct(body)
  res.status(201).json({ product })
}
