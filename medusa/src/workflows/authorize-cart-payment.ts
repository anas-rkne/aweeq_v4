import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { authorizePaymentSessionStep } from "@medusajs/medusa/core-flows"

type AuthorizeCartPaymentInput = {
  id: string
  context?: Record<string, unknown>
}

export const authorizeCartPaymentWorkflow = createWorkflow(
  "authorize-cart-payment",
  (input: AuthorizeCartPaymentInput) => {
    const payment = authorizePaymentSessionStep({
      id: input.id,
      context: input.context ?? {},
    })

    return new WorkflowResponse(payment)
  }
)
