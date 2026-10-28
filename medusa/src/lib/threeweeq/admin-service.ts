import { randomUUID } from "crypto"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import {
  createProductVariantsWorkflow,
  createProductsWorkflow,
  deleteProductVariantsWorkflow,
  updateProductOptionsWorkflow,
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

function inferSizeMl(title: unknown): number | null {
  const match = String(title ?? "").match(/(\d+)\s*ml/i)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) && value > 0 ? value : null
}

function positiveNumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/**
 * Admin-side orchestration for the 3WEEQ catalog. Combines Medusa core
 * workflows (products, prices, variants) with the custom `catalog.*` tables
 * that the storefront reads. All reads use parameterized raw SQL — no
 * joinRaw/leftJoinRaw (removed in knex 3).
 */
export class CatalogAdminService {
  private repository: ThreeweeqRepository

  constructor(
    private readonly container: MedusaContainer,
    private readonly actorId: string | null = null
  ) {
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
    action: string,
    entityType: string,
    entityId: string,
    before?: unknown,
    after?: unknown
  ) {
    try {
      await this.db("ops.audit_log").insert({
        id: randomUUID(),
        actor_id: this.actorId,
        actor_type: this.actorId ? "admin" : "system",
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

  /**
   * Ask the storefront to drop cached catalog pages. Fire-and-forget: a cache
   * miss is always recoverable, a failed admin mutation is not. Requires
   * STOREFRONT_URL (or MEDUSA_STOREFRONT_URL) and REVALIDATE_SECRET.
   */
  async revalidateStorefront(tags: string[], paths: string[] = []) {
    const baseUrl =
      process.env.STOREFRONT_URL ?? process.env.MEDUSA_STOREFRONT_URL ?? null
    const secret = process.env.REVALIDATE_SECRET ?? null

    if (!baseUrl || !secret || (!tags.length && !paths.length)) {
      return { revalidated: false, reason: "not_configured" }
    }

    try {
      const response = await fetch(
        `${baseUrl.replace(/\/+$/, "")}/api/revalidate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify({ tags, paths }),
          signal: AbortSignal.timeout(5000),
        }
      )

      return { revalidated: response.ok, status: response.status }
    } catch {
      return { revalidated: false, reason: "request_failed" }
    }
  }

  private async revalidateProduct(productId: string, handle?: string | null) {
    const tags = ["products", `product:${productId}`]
    const paths = ["/ar/products", "/en/products"]

    if (handle) {
      tags.push(`product:${handle}`)
      paths.push(`/ar/products/${handle}`, `/en/products/${handle}`)
    }

    await this.revalidateStorefront(tags, paths)
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
       left join catalog.product_translation ptr
         on ptr.product_id = p.product_id and ptr.locale = 'en'
       where ${whereSql}`,
      bindings
    )

    return { items, count: Number(countRow[0]?.count ?? 0) }
  }

  async getProductAdmin(productId: string): Promise<{
    profile: AnyRow
    translations: AnyRow[]
    variantProfiles: AnyRow[]
    media: AnyRow[]
    core: AnyRow | null
  }> {
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

    // Core Medusa data: titles, status, variants and AED prices. The custom
    // tables drive the storefront, but price/variant edits must go through
    // Medusa, so the editor needs both halves in one response.
    let core: AnyRow | null = null

    try {
      const { data } = await this.query.graph({
        entity: "product",
        fields: [
          "id",
          "title",
          "handle",
          "status",
          "thumbnail",
          "created_at",
          "updated_at",
          "options.id",
          "options.title",
          "options.values.id",
          "options.values.value",
          "variants.id",
          "variants.title",
          "variants.sku",
          "variants.prices.id",
          "variants.prices.amount",
          "variants.prices.currency_code",
        ],
        filters: { id: productId },
      })

      core = data?.[0] ?? null
    } catch {
      core = null
    }

    const coreVariants = (core?.variants ?? []).map((variant: AnyRow) => ({
      ...variant,
      prices: (variant.prices ?? []).map((price: AnyRow) => ({
        ...price,
        amount: Number(price.amount ?? 0),
      })),
    }))

    return {
      profile: profile[0],
      translations,
      variantProfiles,
      media,
      core: core ? { ...core, variants: coreVariants } : null,
    }
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

    const variantTitles = new Set<string>()

    for (const variant of variants) {
      const title = String(variant.title ?? "").trim()
      if (!title) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Every variant needs a title (for example \"100 ml\")"
        )
      }
      if (variantTitles.has(title)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Duplicate variant title "${title}". Variant titles must be unique.`
        )
      }
      variantTitles.add(title)

      const amount = Number(variant.price)
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Variant "${title}" needs a positive price in AED`
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

      let createdVariants: AnyRow[] = firstResult(result)?.variants ?? []

      if (!createdVariants.length) {
        const { data: details } = await this.query.graph({
          entity: "product",
          fields: ["id", "handle", "variants.id", "variants.title"],
          filters: { id: createdProductId },
        })
        createdVariants = details?.[0]?.variants ?? []
      }

      // Map by option value as well as title: Medusa may normalise the title,
      // and two variants can share a display title in edge cases.
      const variantIdByTitle = new Map<string, string>()
      for (const variant of createdVariants) {
        const optionValue = variant.options?.[0]?.value
        if (variant.title) variantIdByTitle.set(String(variant.title), variant.id)
        if (optionValue) variantIdByTitle.set(String(optionValue), variant.id)
      }

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
              size_ml: variant.size_ml ?? inferSizeMl(variant.title),
              concentration: variant.concentration ?? null,
              packaging: variant.packaging ?? null,
              is_serialized:
                variant.is_serialized === undefined
                  ? Boolean(input.is_serialized)
                  : Boolean(variant.is_serialized),
              edition_size:
                variant.edition_size ??
                (input.is_serialized ? input.edition_size ?? null : null),
              metadata: JSON.stringify(variant.metadata ?? {}),
              created_at: trx.fn.now(),
              updated_at: trx.fn.now(),
            })
            .onConflict("variant_id")
            .ignore()
        }
      })

      await this.audit(
        "create",
        "product",
        createdProductId,
        null,
        { handle, title_ar: titleAr, title_en: titleEn }
      )

      await this.revalidateProduct(createdProductId, handle)

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

    if (input.title_ar !== undefined || input.handle !== undefined) {
      const coreUpdate: AnyRow = {}
      if (input.title_ar !== undefined) {
        coreUpdate.title = String(input.title_ar)
      }
      if (input.handle !== undefined) {
        const handle = String(input.handle).trim().toLowerCase()
        if (!/^[a-z0-9-]+$/.test(handle)) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "handle must contain only lowercase letters, numbers and dashes"
          )
        }
        coreUpdate.handle = handle
      }

      try {
        await updateProductsWorkflow(this.container).run({
          input: {
            selector: { id: productId },
            update: coreUpdate,
          },
        })
      } catch {
        // core title/handle are cosmetic; custom translations drive the storefront
      }
    }

