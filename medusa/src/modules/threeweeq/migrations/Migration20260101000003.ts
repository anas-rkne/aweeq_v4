import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260101000003 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "engagement"."drop" (
        "id" text not null,
        "slug" text not null,
        "civilization_id" text not null,
        "product_id" text null,
        "title_ar" text not null,
        "title_en" text not null,
        "status" text not null default 'draft',
        "opens_at" timestamptz null,
        "closes_at" timestamptz null,
        "total_units" integer not null default 0,
        "per_customer_limit" integer not null default 1,
        "requires_waitlist" boolean not null default false,
        "metadata" jsonb not null default '{}'::jsonb,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "drop_pkey" primary key ("id"),
        constraint "drop_slug_unique" unique ("slug"),
        constraint "drop_status_check" check ("status" in ('draft', 'scheduled', 'live', 'closed', 'sold_out')),
        constraint "drop_total_units_check" check ("total_units" >= 0),
        constraint "drop_per_customer_limit_check" check ("per_customer_limit" > 0),
        constraint "drop_window_check" check ("opens_at" is null or "closes_at" is null or "closes_at" > "opens_at"),
        constraint "drop_civilization_id_foreign" foreign key ("civilization_id") references "catalog"."civilization" ("id") on delete restrict
      );
    `)

    this.addSql(`
      create table if not exists "engagement"."drop_allocation" (
        "id" text not null,
        "drop_id" text not null,
        "variant_id" text not null,
        "quantity" integer not null default 0,
        "reserved_quantity" integer not null default 0,
        "sold_quantity" integer not null default 0,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "drop_allocation_pkey" primary key ("id"),
        constraint "drop_allocation_drop_variant_unique" unique ("drop_id", "variant_id"),
        constraint "drop_allocation_quantity_check" check ("quantity" >= 0),
        constraint "drop_allocation_reserved_check" check ("reserved_quantity" >= 0),
        constraint "drop_allocation_sold_check" check ("sold_quantity" >= 0),
        constraint "drop_allocation_total_check" check ("reserved_quantity" + "sold_quantity" <= "quantity"),
        constraint "drop_allocation_drop_id_foreign" foreign key ("drop_id") references "engagement"."drop" ("id") on delete cascade
      );
    `)

    this.addSql(`
      create table if not exists "engagement"."waitlist_entry" (
        "id" text not null,
        "civilization_id" text not null,
        "drop_id" text null,
        "email" text not null,
        "customer_id" text null,
        "locale" text not null default 'ar',
        "source" text null,
        "status" text not null default 'pending',
        "confirmed_at" timestamptz null,
        "invited_at" timestamptz null,
        "converted_at" timestamptz null,
        "metadata" jsonb not null default '{}'::jsonb,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "waitlist_entry_pkey" primary key ("id"),
        constraint "waitlist_entry_locale_check" check ("locale" in ('ar', 'en')),
        constraint "waitlist_entry_status_check" check ("status" in ('pending', 'confirmed', 'invited', 'converted', 'unsubscribed', 'bounced')),
        constraint "waitlist_entry_civilization_id_foreign" foreign key ("civilization_id") references "catalog"."civilization" ("id") on delete restrict,
        constraint "waitlist_entry_drop_id_foreign" foreign key ("drop_id") references "engagement"."drop" ("id") on delete set null
      );
    `)

    this.addSql(`create unique index if not exists "waitlist_entry_civilization_email_unique" on "engagement"."waitlist_entry" ("civilization_id", lower("email")) where "deleted_at" is null;`)
    this.addSql(`create index if not exists "waitlist_entry_status_idx" on "engagement"."waitlist_entry" ("status", "created_at");`)

    this.addSql(`
      create table if not exists "engagement"."waitlist_event" (
        "id" text not null,
        "entry_id" text not null,
        "event_type" text not null,
        "payload" jsonb not null default '{}'::jsonb,
        "created_at" timestamptz not null default now(),
        constraint "waitlist_event_pkey" primary key ("id"),
        constraint "waitlist_event_type_check" check ("event_type" in ('created', 'confirmed', 'invited', 'converted', 'unsubscribed', 'email_sent', 'email_bounced')),
        constraint "waitlist_event_entry_id_foreign" foreign key ("entry_id") references "engagement"."waitlist_entry" ("id") on delete cascade
      );
    `)

    this.addSql(`
      create table if not exists "engagement"."review" (
        "id" text not null,
        "product_id" text not null,
        "customer_id" text null,
        "order_id" text null,
        "rating" integer not null,
        "title" text null,
        "body" text null,
        "locale" text not null default 'ar',
        "status" text not null default 'pending',
        "is_verified_purchase" boolean not null default false,
        "helpful_count" integer not null default 0,
        "published_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "review_pkey" primary key ("id"),
        constraint "review_rating_check" check ("rating" between 1 and 5),
        constraint "review_locale_check" check ("locale" in ('ar', 'en')),
        constraint "review_status_check" check ("status" in ('pending', 'published', 'rejected')),
        constraint "review_helpful_count_check" check ("helpful_count" >= 0)
      );
    `)

    this.addSql(`create unique index if not exists "review_customer_product_unique" on "engagement"."review" ("customer_id", "product_id") where "customer_id" is not null and "deleted_at" is null;`)
    this.addSql(`create index if not exists "review_product_status_idx" on "engagement"."review" ("product_id", "status", "published_at" desc);`)

    this.addSql(`
      create table if not exists "engagement"."review_media" (
        "id" text not null,
        "review_id" text not null,
        "media_id" text not null,
        "sort_order" integer not null default 0,
        "created_at" timestamptz not null default now(),
        constraint "review_media_pkey" primary key ("id"),
        constraint "review_media_review_media_unique" unique ("review_id", "media_id"),
        constraint "review_media_review_id_foreign" foreign key ("review_id") references "engagement"."review" ("id") on delete cascade,
        constraint "review_media_media_id_foreign" foreign key ("media_id") references "catalog"."media_asset" ("id") on delete cascade
      );
    `)

    this.addSql(`
      create table if not exists "engagement"."loyalty_tier" (
        "id" text not null,
        "code" text not null,
        "name_ar" text not null,
        "name_en" text not null,
        "min_points" integer not null default 0,
        "benefits" jsonb not null default '{}'::jsonb,
        "sort_order" integer not null default 0,
        "is_active" boolean not null default true,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "loyalty_tier_pkey" primary key ("id"),
        constraint "loyalty_tier_code_unique" unique ("code"),
        constraint "loyalty_tier_min_points_check" check ("min_points" >= 0)
      );
    `)

    this.addSql(`
      create table if not exists "engagement"."loyalty_account" (
        "id" text not null,
        "customer_id" text not null,
        "tier_id" text null,
        "points_balance" integer not null default 0,
        "lifetime_points" integer not null default 0,
        "status" text not null default 'active',
        "enrolled_at" timestamptz not null default now(),
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "loyalty_account_pkey" primary key ("id"),
        constraint "loyalty_account_customer_id_unique" unique ("customer_id"),
        constraint "loyalty_account_balance_check" check ("points_balance" >= 0),
        constraint "loyalty_account_lifetime_check" check ("lifetime_points" >= 0),
        constraint "loyalty_account_status_check" check ("status" in ('active', 'suspended', 'closed')),
        constraint "loyalty_account_tier_id_foreign" foreign key ("tier_id") references "engagement"."loyalty_tier" ("id") on delete set null
      );
    `)

    this.addSql(`
      create table if not exists "engagement"."loyalty_transaction" (
        "id" text not null,
        "account_id" text not null,
        "order_id" text null,
        "type" text not null,
        "points" integer not null,
        "balance_after" integer not null,
        "reason" text null,
        "metadata" jsonb not null default '{}'::jsonb,
        "created_at" timestamptz not null default now(),
        constraint "loyalty_transaction_pkey" primary key ("id"),
        constraint "loyalty_transaction_type_check" check ("type" in ('earn', 'redeem', 'adjust', 'expire', 'refund')),
        constraint "loyalty_transaction_balance_after_check" check ("balance_after" >= 0),
        constraint "loyalty_transaction_account_id_foreign" foreign key ("account_id") references "engagement"."loyalty_account" ("id") on delete cascade
      );
    `)

    this.addSql(`create index if not exists "loyalty_transaction_account_idx" on "engagement"."loyalty_transaction" ("account_id", "created_at" desc);`)

    this.addSql(`
      create table if not exists "engagement"."consent_record" (
        "id" text not null,
        "customer_id" text null,
        "email" text null,
        "purpose" text not null,
        "granted" boolean not null,
        "policy_version" text null,
        "source" text null,
        "ip" inet null,
        "user_agent" text null,
        "created_at" timestamptz not null default now(),
        constraint "consent_record_pkey" primary key ("id"),
        constraint "consent_record_purpose_check" check ("purpose" in ('marketing_email', 'sms', 'analytics', 'personalization', 'terms', 'privacy'))
      );
    `)

    this.addSql(`create index if not exists "consent_record_email_idx" on "engagement"."consent_record" (lower("email"), "purpose", "created_at" desc);`)

    this.addSql(`
      create table if not exists "engagement"."newsletter_subscriber" (
        "id" text not null,
        "email" text not null,
        "locale" text not null default 'ar',
        "status" text not null default 'pending',
        "source" text null,
        "confirmed_at" timestamptz null,
        "unsubscribed_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "newsletter_subscriber_pkey" primary key ("id"),
        constraint "newsletter_subscriber_locale_check" check ("locale" in ('ar', 'en')),
        constraint "newsletter_subscriber_status_check" check ("status" in ('pending', 'subscribed', 'unsubscribed', 'bounced'))
      );
    `)

    this.addSql(`create unique index if not exists "newsletter_subscriber_email_unique" on "engagement"."newsletter_subscriber" (lower("email")) where "deleted_at" is null;`)
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "engagement"."newsletter_subscriber" cascade;`)
    this.addSql(`drop table if exists "engagement"."consent_record" cascade;`)
    this.addSql(`drop table if exists "engagement"."loyalty_transaction" cascade;`)
    this.addSql(`drop table if exists "engagement"."loyalty_account" cascade;`)
    this.addSql(`drop table if exists "engagement"."loyalty_tier" cascade;`)
    this.addSql(`drop table if exists "engagement"."review_media" cascade;`)
    this.addSql(`drop table if exists "engagement"."review" cascade;`)
    this.addSql(`drop table if exists "engagement"."waitlist_event" cascade;`)
    this.addSql(`drop table if exists "engagement"."waitlist_entry" cascade;`)
    this.addSql(`drop table if exists "engagement"."drop_allocation" cascade;`)
    this.addSql(`drop table if exists "engagement"."drop" cascade;`)
  }
}
