import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260101000007 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "engagement"."newsletter_subscriber" (
        "id" text not null,
        "email" text not null,
        "locale" text not null default 'ar',
        "source" text null,
        "status" text not null default 'subscribed',
        "confirmed_at" timestamptz null,
        "unsubscribed_at" timestamptz null,
        "metadata" jsonb not null default '{}'::jsonb,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "newsletter_subscriber_pkey" primary key ("id"),
        constraint "newsletter_subscriber_locale_check"
          check ("locale" in ('ar', 'en')),
        constraint "newsletter_subscriber_status_check"
          check ("status" in ('subscribed', 'pending', 'unsubscribed'))
      );
    `)

    // One row per address, case-insensitive, ignoring soft-deleted rows.
    this.addSql(`
      create unique index if not exists "newsletter_subscriber_email_unique"
      on "engagement"."newsletter_subscriber" (lower("email"))
      where "deleted_at" is null;
    `)

    this.addSql(`
      create index if not exists "newsletter_subscriber_created_at_idx"
      on "engagement"."newsletter_subscriber" ("created_at" desc);
    `)
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "engagement"."newsletter_subscriber";`)
  }
}
