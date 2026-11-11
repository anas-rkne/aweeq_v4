import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * One-off cleanup for the abandoned "RAFID — The First Chapter" limited drop.
 *
 * The original seed launched RAFID as a hand-numbered limited edition (1500
 * serial units across three sizes, gated by a live drop). The store pivoted to
 * a plain retail RAFID, so this drop, its serial units, and its product were
 * left behind in the database. They are invisible to shoppers but the drop is
 * still marked `live`, which is misleading — this script removes all of it.
 *
 * Every step is idempotent: safe to run more than once, and it reports what it
 * actually touched.
 *
 * Run once on the server:  npm run medusa:cleanup
 */

const LEGACY_DROP_ID = "drop_rafid_first_chapter"
const LEGACY_PRODUCT_ID = "prod_01M5TXG9D2088GQFWGCA43ZEKG"
const LEGACY_VARIANT_IDS = [
  "variant_01M5TXG9FN96XD8AHCV37EJ04E", // 50 ml
  "variant_01M5TXG9FNA04601NYYFRCDNDH", // 100 ml
  "variant_01M5TXG9FNMXXJG7VNJERW0EHP", // Discovery Set
]

export default async function cleanupLegacyRafid({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
  const query = container.resolve<any>(ContainerRegistrationKeys.QUERY)

  const report: Record<string, number | boolean> = {
    serials: 0,
    drop: 0,
    productDeleted: false,
    productProfiles: 0,
    variantProfiles: 0,
    translations: 0,
    mediaLinks: 0,
  }

  // 1. The 1500 hand-numbered serial units (500 × three sizes).
  report.serials = await knex("catalog.serial_unit")
    .whereIn("variant_id", LEGACY_VARIANT_IDS)
    .del()

  // 2. The drop. `drop_allocation` has `on delete cascade`, so this also
  //    removes the three allocation rows.
  report.drop = await knex("engagement.drop")
    .where({ id: LEGACY_DROP_ID })
    .del()

  // 3. The legacy product, if Medusa still knows it (query.graph hides
  //    soft-deleted rows, so an already-deleted product is simply skipped).
  const { data } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: { id: LEGACY_PRODUCT_ID },
  })

  if (data?.length) {
    await deleteProductsWorkflow(container).run({
      input: { ids: [LEGACY_PRODUCT_ID] },
    })
    report.productDeleted = true
  }

  // 4. The custom catalog rows that pointed at that product. Soft-delete the
  //    profiles (the storefront filters on `deleted_at`), and drop the
  //    translation/media rows that carry no soft-delete column.
  report.productProfiles = await knex("catalog.product_profile")
    .where({ product_id: LEGACY_PRODUCT_ID })
    .whereNull("deleted_at")
    .update({ deleted_at: knex.fn.now(), updated_at: knex.fn.now() })

  report.variantProfiles = await knex("catalog.variant_profile")
    .where({ product_id: LEGACY_PRODUCT_ID })
    .whereNull("deleted_at")
    .update({ deleted_at: knex.fn.now(), updated_at: knex.fn.now() })

  report.translations = await knex("catalog.product_translation")
    .where({ product_id: LEGACY_PRODUCT_ID })
    .del()

  report.mediaLinks = await knex("catalog.product_media")
    .where({ product_id: LEGACY_PRODUCT_ID })
    .del()

  logger.info(`Legacy RAFID cleanup complete: ${JSON.stringify(report)}`)
  return report
}
