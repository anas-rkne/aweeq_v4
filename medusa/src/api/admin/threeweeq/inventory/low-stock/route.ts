import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { catalogAdminService } from "../../../../../lib/threeweeq/admin-route"

/**
 * GET /admin/threeweeq/inventory/low-stock
 *
 * Variants whose shelf quantity is at or below the threshold (3 by default),
 * including the ones that already hit zero. The Studio shows them as a banner
 * so the owner knows what to restock.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = catalogAdminService(req)
  const raw = Number(req.query.threshold ?? NaN)
  const threshold = Number.isFinite(raw) && raw >= 0 ? Math.trunc(raw) : undefined

  res.json(await service.listLowStock(threshold))
}
