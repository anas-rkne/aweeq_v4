import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260101000006 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      alter table "catalog"."product_profile"
      add column if not exists "max_per_customer" integer null;
    `)

    this.addSql(`
      alter table "catalog"."product_profile"
      drop constraint if exists "product_profile_max_per_customer_check";
    `)

    this.addSql(`
      alter table "catalog"."product_profile"
      add constraint "product_profile_max_per_customer_check"
      check ("max_per_customer" is null or "max_per_customer" > 0);
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      alter table "catalog"."product_profile"
      drop constraint if exists "product_profile_max_per_customer_check";
    `)

    this.addSql(`
      alter table "catalog"."product_profile"
      drop column if exists "max_per_customer";
    `)
  }
}
