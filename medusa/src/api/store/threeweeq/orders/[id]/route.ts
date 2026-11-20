import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

type OrderItem = {
  id: string
  title?: string | null
  product_title?: string | null
  variant_title?: string | null
  variant_id?: string | null
  thumbnail?: string | null
  quantity?: number
  unit_price?: number
  total?: number
}

type OrderRow = {
  id: string
  display_id?: number
  status?: string
  email?: string | null
  currency_code?: string
  subtotal?: number
  total?: number
  tax_total?: number
  shipping_total?: number
  created_at?: string
  items?: OrderItem[]
  shipping_address?: Record<string, unknown> | null
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const orderId = String(req.params.id ?? "").trim()
  const email = String(req.query.email ?? "").trim().toLowerCase()

  if (!orderId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Order id is required")
  }

  if (!email) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Email is required to verify this order"
    )
  }

  const query = req.scope.resolve<any>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "status",
      "email",
      "currency_code",
      "subtotal",
      "total",
      "tax_total",
      "shipping_total",
      "created_at",
      "shipping_address.*",
      "items.id",
      "items.title",
      "items.product_title",
      "items.variant_title",
      "items.variant_id",
      "items.thumbnail",
      "items.quantity",
      "items.unit_price",
      "items.total",
    ],
    filters: { id: orderId },
  })

  const order: OrderRow | undefined = data?.[0]

  if (!order) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found")
  }

  if (String(order.email ?? "").trim().toLowerCase() !== email) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Email does not match this order"
    )
  }

  /* Meta Purchase uses the variant SKU as its Content ID. */
  const variantIds = Array.from(
    new Set(
      (order.items ?? [])
        .map((item) => item.variant_id)
        .filter((id): id is string => Boolean(id))
    )
  )
  const skuByVariant = new Map<string, string | null>()
  if (variantIds.length) {
    const { data: variantRows } = await query.graph({
      entity: "product_variant",
      fields: ["id", "sku"],
      filters: { id: variantIds },
    })
    for (const row of variantRows ?? []) {
      skuByVariant.set(row.id, row.sku ?? null)
    }
  }

  res.status(200).json({
    order: {
      id: order.id,
      display_id: order.display_id ?? null,
      status: order.status,
      currency_code: order.currency_code,
      subtotal: order.subtotal ?? 0,
      total: order.total ?? 0,
      tax_total: order.tax_total ?? 0,
      shipping_total: order.shipping_total ?? 0,
      created_at: order.created_at,
      shipping_address: order.shipping_address ?? null,
      items: (order.items ?? []).map((item) => ({
        id: item.id,
        title: item.product_title ?? item.title ?? null,
        variant_title: item.variant_title ?? null,
        sku: item.variant_id ? (skuByVariant.get(item.variant_id) ?? null) : null,
        thumbnail: item.thumbnail ?? null,
        quantity: Number(item.quantity ?? 0),
        unit_price: item.unit_price ?? null,
        total: item.total ?? null,
      })),
    },
  })
}
