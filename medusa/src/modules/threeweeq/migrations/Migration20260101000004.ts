import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260101000004 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "commerce"."promotion_profile" (
        "id" text not null,
        "promotion_id" text not null,
        "civilization_id" text null,
        "product_id" text null,
        "kind" text not null default 'campaign',
        "metadata" jsonb not null default '{}'::jsonb,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "promotion_profile_pkey" primary key ("id"),
        constraint "promotion_profile_promotion_id_unique" unique ("promotion_id"),
        constraint "promotion_profile_kind_check" check ("kind" in ('campaign', 'drop_access', 'waitlist', 'loyalty', 'gift')),
        constraint "promotion_profile_civilization_id_foreign" foreign key ("civilization_id") references "catalog"."civilization" ("id") on delete set null
      );
    `)

    this.addSql(`
      create table if not exists "commerce"."order_profile" (
        "id" text not null,
        "order_id" text not null,
        "customer_id" text null,
        "civilization_id" text null,
        "drop_id" text null,
        "locale" text not null default 'ar',
        "gift_message" text null,
        "packaging_code" text null,
        "metadata" jsonb not null default '{}'::jsonb,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "order_profile_pkey" primary key ("id"),
        constraint "order_profile_order_id_unique" unique ("order_id"),
        constraint "order_profile_locale_check" check ("locale" in ('ar', 'en')),
        constraint "order_profile_civilization_id_foreign" foreign key ("civilization_id") references "catalog"."civilization" ("id") on delete set null,
        constraint "order_profile_drop_id_foreign" foreign key ("drop_id") references "engagement"."drop" ("id") on delete set null
      );
    `)

    this.addSql(`
      create table if not exists "commerce"."order_item_profile" (
        "id" text not null,
        "order_id" text not null,
        "order_item_id" text not null,
        "product_id" text null,
        "variant_id" text null,
        "serial_unit_id" text null,
        "civilization_id" text null,
        "metadata" jsonb not null default '{}'::jsonb,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "order_item_profile_pkey" primary key ("id"),
        constraint "order_item_profile_order_item_id_unique" unique ("order_item_id"),
        constraint "order_item_profile_serial_unit_id_unique" unique ("serial_unit_id"),
        constraint "order_item_profile_civilization_id_foreign" foreign key ("civilization_id") references "catalog"."civilization" ("id") on delete set null,
        constraint "order_item_profile_serial_unit_id_foreign" foreign key ("serial_unit_id") references "catalog"."serial_unit" ("id") on delete set null
      );
    `)

    this.addSql(`create index if not exists "order_profile_order_idx" on "commerce"."order_profile" ("order_id");`)
    this.addSql(`create index if not exists "order_item_profile_order_idx" on "commerce"."order_item_profile" ("order_id");`)

    this.addSql(`
      create table if not exists "commerce"."preorder" (
        "id" text not null,
        "customer_id" text null,
        "email" text not null,
        "product_id" text not null,
        "variant_id" text not null,
        "drop_id" text null,
        "quantity" integer not null default 1,
        "status" text not null default 'pending',
        "payment_intent_id" text null,
        "expires_at" timestamptz null,
        "converted_order_id" text null,
        "metadata" jsonb not null default '{}'::jsonb,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "preorder_pkey" primary key ("id"),
        constraint "preorder_quantity_check" check ("quantity" > 0),
        constraint "preorder_status_check" check ("status" in ('pending', 'authorized', 'captured', 'cancelled', 'expired', 'converted')),
        constraint "preorder_drop_id_foreign" foreign key ("drop_id") references "engagement"."drop" ("id") on delete set null
      );
    `)

    this.addSql(`create index if not exists "preorder_email_idx" on "commerce"."preorder" (lower("email"), "created_at" desc);`)
    this.addSql(`create index if not exists "preorder_status_expires_idx" on "commerce"."preorder" ("status", "expires_at");`)
    this.addSql(`create unique index if not exists "preorder_payment_intent_unique" on "commerce"."preorder" ("payment_intent_id") where "payment_intent_id" is not null;`)
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "commerce"."preorder" cascade;`)
    this.addSql(`drop table if exists "commerce"."order_item_profile" cascade;`)
    this.addSql(`drop table if exists "commerce"."order_profile" cascade;`)
    this.addSql(`drop table if exists "commerce"."promotion_profile" cascade;`)
  }
}
