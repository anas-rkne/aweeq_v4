import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { resolveOrderId, retrieveOrder } from "../lib/threeweeq/orders"
import { ThreeweeqRepository } from "../lib/threeweeq/repository"

/**
 * When a shipment is created in the admin (Medusa's native «Create
 * fulfillment», where the operator pastes the courier's AWB into the tracking
 * number field), the customer gets the tracking email. It rides the same
 * outbox as the order confirmation, so if the Resend key is not set yet the
 * event stays pending and delivers the moment the key goes in.
 */
export default async function orderShippedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!data?.id) {
    return
  }

  const orderId = await resolveOrderId(container, {
    fulfillmentId: data.id,
  })

  if (!orderId) {
    return
  }

  const order = await retrieveOrder(container, orderId)
  if (!order) {
    return
  }

  const repository = new ThreeweeqRepository(container)
  const locale =
    (order.metadata as Record<string, unknown> | null)?.locale === "en"
      ? "en"
      : "ar"

  const trackingNumbers = (order.fulfillments ?? [])
    .flatMap((fulfillment: any) =>
      (fulfillment.tracking_links ?? []).map(
        (link: any) => link.tracking_number
      )
    )
    .filter(Boolean)

  await repository.enqueueOutboxOnce({
    aggregateType: "order",
    aggregateId: order.id,
    eventType: "order.shipped",
    payload: {
      order_id: order.id,
      display_id: order.display_id,
      email: order.email,
      customer_name: [
        order.shipping_address?.first_name,
        order.shipping_address?.last_name,
      ]
        .filter(Boolean)
        .join(" "),
      locale,
      tracking_numbers: trackingNumbers,
    },
  })
}

export const config: SubscriberConfig = {
  event: "delivery.created",
}
