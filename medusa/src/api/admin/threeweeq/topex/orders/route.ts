import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/* GET /admin/threeweeq/topex/orders
   The paid orders the studio's «توبكس» tab lists: newest first, with the
   delivery fields the courier needs and whether a shipment already exists. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve<any>(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "created_at",
      "total",
      "currency_code",
      "shipping_address.first_name",
      "shipping_address.last_name",
      "shipping_address.phone",
      "shipping_address.city",
      "shipping_address.province",
      "fulfillments.id",
      "payment_collections.payments.amount",
      "payment_collections.payments.status",
      "payment_collections.payments.captured_at",
    ],
    filters: {},
    pagination: { skip: 0, take: 100 },
  })

  const orders = (data ?? [])
    .filter((order: any) => {
      const payments = (order.payment_collections ?? []).flatMap(
        (collection: any) => collection.payments ?? []
      )
      return payments.some(
        (payment: any) => payment.captured_at || payment.status === "captured"
      )
    })
    .sort(
      (a: any, b: any) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime()
    )
    .map((order: any) => ({
      id: order.id,
      display_id: order.display_id,
      created_at: order.created_at,
      total: Number(order.total ?? 0),
      currency_code: order.currency_code ?? "aed",
      customer_name: [
        order.shipping_address?.first_name,
        order.shipping_address?.last_name,
      ]
        .filter(Boolean)
        .join(" "),
      phone: order.shipping_address?.phone ?? null,
      emirate: order.shipping_address?.province ?? null,
      area: order.shipping_address?.city ?? null,
      shipped: (order.fulfillments ?? []).length > 0,
    }))

  res.json({ orders })
}
