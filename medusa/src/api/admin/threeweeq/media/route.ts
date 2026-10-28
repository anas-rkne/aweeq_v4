import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { catalogAdminService } from "../../../../lib/threeweeq/admin-route"

function asNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = catalogAdminService(req)

  res.json(
    await service.listMediaAdmin({
      q: typeof req.query.q === "string" ? req.query.q : undefined,
      limit: asNumber(req.query.limit),
      offset: asNumber(req.query.offset),
    })
  )
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = catalogAdminService(req)
  const body = (req.body ?? {}) as Record<string, unknown>

  const media = await service.createMediaAsset({
    url: String(body.url ?? ""),
    mime_type:
      typeof body.mime_type === "string" ? body.mime_type : undefined,
    alt_ar: typeof body.alt_ar === "string" ? body.alt_ar : undefined,
    alt_en: typeof body.alt_en === "string" ? body.alt_en : undefined,
    focal_x: typeof body.focal_x === "number" ? body.focal_x : undefined,
    focal_y: typeof body.focal_y === "number" ? body.focal_y : undefined,
    width: asNumber(body.width),
    height: asNumber(body.height),
    bytes: asNumber(body.bytes),
    blurhash:
      typeof body.blurhash === "string" ? body.blurhash : undefined,
    storage_key:
      typeof body.storage_key === "string" ? body.storage_key : undefined,
    product_id:
      typeof body.product_id === "string" ? body.product_id : undefined,
    role: typeof body.role === "string" ? body.role : "gallery",
    sort_order:
      typeof body.sort_order === "number" ? body.sort_order : undefined,
  })

  res.status(201).json({ media })
}
