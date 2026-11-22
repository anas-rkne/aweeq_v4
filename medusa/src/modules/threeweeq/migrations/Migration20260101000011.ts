import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260101000011 extends Migration {
  async up(): Promise<void> {
    // `enqueueOutboxOnce` used to read-then-insert, so the Stripe webhook and
    // the `payment.captured` subscriber could both queue the same email.
    // Collapse any historical duplicates before enforcing one event per
    // aggregate + type. A published row wins over a pending duplicate so the
    // cleanup never re-sends an email that already went out.
    this.addSql(`
      delete from "ops"."outbox_event" a
      using "ops"."outbox_event" b
      where a."aggregate_type" = b."aggregate_type"
        and a."aggregate_id" = b."aggregate_id"
        and a."event_type" = b."event_type"
        and (
          case when a."status" = 'published' then 0 else 1 end,
          a."created_at",
          a."id"
        ) > (
          case when b."status" = 'published' then 0 else 1 end,
          b."created_at",
          b."id"
        );
    `)

    this.addSql(`
      create unique index if not exists "outbox_event_aggregate_event_unique"
      on "ops"."outbox_event" ("aggregate_type", "aggregate_id", "event_type");
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      drop index if exists "ops"."outbox_event_aggregate_event_unique";
    `)
  }
}
