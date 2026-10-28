import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { catalogAdminService } from "../../../../../../../lib/threeweeq/admin-route"

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const service = catalogAdminService(req)
  const productId = String(req.params.id ?? "")
  const variantId = String(req.params.variantId ?? "")
  const body = (req.body ?? {}) as Record<string, unknown>

  res.json(
    await service.updateVariant(productId, variantId, body as Record<string, any>)
  )
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service = catalogAdminService(req)
  const productId = String(req.params.id ?? "")
  const variantId = String(req.params.variantId ?? "")

  res.json(await service.deleteVariant(productId, variantId))
}
