import type { MedusaContainer } from "@medusajs/framework/types"
import abandonedCartReminderWorkflow from "../workflows/abandoned-cart-reminder"

export default async function abandonedCartReminderJob(
  container: MedusaContainer
) {
  await abandonedCartReminderWorkflow(container).run({
    input: {
      older_than_minutes: 60,
      limit: 100,
    },
  })
}

export const config = {
  name: "abandoned-cart-reminder",
  schedule: "0 * * * *",
}
