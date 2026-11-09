import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260101000010 extends Migration {
  async up(): Promise<void> {
    // Add the "float" role: a transparent product cut-out used only by the
    // hero-2 (store-invitation) WebGL float, separate from the full "hero"
    // photograph the store grid and product page use.
    this.addSql(`
      alter table "catalog"."product_media"
      drop constraint if exists "product_media_role_check";
    `)
    this.addSql(`
      alter table "catalog"."product_media"
      add constraint "product_media_role_check"
      check ("role" in ('hero', 'gallery', 'detail', 'packaging', 'editorial', 'video', 'float'));
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      alter table "catalog"."product_media"
      drop constraint if exists "product_media_role_check";
    `)
    this.addSql(`
      alter table "catalog"."product_media"
      add constraint "product_media_role_check"
      check ("role" in ('hero', 'gallery', 'detail', 'packaging', 'editorial', 'video'));
    `)
  }
}
