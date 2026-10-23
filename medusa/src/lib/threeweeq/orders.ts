import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

export type OrderLookupInput = {
  orderId?: string
  paymentId?: string
  fulfillmentId?: string
}

export async function resolveOrderId(
  container: MedusaContainer,
  input: OrderLookupInput
): Promise<string | null> {
  if (input.orderId) {
    return input.orderId
  }

  const query = container.resolve<any>(ContainerRegistrationKeys.QUERY)

  if (input.paymentId) {
    try {
      const { data } = await query.graph({
        entity: "order",
        fields: ["id"],
        filters: {
          "payment_collections.payments.id": input.paymentId,
        },
      })

      if (data?.[0]?.id) {
        return data[0].id
      }
    } catch {
      void 0
    }

    try {
      const paymentService = container.resolve<any>(Modules.PAYMENT)
      const payment = await paymentService.retrievePayment(input.paymentId)
      const orderId = payment?.order_id ?? payment?.metadata?.order_id

      if (orderId) {
        return String(orderId)
      }

      if (payment?.payment_collection_id) {
        const { data } = await query.graph({
          entity: "order",
          fields: ["id"],
          filters: {
            "payment_collections.id": payment.payment_collection_id,
          },
        })

        if (data?.[0]?.id) {
          return data[0].id
        }
      }
    } catch {
      void 0
    }
  }

  if (input.fulfillmentId) {
    for (const filter of [
      { "fulfillments.id": input.fulfillmentId },
      { "fulfillments.delivery.id": input.fulfillmentId },
    ]) {
      try {
        const { data } = await query.graph({
          entity: "order",
          fields: ["id"],
          filters: filter,
        })

        if (data?.[0]?.id) {
          return data[0].id
        }
      } catch {
        void 0
      }
    }
  }

  return null
}

export async function retrieveOrder(
  container: MedusaContainer,
  orderId: string
) {
  const query = container.resolve<any>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "customer_id",
      "currency_code",
      "total",
      "subtotal",
      "shipping_total",
      "tax_total",
      "metadata",
      "shipping_address.first_name",
      "shipping_address.last_name",
      "shipping_address.phone",
      "shipping_address.city",
      "shipping_address.country_code",
      "items.id",
      "items.title",
      "items.quantity",
      "items.unit_price",
      "items.variant_id",
    ],
    filters: { id: orderId },
  })

  return data?.[0] ?? null
}
