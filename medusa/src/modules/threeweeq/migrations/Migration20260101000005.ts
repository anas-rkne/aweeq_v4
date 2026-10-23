import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260101000005 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "content"."journal_post" (
        "id" text not null,
        "slug" text not null,
        "civilization_id" text null,
        "product_id" text null,
        "status" text not null default 'draft',
        "cover_media_id" text null,
        "author_name" text null,
        "reading_minutes" integer null,
        "tags" text[] not null default '{}',
        "published_at" timestamptz null,
        "title_ar" text not null,
        "title_en" text not null,
        "excerpt_ar" text null,
        "excerpt_en" text null,
        "body_ar" text null,
        "body_en" text null,
        "metadata" jsonb not null default '{}'::jsonb,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "journal_post_pkey" primary key ("id"),
        constraint "journal_post_slug_unique" unique ("slug"),
        constraint "journal_post_status_check" check ("status" in ('draft', 'published', 'archived')),
        constraint "journal_post_reading_minutes_check" check ("reading_minutes" is null or "reading_minutes" > 0),
        constraint "journal_post_civilization_id_foreign" foreign key ("civilization_id") references "catalog"."civilization" ("id") on delete set null,
        constraint "journal_post_cover_media_id_foreign" foreign key ("cover_media_id") references "catalog"."media_asset" ("id") on delete set null
      );
    `)

    this.addSql(`create index if not exists "journal_post_status_published_idx" on "content"."journal_post" ("status", "published_at" desc);`)
    this.addSql(`create index if not exists "journal_post_civilization_idx" on "content"."journal_post" ("civilization_id");`)

    this.addSql(`
      create table if not exists "ops"."webhook_event" (
        "id" text not null,
        "provider" text not null,
        "external_id" text null,
        "event_type" text not null,
        "payload" jsonb not null,
        "headers" jsonb not null default '{}'::jsonb,
        "status" text not null default 'received',
        "attempts" integer not null default 0,
        "last_error" text null,
        "received_at" timestamptz not null default now(),
        "processed_at" timestamptz null,
        constraint "webhook_event_pkey" primary key ("id"),
        constraint "webhook_event_status_check" check ("status" in ('received', 'processing', 'processed', 'failed', 'ignored')),
        constraint "webhook_event_attempts_check" check ("attempts" >= 0)
      );
    `)

    this.addSql(`create unique index if not exists "webhook_event_provider_external_unique" on "ops"."webhook_event" ("provider", "external_id") where "external_id" is not null;`)
    this.addSql(`create index if not exists "webhook_event_status_idx" on "ops"."webhook_event" ("status", "received_at");`)

    this.addSql(`
      create table if not exists "ops"."outbox_event" (
        "id" text not null,
        "aggregate_type" text not null,
        "aggregate_id" text not null,
        "event_type" text not null,
        "payload" jsonb not null default '{}'::jsonb,
        "status" text not null default 'pending',
        "attempts" integer not null default 0,
        "available_at" timestamptz not null default now(),
        "last_error" text null,
        "created_at" timestamptz not null default now(),
        "published_at" timestamptz null,
        constraint "outbox_event_pkey" primary key ("id"),
        constraint "outbox_event_status_check" check ("status" in ('pending', 'processing', 'published', 'failed')),
        constraint "outbox_event_attempts_check" check ("attempts" >= 0)
      );
    `)

    this.addSql(`create index if not exists "outbox_event_dispatch_idx" on "ops"."outbox_event" ("status", "available_at");`)

    this.addSql(`
      create table if not exists "ops"."idempotency_key" (
        "key" text not null,
        "scope" text not null,
        "request_hash" text null,
        "response_status" integer null,
        "response_body" jsonb null,
        "status" text not null default 'in_progress',
        "locked_until" timestamptz null,
        "expires_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "idempotency_key_pkey" primary key ("key"),
        constraint "idempotency_key_status_check" check ("status" in ('in_progress', 'completed', 'failed')),
        constraint "idempotency_key_response_status_check" check ("response_status" is null or ("response_status" >= 100 and "response_status" <= 599))
      );
    `)

    this.addSql(`create index if not exists "idempotency_key_expires_idx" on "ops"."idempotency_key" ("expires_at");`)

    this.addSql(`
      create table if not exists "ops"."audit_log" (
        "id" text not null,
        "actor_id" text null,
        "actor_type" text not null default 'system',
        "action" text not null,
        "entity_type" text not null,
        "entity_id" text not null,
        "before" jsonb null,
        "after" jsonb null,
        "ip" inet null,
        "user_agent" text null,
        "metadata" jsonb not null default '{}'::jsonb,
        "created_at" timestamptz not null default now(),
        constraint "audit_log_pkey" primary key ("id"),
        constraint "audit_log_actor_type_check" check ("actor_type" in ('customer', 'admin', 'system', 'webhook'))
      );
    `)

    this.addSql(`create index if not exists "audit_log_entity_idx" on "ops"."audit_log" ("entity_type", "entity_id", "created_at" desc);`)
    this.addSql(`create index if not exists "audit_log_actor_idx" on "ops"."audit_log" ("actor_type", "actor_id", "created_at" desc);`)
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "ops"."audit_log" cascade;`)
    this.addSql(`drop table if exists "ops"."idempotency_key" cascade;`)
    this.addSql(`drop table if exists "ops"."outbox_event" cascade;`)
    this.addSql(`drop table if exists "ops"."webhook_event" cascade;`)
    this.addSql(`drop table if exists "content"."journal_post" cascade;`)
  }
}
