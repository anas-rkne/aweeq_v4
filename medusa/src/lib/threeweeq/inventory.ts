import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  updateInventoryLevelsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * Medusa keeps the real stock numbers in its Inventory module: every variant
 * that tracks stock is linked to an inventory item, and the item holds one
 * "level" row per stock location with `stocked_quantity` (what is on the
 * shelf) and `reserved_quantity` (what is already promised to an order).
 * The number the storefront shows is `stocked - reserved`.
 */

/** At or below this count the Studio flags the piece as low stock. */
export const LOW_STOCK_THRESHOLD = 3

/** At or below this count the storefront says "last piece(s)". */
export const LAST_PIECES_THRESHOLD = 2

export type VariantStock = {
  /** false = the piece is sold without a limit (no number is tracked). */
  managed: boolean
  stocked: number
  reserved: number
  available: number
}

const VARIANT_STOCK_FIELDS = [
  "id",
  "product_id",
  "sku",
  "title",
  "manage_inventory",
  "inventory_items.inventory_item_id",
  "inventory_items.required_quantity",
  "inventory_items.inventory.id",
  "inventory_items.inventory.location_levels.id",
  "inventory_items.inventory.location_levels.location_id",
  "inventory_items.inventory.location_levels.stocked_quantity",
  "inventory_items.inventory.location_levels.reserved_quantity",
]

export type VariantStockRow = {
  id: string
  product_id: string
  sku?: string | null
  title?: string | null
  manage_inventory?: boolean | null
  inventory_items?: Array<{
    inventory_item_id?: string | null
    required_quantity?: number | null
    inventory?: {
      id?: string | null
      location_levels?: Array<{
        id?: string | null
        location_id?: string | null
        stocked_quantity?: number | string | null
        reserved_quantity?: number | string | null
      }> | null
    } | null
  }> | null
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

/**
 * The store runs on a single warehouse. Take the first stock location; the
 * seed script creates exactly one and links it to the sales channel.
 */
export async function resolveStockLocationId(
  container: MedusaContainer
): Promise<string> {
  const query = container.resolve<any>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
    pagination: { skip: 0, take: 1 },
  })

  const locationId = data?.[0]?.id
  if (!locationId) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "No stock location is configured, so stock cannot be saved"
    )
  }

  return locationId
}

async function loadVariants(
  container: MedusaContainer,
  variantIds: string[]
): Promise<VariantStockRow[]> {
  if (!variantIds.length) {
    return []
  }

  const query = container.resolve<any>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: VARIANT_STOCK_FIELDS,
    filters: { id: variantIds },
  })

  return (data ?? []) as VariantStockRow[]
}

/**
 * Read the stock of a set of variants. A variant that does not track stock
 * reports `managed: false`; the storefront then treats it as always available.
 */
export async function getVariantStockMap(
  container: MedusaContainer,
  variantIds: string[]
): Promise<Map<string, VariantStock>> {
  const variants = await loadVariants(container, variantIds)
  const stock = new Map<string, VariantStock>()

  for (const variant of variants) {
    const managed = Boolean(variant.manage_inventory)
    const levels = (variant.inventory_items ?? [])
      .map((link) => ({ link, inventory: link.inventory }))
      .filter((entry) => Boolean(entry.inventory?.id))

    if (!managed || !levels.length) {
      stock.set(variant.id, {
        managed: false,
        stocked: 0,
        reserved: 0,
        available: 0,
      })
      continue
    }

    // A variant may require several units of an inventory item (kits). Each
    // item yields how many variants can be sold; the smallest one wins.
    const perItem: number[] = []
    let stocked = 0
    let reserved = 0

    for (const { link, inventory } of levels) {
      const required = Math.max(1, toNumber(link.required_quantity, 1))
      let itemStocked = 0
      let itemReserved = 0

      for (const level of inventory?.location_levels ?? []) {
        itemStocked += toNumber(level.stocked_quantity)
        itemReserved += toNumber(level.reserved_quantity)
      }

      stocked += Math.floor(itemStocked / required)
      reserved += Math.floor(itemReserved / required)
      perItem.push(Math.floor((itemStocked - itemReserved) / required))
    }

    stock.set(variant.id, {
      managed: true,
      stocked,
      reserved,
      available: Math.max(0, Math.min(...perItem)),
    })
  }

  return stock
}

export async function getVariantStock(
  container: MedusaContainer,
  variantId: string
): Promise<VariantStock | null> {
  const stock = await getVariantStockMap(container, [variantId])
  return stock.get(variantId) ?? null
}