    await this.audit("update", "product", productId, profile[0], input)

    const nextHandle =
      input.handle !== undefined
        ? String(input.handle).trim().toLowerCase()
        : null

    await this.revalidateProduct(productId, nextHandle)

    return this.getProductAdmin(productId)
  }

  async publishProduct(productId: string) {
    const { profile, translations, variantProfiles, media, core } =
      await this.getProductAdmin(productId)

    const missing: string[] = []

    const translationByLocale = new Map(
      translations.map((translation: AnyRow) => [translation.locale, translation])
    )

    for (const locale of ["ar", "en"] as const) {
      const translation = translationByLocale.get(locale)
      if (!translation) {
        missing.push(`translation_${locale}`)
      } else if (!String(translation.title ?? "").trim()) {
        missing.push(`title_${locale}`)
      }
    }

    const hasHero =
      Boolean(profile.hero_media_id) ||
      media.some((row: AnyRow) => row.role === "hero")
    if (!hasHero) missing.push("hero_media")

    if (!variantProfiles.length) missing.push("variant_profile")

    const hasAedPrice = (core?.variants ?? []).some((variant: AnyRow) =>
      (variant.prices ?? []).some(
        (price: AnyRow) =>
          price.currency_code === DEFAULT_CURRENCY && Number(price.amount) > 0
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

    for (const variant of variantProfiles) {
      if (variant.is_serialized && Number(variant.edition_size ?? 0) > 0) {
        await this.generateSerials({
          variant_id: variant.variant_id,
          edition_size: Number(variant.edition_size),
        })
      }
    }

    await this.audit(
      "publish",
      "product",
      productId,
      { status: "draft" },
      { status: "active" }
    )

    await this.revalidateProduct(productId, core?.handle ?? null)

    return this.getProductAdmin(productId)
  }

  async archiveProduct(productId: string) {
    const { core } = await this.getProductAdmin(productId)

    await updateProductsWorkflow(this.container).run({
      input: {
        selector: { id: productId },
        update: { status: "draft" },
      },
    })
    await this.db("catalog.product_profile")
      .where({ product_id: productId })
      .update({ status: "archived", updated_at: this.db.fn.now() })
    await this.audit("archive", "product", productId, null, null)
    await this.revalidateProduct(productId, core?.handle ?? null)
    return this.getProductAdmin(productId)
  }

  /* ============================ variants ============================ */

  async addVariant(productId: string, input: AnyRow) {
    const { core } = await this.getProductAdmin(productId)

    if (!core?.id) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Medusa product not found for this profile"
      )
    }

    const title = String(input.title ?? "").trim()
    if (!title) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Variant title is required (for example \"100 ml\")"
      )
    }

    const amount = Number(input.price)
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Variant price must be a positive number in AED"
      )
    }

    const option = core.options?.[0]
    if (!option?.id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "This product has no option to attach variants to"
      )
    }

    const values = (option.values ?? []).map((value: AnyRow) =>
      String(value.value)
    )

    if (!values.includes(title)) {
      await updateProductOptionsWorkflow(this.container).run({
        input: {
          selector: { id: option.id },
          update: { values: [...values, title] },
        },
      })
    }

    const result = await createProductVariantsWorkflow(this.container).run({
      input: {
        product_variants: [
          {
            product_id: productId,
            title,
            sku: input.sku ? String(input.sku) : undefined,
            manage_inventory: false,
            allow_backorder: false,
            options: { [option.title]: title },
            prices: [{ amount, currency_code: DEFAULT_CURRENCY }],
          },
        ],
      },
    })

    const created = firstResult(result)
    const variantId = created?.id ?? created?.product_variants?.[0]?.id ?? null

    if (!variantId) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Variant creation returned no id"
      )
    }

    await this.db("catalog.variant_profile")
      .insert({
        variant_id: variantId,
        product_id: productId,
        size_ml: input.size_ml ?? inferSizeMl(title),
        concentration: input.concentration ?? null,
        packaging: input.packaging ?? null,
        is_serialized: Boolean(input.is_serialized),
        edition_size: positiveNumber(input.edition_size),
        metadata: JSON.stringify(input.metadata ?? {}),
        created_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      })
      .onConflict("variant_id")
      .merge([
        "product_id",
        "size_ml",
        "concentration",
        "packaging",
        "is_serialized",
        "edition_size",
        "updated_at",
      ])

    await this.audit("create", "variant", variantId, null, {
      product_id: productId,
      title,
      price: amount,
    })

    const { core: refreshed } = await this.getProductAdmin(productId)
    await this.revalidateProduct(productId, refreshed?.handle ?? null)

    return this.getProductAdmin(productId)
  }

  async updateVariant(productId: string, variantId: string, input: AnyRow) {
    const { variantProfiles } = await this.getProductAdmin(productId)
    const profile = variantProfiles.find(
      (row: AnyRow) => row.variant_id === variantId
    )

    if (!profile) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Variant does not belong to this product"
      )
    }

    const amount =
      input.price === undefined || input.price === null
        ? null
        : Number(input.price)

    if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Variant price must be a positive number in AED"
      )
    }

    const variantUpdate: AnyRow = { id: variantId }

    if (input.title !== undefined) {
      variantUpdate.title = String(input.title)
    }
    if (input.sku !== undefined) {
      variantUpdate.sku = input.sku ? String(input.sku) : null
    }
    if (amount !== null) {
      variantUpdate.prices = [{ amount, currency_code: DEFAULT_CURRENCY }]
    }

    if (Object.keys(variantUpdate).length > 1) {
      try {
        await updateProductsWorkflow(this.container).run({
          input: {
            selector: { id: productId },
            update: { variants: [variantUpdate] },
          },
        })
      } catch (error) {
        // Price/title edits are the common path; surface a readable error
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Could not update the Medusa variant: ${
            error instanceof Error ? error.message : "unknown error"
          }`
        )
      }
    }

    const profileUpdate: AnyRow = { updated_at: this.db.fn.now() }

    for (const key of ["concentration", "packaging"] as const) {
      if (input[key] !== undefined) profileUpdate[key] = input[key] || null
    }
    if (input.size_ml !== undefined) {
      profileUpdate.size_ml = positiveNumber(input.size_ml)
    }
    if (input.is_serialized !== undefined) {
      profileUpdate.is_serialized = Boolean(input.is_serialized)
    }
    if (input.edition_size !== undefined) {
      profileUpdate.edition_size = positiveNumber(input.edition_size)
    }

    await this.db("catalog.variant_profile")
      .where({ variant_id: variantId })
      .update(profileUpdate)

    await this.audit("update", "variant", variantId, profile, input)

    const { core } = await this.getProductAdmin(productId)
    await this.revalidateProduct(productId, core?.handle ?? null)

    return this.getProductAdmin(productId)
  }

  async deleteVariant(productId: string, variantId: string) {
    const { variantProfiles } = await this.getProductAdmin(productId)
    const profile = variantProfiles.find(
      (row: AnyRow) => row.variant_id === variantId
    )

    if (!profile) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Variant does not belong to this product"
      )
    }

    if (variantProfiles.length <= 1) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "A published product needs at least one variant"
      )
    }

    await deleteProductVariantsWorkflow(this.container).run({
      input: { ids: [variantId] },
    })

    await this.db("catalog.variant_profile")
      .where({ variant_id: variantId })
      .update({ deleted_at: this.db.fn.now(), updated_at: this.db.fn.now() })

    await this.audit("delete", "variant", variantId, profile, null)

    const { core } = await this.getProductAdmin(productId)
    await this.revalidateProduct(productId, core?.handle ?? null)

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
    width?: number
    height?: number
    bytes?: number
    blurhash?: string
    storage_key?: string
    product_id?: string
    role?: string
    sort_order?: number
  }) {
    const url = String(input.url ?? "").trim()

    if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "url must be an absolute URL or a site-relative path"
      )
    }

    const existing = await rawRows(
      this.db,
      `select id from catalog.media_asset where url = $1 and deleted_at is null limit 1`,
      [url]
    )

    const id = String(existing[0]?.id ?? randomUUID())

    if (!existing[0]) {
      await this.db("catalog.media_asset").insert({
        id,
        storage_key: input.storage_key ?? `admin/${id}`,
        url,
        mime_type: input.mime_type ?? "image/webp",
        width: positiveNumber(input.width),
        height: positiveNumber(input.height),
        bytes: positiveNumber(input.bytes),
        blurhash: input.blurhash ?? null,
        alt_ar: input.alt_ar ?? null,
        alt_en: input.alt_en ?? null,
        focal_x: input.focal_x ?? null,
        focal_y: input.focal_y ?? null,
        metadata: "{}",
        created_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      })
    } else if (input.alt_ar || input.alt_en) {
      await this.db("catalog.media_asset")
        .where({ id })
        .update({
          alt_ar: input.alt_ar ?? null,
          alt_en: input.alt_en ?? null,
          updated_at: this.db.fn.now(),
        })
    }

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

      if (input.role === "hero") {
        await this.db("catalog.product_profile")
          .where({ product_id: input.product_id })
          .update({ hero_media_id: id, updated_at: this.db.fn.now() })
      }
    }

    await this.audit("create", "media", id, null, { url, input })

    if (input.product_id) {
      await this.revalidateProduct(input.product_id, null)
    }

    return { id, url }
  }

  async listMediaAdmin(input: { q?: string; limit?: number; offset?: number }) {
    const limit = Math.min(200, Math.max(1, input.limit ?? 60))
    const offset = Math.max(0, input.offset ?? 0)
    const bindings: unknown[] = []
    let whereSql = "deleted_at is null"

    if (input.q?.trim()) {
      bindings.push(`%${input.q.trim()}%`)
      whereSql += ` and (url ilike $1 or coalesce(alt_ar, '') ilike $1 or coalesce(alt_en, '') ilike $1)`
    }

    const items = await rawRows(
      this.db,
      `select id, url, mime_type, width, height, bytes, alt_ar, alt_en,
              focal_x, focal_y, created_at
       from catalog.media_asset
       where ${whereSql}
       order by created_at desc
       limit $${bindings.length + 1} offset $${bindings.length + 2}`,
      [...bindings, limit, offset]
    )

    return { media: items }
  }

  async removeProductMedia(productId: string, mediaId: string, role?: string) {
    const query = this.db("catalog.product_media").where({
      product_id: productId,
      media_id: mediaId,
    })

    if (role) {
      query.andWhere({ role })
    }

    const removed = await query.del()

    await this.db("catalog.product_profile")
      .where({ product_id: productId, hero_media_id: mediaId })
      .update({ hero_media_id: null, updated_at: this.db.fn.now() })

    await this.audit("delete", "product_media", productId, { media_id: mediaId }, null)
    await this.revalidateProduct(productId, null)

    return { removed }
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
    if (media.some((link) => link.role === "hero")) {
      const hero = media.find((link) => link.role === "hero")
      await this.db("catalog.product_profile")
        .where({ product_id: productId })
        .update({ hero_media_id: hero ? hero.media_id : null, updated_at: this.db.fn.now() })
    }

    await this.audit( "update", "product_media", productId, null, media)
    await this.revalidateProduct(productId, null)
    return this.getProductAdmin(productId).then((value) => value.media)
  }

  async deleteCivilization(id: string) {
    const used = await rawRows(
      this.db,
      `select count(product_id)::text as count from catalog.product_profile
       where civilization_id = $1 and deleted_at is null`,
      [id]
    )

    if (Number(used[0]?.count ?? 0) > 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "This civilization still has products. Move or archive them first."
      )
    }

    await this.db("catalog.civilization")
      .where({ id })
      .update({ deleted_at: this.db.fn.now(), status: "archived", updated_at: this.db.fn.now() })

    await this.audit("delete", "civilization", id, null, null)
    await this.revalidateStorefront(["civilizations"], ["/ar", "/en"])

    return { id, deleted: true }
  }

  async deleteCollection(id: string) {
    const used = await rawRows(
      this.db,
      `select count(product_id)::text as count from catalog.product_profile
       where collection_id = $1 and deleted_at is null`,
      [id]
    )

    if (Number(used[0]?.count ?? 0) > 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "This collection still has products. Move or archive them first."
      )
    }

    await this.db("catalog.collection_profile")
      .where({ id })
      .update({ deleted_at: this.db.fn.now(), status: "archived", updated_at: this.db.fn.now() })

    await this.audit("delete", "collection", id, null, null)
    await this.revalidateStorefront(["collections"], ["/ar/collections", "/en/collections"])

    return { id, deleted: true }
  }

  async deleteProductType(id: string) {
    const used = await rawRows(
      this.db,
      `select count(product_id)::text as count from catalog.product_profile
       where product_type_id = $1 and deleted_at is null`,
      [id]
    )

    if (Number(used[0]?.count ?? 0) > 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "This product type is still used by products."
      )
    }

    await this.db("catalog.product_type")
      .where({ id })
      .update({ deleted_at: this.db.fn.now(), is_active: false, updated_at: this.db.fn.now() })

    await this.audit("delete", "product_type", id, null, null)
    await this.revalidateStorefront(["products"], ["/ar/products", "/en/products"])

    return { id, deleted: true }
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

    await this.audit( "upsert", "civilization", id, null, input)
    await this.revalidateStorefront(["civilizations"], ["/ar", "/en"])
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

    await this.audit( "upsert", "collection", id, null, input)
    await this.revalidateStorefront(
      ["collections", "products"],
      ["/ar/collections", "/en/collections"]
    )
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

    await this.audit( "upsert", "product_type", id, null, input)
    await this.revalidateStorefront(["products"], ["/ar/products", "/en/products"])
    return { id }
  }
}
