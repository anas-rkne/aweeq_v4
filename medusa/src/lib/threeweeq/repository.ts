import { randomUUID } from "crypto"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

export type Locale = "ar" | "en"

export type WaitlistInput = {
  civilization_id: string
  drop_id?: string | null
  email: string
  customer_id?: string | null
  locale?: Locale
  source?: string | null
  metadata?: Record<string, unknown>
}

export type OutboxInput = {
  aggregateType: string
  aggregateId: string
  eventType: string
  payload: Record<string, unknown>
}

export type WebhookRecordInput = {
  provider: string
  externalId: string | null
  eventType: string
  payload: Record<string, unknown>
  headers: Record<string, unknown>
}

export type IdempotencyResult = {
  state: "started" | "completed" | "in_progress" | "conflict"
  record?: Record<string, unknown>
}

export type OrderProfileInput = {
  orderId: string
  customerId?: string | null
  civilizationId?: string | null
  dropId?: string | null
  locale: Locale
  giftMessage?: string | null
  packagingCode?: string | null
  metadata?: Record<string, unknown>
}

export type OrderItemProfileInput = {
  orderId: string
  orderItemId: string
  productId?: string | null
  variantId?: string | null
  serialUnitId?: string | null
  civilizationId?: string | null
  metadata?: Record<string, unknown>
}

const IDEMPOTENCY_LOCK_MS = 5 * 60 * 1000

export class ThreeweeqRepository {
  constructor(private readonly container: MedusaContainer) {}

  private get db(): any {
    return this.container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  }

  async listCivilizations(locale: Locale) {
    return this.db("catalog.civilization as c")
      .join("catalog.civilization_translation as ct", "ct.civilization_id", "c.id")
      .leftJoin("catalog.media_asset as m", "m.id", "c.hero_media_id")
      .where("ct.locale", locale)
      .whereIn("c.status", ["announced", "live"])
      .whereNull("c.deleted_at")
      .orderBy("c.sort_order", "asc")
      .orderBy("c.created_at", "asc")
      .select(
        "c.id",
        "c.code",
        "c.status",
        "c.launch_at",
        "c.sort_order",
        "c.accent_color",
        "ct.name",
        "ct.subtitle",
        "ct.description",
        "ct.story",
        "ct.seo_title",
        "ct.seo_description",
        "m.url as hero_url",
        "m.alt_ar",
        "m.alt_en"
      )
  }

  async getCurrentDrop(locale: Locale) {
    const now = new Date()
    const drop = await this.db("engagement.drop as d")
      .join(
        "catalog.civilization_translation as ct",
        "ct.civilization_id",
        "d.civilization_id"
      )
      .where("ct.locale", locale)
      .whereIn("d.status", ["scheduled", "live"])
      .whereNull("d.deleted_at")
      .where((query: any) =>
        query.whereNull("d.opens_at").orWhere("d.opens_at", "<=", now)
      )
      .where((query: any) =>
        query.whereNull("d.closes_at").orWhere("d.closes_at", ">", now)
      )
      .orderBy("d.opens_at", "asc")
      .select(
        "d.*",
        "ct.name as civilization_name",
        "ct.subtitle as civilization_subtitle"
      )
      .first()

    if (!drop) {
      return null
    }

    const allocations = await this.db("engagement.drop_allocation")
      .where({ drop_id: drop.id })
      .orderBy("created_at", "asc")
      .select(
        "id",
        "variant_id",
        "quantity",
        "reserved_quantity",
        "sold_quantity"
      )

    const availableUnits = allocations.reduce(
      (total: number, allocation: any) =>
        total +
        Math.max(
          0,
          Number(allocation.quantity) -
            Number(allocation.reserved_quantity) -
            Number(allocation.sold_quantity)
        ),
      0
    )

    return {
      ...drop,
      allocations,
      available_units: availableUnits,
    }
  }

  async getDropById(dropId: string) {
    return this.db("engagement.drop")
      .where({ id: dropId })
      .whereIn("status", ["live", "scheduled"])
      .whereNull("deleted_at")
      .first()
  }

  async findDropForVariants(variantIds: string[]) {
    if (!variantIds.length) {
      return null
    }

    return this.db("engagement.drop as d")
      .join("engagement.drop_allocation as da", "da.drop_id", "d.id")
      .whereIn("da.variant_id", variantIds)
      .whereIn("d.status", ["live", "scheduled"])
      .whereNull("d.deleted_at")
      .orderBy("d.opens_at", "asc")
      .select("d.*")
      .first()
  }

