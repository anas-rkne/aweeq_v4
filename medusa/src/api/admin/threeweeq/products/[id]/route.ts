import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { CatalogAdminService } from "../../../../../lib/threeweeq/admin-service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = new CatalogAdminService(req.scope)
  const productId = String(req.params.id ?? "")
  res.json(await service.getProductAdmin(productId))
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const service = new CatalogAdminService(req.scope)
  const productId = String(req.params.id ?? "")
  const body = (req.body ?? {}) as Record<string, unknown>

  res.json(await service.updateProduct(productId, body))
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service = new CatalogAdminService(req.scope)
  const productId = String(req.params.id ?? "")
  res.json(await service.archiveProduct(productId))
}
