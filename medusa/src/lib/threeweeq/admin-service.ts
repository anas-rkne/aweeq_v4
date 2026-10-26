import { randomUUID } from "crypto"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import { ThreeweeqRepository } from "./repository"

type AnyRow = Record<string, any>

const DEFAULT_CURRENCY = "aed"

function firstResult(value: any) {
  const output = value?.result ?? value
  return Array.isArray(output) ? (output[0] ?? null) : (output ?? null)
}

async function rawRows(
  executor: any,
  sql: string,
  bindings: unknown[] = []
): Promise<AnyRow[]> {
  const result = await executor.raw(sql, bindings as any)
  return (result?.rows ?? []) as AnyRow[]
}

/**
 * Admin-side orchestration for the 3WEEQ catalog. Combines Medusa core
 * workflows (products, prices, variants) with the custom `catalog.*` tables
 * that the storefront reads. All reads use parameterized raw SQL — no
 * joinRaw/leftJoinRaw (removed in knex 3).
 */
export class CatalogAdminService {
  private repository: ThreeweeqRepository

  constructor(private readonly container: MedusaContainer) {
    this.repository = new ThreeweeqRepository(container)
  }

  private get db(): any {
    return this.container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  }

  private get query(): any {
    return this.container.resolve(ContainerRegistrationKeys.QUERY)
  }

  private async resolveSalesChannelId(): Promise<string | null> {
    const { data } = await this.query.graph({
      entity: "sales_channel",
      fields: ["id", "name"],
      pagination: { skip: 0, take: 1 },
    })
    return data?.[0]?.id ?? null
  }

  private async audit(
    actorId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    before?: unknown,
    after?: unknown
  ) {
    try {
      await this.db("ops.audit_log").insert({
        id: randomUUID(),
        actor_id: actorId,
        actor_type: actorId ? "admin" : "system",
        action,
        entity_type: entityType,
        entity_id: entityId,
        before: before ? JSON.stringify(before) : null,
        after: after ? JSON.stringify(after) : null,
        created_at: this.db.fn.now(),
      })
    } catch {
      // audit is best-effort, never break the main operation
    }
  }

  /* ============================ products ============================ */

  async listProductsAdmin(input: {
    limit?: number
    offset?: number
    q?: string
    civilizationId?: string
    collectionId?: string
    status?: string
  }) {
    const limit = Math.min(100, Math.max(1, input.limit ?? 20))
    const offset = Math.max(0, input.offset ?? 0)
    const bindings: unknown[] = []
    const where: string[] = ["p.deleted_at is null"]

    if (input.civilizationId) {
      bindings.push(input.civilizationId)
      where.push(`p.civilization_id = $${bindings.length}`)
    }
    if (input.collectionId) {
      bindings.push(input.collectionId)
      where.push(`p.collection_id = $${bindings.length}`)
    }
    if (input.status) {
      bindings.push(input.status)
      where.push(`p.status = $${bindings.length}`)
    }
    if (input.q?.trim()) {
      bindings.push(`%${input.q.trim()}%`)
      where.push(
        `(coalesce(ptr.title, '') ilike $${bindings.length} or coalesce(pt.title, '') ilike $${bindings.length})`
      )
    }

    const whereSql = where.join(" and ")
    const offsetIdx = bindings.length + 1
    const limitIdx = bindings.length + 2

    const items = await rawRows(
      this.db,
      `select
         p.product_id, p.civilization_id, p.collection_id, p.product_type_id,
         p.status, p.is_limited, p.is_serialized, p.edition_size,
         p.max_per_customer, p.launch_at,
         pt.title as title_ar, ptr.title as title_en,
         cp.handle as collection_handle,
         pt.subtitle as subtitle_ar, ptr.subtitle as subtitle_en
       from catalog.product_profile p
       left join catalog.product_translation pt
         on pt.product_id = p.product_id and pt.locale = 'ar'
       left join catalog.product_translation ptr
         on ptr.product_id = p.product_id and ptr.locale = 'en'
       left join catalog.collection_profile cp on cp.id = p.collection_id
       where ${whereSql}
       order by p.created_at desc
       limit $${offsetIdx} offset $${limitIdx}`,
      [...bindings, limit, offset]
    )

    const countRow = await rawRows(
      this.db,
      `select count(p.product_id)::text as count
       from catalog.product_profile p
       left join catalog.product_translation pt
         on pt.product_id = p.product_id and pt.locale = 'ar'
       where ${whereSql}`,
      bindings
    )

    return { items, count: Number(countRow[0]?.count ?? 0) }
  }

