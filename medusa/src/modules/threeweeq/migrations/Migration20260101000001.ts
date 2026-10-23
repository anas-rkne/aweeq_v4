import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260101000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(`create schema if not exists "catalog";`)
    this.addSql(`create schema if not exists "engagement";`)
    this.addSql(`create schema if not exists "commerce";`)
    this.addSql(`create schema if not exists "content";`)
    this.addSql(`create schema if not exists "ops";`)
  }

  async down(): Promise<void> {
    this.addSql(`drop schema if exists "ops" cascade;`)
    this.addSql(`drop schema if exists "content" cascade;`)
    this.addSql(`drop schema if exists "commerce" cascade;`)
    this.addSql(`drop schema if exists "engagement" cascade;`)
    this.addSql(`drop schema if exists "catalog" cascade;`)
  }
}
