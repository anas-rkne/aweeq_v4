import type { MedusaContainer } from "@medusajs/framework/types"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ThreeweeqRepository } from "../lib/threeweeq/repository"

type AbandonedCartReminderInput = {
  older_than_minutes?: number
  limit?: number
}

const enqueueAbandonedCartRemindersStep = createStep(
  "enqueue-abandoned-cart-reminders",
  async (input: AbandonedCartReminderInput, { container }) => {
    const db = container.resolve<any>(ContainerRegistrationKeys.PG_CONNECTION)
    const repository = new ThreeweeqRepository(container as MedusaContainer)
    const olderThanMinutes = Math.max(input.older_than_minutes ?? 60, 60)
    const limit = Math.min(Math.max(input.limit ?? 100, 1), 500)

    const carts = await db("cart")
      .whereNull("completed_at")
      .whereNotNull("email")
      .where(
        "updated_at",
        "<",
        db.raw("now() - (? * interval '1 minute')", [olderThanMinutes])
      )
      .orderBy("updated_at", "asc")
      .limit(limit)
      .select(
        "id",
        "email",
        "customer_id",
        "currency_code",
        "updated_at"
      )

    let queued = 0

    for (const cart of carts) {
      const existing = await db("ops.outbox_event")
        .where({
          aggregate_type: "cart",
          aggregate_id: cart.id,
          event_type: "cart.abandoned_reminder",
        })
        .first()

      if (existing) {
        continue
      }

      await repository.enqueueOutbox({
        aggregateType: "cart",
        aggregateId: cart.id,
        eventType: "cart.abandoned_reminder",
        payload: {
          cart_id: cart.id,
          email: cart.email,
          customer_id: cart.customer_id,
          currency_code: cart.currency_code,
          updated_at: cart.updated_at,
          locale: "ar",
        },
      })

      queued += 1
    }

    return new StepResponse({
      scanned: carts.length,
      queued,
    })
  }
)

const abandonedCartReminderWorkflow = createWorkflow(
  "abandoned-cart-reminder",
  function (input: AbandonedCartReminderInput) {
    const result = enqueueAbandonedCartRemindersStep(input)

    return new WorkflowResponse(result)
  }
)

export default abandonedCartReminderWorkflow
