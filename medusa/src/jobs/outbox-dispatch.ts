import type { MedusaContainer } from "@medusajs/framework/types"
import type { Logger } from "@medusajs/framework/types"
import { ThreeweeqRepository } from "../lib/threeweeq/repository"
import { sendOutboxEvent } from "../lib/threeweeq/email"

const BATCH_SIZE = 20
const MAX_ATTEMPTS = 5

function backoffSeconds(attempts: number) {
  // 1m, 2m, 4m, 8m — small enough to retry within the hour, large enough to
  // ride out a provider outage.
  return Math.min(60 * 2 ** Math.max(0, attempts - 1), 3600)
}

/**
 * Drains `ops.outbox_event` (order confirmations, and later anything else that
 * needs an external side effect). Claiming is done inside a transaction with
 * `FOR UPDATE SKIP LOCKED`, so overlapping ticks never double-send.
 *
 * When RESEND_API_KEY is missing every event is reported as `skipped` and left
 * pending — no attempt is burned, and turning the key on starts delivery.
 */
export default async function outboxDispatchJob(container: MedusaContainer) {
  const logger = container.resolve<Logger>("logger")
  const repository = new ThreeweeqRepository(container)

  const events = await repository.claimOutboxEvents(BATCH_SIZE)
  if (!events.length) {
    return
  }

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const event of events) {
    try {
      const result = await sendOutboxEvent({
        id: event.id,
        event_type: event.event_type,
        payload: (event.payload ?? {}) as Record<string, any>,
      })

      if (result.sent) {
        await repository.markOutboxPublished(event.id)
        sent += 1
        continue
      }

      // Not configured yet (missing key / recipient): release the event without
      // counting an attempt so it can be retried once the env is set.
      await repository.releaseOutboxEvent(event.id, result.reason ?? "skipped")
      skipped += 1
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown outbox error"
      const attempts = Number(event.attempts ?? 0) + 1

      await repository.markOutboxFailed(
        event.id,
        message,
        backoffSeconds(attempts),
        MAX_ATTEMPTS
      )

      failed += 1
      logger.warn(
        `outbox event ${event.id} (${event.event_type}) failed: ${message}`
      )
    }
  }

  logger.info(
    `outbox dispatch: ${sent} sent, ${skipped} skipped, ${failed} failed`
  )
}

export const config = {
  name: "outbox-dispatch",
  schedule: "* * * * *",
}