/**
 * Toggle Medusa's stock tracking for a variant. Turning it on also creates the
 * default inventory item and links it, which `updateProductsWorkflow` does for
 * us; turning it off dismisses that link but keeps the item and its history.
 */
async function setManageInventory(
  container: MedusaContainer,
  productId: string,
  variantId: string,
  manageInventory: boolean
) {
  await updateProductsWorkflow(container).run({
    input: {
      selector: { id: productId },
      update: {
        variants: [
          {
            id: variantId,
            manage_inventory: manageInventory,
            allow_backorder: false,
          },
        ],
      },
    },
  })
}

/**
 * Write the shelf quantity of one variant.
 *
 * `null` stops tracking the piece (it sells without a limit). A number starts
 * or updates tracking: Medusa creates the inventory item on first use, and we
 * then write the quantity into its level for the single stock location.
 */
export async function setVariantStock(
  container: MedusaContainer,
  input: {
    variantId: string
    quantity: number | null
  }
): Promise<VariantStock> {
  const [variant] = await loadVariants(container, [input.variantId])

  if (!variant) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Variant not found while saving stock"
    )
  }

  if (input.quantity === null) {
    if (variant.manage_inventory) {
      await setManageInventory(
        container,
        variant.product_id,
        variant.id,
        false
      )
    }

    return (
      (await getVariantStock(container, variant.id)) ?? {
        managed: false,
        stocked: 0,
        reserved: 0,
        available: 0,
      }
    )
  }

  const quantity = Math.max(0, Math.trunc(input.quantity))

  if (!variant.manage_inventory) {
    await setManageInventory(container, variant.product_id, variant.id, true)
  }

  // Re-read: when tracking was just switched on, Medusa created and linked the
  // default inventory item inside the workflow above.
  const [tracked] = await loadVariants(container, [variant.id])
  const linkedItem = (tracked?.inventory_items ?? []).find(
    (link) => Boolean(link.inventory?.id)
  )

  if (!linkedItem?.inventory?.id) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Medusa did not create an inventory item for this variant"
    )
  }

  const inventoryItemId = linkedItem.inventory.id
  const locationId = await resolveStockLocationId(container)
  const level = (linkedItem.inventory.location_levels ?? []).find(
    (row) => row.location_id === locationId
  )

  if (level?.id) {
    await updateInventoryLevelsWorkflow(container).run({
      input: {
        updates: [
          {
            id: level.id,
            inventory_item_id: inventoryItemId,
            location_id: locationId,
            stocked_quantity: quantity,
          },
        ],
      },
    })
  } else {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: [
          {
            inventory_item_id: inventoryItemId,
            location_id: locationId,
            stocked_quantity: quantity,
          },
        ],
      },
    })
  }

  return (
    (await getVariantStock(container, variant.id)) ?? {
      managed: true,
      stocked: quantity,
      reserved: 0,
      available: quantity,
    }
  )
}

export type LowStockItem = {
  variant_id: string
  product_id: string
  product_title: string | null
  product_handle: string | null
  variant_title: string | null
  sku: string | null
  available: number
  reserved: number
}

/**
 * Everything that is tracked and at or below the threshold — including the
 * pieces that already hit zero. Used by the Studio's low-stock banner.
 */
export async function listLowStockItems(
  container: MedusaContainer,
  threshold = LOW_STOCK_THRESHOLD
): Promise<LowStockItem[]> {
  const query = container.resolve<any>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: [
      ...VARIANT_STOCK_FIELDS,
      "product.id",
      "product.title",
      "product.handle",
      "product.status",
    ],
    filters: { manage_inventory: true },
  })

  const rows = (data ?? []) as Array<
    VariantStockRow & {
      product?: {
        id?: string | null
        title?: string | null
        handle?: string | null
        status?: string | null
      } | null
    }
  >

  const stock = await getVariantStockMap(
    container,
    rows.map((row) => row.id)
  )
  const items: LowStockItem[] = []

  for (const row of rows) {
    if (row.product?.status === "archived") {
      continue
    }

    const entry = stock.get(row.id)
    if (!entry?.managed || entry.available > threshold) {
      continue
    }

    items.push({
      variant_id: row.id,
      product_id: row.product_id,
      product_title: row.product?.title ?? null,
      product_handle: row.product?.handle ?? null,
      variant_title: row.title ?? null,
      sku: row.sku ?? null,
      available: entry.available,
      reserved: entry.reserved,
    })
  }

  return items.sort((a, b) => a.available - b.available)
}
