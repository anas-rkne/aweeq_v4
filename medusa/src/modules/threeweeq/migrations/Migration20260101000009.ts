import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260101000009 extends Migration {
  async up(): Promise<void> {
    // `newsletter_subscriber` was first created in migration 0003 without a
    // `metadata` column; the later 0007 definition (which includes it) is a
    // no-op because the table already exists. The repository writes
    // `metadata` on insert, so the column must exist.
    this.addSql(`
      alter table "engagement"."newsletter_subscriber"
      add column if not exists "metadata" jsonb not null default '{}'::jsonb;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      alter table "engagement"."newsletter_subscriber"
      drop column if exists "metadata";
    `)
  }
}
