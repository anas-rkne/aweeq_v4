import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import manageLoyaltyPointsWorkflow from "../workflows/manage-loyalty-points"

export default async function deliveryCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!data?.id) {
    return
  }

  await manageLoyaltyPointsWorkflow(container).run({
    input: {
      fulfillment_id: data.id,
    },
  })
}

export const config: SubscriberConfig = {
  event: "delivery.created",
}
