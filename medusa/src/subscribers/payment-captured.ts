import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import sendOrderConfirmationWorkflow from "../workflows/send-order-confirmation"

export default async function paymentCapturedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!data?.id) {
    return
  }

  await sendOrderConfirmationWorkflow(container).run({
    input: {
      payment_id: data.id,
    },
  })
}

export const config: SubscriberConfig = {
  event: "payment.captured",
}
