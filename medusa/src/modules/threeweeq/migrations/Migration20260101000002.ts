import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260101000002 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "catalog"."media_asset" (
        "id" text not null,
        "storage_key" text not null,
        "url" text not null,
        "mime_type" text not null,
        "width" integer null,
        "height" integer null,
        "bytes" bigint null,
        "alt_ar" text null,
        "alt_en" text null,
        "blurhash" text null,
        "focal_x" numeric(5, 4) null,
        "focal_y" numeric(5, 4) null,
        "metadata" jsonb not null default '{}'::jsonb,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "media_asset_pkey" primary key ("id"),
        constraint "media_asset_storage_key_unique" unique ("storage_key"),
        constraint "media_asset_focal_x_check" check ("focal_x" is null or ("focal_x" >= 0 and "focal_x" <= 1)),
        constraint "media_asset_focal_y_check" check ("focal_y" is null or ("focal_y" >= 0 and "focal_y" <= 1))
      );
    `)

    this.addSql(`
      create table if not exists "catalog"."civilization" (
        "id" text not null,
        "code" text not null,
        "status" text not null default 'draft',
        "launch_at" timestamptz null,
        "sort_order" integer not null default 0,
        "accent_color" text null,
        "hero_media_id" text null,
        "metadata" jsonb not null default '{}'::jsonb,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "civilization_pkey" primary key ("id"),
        constraint "civilization_code_unique" unique ("code"),
        constraint "civilization_status_check" check ("status" in ('draft', 'announced', 'live', 'archived')),
        constraint "civilization_hero_media_id_foreign" foreign key ("hero_media_id") references "catalog"."media_asset" ("id") on delete set null
      );
    `)

    this.addSql(`
      create table if not exists "catalog"."civilization_translation" (
        "civilization_id" text not null,
        "locale" text not null,
        "name" text not null,
        "subtitle" text null,
        "description" text null,
        "story" text null,
        "seo_title" text null,
        "seo_description" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "civilization_translation_pkey" primary key ("civilization_id", "locale"),
        constraint "civilization_translation_locale_check" check ("locale" in ('ar', 'en')),
        constraint "civilization_translation_civilization_id_foreign" foreign key ("civilization_id") references "catalog"."civilization" ("id") on delete cascade
      );
    `)

    this.addSql(`
      create table if not exists "catalog"."product_type" (
        "id" text not null,
        "code" text not null,
        "name_ar" text not null,
        "name_en" text not null,
        "description_ar" text null,
        "description_en" text null,
        "sort_order" integer not null default 0,
        "is_active" boolean not null default true,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "product_type_pkey" primary key ("id"),
        constraint "product_type_code_unique" unique ("code")
      );
    `)

    this.addSql(`
      create table if not exists "catalog"."collection_profile" (
        "id" text not null,
        "handle" text not null,
        "civilization_id" text not null,
        "product_type_id" text null,
        "status" text not null default 'draft',
        "sort_order" integer not null default 0,
        "hero_media_id" text null,
        "launch_at" timestamptz null,
        "metadata" jsonb not null default '{}'::jsonb,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "collection_profile_pkey" primary key ("id"),
        constraint "collection_profile_handle_unique" unique ("handle"),
        constraint "collection_profile_status_check" check ("status" in ('draft', 'scheduled', 'live', 'archived')),
        constraint "collection_profile_civilization_id_foreign" foreign key ("civilization_id") references "catalog"."civilization" ("id") on delete restrict,
        constraint "collection_profile_product_type_id_foreign" foreign key ("product_type_id") references "catalog"."product_type" ("id") on delete set null,
        constraint "collection_profile_hero_media_id_foreign" foreign key ("hero_media_id") references "catalog"."media_asset" ("id") on delete set null
      );
    `)

    this.addSql(`
      create table if not exists "catalog"."collection_translation" (
        "collection_id" text not null,
        "locale" text not null,
        "title" text not null,
        "subtitle" text null,
        "description" text null,
        "story" text null,
        "seo_title" text null,
        "seo_description" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "collection_translation_pkey" primary key ("collection_id", "locale"),
        constraint "collection_translation_locale_check" check ("locale" in ('ar', 'en')),
        constraint "collection_translation_collection_id_foreign" foreign key ("collection_id") references "catalog"."collection_profile" ("id") on delete cascade
      );
    `)

    this.addSql(`
      create table if not exists "catalog"."product_profile" (
        "product_id" text not null,
        "civilization_id" text not null,
        "collection_id" text null,
        "product_type_id" text not null,
        "status" text not null default 'draft',
        "is_limited" boolean not null default false,
        "is_serialized" boolean not null default false,
        "edition_size" integer null,
        "launch_at" timestamptz null,
        "hero_media_id" text null,
        "olfactory_pyramid" jsonb not null default '{}'::jsonb,
        "specifications" jsonb not null default '{}'::jsonb,
        "metadata" jsonb not null default '{}'::jsonb,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "product_profile_pkey" primary key ("product_id"),
        constraint "product_profile_status_check" check ("status" in ('draft', 'active', 'archived')),
        constraint "product_profile_edition_size_check" check ("edition_size" is null or "edition_size" > 0),
        constraint "product_profile_civilization_id_foreign" foreign key ("civilization_id") references "catalog"."civilization" ("id") on delete restrict,
        constraint "product_profile_collection_id_foreign" foreign key ("collection_id") references "catalog"."collection_profile" ("id") on delete set null,
        constraint "product_profile_product_type_id_foreign" foreign key ("product_type_id") references "catalog"."product_type" ("id") on delete restrict,
        constraint "product_profile_hero_media_id_foreign" foreign key ("hero_media_id") references "catalog"."media_asset" ("id") on delete set null
      );
    `)

    this.addSql(`
      create table if not exists "catalog"."product_translation" (
        "product_id" text not null,
        "locale" text not null,
        "title" text not null,
        "subtitle" text null,
        "short_description" text null,
        "description" text null,
        "story" text null,
        "ingredients" text null,
        "ritual" text null,
        "seo_title" text null,
        "seo_description" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "product_translation_pkey" primary key ("product_id", "locale"),
        constraint "product_translation_locale_check" check ("locale" in ('ar', 'en')),
        constraint "product_translation_product_id_foreign" foreign key ("product_id") references "catalog"."product_profile" ("product_id") on delete cascade
      );
    `)

    this.addSql(`
      create table if not exists "catalog"."variant_profile" (
        "variant_id" text not null,
        "product_id" text not null,
        "size_ml" integer null,
        "concentration" text null,
        "packaging" text null,
        "is_serialized" boolean not null default false,
        "edition_size" integer null,
        "metadata" jsonb not null default '{}'::jsonb,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "variant_profile_pkey" primary key ("variant_id"),
        constraint "variant_profile_size_ml_check" check ("size_ml" is null or "size_ml" > 0),
        constraint "variant_profile_edition_size_check" check ("edition_size" is null or "edition_size" > 0)
      );
    `)

    this.addSql(`
      create table if not exists "catalog"."product_media" (
        "product_id" text not null,
        "media_id" text not null,
        "role" text not null default 'gallery',
        "sort_order" integer not null default 0,
        "created_at" timestamptz not null default now(),
        constraint "product_media_pkey" primary key ("product_id", "media_id", "role"),
        constraint "product_media_role_check" check ("role" in ('hero', 'gallery', 'detail', 'packaging', 'editorial', 'video')),
        constraint "product_media_media_id_foreign" foreign key ("media_id") references "catalog"."media_asset" ("id") on delete cascade
      );
    `)

    this.addSql(`
      create table if not exists "catalog"."product_relationship" (
        "source_product_id" text not null,
        "target_product_id" text not null,
        "relation_type" text not null,
        "sort_order" integer not null default 0,
        "created_at" timestamptz not null default now(),
        constraint "product_relationship_pkey" primary key ("source_product_id", "target_product_id", "relation_type"),
        constraint "product_relationship_not_self_check" check ("source_product_id" <> "target_product_id"),
        constraint "product_relationship_type_check" check ("relation_type" in ('related', 'upsell', 'cross_sell', 'complete_the_ritual'))
      );
    `)

    this.addSql(`
      create table if not exists "catalog"."serial_unit" (
        "id" text not null,
        "product_id" text not null,
        "variant_id" text not null,
        "serial" text not null,
        "edition_number" integer not null,
        "edition_size" integer not null,
        "status" text not null default 'allocated',
        "order_id" text null,
        "order_item_id" text null,
        "allocated_at" timestamptz not null default now(),
        "sold_at" timestamptz null,
        "voided_at" timestamptz null,
        "metadata" jsonb not null default '{}'::jsonb,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "serial_unit_pkey" primary key ("id"),
        constraint "serial_unit_product_serial_unique" unique ("product_id", "serial"),
        constraint "serial_unit_variant_edition_unique" unique ("variant_id", "edition_number"),
        constraint "serial_unit_edition_number_check" check ("edition_number" > 0),
        constraint "serial_unit_edition_size_check" check ("edition_size" > 0),
        constraint "serial_unit_edition_range_check" check ("edition_number" <= "edition_size"),
        constraint "serial_unit_status_check" check ("status" in ('allocated', 'reserved', 'sold', 'void', 'returned'))
      );
    `)

    this.addSql(`create index if not exists "civilization_status_sort_idx" on "catalog"."civilization" ("status", "sort_order");`)
    this.addSql(`create index if not exists "collection_profile_civilization_idx" on "catalog"."collection_profile" ("civilization_id", "status");`)
    this.addSql(`create index if not exists "product_profile_civilization_idx" on "catalog"."product_profile" ("civilization_id", "status");`)
    this.addSql(`create index if not exists "product_profile_collection_idx" on "catalog"."product_profile" ("collection_id");`)
    this.addSql(`create index if not exists "product_profile_type_idx" on "catalog"."product_profile" ("product_type_id");`)
    this.addSql(`create index if not exists "variant_profile_product_idx" on "catalog"."variant_profile" ("product_id");`)
    this.addSql(`create index if not exists "product_media_product_idx" on "catalog"."product_media" ("product_id", "role", "sort_order");`)
    this.addSql(`create index if not exists "product_relationship_target_idx" on "catalog"."product_relationship" ("target_product_id", "relation_type");`)
    this.addSql(`create index if not exists "serial_unit_variant_status_idx" on "catalog"."serial_unit" ("variant_id", "status");`)
    this.addSql(`create index if not exists "serial_unit_order_idx" on "catalog"."serial_unit" ("order_id") where "order_id" is not null;`)
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "catalog"."serial_unit" cascade;`)
    this.addSql(`drop table if exists "catalog"."product_relationship" cascade;`)
    this.addSql(`drop table if exists "catalog"."product_media" cascade;`)
    this.addSql(`drop table if exists "catalog"."variant_profile" cascade;`)
    this.addSql(`drop table if exists "catalog"."product_translation" cascade;`)
    this.addSql(`drop table if exists "catalog"."product_profile" cascade;`)
    this.addSql(`drop table if exists "catalog"."collection_translation" cascade;`)
    this.addSql(`drop table if exists "catalog"."collection_profile" cascade;`)
    this.addSql(`drop table if exists "catalog"."product_type" cascade;`)
    this.addSql(`drop table if exists "catalog"."civilization_translation" cascade;`)
    this.addSql(`drop table if exists "catalog"."civilization" cascade;`)
    this.addSql(`drop table if exists "catalog"."media_asset" cascade;`)
  }
}