  async getProductAdmin(productId: string) {
    const profile = await rawRows(
      this.db,
      `select * from catalog.product_profile where product_id = $1 and deleted_at is null limit 1`,
      [productId]
    )

    if (!profile[0]) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Product not found")
    }

    const translations = await rawRows(
      this.db,
      `select * from catalog.product_translation where product_id = $1 order by locale`,
      [productId]
    )

    const variantProfiles = await rawRows(
      this.db,
      `select * from catalog.variant_profile where product_id = $1 and deleted_at is null`,
      [productId]
    )

    const media = await rawRows(
      this.db,
      `select pm.role, pm.sort_order, m.*
       from catalog.product_media pm
       join catalog.media_asset m on m.id = pm.media_id
       where pm.product_id = $1
       order by pm.sort_order asc`,
      [productId]
    )

    return { profile: profile[0], translations, variantProfiles, media }
  }

  async createProduct(input: AnyRow) {
    const handle = String(input.handle ?? "").trim().toLowerCase()
    if (!/^[a-z0-9-]+$/.test(handle)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "handle must contain only lowercase letters, numbers and dashes"
      )
    }

    const titleAr = String(input.title_ar ?? "").trim()
    const titleEn = String(input.title_en ?? "").trim()
    if (!titleAr || !titleEn) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "title_ar and title_en are required"
      )
    }

    const variants = Array.isArray(input.variants) ? input.variants : []
    if (!variants.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "At least one variant is required"
      )
    }

    for (const variant of variants) {
      const amount = Number(variant.price)
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Variant "${variant.title}" needs a positive price in AED`
        )
      }
    }

    const salesChannelId = await this.resolveSalesChannelId()

    let createdProductId: string | null = null

    try {
      const result = await createProductsWorkflow(this.container).run({
        input: {
          products: [
            {
              title: titleAr,
              handle,
              status: "draft",
              options: [
                {
                  title: "Size",
                  values: variants.map((variant: AnyRow) =>
                    String(variant.title ?? "")
                  ),
                },
              ],
              variants: variants.map((variant: AnyRow) => ({
                title: String(variant.title ?? ""),
                sku: variant.sku ? String(variant.sku) : undefined,
                manage_inventory: false,
                allow_backorder: false,
                options: { Size: String(variant.title ?? "") },
                prices: [
                  {
                    amount: Number(variant.price),
                    currency_code: DEFAULT_CURRENCY,
                  },
                ],
              })),
              ...(salesChannelId
                ? { sales_channels: [{ id: salesChannelId }] }
                : {}),
            },
          ],
        },
      })

      createdProductId = firstResult(result)?.id ?? null
      if (!createdProductId) {
        throw new Error("Product creation returned no id")
      }

      const { data: details } = await this.query.graph({
        entity: "product",
        fields: ["id", "handle", "variants.id", "variants.title"],
        filters: { id: createdProductId },
      })

      const createdVariants = details?.[0]?.variants ?? []
      const variantIdByTitle = new Map(
        createdVariants.map((variant: AnyRow) => [variant.title, variant.id])
      )

      await this.db.transaction(async (trx: any) => {
        await trx("catalog.product_profile")
          .insert({
            product_id: createdProductId,
            civilization_id: input.civilization_id ?? null,
            collection_id: input.collection_id ?? null,
            product_type_id: input.product_type_id ?? null,
            status: "draft",
            is_limited: Boolean(input.is_limited),
            is_serialized: Boolean(input.is_serialized),
            edition_size: input.edition_size ?? null,
            launch_at: input.launch_at ?? null,
            hero_media_id: input.hero_media_id ?? null,
            olfactory_pyramid: JSON.stringify(input.olfactory_pyramid ?? {}),
            specifications: JSON.stringify(input.specifications ?? {}),
            max_per_customer: input.max_per_customer ?? null,
            metadata: JSON.stringify(input.metadata ?? {}),
            created_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          })
          .onConflict("product_id")
          .ignore()

        for (const locale of ["ar", "en"] as const) {
          await trx("catalog.product_translation")
            .insert({
              product_id: createdProductId,
              locale,
              title: String(input[`title_${locale}`] ?? "").trim(),
              subtitle: input[`subtitle_${locale}`] ?? null,
              short_description: input[`short_description_${locale}`] ?? null,
              description: input[`description_${locale}`] ?? null,
              story: input[`story_${locale}`] ?? null,
              ingredients: input[`ingredients_${locale}`] ?? null,
              ritual: input[`ritual_${locale}`] ?? null,
              seo_title: input[`seo_title_${locale}`] ?? null,
              seo_description: input[`seo_description_${locale}`] ?? null,
              created_at: trx.fn.now(),
              updated_at: trx.fn.now(),
            })
            .onConflict(["product_id", "locale"])
            .ignore()
        }

        for (const variant of variants) {
          const variantId = variantIdByTitle.get(String(variant.title ?? ""))
          if (!variantId) continue

          await trx("catalog.variant_profile")
            .insert({
              variant_id: variantId,
              product_id: createdProductId,
              size_ml: variant.size_ml ?? null,
              concentration: variant.concentration ?? null,
              packaging: variant.packaging ?? null,
              is_serialized: Boolean(variant.is_serialized),
              edition_size: variant.edition_size ?? null,
              metadata: JSON.stringify(variant.metadata ?? {}),
              created_at: trx.fn.now(),
              updated_at: trx.fn.now(),
            })
            .onConflict("variant_id")
            .ignore()
        }
      })

      await this.audit(
        null,
        "create",
        "product",
        createdProductId,
        null,
        { handle, title_ar: titleAr, title_en: titleEn }
      )

      return this.getProductAdmin(createdProductId)
    } catch (error) {
      if (createdProductId) {
        // best-effort compensation
        try {
          const { deleteProductsWorkflow } = await import(
            "@medusajs/medusa/core-flows"
          )
          await deleteProductsWorkflow(this.container).run({
            input: { ids: [createdProductId] },
          })
        } catch {}
      }
      throw error
    }
  }

  async updateProduct(productId: string, input: AnyRow) {
    const profile = await rawRows(
      this.db,
      `select * from catalog.product_profile where product_id = $1 and deleted_at is null limit 1`,
      [productId]
    )
    if (!profile[0]) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Product not found")
    }

    const updates: AnyRow = {
      updated_at: this.db.fn.now(),
    }

    const keys = [
      "civilization_id",
      "collection_id",
      "product_type_id",
      "is_limited",
      "is_serialized",
      "edition_size",
      "max_per_customer",
      "launch_at",
      "hero_media_id",
    ] as const

    for (const key of keys) {
      if (input[key] !== undefined) {
        updates[key] = input[key]
      }
    }

    if (input.olfactory_pyramid !== undefined) {
      updates.olfactory_pyramid = JSON.stringify(input.olfactory_pyramid ?? {})
    }
    if (input.specifications !== undefined) {
      updates.specifications = JSON.stringify(input.specifications ?? {})
    }

    await this.db.transaction(async (trx: any) => {
      await trx("catalog.product_profile")
        .where({ product_id: productId })
        .update(updates)

      for (const locale of ["ar", "en"] as const) {
        const translation: AnyRow = {}
        const translationKeys = [
          "title",
          "subtitle",
          "short_description",
          "description",
          "story",
          "ingredients",
          "ritual",
          "seo_title",
          "seo_description",
        ]
        for (const key of translationKeys) {
          const value = input[`${key}_${locale}`]
          if (value !== undefined) {
            translation[key] = value
          }
        }

        if (Object.keys(translation).length > 0) {
          await trx("catalog.product_translation")
            .insert({
              product_id: productId,
              locale,
              ...translation,
              created_at: trx.fn.now(),
              updated_at: trx.fn.now(),
            })
            .onConflict(["product_id", "locale"])
            .merge(Object.keys(translation))
        }
      }
    })

    if (input.title_ar !== undefined) {
      try {
        await updateProductsWorkflow(this.container).run({
          input: {
            selector: { id: productId },
            update: { title: String(input.title_ar) },
          },
        })
      } catch {
        // core title is cosmetic; custom translations drive the storefront
      }
    }

    await this.audit(null, "update", "product", productId, profile[0], input)
    return this.getProductAdmin(productId)
  }

  async publishProduct(productId: string) {
    const { profile, translations, variantProfiles, media } =
      await this.getProductAdmin(productId)

    const missing: string[] = []

    const locales = new Set(
      translations.map((translation: AnyRow) => translation.locale)
    )
    if (!locales.has("ar")) missing.push("translation_ar")
    if (!locales.has("en")) missing.push("translation_en")
    if (!media.some((row: AnyRow) => row.role === "hero")) {
      missing.push("hero_media")
    }
    if (!variantProfiles.length) missing.push("variant_profile")

    const core = await this.query.graph({
      entity: "product",
      fields: ["id", "status", "variants.id", "variants.prices.currency_code"],
      filters: { id: productId },
    })
    const coreProduct = core.data?.[0]
    const hasAedPrice = (coreProduct?.variants ?? []).some((variant: AnyRow) =>
      (variant.prices ?? []).some(
        (price: AnyRow) => price.currency_code === DEFAULT_CURRENCY
      )
    )
    if (!hasAedPrice) missing.push("aed_price")

    if (missing.length > 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot publish: ${missing.join(", ")}`
      )
    }

    await updateProductsWorkflow(this.container).run({
      input: {
        selector: { id: productId },
        update: { status: "published" },
      },
    })

    await this.db("catalog.product_profile")
      .where({ product_id: productId })
      .update({ status: "active", updated_at: this.db.fn.now() })

    if (profile.is_serialized) {
      for (const variant of variantProfiles.filter(
        (row: AnyRow) => row.is_serialized
      )) {
        await this.generateSerials({
          variant_id: variant.variant_id,
          edition_size: Number(variant.edition_size ?? 0),
        })
      }
    }

    await this.audit(null, "publish", "product", productId, { status: "draft" }, { status: "active" })
    return this.getProductAdmin(productId)
  }

  async archiveProduct(productId: string) {
    await updateProductsWorkflow(this.container).run({
      input: {
        selector: { id: productId },
        update: { status: "draft" },
      },
    })
    await this.db("catalog.product_profile")
      .where({ product_id: productId })
      .update({ status: "archived", updated_at: this.db.fn.now() })
    await this.audit(null, "archive", "product", productId, null, null)
    return this.getProductAdmin(productId)
  }

  /* ============================ serials ============================ */

  async generateSerials(input: {
    variant_id: string
    edition_size: number
    prefix?: string
  }) {
    const size = Number(input.edition_size)
    if (!Number.isInteger(size) || size <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "edition_size must be a positive integer"
      )
    }

    const variant = await rawRows(
      this.db,
      `select * from catalog.variant_profile where variant_id = $1 limit 1`,
      [input.variant_id]
    )

    if (!variant[0]) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Variant not found")
    }

    const existing = await rawRows(
      this.db,
      `select count(id)::text as count from catalog.serial_unit where variant_id = $1`,
      [input.variant_id]
    )
    const existingCount = Number(existing[0]?.count ?? 0)

    if (existingCount > 0) {
      return {
        generated: 0,
        total: existingCount,
        skipped: true,
        sample: await rawRows(
          this.db,
          `select serial, edition_number from catalog.serial_unit where variant_id = $1 order by edition_number limit 5`,
          [input.variant_id]
        ),
      }
    }

    const prefix = String(
      input.prefix ??
        `RAFID-${String(input.variant_id).slice(-4).toUpperCase()}`
    ).toUpperCase()

    const rows = []
    for (let edition = 1; edition <= size; edition++) {
      rows.push({
        id: randomUUID(),
        product_id: variant[0].product_id,
        variant_id: input.variant_id,
        serial: `${prefix}-${String(edition).padStart(4, "0")}`,
        edition_number: edition,
        edition_size: size,
        status: "allocated",
        allocated_at: new Date(),
        metadata: "{}",
        created_at: new Date(),
        updated_at: new Date(),
      })
    }

    const BATCH = 250
    for (let start = 0; start < rows.length; start += BATCH) {
      await this.db("catalog.serial_unit")
        .insert(rows.slice(start, start + BATCH))
        .onConflict(["variant_id", "edition_number"])
        .ignore()
    }

    await this.audit(
      null,
      "generate_serials",
      "variant",
      input.variant_id,
      null,
      { generated: size }
    )

    return { generated: size, total: size, skipped: false, sample: rows.slice(0, 5) }
  }

  async getSerialStatus(variantId: string) {
    const rows = await rawRows(
      this.db,
      `select status, count(id)::text as count
       from catalog.serial_unit
       where variant_id = $1
       group by status`,
      [variantId]
    )

    return { variant_id: variantId, by_status: rows }
  }

  /* ============================ media ============================ */

  async createMediaAsset(input: {
    url: string
    mime_type?: string
    alt_ar?: string
    alt_en?: string
    focal_x?: number
    focal_y?: number
    product_id?: string
    role?: string
    sort_order?: number
  }) {
    const id = randomUUID()
    await this.db("catalog.media_asset")
      .insert({
        id,
        storage_key: `admin/${id}`,
        url: input.url,
        mime_type: input.mime_type ?? "image/webp",
        alt_ar: input.alt_ar ?? null,
        alt_en: input.alt_en ?? null,
        focal_x: input.focal_x ?? null,
        focal_y: input.focal_y ?? null,
        metadata: "{}",
        created_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      })
      .onConflict("id")
      .ignore()

    if (input.product_id) {
      await this.db("catalog.product_media")
        .insert({
          product_id: input.product_id,
          media_id: id,
          role: input.role ?? "gallery",
          sort_order: input.sort_order ?? 99,
          created_at: this.db.fn.now(),
        })
        .onConflict(["product_id", "media_id", "role"])
        .ignore()
    }

    await this.audit(null, "create", "media", id, null, input)
    return { id, url: input.url }
  }

  async setProductMedia(
    productId: string,
    media: Array<{
      media_id: string
      role: string
      sort_order: number
    }>
  ) {
    await this.db.transaction(async (trx: any) => {
      await trx("catalog.product_media").where({ product_id: productId }).del()
      for (const link of media) {
        await trx("catalog.product_media")
          .insert({
            product_id: productId,
            media_id: link.media_id,
            role: link.role,
            sort_order: link.sort_order,
            created_at: trx.fn.now(),
          })
          .onConflict(["product_id", "media_id", "role"])
          .ignore()
      }
    })
    await this.audit(null, "update", "product_media", productId, null, media)
    return this.getProductAdmin(productId).then((value) => value.media)
  }

  /* ===================== civilizations & collections ===================== */

  async listCivilizationsAdmin() {
    const items = await rawRows(
      this.db,
      `select c.*, ct.name as name_ar, ctr.name as name_en,
              m.url as hero_url
       from catalog.civilization c
       left join catalog.civilization_translation ct
         on ct.civilization_id = c.id and ct.locale = 'ar'
       left join catalog.civilization_translation ctr
         on ctr.civilization_id = c.id and ctr.locale = 'en'
       left join catalog.media_asset m on m.id = c.hero_media_id
       where c.deleted_at is null
       order by c.sort_order asc, c.created_at asc`
    )
    return { civilizations: items }
  }

  async upsertCivilization(input: AnyRow) {
    const id = String(input.id ?? randomUUID())
    const code = String(input.code ?? "").trim()
    if (!code) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "code is required")
    }

    await this.db.transaction(async (trx: any) => {
      await trx("catalog.civilization")
        .insert({
          id,
          code,
          status: input.status ?? "draft",
          launch_at: input.launch_at ?? null,
          sort_order: input.sort_order ?? 0,
          accent_color: input.accent_color ?? null,
          hero_media_id: input.hero_media_id ?? null,
          metadata: "{}",
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        })
        .onConflict("id")
        .merge(["code", "status", "launch_at", "sort_order", "accent_color", "hero_media_id", "updated_at"])

      for (const locale of ["ar", "en"] as const) {
        const translation: AnyRow = {}
        for (const key of [
          "name",
          "subtitle",
          "description",
          "story",
          "seo_title",
          "seo_description",
        ]) {
          const value = input[`${key}_${locale}`]
          if (value !== undefined) translation[key] = value
        }

        if (Object.keys(translation).length > 0) {
          await trx("catalog.civilization_translation")
            .insert({
              civilization_id: id,
              locale,
              name: translation.name ?? "",
              ...translation,
              created_at: trx.fn.now(),
              updated_at: trx.fn.now(),
            })
            .onConflict(["civilization_id", "locale"])
            .merge(Object.keys(translation))
        }
      }
    })

    await this.audit(null, "upsert", "civilization", id, null, input)
    return { id }
  }

  async listCollectionsAdmin() {
    const items = await rawRows(
      this.db,
      `select cp.*, ct.title as title_ar, ctr.title as title_en,
              m.url as hero_url
       from catalog.collection_profile cp
       left join catalog.collection_translation ct
         on ct.collection_id = cp.id and ct.locale = 'ar'
       left join catalog.collection_translation ctr
         on ctr.collection_id = cp.id and ctr.locale = 'en'
       left join catalog.media_asset m on m.id = cp.hero_media_id
       where cp.deleted_at is null
       order by cp.sort_order asc, cp.created_at asc`
    )
    return { collections: items }
  }

  async upsertCollection(input: AnyRow) {
    const id = String(input.id ?? randomUUID())
    const handle = String(input.handle ?? "").trim().toLowerCase()
    if (!/^[a-z0-9-]+$/.test(handle)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "handle must contain only lowercase letters, numbers and dashes"
      )
    }

    await this.db.transaction(async (trx: any) => {
      await trx("catalog.collection_profile")
        .insert({
          id,
          handle,
          civilization_id: input.civilization_id ?? null,
          product_type_id: input.product_type_id ?? null,
          status: input.status ?? "draft",
          sort_order: input.sort_order ?? 0,
          hero_media_id: input.hero_media_id ?? null,
          launch_at: input.launch_at ?? null,
          metadata: "{}",
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        })
        .onConflict("id")
        .merge(["handle", "civilization_id", "product_type_id", "status", "sort_order", "hero_media_id", "launch_at", "updated_at"])

      for (const locale of ["ar", "en"] as const) {
        const translation: AnyRow = {}
        for (const key of [
          "title",
          "subtitle",
          "description",
          "story",
          "seo_title",
          "seo_description",
        ]) {
          const value = input[`${key}_${locale}`]
          if (value !== undefined) translation[key] = value
        }

        if (Object.keys(translation).length > 0) {
          await trx("catalog.collection_translation")
            .insert({
              collection_id: id,
              locale,
              title: translation.title ?? "",
              ...translation,
              created_at: trx.fn.now(),
              updated_at: trx.fn.now(),
            })
            .onConflict(["collection_id", "locale"])
            .merge(Object.keys(translation))
        }
      }
    })

    await this.audit(null, "upsert", "collection", id, null, input)
    return { id }
  }

  async listProductTypesAdmin() {
    const items = await rawRows(
      this.db,
      `select * from catalog.product_type where deleted_at is null order by sort_order asc`
    )
    return { product_types: items }
  }

  async upsertProductType(input: AnyRow) {
    const id = String(input.id ?? randomUUID())
    await this.db("catalog.product_type")
      .insert({
        id,
        code: String(input.code ?? "").trim(),
        name_ar: input.name_ar ?? "",
        name_en: input.name_en ?? "",
        description_ar: input.description_ar ?? null,
        description_en: input.description_en ?? null,
        sort_order: input.sort_order ?? 0,
        is_active: input.is_active ?? true,
        created_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      })
      .onConflict("id")
      .merge(["code", "name_ar", "name_en", "description_ar", "description_en", "sort_order", "is_active", "updated_at"])

    await this.audit(null, "upsert", "product_type", id, null, input)
    return { id }
  }
}
