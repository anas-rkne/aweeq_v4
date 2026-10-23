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

type ManageLoyaltyPointsInput = {
  order_id?: string
  payment_id?: string
  fulfillment_id?: string
}

const awardLoyaltyPointsStep = createStep(
  "award-loyalty-points",
  async (input: ManageLoyaltyPointsInput, { container }) => {
    const orderId = await resolveOrderId(container as MedusaContainer, {
      orderId: input.order_id,
      paymentId: input.payment_id,
      fulfillmentId: input.fulfillment_id,
    })

    if (!orderId) {
      return new StepResponse({ awarded: false, reason: "order_not_found" })
    }

    const order = await retrieveOrder(container as MedusaContainer, orderId)
    if (!order) {
      return new StepResponse({ awarded: false, reason: "order_not_found" })
    }

    if (!order.customer_id) {
      return new StepResponse({ awarded: false, reason: "guest_order" })
    }

    const points = Math.floor(Number(order.total ?? 0))
    if (points <= 0) {
      return new StepResponse({ awarded: false, reason: "no_points" })
    }

    const repository = new ThreeweeqRepository(container as MedusaContainer)
    const result = await repository.awardLoyaltyPoints({
      customerId: order.customer_id,
      orderId: order.id,
      points,
      reason: "order_delivered",
    })

    return new StepResponse({
      awarded: result.awarded,
      order_id: order.id,
      points: result.awarded ? points : 0,
      balance: result.balance,
    })
  }
)

const manageLoyaltyPointsWorkflow = createWorkflow(
  "manage-loyalty-points",
  function (input: ManageLoyaltyPointsInput) {
    const result = awardLoyaltyPointsStep(input)

    return new WorkflowResponse(result)
  }
)

export default manageLoyaltyPointsWorkflow
