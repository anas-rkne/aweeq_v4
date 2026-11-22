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

type SendOrderConfirmationOutput = {
  queued: boolean
  reason?: string
  order_id?: string
  outbox_id?: string
  admin_outbox_id?: string | null
}

const prepareOrderConfirmationStep = createStep(
  "prepare-order-confirmation",
  async (
    input: SendOrderConfirmationInput,
    { container }
  ): Promise<StepResponse<SendOrderConfirmationOutput>> => {
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

    const items = (order.items ?? []).map((item: any) => ({
      title: item.title,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }))

    const customerName = [
      order.shipping_address?.first_name,
      order.shipping_address?.last_name,
    ]
      .filter(Boolean)
      .join(" ")

    const outboxId = await repository.enqueueOutboxOnce({
      aggregateType: "order",
      aggregateId: order.id,
      eventType: "order.confirmation",
      payload: {
        order_id: order.id,
        display_id: order.display_id,
        email: order.email,
        phone: order.shipping_address?.phone,
        customer_name: customerName,
        customer_id: order.customer_id,
        locale,
        currency_code: order.currency_code,
        total: order.total,
        shipping_address: order.shipping_address,
        items,
      },
    })

    /* The merchant alert is opt-in through the environment: until an inbox is
       configured, no event is queued and nothing sits in the outbox forever.
       Once `ORDER_NOTIFICATION_EMAIL` is set, every new order alerts it. */
    const adminRecipients = String(
      process.env.ORDER_NOTIFICATION_EMAIL ?? ""
    ).trim()
    let adminOutboxId: string | null = null

    if (adminRecipients) {
      const adminBase = (
        process.env.MEDUSA_ADMIN_URL ||
        process.env.MEDUSA_BACKEND_URL ||
        ""
      ).replace(/\/+$/, "")

      adminOutboxId = await repository.enqueueOutboxOnce({
        aggregateType: "order",
        aggregateId: order.id,
        eventType: "order.admin_notification",
        payload: {
          order_id: order.id,
          display_id: order.display_id,
          email: adminRecipients,
          customer_email: order.email,
          customer_phone: order.shipping_address?.phone,
          customer_name: customerName,
          locale,
          currency_code: order.currency_code,
          total: order.total,
          shipping_total: order.shipping_total,
          shipping_address: order.shipping_address,
          created_at: order.created_at,
          status: order.status,
          admin_url: adminBase ? `${adminBase}/app/orders/${order.id}` : "",
          items,
        },
      })
    }

    return new StepResponse({
      queued: true,
      order_id: order.id,
      outbox_id: outboxId,
      admin_outbox_id: adminOutboxId,
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
