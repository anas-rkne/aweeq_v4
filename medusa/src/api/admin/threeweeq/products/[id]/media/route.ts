import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { CatalogAdminService } from "../../../../../lib/threeweeq/admin-service"

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const service = new CatalogAdminService(req.scope)
  const productId = String(req.params.id ?? "")
  const body = (req.body ?? {}) as { media?: unknown }

  const media = Array.isArray(body.media)
    ? (body.media as Array<{
        media_id: string
        role: string
        sort_order: number
      }>)
    : []

  res.json(await service.setProductMedia(productId, media))
}