  async getVariantProfiles(variantIds: string[]) {
    if (!variantIds.length) {
      return []
    }

    return this.db("catalog.variant_profile")
      .whereIn("variant_id", variantIds)
      .whereNull("deleted_at")
      .select(
        "variant_id",
        "product_id",
        "size_ml",
        "concentration",
        "packaging",
        "is_serialized",
        "edition_size",
        "metadata"
      )
  }

  async getProductProfiles(productIds: string[]) {
    if (!productIds.length) {
      return []
    }

    return this.db("catalog.product_profile")
      .whereIn("product_id", productIds)
      .whereNull("deleted_at")
      .select(
        "product_id",
        "civilization_id",
        "is_limited",
        "is_serialized",
        "edition_size",
        "max_per_customer"
      )
  }

  /**
   * Storefront newsletter (footer + home section). Unlike the waitlist this is
   * not tied to a civilization, so it needs its own table; the unique index on
   * lower(email) makes the upsert idempotent for the same address.
   */
  async addNewsletterSubscriber(input: {
    email: string
    locale?: Locale
    source?: string | null
    metadata?: Record<string, unknown>
  }) {
    const email = input.email.trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "A valid email is required"
      )
    }

    return this.db.transaction(async (trx: any) => {
      const existing = await trx("engagement.newsletter_subscriber")
        .whereRaw("lower(email) = ?", [email])
        .whereNull("deleted_at")
        .first()

      if (existing) {
        // Re-subscribing after an unsubscribe should work without a new row.
        if (existing.status === "unsubscribed") {
          const [updated] = await trx("engagement.newsletter_subscriber")
            .where({ id: existing.id })
            .update({
              status: "subscribed",
              unsubscribed_at: null,
              updated_at: trx.fn.now(),
            })
            .returning("*")

          return { subscriber: updated, created: false, resubscribed: true }
        }

        return { subscriber: existing, created: false, resubscribed: false }
      }

      const [subscriber] = await trx("engagement.newsletter_subscriber")
        .insert({
          id: randomUUID(),
          email,
          locale: input.locale ?? "ar",
          source: input.source ?? null,
          status: "subscribed",
          metadata: JSON.stringify(input.metadata ?? {}),
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        })
        .returning("*")

      return { subscriber, created: true, resubscribed: false }
    })
  }

  async addWaitlist(input: WaitlistInput) {
    const email = input.email.trim().toLowerCase()

    return this.db.transaction(async (trx: any) => {
      const civilization = await trx("catalog.civilization")
        .where({ id: input.civilization_id })
        .whereNull("deleted_at")
        .first()

      if (!civilization) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          "Civilization not found"
        )
      }

      if (input.drop_id) {
        const drop = await trx("engagement.drop")
          .where({ id: input.drop_id })
          .whereNull("deleted_at")
          .first()

        if (!drop || drop.civilization_id !== input.civilization_id) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "Drop does not belong to the selected civilization"
          )
        }
      }

      const existing = await trx("engagement.waitlist_entry")
        .where({ civilization_id: input.civilization_id })
        .whereRaw("lower(email) = ?", [email])
        .whereNull("deleted_at")
        .first()

      if (existing) {
        return { entry: existing, created: false }
      }

      const id = randomUUID()
      const [entry] = await trx("engagement.waitlist_entry")
        .insert({
          id,
          civilization_id: input.civilization_id,
          drop_id: input.drop_id ?? null,
          email,
          customer_id: input.customer_id ?? null,
          locale: input.locale ?? "ar",
          source: input.source ?? null,
          status: "pending",
          metadata: input.metadata ?? {},
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        })
        .returning("*")

      await trx("engagement.waitlist_event").insert({
        id: randomUUID(),
        entry_id: id,
        event_type: "created",
        payload: {
          source: input.source ?? null,
          locale: input.locale ?? "ar",
        },
        created_at: trx.fn.now(),
      })

      return { entry, created: true }
    })
  }

  async beginIdempotency(
    key: string,
    scope: string,
    requestHash: string
  ): Promise<IdempotencyResult> {
    const now = new Date()

    try {
      return await this.db.transaction(async (trx: any) => {
        const existing = await trx("ops.idempotency_key")
          .where({ key })
          .forUpdate()
          .first()

        if (existing) {
          if (
            existing.request_hash &&
            existing.request_hash !== requestHash
          ) {
            return { state: "conflict", record: existing }
          }

          if (existing.status === "completed") {
            return { state: "completed", record: existing }
          }

          const lockedUntil = existing.locked_until
            ? new Date(existing.locked_until)
            : null

          if (
            existing.status === "in_progress" &&
            lockedUntil &&
            lockedUntil.getTime() > now.getTime()
          ) {
            return { state: "in_progress", record: existing }
          }

          const [record] = await trx("ops.idempotency_key")
            .where({ key })
            .update({
              status: "in_progress",
              response_status: null,
              response_body: null,
              last_error: null,
              locked_until: new Date(now.getTime() + IDEMPOTENCY_LOCK_MS),
              updated_at: now,
            })
            .returning("*")

          return { state: "started", record }
        }

        const [record] = await trx("ops.idempotency_key")
          .insert({
            key,
            scope,
            request_hash: requestHash,
            status: "in_progress",
            locked_until: new Date(now.getTime() + IDEMPOTENCY_LOCK_MS),
            created_at: now,
            updated_at: now,
          })
          .returning("*")

        return { state: "started", record }
      })
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        const record = await this.db("ops.idempotency_key")
          .where({ key })
          .first()

        if (record) {
          return {
            state:
              record.status === "completed" ? "completed" : "in_progress",
            record,
          }
        }
      }

      throw error
    }
  }

  async completeIdempotency(
    key: string,
    responseStatus: number,
    responseBody: Record<string, unknown>
  ) {
    await this.db("ops.idempotency_key").where({ key }).update({
      status: "completed",
      response_status: responseStatus,
      response_body: responseBody,
      locked_until: null,
      updated_at: this.db.fn.now(),
    })
  }

  async failIdempotency(key: string, error: string) {
    await this.db("ops.idempotency_key").where({ key }).update({
      status: "failed",
      last_error: error,
      locked_until: null,
      updated_at: this.db.fn.now(),
    })
  }

  async getDropAllocations(dropId: string) {
    return this.db("engagement.drop_allocation")
      .where({ drop_id: dropId })
      .select("variant_id", "quantity", "reserved_quantity", "sold_quantity")
  }

  async reserveCheckoutInventory(input: {
    dropId?: string | null
    dropVariantIds?: string[]
    items: Array<{
      variantId: string
      quantity: number
      isSerialized: boolean
    }>
  }) {
    return this.db.transaction(async (trx: any) => {
      const serialByVariant: Record<string, string[]> = {}

      for (const item of input.items) {
        if (item.isSerialized) {
          const reserved = await this.reserveSerialUnits(
            trx,
            item.variantId,
            item.quantity
          )
          serialByVariant[item.variantId] = [
            ...(serialByVariant[item.variantId] ?? []),
            ...reserved,
          ]
        }
      }

      if (input.dropId) {
        const dropVariantIds = new Set(input.dropVariantIds ?? [])
        for (const item of input.items) {
          if (!dropVariantIds.has(item.variantId)) {
            continue
          }

          await this.reserveDropAllocation(
            trx,
            input.dropId,
            item.variantId,
            item.quantity
          )
        }
      }

      return { serialByVariant }
    })
  }

  async finalizeCheckout(input: {
    orderId: string
    customerId?: string | null
    civilizationId?: string | null
    dropId?: string | null
    locale: Locale
    giftMessage?: string | null
    packagingCode?: string | null
    orderItems: Array<{
      id: string
      variantId?: string | null
      productId?: string | null
      quantity: number
    }>
    serialByVariant?: Record<string, string[]>
    dropVariantIds?: string[]
  }) {
    return this.db.transaction(async (trx: any) => {
      await trx("commerce.order_profile")
        .insert({
          id: randomUUID(),
          order_id: input.orderId,
          customer_id: input.customerId ?? null,
          civilization_id: input.civilizationId ?? null,
          drop_id: input.dropId ?? null,
          locale: input.locale,
          gift_message: input.giftMessage ?? null,
          packaging_code: input.packagingCode ?? null,
          metadata: {},
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        })
        .onConflict("order_id")
        .ignore()

      const remainingSerials: Record<string, string[]> = Object.fromEntries(
        Object.entries(input.serialByVariant ?? {}).map(([variantId, ids]) => [
          variantId,
          [...ids],
        ])
      )
      const serialByOrderItem: Record<string, string> = {}

      for (const item of input.orderItems) {
        const variantId = item.variantId ?? ""
        const serialUnitId = remainingSerials[variantId]?.shift()

        if (serialUnitId) {
          serialByOrderItem[item.id] = serialUnitId
          await this.assignSerialUnits(
            trx,
            [serialUnitId],
            input.orderId,
            item.id
          )
        }

        await trx("commerce.order_item_profile")
          .insert({
            id: randomUUID(),
            order_id: input.orderId,
            order_item_id: item.id,
            product_id: item.productId ?? null,
            variant_id: variantId || null,
            serial_unit_id: serialUnitId ?? null,
            civilization_id: input.civilizationId ?? null,
            metadata: {},
            created_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          })
          .onConflict("order_item_id")
          .ignore()
      }

      if (input.dropId && input.dropVariantIds?.length) {
        const quantityByVariant = input.orderItems.reduce<Record<string, number>>(
          (result, item) => {
            if (item.variantId) {
              result[item.variantId] =
                (result[item.variantId] ?? 0) + item.quantity
            }
            return result
          },
          {}
        )

        for (const variantId of input.dropVariantIds) {
          const quantity = quantityByVariant[variantId] ?? 0
          if (quantity > 0) {
            await this.consumeDropAllocation(
              trx,
              input.dropId,
              variantId,
              quantity
            )
          }
        }
      }

      return { serialByOrderItem }
    })
  }

  async reserveSerialUnits(
    trx: any,
    variantId: string,
    quantity: number
  ): Promise<string[]> {
    const units = await trx("catalog.serial_unit")
      .where({ variant_id: variantId, status: "allocated" })
      .orderBy("edition_number", "asc")
      .limit(quantity)
      .forUpdate()
      .skipLocked()

    if (units.length < quantity) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Not enough serialized units available for variant ${variantId}`
      )
    }

    const ids = units.map((unit: any) => unit.id)
    await trx("catalog.serial_unit").whereIn("id", ids).update({
      status: "reserved",
      allocated_at: trx.fn.now(),
      updated_at: trx.fn.now(),
    })

    return ids
  }

  async releaseSerialUnits(ids: string[]) {
    if (!ids.length) {
      return
    }

    await this.db("catalog.serial_unit").whereIn("id", ids).update({
      status: "allocated",
      order_id: null,
      order_item_id: null,
      updated_at: this.db.fn.now(),
    })
  }

  async assignSerialUnits(
    trx: any,
    ids: string[],
    orderId: string,
    orderItemId: string
  ) {
    if (!ids.length) {
      return
    }

    await trx("catalog.serial_unit").whereIn("id", ids).update({
      status: "sold",
      order_id: orderId,
      order_item_id: orderItemId,
      sold_at: trx.fn.now(),
      updated_at: trx.fn.now(),
    })
  }

  async reserveDropAllocation(
    trx: any,
    dropId: string,
    variantId: string,
    quantity: number
  ) {
    const updated = await trx("engagement.drop_allocation")
      .where({ drop_id: dropId, variant_id: variantId })
      .whereRaw("reserved_quantity + sold_quantity + ? <= quantity", [
        quantity,
      ])
      .update({
        reserved_quantity: trx.raw("reserved_quantity + ?", [quantity]),
        updated_at: trx.fn.now(),
      })

    if (!updated) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Drop allocation is no longer available for variant ${variantId}`
      )
    }
  }

  async releaseDropAllocation(
    dropId: string,
    variantId: string,
    quantity: number
  ) {
    await this.db("engagement.drop_allocation")
      .where({ drop_id: dropId, variant_id: variantId })
      .update({
        reserved_quantity: this.db.raw(
          "greatest(reserved_quantity - ?, 0)",
          [quantity]
        ),
        updated_at: this.db.fn.now(),
      })
  }

  async consumeDropAllocation(
    trx: any,
    dropId: string,
    variantId: string,
    quantity: number
  ) {
    await trx("engagement.drop_allocation")
      .where({ drop_id: dropId, variant_id: variantId })
      .update({
        reserved_quantity: trx.raw(
          "greatest(reserved_quantity - ?, 0)",
          [quantity]
        ),
        sold_quantity: trx.raw("sold_quantity + ?", [quantity]),
        updated_at: trx.fn.now(),
      })
  }

  async createOrderProfiles(
    profile: OrderProfileInput,
    items: OrderItemProfileInput[]
  ) {
    return this.db.transaction(async (trx: any) => {
      await trx("commerce.order_profile")
        .insert({
          id: randomUUID(),
          order_id: profile.orderId,
          customer_id: profile.customerId ?? null,
          civilization_id: profile.civilizationId ?? null,
          drop_id: profile.dropId ?? null,
          locale: profile.locale,
          gift_message: profile.giftMessage ?? null,
          packaging_code: profile.packagingCode ?? null,
          metadata: profile.metadata ?? {},
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        })
        .onConflict("order_id")
        .ignore()

      if (!items.length) {
        return
      }

      await trx("commerce.order_item_profile")
        .insert(
          items.map((item) => ({
            id: randomUUID(),
            order_id: item.orderId,
            order_item_id: item.orderItemId,
            product_id: item.productId ?? null,
            variant_id: item.variantId ?? null,
            serial_unit_id: item.serialUnitId ?? null,
            civilization_id: item.civilizationId ?? null,
            metadata: item.metadata ?? {},
            created_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          }))
        )
        .onConflict("order_item_id")
        .ignore()
    })
  }

  async awardLoyaltyPoints(input: {
    customerId: string
    orderId: string
    points: number
    reason: string
  }) {
    return this.db.transaction(async (trx: any) => {
      const existing = await trx("engagement.loyalty_transaction")
        .where({ order_id: input.orderId, type: "earn" })
        .first()

      if (existing) {
        return { awarded: false, transaction: existing }
      }

      let account = await trx("engagement.loyalty_account")
        .where({ customer_id: input.customerId })
        .forUpdate()
        .first()

      const lockedExisting = await trx("engagement.loyalty_transaction")
        .where({ order_id: input.orderId, type: "earn" })
        .first()

      if (lockedExisting) {
        return { awarded: false, transaction: lockedExisting }
      }

      if (!account) {
        const [created] = await trx("engagement.loyalty_account")
          .insert({
            id: randomUUID(),
            customer_id: input.customerId,
            tier_id: null,
            points_balance: 0,
            lifetime_points: 0,
            status: "active",
            enrolled_at: trx.fn.now(),
            created_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          })
          .returning("*")

        account = created
      }

      const balance = Number(account.points_balance) + input.points
      const lifetime = Number(account.lifetime_points) + input.points

      const tier = await trx("engagement.loyalty_tier")
        .where({ is_active: true })
        .where("min_points", "<=", balance)
        .orderBy("min_points", "desc")
        .first()

      await trx("engagement.loyalty_account")
        .where({ id: account.id })
        .update({
          points_balance: balance,
          lifetime_points: lifetime,
          tier_id: tier?.id ?? account.tier_id,
          updated_at: trx.fn.now(),
        })

      const [transaction] = await trx("engagement.loyalty_transaction")
        .insert({
          id: randomUUID(),
          account_id: account.id,
          order_id: input.orderId,
          type: "earn",
          points: input.points,
          balance_after: balance,
          reason: input.reason,
          metadata: {},
          created_at: trx.fn.now(),
        })
        .returning("*")

      return {
        awarded: true,
        transaction,
        account_id: account.id,
        balance,
      }
    })
  }

  async enqueueOutbox(input: OutboxInput) {
    const id = randomUUID()

    await this.db("ops.outbox_event").insert({
      id,
      aggregate_type: input.aggregateType,
      aggregate_id: input.aggregateId,
      event_type: input.eventType,
      payload: input.payload,
      status: "pending",
      attempts: 0,
      available_at: this.db.fn.now(),
      created_at: this.db.fn.now(),
    })

    return id
  }

  async enqueueOutboxOnce(input: OutboxInput) {
    const existing = await this.db("ops.outbox_event")
      .where({
        aggregate_type: input.aggregateType,
        aggregate_id: input.aggregateId,
        event_type: input.eventType,
      })
      .first()

    if (existing) {
      return existing.id
    }

    return this.enqueueOutbox(input)
  }

  /**
   * Atomically claim up to `limit` due outbox events. `FOR UPDATE SKIP LOCKED`
   * keeps two workers (or two ticks of the same job) from sending the same
   * email twice.
   */
  async claimOutboxEvents(limit = 10) {
    return this.db.transaction(async (trx: any) => {
      // A crash between claim and mark leaves rows in `processing` forever.
      // The claim itself sets a 15-minute lease in `available_at`, so any row
      // whose lease expired is safe to reclaim.
      await trx("ops.outbox_event")
        .where({ status: "processing" })
        .where("available_at", "<=", trx.fn.now())
        .update({ status: "pending" })

      const rows = await trx("ops.outbox_event")
        .where({ status: "pending" })
        .where("available_at", "<=", trx.fn.now())
        .orderBy("available_at", "asc")
        .limit(limit)
        .forUpdate()
        .skipLocked()

      if (!rows.length) {
        return []
      }

      await trx("ops.outbox_event")
        .whereIn(
          "id",
          rows.map((row: { id: string }) => row.id)
        )
        .update({
          status: "processing",
          // lease: if this worker dies, the row becomes reclaimable after 15m
          available_at: trx.raw("now() + interval '15 minutes'"),
        })

      return rows
    })
  }

  async markOutboxPublished(id: string) {
    await this.db("ops.outbox_event")
      .where({ id })
      .update({ status: "published", published_at: this.db.fn.now(), last_error: null })
  }

  /**
   * Put a claimed event back without counting an attempt. Used when nothing was
   * actually attempted (no API key configured, no template, no recipient).
   */
  async releaseOutboxEvent(id: string, reason: string) {
    await this.db("ops.outbox_event")
      .where({ id })
      .update({
        status: "pending",
        last_error: reason.slice(0, 1000),
        available_at: this.db.raw("now() + interval '15 minutes'"),
      })
  }

  async markOutboxFailed(id: string, error: string, retryInSeconds: number, maxAttempts = 5) {
    const row = await this.db("ops.outbox_event").where({ id }).first()
    const attempts = Number(row?.attempts ?? 0) + 1
    const exhausted = attempts >= maxAttempts || retryInSeconds <= 0

    await this.db("ops.outbox_event")
      .where({ id })
      .update({
        status: exhausted ? "failed" : "pending",
        attempts,
        last_error: error.slice(0, 1000),
        available_at: exhausted
          ? this.db.fn.now()
          : this.db.raw("now() + (? || ' seconds')::interval", [
              String(retryInSeconds),
            ]),
      })

    return { attempts, exhausted }
  }

  async recordWebhookEvent(input: WebhookRecordInput) {
    try {
      return await this.db.transaction(async (trx: any) => {
        if (input.externalId) {
          const existing = await trx("ops.webhook_event")
            .where({ provider: input.provider, external_id: input.externalId })
            .first()

          if (existing) {
            return { duplicate: true, event: existing }
          }
        }

        const [event] = await trx("ops.webhook_event")
          .insert({
            id: randomUUID(),
            provider: input.provider,
            external_id: input.externalId,
            event_type: input.eventType,
            payload: input.payload,
            headers: input.headers,
            status: "received",
            attempts: 0,
            received_at: trx.fn.now(),
          })
          .returning("*")

        return { duplicate: false, event }
      })
    } catch (error) {
      if ((error as { code?: string }).code === "23505" && input.externalId) {
        const existing = await this.db("ops.webhook_event")
          .where({ provider: input.provider, external_id: input.externalId })
          .first()

        if (existing) {
          return { duplicate: true, event: existing }
        }
      }

      throw error
    }
  }

  async markWebhookProcessing(id: string) {
    await this.db("ops.webhook_event").where({ id }).update({
      status: "processing",
      attempts: this.db.raw("attempts + 1"),
    })
  }

  async markWebhookProcessed(id: string) {
    await this.db("ops.webhook_event").where({ id }).update({
      status: "processed",
      processed_at: this.db.fn.now(),
      last_error: null,
    })
  }

  async markWebhookFailed(id: string, error: string) {
    await this.db("ops.webhook_event").where({ id }).update({
      status: "failed",
      last_error: error,
    })
  }

  async findCivilizationIdByCode(code: string) {
    const row = await this.db("catalog.civilization")
      .whereRaw("lower(code) = ?", [code.trim().toLowerCase()])
      .whereNull("deleted_at")
      .first()

    return row?.id ?? null
  }

  async findCollectionIdByHandle(handle: string) {
    const row = await this.db("catalog.collection_profile")
      .where({ handle })
      .whereNull("deleted_at")
      .first()

    return row?.id ?? null
  }

  async findProductTypeIdByCode(code: string) {
    const row = await this.db("catalog.product_type")
      .whereRaw("lower(code) = ?", [code.trim().toLowerCase()])
      .whereNull("deleted_at")
      .first()

    return row?.id ?? null
  }

  async listCatalogProductProfiles(input: {
    locale: Locale
    productIds?: string[]
    civilizationId?: string
    collectionId?: string
    productTypeId?: string
    query?: string
    limit?: number
    offset?: number
  }) {
    const build = () => {
      const base = this.db("catalog.product_profile as p")
        .joinRaw(
          "join catalog.product_translation pt on pt.product_id = p.product_id and pt.locale = ?",
          [input.locale]
        )
        .leftJoin("catalog.product_type as ptype", "ptype.id", "p.product_type_id")
        .leftJoin("catalog.collection_profile as cp", "cp.id", "p.collection_id")
        .joinRaw(
          "left join catalog.collection_translation ctr on ctr.collection_id = cp.id and ctr.locale = ?",
          [input.locale]
        )
        .joinRaw(
          "left join catalog.civilization_translation civt on civt.civilization_id = p.civilization_id and civt.locale = ?",
          [input.locale]
        )
        .leftJoin("catalog.media_asset as hero", "hero.id", "p.hero_media_id")
        .where("p.status", "active")
        .whereNull("p.deleted_at")

      if (input.productIds) {
        if (!input.productIds.length) {
          base.whereRaw("1 = 0")
        } else {
          base.whereIn("p.product_id", input.productIds)
        }
      }

      if (input.civilizationId) {
        base.where("p.civilization_id", input.civilizationId)
      }

      if (input.collectionId) {
        base.where("p.collection_id", input.collectionId)
      }

      if (input.productTypeId) {
        base.where("p.product_type_id", input.productTypeId)
      }

      if (input.query?.trim()) {
        const term = `%${input.query.trim()}%`
        base.where((builder: any) => {
          builder
            .whereILike("pt.title", term)
            .orWhereILike("pt.subtitle", term)
            .orWhereILike("pt.short_description", term)
            .orWhereILike("pt.description", term)
        })
      }

      return base
    }

    const countRow = (await build()
      .count("p.product_id as count")
      .first()) as { count: string } | undefined
    const count = Number(countRow?.count ?? 0)

    const items = await build()
      .orderBy("p.created_at", "desc")
      .offset(Math.max(0, input.offset ?? 0))
      .limit(Math.min(100, Math.max(1, input.limit ?? 24)))
      .select(
        "p.product_id",
        "p.civilization_id",
        "p.collection_id",
        "p.product_type_id",
        "p.status",
        "p.is_limited",
        "p.is_serialized",
        "p.edition_size",
        "p.max_per_customer",
        "p.launch_at",
        "p.olfactory_pyramid",
        "p.specifications",
        "p.metadata",
        "pt.title",
        "pt.subtitle",
        "pt.short_description",
        "pt.description",
        "pt.story",
        "pt.ingredients",
        "pt.ritual",
        "pt.seo_title",
        "pt.seo_description",
        "ptype.code as product_type_code",
        "ptype.name_ar as product_type_name_ar",
        "ptype.name_en as product_type_name_en",
        "cp.handle as collection_handle",
        "ctr.title as collection_title",
        "ctr.subtitle as collection_subtitle",
        "civt.name as civilization_name",
        "civt.subtitle as civilization_subtitle",
        "hero.url as hero_url",
        "hero.alt_ar as hero_alt_ar",
        "hero.alt_en as hero_alt_en"
      )

    return { items, count }
  }

  async getCatalogProductProfiles(productIds: string[], locale: Locale) {
    if (!productIds.length) {
      return []
    }

    const result = await this.listCatalogProductProfiles({
      locale,
      productIds,
      limit: productIds.length,
      offset: 0,
    })

    return result.items
  }

  async getCatalogCollections(locale: Locale) {
    const items = await this.db("catalog.collection_profile as cp")
      .joinRaw(
        "left join catalog.collection_translation ctr on ctr.collection_id = cp.id and ctr.locale = ?",
        [locale]
      )
      .joinRaw(
        "left join catalog.civilization_translation civt on civt.civilization_id = cp.civilization_id and civt.locale = ?",
        [locale]
      )
      .leftJoin("catalog.media_asset as hero", "hero.id", "cp.hero_media_id")
      .whereIn("cp.status", ["scheduled", "live"])
      .whereNull("cp.deleted_at")
      .orderBy("cp.sort_order", "asc")
      .orderBy("cp.created_at", "asc")
      .select(
        "cp.id",
        "cp.handle",
        "cp.civilization_id",
        "cp.product_type_id",
        "cp.status",
        "cp.sort_order",
        "cp.launch_at",
        "cp.metadata",
        "ctr.title",
        "ctr.subtitle",
        "ctr.description",
        "ctr.story",
        "ctr.seo_title",
        "ctr.seo_description",
        "civt.name as civilization_name",
        "civt.subtitle as civilization_subtitle",
        "hero.url as hero_url",
        "hero.alt_ar as hero_alt_ar",
        "hero.alt_en as hero_alt_en"
      )

    if (!items.length) {
      return []
    }

    const counts = (await this.db("catalog.product_profile")
      .whereIn(
        "collection_id",
        items.map((item: any) => item.id)
      )
      .where("status", "active")
      .whereNull("deleted_at")
      .groupBy("collection_id")
      .select("collection_id")
      .count("product_id as count")) as Array<{
      collection_id: string
      count: string
    }>

    const countByCollection = new Map(
      counts.map((row: any) => [row.collection_id, Number(row.count)])
    )

    return items.map((item: any) => ({
      ...item,
      product_count: countByCollection.get(item.id) ?? 0,
    }))
  }

  async getCatalogProductMedia(productIds: string[], locale: Locale) {
    if (!productIds.length) {
      return []
    }

    return this.db("catalog.product_media as pm")
      .join("catalog.media_asset as m", "m.id", "pm.media_id")
      .whereIn("pm.product_id", productIds)
      .orderBy("pm.product_id", "asc")
      .orderBy("pm.sort_order", "asc")
      .select(
        "pm.product_id",
        "pm.role",
        "pm.sort_order",
        "m.id",
        "m.url",
        "m.mime_type",
        "m.width",
        "m.height",
        "m.bytes",
        "m.alt_ar",
        "m.alt_en",
        "m.blurhash",
        "m.focal_x",
        "m.focal_y",
        "m.metadata"
      )
      .then((rows: any[]) =>
        rows.map((row) => ({
          ...row,
          alt: locale === "en" ? row.alt_en : row.alt_ar,
        }))
      )
  }

  async getSerialAvailability(variantIds: string[]) {
    if (!variantIds.length) {
      return new Map<string, number>()
    }

    const rows = (await this.db("catalog.serial_unit")
      .whereIn("variant_id", variantIds)
      .where("status", "allocated")
      .groupBy("variant_id")
      .select("variant_id")
      .count("id as count")) as Array<{
      variant_id: string
      count: string
    }>

    return new Map(
      rows.map((row: any) => [row.variant_id, Number(row.count)])
    )
  }

  async countPurchasedQuantities(input: {
    customerId?: string | null
    email?: string | null
    variantIds: string[]
  }) {
    if (!input.variantIds.length) {
      return new Map<string, number>()
    }

    // Medusa v2 stores quantity on order_item and the variant/product reference
    // on order_line_item (linked via order_item.item_id). Querying
    // order_item.variant_id fails with "column oi.variant_id does not exist".
    const query = this.db("order as o")
      .join("order_item as oi", "oi.order_id", "o.id")
      .join("order_line_item as oli", "oli.id", "oi.item_id")
      .whereIn("oli.variant_id", input.variantIds)
      .whereNot("o.status", "canceled")

    if (input.customerId) {
      query.where("o.customer_id", input.customerId)
    } else if (input.email) {
      query.whereRaw("lower(o.email) = ?", [input.email.trim().toLowerCase()])
    } else {
      return new Map<string, number>()
    }

    const rows = (await query
      .groupBy("oli.variant_id")
      .select("oli.variant_id")
      .sum("oi.quantity as total")) as Array<{
      variant_id: string
      total: string
    }>

    return new Map(
      rows.map((row: any) => [row.variant_id, Number(row.total)])
    )
  }
}
