import type { MedusaContainer } from "@medusajs/framework/types"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ThreeweeqRepository } from "../lib/threeweeq/repository"
import {
  resolveOrderId,
  retrieveOrder,
} from "../lib/threeweeq/orders"

type SendOrderConfirmationInput = {
  order_id?: string
  payment_id?: string
}

const prepareOrderConfirmationStep = createStep(
  "prepare-order-confirmation",
  async (input: SendOrderConfirmationInput, { container }) => {
    const orderId = await resolveOrderId(container as MedusaContainer, {
      orderId: input.order_id,
      paymentId: input.payment_id,
    })

    if (!orderId) {
      return new StepResponse({ queued: false, reason: "order_not_found" })
    }

    const order = await retrieveOrder(container as MedusaContainer, orderId)
    if (!order) {
      return new StepResponse({ queued: false, reason: "order_not_found" })
    }

    const repository = new ThreeweeqRepository(container as MedusaContainer)
    const locale =
      (order.metadata as Record<string, unknown> | null)?.locale === "en"
        ? "en"
        : "ar"

    const outboxId = await repository.enqueueOutboxOnce({
      aggregateType: "order",
      aggregateId: order.id,
      eventType: "order.confirmation",
      payload: {
        order_id: order.id,
        display_id: order.display_id,
        email: order.email,
        phone: order.shipping_address?.phone,
        customer_name: [
          order.shipping_address?.first_name,
          order.shipping_address?.last_name,
        ]
          .filter(Boolean)
          .join(" "),
        customer_id: order.customer_id,
        locale,
        currency_code: order.currency_code,
        total: order.total,
        shipping_address: order.shipping_address,
        items: (order.items ?? []).map((item: any) => ({
          title: item.title,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      },
    })

    return new StepResponse({
      queued: true,
      order_id: order.id,
      outbox_id: outboxId,
    })
  }
)

const sendOrderConfirmationWorkflow = createWorkflow(
  "send-order-confirmation",
  function (input: SendOrderConfirmationInput) {
    const result = prepareOrderConfirmationStep(input)

    return new WorkflowResponse(result)
  }
)

export default sendOrderConfirmationWorkflow
