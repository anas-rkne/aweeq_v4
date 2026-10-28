import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { catalogAdminService } from "../../../../lib/threeweeq/admin-route"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = catalogAdminService(req)
  const variantId = String(req.query.variant_id ?? "")

  if (!variantId) {
    res.status(400).json({ message: "variant_id is required" })
    return
  }

  res.json(await service.getSerialStatus(variantId))
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = catalogAdminService(req)
  const body = (req.body ?? {}) as Record<string, unknown>

  const result = await service.generateSerials({
    variant_id: String(body.variant_id ?? ""),
    edition_size: Number(body.edition_size ?? 0),
    prefix: typeof body.prefix === "string" ? body.prefix : undefined,
  })

  res.status(201).json(result)
}
