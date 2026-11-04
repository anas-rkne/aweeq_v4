import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260101000008 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      alter table "ops"."idempotency_key"
      add column if not exists "last_error" text null;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      alter table "ops"."idempotency_key"
      drop column if exists "last_error";
    `)
  }
}
