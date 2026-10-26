import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  batchLinksWorkflow,
  createApiKeysWorkflow,
  createLocationFulfillmentSetWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateRegionsWorkflow,
} from "@medusajs/medusa/core-flows"

type Row = Record<string, unknown>

async function upsert(
  trx: any,
  table: string,
  rows: Row[],
  conflictColumns: string[],
  updateColumns: string[]
): Promise<void> {
  if (!rows.length) {
    return
  }

  const columns = Object.keys(rows[0])
  const values: unknown[] = []

  const tuples = rows.map((row) => {
    const placeholders = columns.map((column) => {
      values.push(row[column])
      return "?"
    })
    return `(${placeholders.join(", ")})`
  })

  const quotedColumns = columns.map((column) => `"${column}"`).join(", ")
  const quotedConflict = conflictColumns
    .map((column) => `"${column}"`)
    .join(", ")
  const quotedUpdates = updateColumns
    .map((column) => `"${column}" = excluded."${column}"`)
    .join(", ")

  await trx.raw(
    `insert into ${table} (${quotedColumns}) values ${tuples.join(
      ", "
    )} on conflict (${quotedConflict}) do update set ${quotedUpdates}`,
    values
  )
}

const civilizations = [
  {
    id: "babylon",
    code: "BABYLON",
    status: "live",
    sort_order: 1,
    accent_color: "#cd9e61",
    launch_at: null,
  },
  {
    id: "egypt",
    code: "EGYPT",
    status: "announced",
    sort_order: 2,
    accent_color: "#cd9e61",
    launch_at: null,
  },
  {
    id: "china",
    code: "CHINA",
    status: "announced",
    sort_order: 3,
    accent_color: "#cd9e61",
    launch_at: null,
  },
  {
    id: "greece",
    code: "GREECE",
    status: "announced",
    sort_order: 4,
    accent_color: "#cd9e61",
    launch_at: null,
  },
  {
    id: "gulf",
    code: "GULF",
    status: "announced",
    sort_order: 5,
    accent_color: "#cd9e61",
    launch_at: null,
  },
]

const civilizationTranslations = [
  {
    civilization_id: "babylon",
    locale: "ar",
    name: "ط¨ط§ط¨ظ„",
    subtitle: "ط§ظ„ظپطµظ„ ط§ظ„ط£ظˆظ„",
    description:
      "ظ…ظ† ط¨ظٹظ† ط§ظ„ظ†ظ‡ط±ظٹظ†طŒ ط­ظٹط« ظˆظڈظ„ط¯طھ ط§ظ„ظƒطھط§ط¨ط© ط§ظ„ط£ظˆظ„ظ‰طŒ ظٹط¨ط¯ط£ ط¹ط·ط± ط±ط§ظپط¯ ط±ط­ظ„طھظ‡ ط¹ط¨ط± ط§ظ„ط­ط¶ط§ط±ط§طھ.",
    story:
      "ط¨ط§ط¨ظ„ ظ„ظٹط³طھ ظ…ظƒط§ظ†ط§ظ‹ ظپط­ط³ط¨طŒ ط¨ظ„ ط¨ظˆط§ط¨ط©. ظ…ظ† ط·ظٹظ†ظ‡ط§ ظˆط®ط·ظ‡ط§ ط§ظ„ظ…ط³ظ…ط§ط±ظٹ ظˆط²ط±ظ‚طھظ‡ط§ ط§ظ„ط¹ظ…ظٹظ‚ط©طŒ ط§ط³طھظڈظ„ظ‡ظ… ط±ط§ظپط¯ ظ„ظٹظƒظˆظ† ط£ظˆظ„ ظپطµظˆظ„ 3weeq.",
    seo_title: "ط¨ط§ط¨ظ„ â€” ط§ظ„ظپطµظ„ ط§ظ„ط£ظˆظ„ ظ…ظ† 3weeq",
    seo_description:
      "ط§ظƒطھط´ظپ ط¹ط·ط± ط±ط§ظپط¯ ط§ظ„ظ…ط³طھظˆط­ظ‰ ظ…ظ† ط­ط¶ط§ط±ط© ط¨ط§ط¨ظ„طŒ ط£ظˆظ„ ظپطµظˆظ„ ط¨ظˆط§ط¨ط© 3weeq ط¹ط¨ط± ط§ظ„ط­ط¶ط§ط±ط§طھ.",
  },
  {
    civilization_id: "babylon",
    locale: "en",
    name: "Babylon",
    subtitle: "The First Chapter",
    description:
      "From Mesopotamia, where the first writing was born, RAFID begins its journey across civilizations.",
    story:
      "Babylon is not merely a place; it is a gateway. From its clay, cuneiform, and deep blue, RAFID was imagined as the first chapter of 3weeq.",
    seo_title: "Babylon â€” The First Chapter of 3weeq",
    seo_description:
      "Discover RAFID, inspired by the civilization of Babylon, the first chapter of the 3weeq gateway.",
  },
  {
    civilization_id: "egypt",
    locale: "ar",
    name: "ظ…طµط±",
    subtitle: "ط§ظ„ظپطµظ„ ط§ظ„ظ‚ط§ط¯ظ…",
    description:
      "ط­ط¶ط§ط±ط© ط§ظ„ظ†ظٹظ„طŒ ط­ظٹط« طھط­ظˆظ‘ظ„ ط§ظ„ط¨ط®ظˆط± ط¥ظ„ظ‰ ظ„ط؛ط© ظ…ظ‚ط¯ط³ط© ط¨ظٹظ† ط§ظ„ظ…ط¹ط§ط¨ط¯ ظˆط§ظ„ظ…ظ„ظˆظƒ.",
    story:
      "ظ…ظ† ظˆط§ط¯ظٹ ط§ظ„ظ†ظٹظ„طŒ ظ†ط³طھظ„ظ‡ظ… ط·ظ‚ظˆط³ ط§ظ„ط¨ط®ظˆط± ظˆط§ظ„ط²ط±ظ‚ط© ط§ظ„ظ…ظ„ظƒظٹط© ظˆط§ظ„ط°ظ‡ط¨طŒ ظ„طھطµط¨ط­ ظ…طµط± ط§ظ„ظپطµظ„ ط§ظ„طھط§ظ„ظٹ ظپظٹ ط±ط­ظ„طھظ†ط§.",
    seo_title: "ظ…طµط± â€” ظپطµظ„ ظ‚ط§ط¯ظ… ظ…ظ† 3weeq",
    seo_description:
      "ط§ظ†ط¶ظ… ط¥ظ„ظ‰ ظ‚ط§ط¦ظ…ط© ط§ظ†طھط¸ط§ط± ظپطµظ„ ظ…طµط±طŒ ط­ظٹط« ظٹظ„طھظ‚ظٹ ط§ظ„ط¨ط®ظˆط± ط§ظ„ظ…ظ‚ط¯ط³ ط¨ظپط®ط§ظ…ط© ط§ظ„ظ†ظٹظ„.",
  },
  {
    civilization_id: "egypt",
    locale: "en",
    name: "Egypt",
    subtitle: "The Next Chapter",
    description:
      "The civilization of the Nile, where incense became a sacred language between temples and kings.",
    story:
      "From the Nile valley, we draw on incense rituals, royal blue, and gold, making Egypt the next chapter of our journey.",
    seo_title: "Egypt â€” An Upcoming Chapter of 3weeq",
    seo_description:
      "Join the waitlist for the Egypt chapter, where sacred incense meets the luxury of the Nile.",
  },
  {
    civilization_id: "china",
    locale: "ar",
    name: "ط§ظ„طµظٹظ†",
    subtitle: "ط§ظ„ظپطµظ„ ط§ظ„ظ‚ط§ط¯ظ…",
    description:
      "ظ…ظ† ط­ط±ظٹط± ط§ظ„طµظٹظ† ظˆظˆط±ظ‚ظ‡ط§ ظˆط£ط®ط´ط§ط¨ظ‡ط§ ط§ظ„ط¹ط·ط±ظٹط©طŒ طھطھط´ظƒظ‘ظ„ ط­ط³ط§ط³ظٹط© ظ…ط®طھظ„ظپط© ظ„ظ„ظپط®ط§ظ…ط©.",
    story:
      "ط§ظ„طµظٹظ† ظپظٹ 3weeq ظ„ظٹط³طھ ط²ط®ط±ظپط©طŒ ط¨ظ„ ظ…ط§ط¯ط© ظˆط­ظƒط§ظٹط©: ط§ظ„ط­ط±ظٹط±طŒ ط§ظ„ط´ط§ظٹطŒ ط§ظ„ط£ط®ط´ط§ط¨ ط§ظ„ط¹ط·ط±ظٹط©طŒ ظˆط§ظ„ظ…ط³ط§ط­ط§طھ ط§ظ„ظ‡ط§ط¯ط¦ط©.",
    seo_title: "ط§ظ„طµظٹظ† â€” ظپطµظ„ ظ‚ط§ط¯ظ… ظ…ظ† 3weeq",
    seo_description:
      "ط§ظ†ط¶ظ… ط¥ظ„ظ‰ ظ‚ط§ط¦ظ…ط© ط§ظ†طھط¸ط§ط± ظپطµظ„ ط§ظ„طµظٹظ†طŒ ط­ظٹط« ظٹطھط­ظˆظ‘ظ„ ط§ظ„ط­ط±ظٹط± ظˆط§ظ„ط£ط®ط´ط§ط¨ ط§ظ„ط¹ط·ط±ظٹط© ط¥ظ„ظ‰ طھط¬ط±ط¨ط© ط­ط³ظٹط©.",
  },
  {
    civilization_id: "china",
    locale: "en",
    name: "China",
    subtitle: "The Next Chapter",
    description:
      "From Chinese silk, paper, and aromatic woods, a different sensibility of luxury takes shape.",
    story:
      "China in 3weeq is not ornament but material and narrative: silk, tea, aromatic woods, and quiet space.",
    seo_title: "China â€” An Upcoming Chapter of 3weeq",
    seo_description:
      "Join the waitlist for the China chapter, where silk and aromatic woods become a sensory experience.",
  },
  {
    civilization_id: "greece",
    locale: "ar",
    name: "ط§ظ„ظٹظˆظ†ط§ظ†",
    subtitle: "ط§ظ„ظپطµظ„ ط§ظ„ظ‚ط§ط¯ظ…",
    description:
      "ظ…ظ† ط§ظ„ط±ط®ط§ظ… ظˆط§ظ„ط²ظٹطھظˆظ† ظˆط§ظ„ط¨ط­ط± ط§ظ„ط¥ظٹط¬ظٹطŒ طھظˆظ„ط¯ ظپط®ط§ظ…ط© طھظ‚ظٹط³ ط§ظ„ط¬ظ…ط§ظ„ ط¨ط§ظ„طھظ†ط§ط³ط¨ ظˆط§ظ„ط¶ظˆط،.",
    story:
      "ط§ظ„ظٹظˆظ†ط§ظ† طھط¹ظ„ظ‘ظ…ظ†ط§ ط£ظ† ط§ظ„ظپط®ط§ظ…ط© ظ„ظٹط³طھ ظƒط«ط±ط©طŒ ط¨ظ„ طھظ†ط§ط³ط¨. ظ…ظ† ط§ظ„ط£ط¹ظ…ط¯ط© ظˆط§ظ„ط±ط®ط§ظ… ظˆط§ظ„ط²ظٹطھظˆظ†طŒ ظ†ط¨ظ†ظٹ ظپطµظ„ط§ظ‹ ط¹ظ† ط§ظ„طµظپط§ط،.",
    seo_title: "ط§ظ„ظٹظˆظ†ط§ظ† â€” ظپطµظ„ ظ‚ط§ط¯ظ… ظ…ظ† 3weeq",
    seo_description:
      "ط§ظ†ط¶ظ… ط¥ظ„ظ‰ ظ‚ط§ط¦ظ…ط© ط§ظ†طھط¸ط§ط± ظپطµظ„ ط§ظ„ظٹظˆظ†ط§ظ†طŒ ط­ظٹط« ظٹظ„طھظ‚ظٹ ط§ظ„ط±ط®ط§ظ… ظˆط§ظ„ط²ظٹطھظˆظ† ظˆط¶ظˆط، ط§ظ„ط¨ط­ط±.",
  },
  {
    civilization_id: "greece",
    locale: "en",
    name: "Greece",
    subtitle: "The Next Chapter",
    description:
      "From marble, olive, and the Aegean, a luxury is born that measures beauty in proportion and light.",
    story:
      "Greece teaches us that luxury is not abundance but proportion. From columns, marble, and olive, we build a chapter about clarity.",
    seo_title: "Greece â€” An Upcoming Chapter of 3weeq",
    seo_description:
      "Join the waitlist for the Greece chapter, where marble, olive, and Aegean light meet.",
  },
  {
    civilization_id: "gulf",
    locale: "ar",
    name: "ط§ظ„ط®ظ„ظٹط¬",
    subtitle: "ط§ظ„ظپطµظ„ ط§ظ„ظ‚ط§ط¯ظ…",
    description:
      "ظ…ظ† ط§ظ„ط¹ظˆط¯ ظˆط§ظ„طµط­ط±ط§ط، ظˆط§ظ„ط¨ط­ط±طŒ طھظڈط±ظˆظ‰ ط­ظƒط§ظٹط© ظپط®ط§ظ…ط© طھط¹ط±ظپ ظ‚ظٹظ…طھظ‡ط§ ظپظٹ ط§ظ„ط£ط«ط± ظ„ط§ ظپظٹ ط§ظ„ط¶ط¬ظٹط¬.",
    story:
      "ط§ظ„ط®ظ„ظٹط¬ ط­ط§ط¶ط± ظپظٹ 3weeq ط¨ظˆطµظپظ‡ ط°ط§ظƒط±ط© ط¹ط·ط±ظٹط©: ط§ظ„ط¹ظˆط¯طŒ ط§ظ„ط¹ظ†ط¨ط±طŒ ط§ظ„ظ†ط®ظٹظ„طŒ ظˆط§ظ„طµظ…طھ ط§ظ„ظˆط§ط³ط¹ ط¨ظٹظ† ط§ظ„ظƒط«ط¨ط§ظ† ظˆط§ظ„ط¨ط­ط±.",
    seo_title: "ط§ظ„ط®ظ„ظٹط¬ â€” ظپطµظ„ ظ‚ط§ط¯ظ… ظ…ظ† 3weeq",
    seo_description:
      "ط§ظ†ط¶ظ… ط¥ظ„ظ‰ ظ‚ط§ط¦ظ…ط© ط§ظ†طھط¸ط§ط± ظپطµظ„ ط§ظ„ط®ظ„ظٹط¬طŒ ط­ظٹط« ظٹظ„طھظ‚ظٹ ط§ظ„ط¹ظˆط¯ ظˆط§ظ„ط¹ظ†ط¨ط± ظˆط§ظ„طµط­ط±ط§ط،.",
  },
  {
    civilization_id: "gulf",
    locale: "en",
    name: "The Gulf",
    subtitle: "The Next Chapter",
    description:
      "From oud, desert, and sea, a story of luxury is told that values impact over noise.",
    story:
      "The Gulf is present in 3weeq as olfactory memory: oud, amber, palm, and the vast silence between dunes and sea.",
    seo_title: "The Gulf â€” An Upcoming Chapter of 3weeq",
    seo_description:
      "Join the waitlist for the Gulf chapter, where oud, amber, and the desert meet.",
  },
]

const productTypes = [
  {
    id: "fragrance",
    code: "FRAGRANCE",
    name_ar: "ط¹ط·ظˆط±",
    name_en: "Fragrances",
    description_ar: "ط¹ط·ظˆط± ظ…ط³طھظˆط­ط§ط© ظ…ظ† ط§ظ„ط­ط¶ط§ط±ط§طھطŒ ط¨طھط±ظƒظٹط² ط¹ط§ظ„ظچ ظˆظ†ط¯ط±ط© ط­ظ‚ظٹظ‚ظٹط©.",
    description_en:
      "Civilization-inspired fragrances with high concentration and true rarity.",
    sort_order: 1,
    is_active: true,
  },
  {
    id: "incense",
    code: "INCENSE",
    name_ar: "ط¨ط®ظˆط±",
    name_en: "Incense",
    description_ar: "ط¨ط®ظˆط± ظˆط±ط§طھظ†ط¬ط§طھ طھط­ظ…ظ„ ط°ط§ظƒط±ط© ط§ظ„ظ…ط¹ط§ط¨ط¯ ظˆط§ظ„ط·ط±ظ‚ ط§ظ„ظ‚ط¯ظٹظ…ط©.",
    description_en:
      "Incense and resins carrying the memory of temples and ancient routes.",
    sort_order: 2,
    is_active: true,
  },
  {
    id: "jewelry",
    code: "JEWELRY",
    name_ar: "ظ…ط¬ظˆظ‡ط±ط§طھ",
    name_en: "Jewelry",
    description_ar: "ظ‚ط·ط¹ طµط؛ظٹط±ط© ظ…ظ†ط­ظˆطھط© ط¨ط±ظˆط­ ط§ظ„ط­ط¶ط§ط±ط§طھ ظˆط±ظ…ظˆط²ظ‡ط§.",
    description_en:
      "Small pieces carved with the spirit and symbols of civilizations.",
    sort_order: 3,
    is_active: true,
  },
  {
    id: "textile",
    code: "TEXTILE",
    name_ar: "ط£ظ‚ظ…ط´ط©",
    name_en: "Textiles",
    description_ar: "ط£ظ‚ظ…ط´ط© ظپط§ط®ط±ط© ط¨ظ†ظ‚ظˆط´ ظˆط£ظ„ظˆط§ظ† ظ…ط³طھط®ظ„طµط© ظ…ظ† ط§ظ„ط£ط±ط´ظٹظپط§طھ ط§ظ„طھط§ط±ظٹط®ظٹط©.",
    description_en:
      "Luxury textiles with patterns and colors drawn from historical archives.",
    sort_order: 4,
    is_active: true,
  },
  {
    id: "leather",
    code: "LEATHER",
    name_ar: "ظ…ظ†طھط¬ط§طھ ط¬ظ„ط¯ظٹط©",
    name_en: "Leather Goods",
    description_ar: "ط¬ظ„ظˆط¯ ظ…ط¯ط¨ظˆط؛ط© ط¨ط¹ظ†ط§ظٹط©طŒ ط¨طھظپط§طµظٹظ„ طھط´ظٹط± ط¥ظ„ظ‰ ط§ظ„ط­ط±ظپط© ط§ظ„ظ‚ط¯ظٹظ…ط©.",
    description_en:
      "Carefully tanned leathers with details that echo ancient craft.",
    sort_order: 5,
    is_active: true,
  },
  {
    id: "artifact",
    code: "ARTIFACT",
    name_ar: "طھط­ظپ",
    name_en: "Artifacts",
    description_ar: "ظ‚ط·ط¹ ظ…ط­ط¯ظˆط¯ط© طھظڈط¹ظٹط¯ ظ‚ط±ط§ط،ط© ط±ظ…ط² ط­ط¶ط§ط±ظٹ ظپظٹ ط³ظٹط§ظ‚ ظ…ط¹ط§طµط±.",
    description_en:
      "Limited pieces that reinterpret a civilizational symbol in a contemporary context.",
    sort_order: 6,
    is_active: true,
  },
]

async function insertIgnore(
  trx: any,
  table: string,
  rows: Row[],
  conflictColumns: string[],
  chunkSize = 200
): Promise<void> {
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize)
    const columns = Object.keys(chunk[0])
    const values: unknown[] = []
    const tuples = chunk.map((row) => {
      const placeholders = columns.map((column) => {
        values.push(row[column])
        return "?"
      })
      return `(${placeholders.join(", ")})`
    })
    const quotedColumns = columns.map((column) => `"${column}"`).join(", ")
    const quotedConflict = conflictColumns
      .map((column) => `"${column}"`)
      .join(", ")

    await trx.raw(
      `insert into ${table} (${quotedColumns}) values ${tuples.join(
        ", "
      )} on conflict (${quotedConflict}) do nothing`,
      values
    )
  }
}

function firstResult<T>(result: any): T | null {
  const output = result?.result ?? result
  if (Array.isArray(output)) {
    return output[0] ?? null
  }
  return output ?? null
}

const storefrontUrl = (
  process.env.STOREFRONT_URL ?? "http://localhost:3000"
).replace(/\/+$/, "")

const rafidCollection = {
  id: "rafid-collection",
  handle: "rafid",
  civilization_id: "babylon",
  product_type_id: "fragrance",
  status: "live",
  sort_order: 1,
  hero_media_id: "media_rafid_hero",
  launch_at: "2026-01-01T00:00:00.000Z",
  metadata: JSON.stringify({ chapter: 1 }),
}

const rafidCollectionTranslations = [
  {
    collection_id: "rafid-collection",
    locale: "ar",
    title: "ط±ط§ظپط¯",
    subtitle: "ط§ظ„ظپطµظ„ ط§ظ„ط£ظˆظ„ â€” ط¨ط§ط¨ظ„",
    description:
      "ظ…ط¬ظ…ظˆط¹ط© ط±ط§ظپط¯ ط§ظ„ط§ظپطھطھط§ط­ظٹط©: ط¹ط·ط± ظˆط§ط­ط¯طŒ ط¥طµط¯ط§ط± ظ…ط­ط¯ظˆط¯طŒ ظˆط°ط§ظƒط±ط© ط­ط¶ط§ط±ط© ظƒط§ظ…ظ„ط©.",
    story:
      "ط±ط§ظپط¯ ظ‡ظˆ ط§ظ„ط¨ط¯ط§ظٹط©. ظ…ظ† ط¨ط§ط¨ظ„طŒ ط­ظٹط« ظˆظڈظ„ط¯طھ ط§ظ„ظƒطھط§ط¨ط©طŒ ظٹظپطھط­ 3weeq ط¨ظˆط§ط¨طھظ‡ ط§ظ„ط£ظˆظ„ظ‰ ط¨ط¹ط·ط± ظٹط­ظ…ظ„ ط§ظ„ط·ظٹظ† ظˆط§ظ„ط²ط±ظ‚ط© ظˆط§ظ„ط±ط§طھظ†ط¬ط§طھ.",
    seo_title: "ط±ط§ظپط¯ â€” ظ…ط¬ظ…ظˆط¹ط© ط¨ط§ط¨ظ„ ظ…ظ† 3weeq",
    seo_description:
      "ط§ظƒطھط´ظپ ظ…ط¬ظ…ظˆط¹ط© ط±ط§ظپط¯ ط§ظ„ط§ظپطھطھط§ط­ظٹط© ظ…ظ† 3weeqطŒ ظ…ط³طھظˆط­ط§ط© ظ…ظ† ط­ط¶ط§ط±ط© ط¨ط§ط¨ظ„.",
  },
  {
    collection_id: "rafid-collection",
    locale: "en",
    title: "RAFID",
    subtitle: "The First Chapter â€” Babylon",
    description:
      "The opening RAFID collection: one fragrance, a limited edition, and the memory of an entire civilization.",
    story:
      "RAFID is the beginning. From Babylon, where writing was born, 3weeq opens its first gateway with a fragrance carrying clay, blue, and resins.",
    seo_title: "RAFID â€” The Babylon Collection by 3weeq",
    seo_description:
      "Discover RAFID, the opening collection by 3weeq inspired by the civilization of Babylon.",
  },
]

const rafidMedia = [
  {
    id: "media_rafid_hero",
    storage_key: "rafid/hero.webp",
    url: `${storefrontUrl}/images/first_chapter/main_first_chapter.webp`,
    mime_type: "image/png",
    width: null,
    height: null,
    bytes: null,
    alt_ar: "ط±ط§ظپط¯ â€” ط§ظ„ظپطµظ„ ط§ظ„ط£ظˆظ„ ظ…ظ† 3weeq",
    alt_en: "RAFID â€” The First Chapter of 3weeq",
    blurhash: null,
    focal_x: 0.5,
    focal_y: 0.5,
    metadata: JSON.stringify({ role: "hero" }),
  },
  {
    id: "media_rafid_gallery",
    storage_key: "rafid/gallery.webp",
    url: `${storefrontUrl}/images/hero/hero_img.webp`,
    mime_type: "image/png",
    width: null,
    height: null,
    bytes: null,
    alt_ar: "ط±ط§ظپط¯ â€” طھظپط§طµظٹظ„ ط§ظ„ط¹ط·ط±",
    alt_en: "RAFID â€” fragrance details",
    blurhash: null,
    focal_x: 0.5,
    focal_y: 0.5,
    metadata: JSON.stringify({ role: "gallery" }),
  },
  {
    id: "media_rafid_packaging",
    storage_key: "rafid/packaging-main.webp",
    url: `${storefrontUrl}/images/packaging_images/main_bg_packaing.webp`,
    mime_type: "image/jpeg",
    width: null,
    height: null,
    bytes: null,
    alt_ar: "ط±ط§ظپط¯ â€” ط§ظ„ط¹ظ„ط¨ط© ظˆط§ظ„طھط؛ظ„ظٹظپ",
    alt_en: "RAFID â€” packaging",
    blurhash: null,
    focal_x: 0.5,
    focal_y: 0.5,
    metadata: JSON.stringify({ role: "packaging" }),
  },
  {
    id: "media_rafid_packaging_detail",
    storage_key: "rafid/packaging-detail.webp",
    url: `${storefrontUrl}/images/packaging_images/1.webp`,
    mime_type: "image/png",
    width: null,
    height: null,
    bytes: null,
    alt_ar: "ط±ط§ظپط¯ â€” طھظپطµظٹظ„ ط§ظ„طھط؛ظ„ظٹظپ",
    alt_en: "RAFID â€” packaging detail",
    blurhash: null,
    focal_x: 0.5,
    focal_y: 0.5,
    metadata: JSON.stringify({ role: "detail" }),
  },
]

const rafidProductTranslations = [
  {
    product_id: "pending",
    locale: "ar",
    title: "ط±ط§ظپط¯",
    subtitle: "ط§ظ„ظپطµظ„ ط§ظ„ط£ظˆظ„ â€” ط¨ط§ط¨ظ„",
    short_description:
      "ط¹ط·ط± ط´ط±ظ‚ظٹ ط¹ظ…ظٹظ‚ ظ…ظ† ط¨ط§ط¨ظ„طŒ ط­ظٹط« ظٹظ„طھظ‚ظٹ ط§ظ„ط·ظٹظ† ظˆط§ظ„ط²ط±ظ‚ط© ط¨ط§ظ„ط£ط®ط´ط§ط¨ ظˆط§ظ„ط±ط§طھظ†ط¬ط§طھ.",
    description:
      "ط±ط§ظپط¯ ط¹ط·ط± ظٹط­ظ…ظ„ ط°ط§ظƒط±ط© ط¨ط§ط¨ظ„: ط²ط±ظ‚ط© ط§ظ„ط·ظٹظ† ط§ظ„ظ…ط­ط±ظˆظ‚طŒ ط¯ظپط، ط§ظ„ط±ط§طھظ†ط¬ط§طھطŒ ظˆط¹ظ…ظ‚ ط§ظ„ط£ط®ط´ط§ط¨. طھط±ظƒظٹط¨ط© ط¹ط§ظ„ظٹط© ط§ظ„طھط±ظƒظٹط² طµظڈظ…ظ…طھ ظ„طھظڈظ„ط¨ط³ ظƒط­ظƒط§ظٹط© ظ„ط§ ظƒط¹ط·ط± ظپظ‚ط·.\n\nظƒظ„ ظ‚ط·ط¹ط© ظ…ظ† ط§ظ„ط¥طµط¯ط§ط± ط§ظ„ط£ظˆظ„ ظ…ط±ظ‚ظ‘ظ…ط© ظٹط¯ظˆظٹط§ظ‹طŒ ظˆطھط£طھظٹ ط¨طھط؛ظ„ظٹظپ ظٹط­ظ…ظ„ ط±ظ…ظˆط² ط§ظ„ظپطµظ„ ط§ظ„ط£ظˆظ„.",
    story:
      "ظ…ظ† ط¨ظٹظ† ط§ظ„ظ†ظ‡ط±ظٹظ†طŒ ط­ظٹط« ظˆظڈظ„ط¯طھ ط§ظ„ظƒطھط§ط¨ط© ط§ظ„ط£ظˆظ„ظ‰طŒ ظٹط¨ط¯ط£ ط±ط§ظپط¯ ط±ط­ظ„طھظ‡. ظ…ظ† ط·ظٹظ† ط¨ط§ط¨ظ„ ظˆط®ط·ظ‡ط§ ط§ظ„ظ…ط³ظ…ط§ط±ظٹ ظˆط²ط±ظ‚طھظ‡ط§ ط§ظ„ط¹ظ…ظٹظ‚ط©طŒ ط§ط³طھظڈظ„ظ‡ظ… ط§ظ„ط¹ط·ط± ظ„ظٹظƒظˆظ† ط¨ظˆط§ط¨ط© 3weeq ط§ظ„ط£ظˆظ„ظ‰.",
    ingredients:
      "ط¹ظˆط¯طŒ ط¹ظ†ط¨ط±طŒ ط¨ط®ظˆط±طŒ ط²ط¹ظپط±ط§ظ†طŒ ظˆط±ط¯طŒ ط®ط´ط¨ ط§ظ„طµظ†ط¯ظ„طŒ ظ…ط³ظƒطŒ ظˆط¨ظ„ط³ظ….",
    ritual:
      "ط±ط´ظ‘ط© ظˆط§ط­ط¯ط© ط¹ظ„ظ‰ ط§ظ„ظ…ط¹طµظ…طŒ ظˆظˆط§ط­ط¯ط© ط¹ظ„ظ‰ ط¬ط§ظ†ط¨ظٹ ط§ظ„ط±ظ‚ط¨ط©. ط§طھط±ظƒ ط§ظ„ط¹ط·ط± ظٹط³طھظ‚ط± ظ‚ط¨ظ„ ط§ظ„ط®ط±ظˆط¬.",
    seo_title: "ط±ط§ظپط¯ â€” ط¹ط·ط± ط¨ط§ط¨ظ„ ظ…ظ† 3weeq",
    seo_description:
      "ط±ط§ظپط¯ ط¹ط·ط± ظ…ط­ط¯ظˆط¯ ظ…ظ† 3weeq ظ…ط³طھظˆط­ظ‰ ظ…ظ† ط­ط¶ط§ط±ط© ط¨ط§ط¨ظ„طŒ ط¨طھط±ظƒظٹط² ط¹ط§ظ„ظچ ظˆطھط؛ظ„ظٹظپ ظ…ط±ظ‚ظ‘ظ….",
  },
  {
    product_id: "pending",
    locale: "en",
    title: "RAFID",
    subtitle: "The First Chapter â€” Babylon",
    short_description:
      "A deep oriental fragrance from Babylon, where clay and blue meet woods and resins.",
    description:
      "RAFID carries the memory of Babylon: the blue of fired clay, the warmth of resins, and the depth of woods. A high-concentration composition made to be worn as a story, not merely a scent.\n\nEvery piece in the first edition is hand-numbered and arrives in packaging carrying the symbols of the first chapter.",
    story:
      "From Mesopotamia, where the first writing was born, RAFID begins its journey. From Babylon's clay, cuneiform, and deep blue, the fragrance was imagined as the first gateway of 3weeq.",
    ingredients:
      "Oud, amber, incense, saffron, rose, sandalwood, musk, and balsam.",
    ritual:
      "One spray on the wrist and one on each side of the neck. Let the fragrance settle before leaving.",
    seo_title: "RAFID â€” The Babylon Fragrance by 3weeq",
    seo_description:
      "RAFID is a limited fragrance by 3weeq inspired by Babylon, with high concentration and numbered packaging.",
  },
]

const rafidVariantSeeds = [
  {
    key: "50",
    title: "50 ml",
    sku: "RAFID-50",
    amount: 850,
    size_ml: 50,
    packaging: "bottle-50",
  },
  {
    key: "100",
    title: "100 ml",
    sku: "RAFID-100",
    amount: 1200,
    size_ml: 100,
    packaging: "bottle-100",
  },
  {
    key: "discovery",
    title: "Discovery Set",
    sku: "RAFID-DISCOVERY",
    amount: 350,
    size_ml: 3,
    packaging: "discovery-box",
  },
]

export default async function seed({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
  const query = container.resolve<any>(ContainerRegistrationKeys.QUERY)

  await knex.transaction(async (trx: any) => {
    await upsert(
      trx,
      "catalog.civilization",
      civilizations,
      ["id"],
      ["code", "status", "sort_order", "accent_color", "launch_at"]
    )

    await upsert(
      trx,
      "catalog.civilization_translation",
      civilizationTranslations,
      ["civilization_id", "locale"],
      [
        "name",
        "subtitle",
        "description",
        "story",
        "seo_title",
        "seo_description",
      ]
    )

    await upsert(
      trx,
      "catalog.product_type",
      productTypes,
      ["id"],
      [
        "code",
        "name_ar",
        "name_en",
        "description_ar",
        "description_en",
        "sort_order",
        "is_active",
      ]
    )
  })

  const { data: existingRegions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
    filters: { currency_code: "aed" },
    pagination: { skip: 0, take: 1 },
  })
  let region = existingRegions?.[0] ?? null

  if (!region) {
    const result = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "UAE",
            currency_code: "aed",
            countries: ["ae"],
          },
        ],
      },
    })
    region = firstResult(result)
  }

  const { data: existingChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
    filters: { name: "3weeq Store" },
    pagination: { skip: 0, take: 1 },
  })
  let salesChannel = existingChannels?.[0] ?? null

  if (!salesChannel) {
    const result = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: "3weeq Store",
            description: "The 3weeq storefront",
          },
        ],
      },
    })
    salesChannel = firstResult(result)
  }

  let publishableKey: { id: string; token?: string } | null = null

  if (salesChannel?.id) {
    const { data: existingKeys } = await query.graph({
      entity: "api_key",
      fields: ["id", "token", "title", "type"],
      filters: { type: "publishable", title: "3weeq Storefront" },
      pagination: { skip: 0, take: 1 },
    })
    publishableKey = existingKeys?.[0] ?? null
    let createdKey = false

    if (!publishableKey) {
      const result = await createApiKeysWorkflow(container).run({
        input: {
          api_keys: [
            {
              type: "publishable",
              title: "3weeq Storefront",
              created_by: "seed",
            },
          ],
        },
      })
      publishableKey = firstResult<{ id: string; token?: string }>(result)
      createdKey = true
    }

    if (createdKey && publishableKey?.id) {
      await linkSalesChannelsToApiKeyWorkflow(container).run({
        input: {
          id: publishableKey.id,
          add: [salesChannel.id],
        },
      })
    }
  }

  if (region?.id) {
    const { data: regionProviders } = await query.graph({
      entity: "region",
      fields: ["id", "payment_providers.id"],
      filters: { id: region.id },
    })
    const currentProviders = (
      regionProviders?.[0]?.payment_providers ?? []
    ).map((provider: any) => provider.id)
    const nextProviders = Array.from(
      new Set([...currentProviders, "pp_stripe_stripe"].filter(Boolean))
    )

    if (!currentProviders.includes("pp_stripe_stripe")) {
      await updateRegionsWorkflow(container).run({
        input: {
          selector: { id: region.id },
          update: { payment_providers: nextProviders },
        },
      })
      logger.info("Enabled Stripe for the GCC region")
    }
  }

  const { data: existingLocations } = await query.graph({
    entity: "stock_location",
    fields: [
      "id",
      "name",
      "sales_channels.id",
      "fulfillment_sets.id",
      "fulfillment_sets.name",
      "fulfillment_sets.type",
      "fulfillment_sets.service_zones.id",
      "fulfillment_sets.service_zones.name",
    ],
    filters: { name: "3weeq Warehouse" },
    pagination: { skip: 0, take: 1 },
  })
  let stockLocation = existingLocations?.[0] ?? null

  if (!stockLocation) {
    const result = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: "3weeq Warehouse",
            address: {
              address_1: "Riyadh",
              city: "Riyadh",
              country_code: "sa",
            },
          },
        ],
      },
    })
    stockLocation = firstResult(result)
  }

  if (!stockLocation?.id) {
    throw new Error("Unable to seed the 3weeq warehouse")
  }

  const linkedChannelIds = (stockLocation.sales_channels ?? []).map(
    (channel: any) => channel.id
  )

  if (salesChannel?.id && !linkedChannelIds.includes(salesChannel.id)) {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: stockLocation.id, add: [salesChannel.id] },
    })
  }

  let fulfillmentSet = (stockLocation.fulfillment_sets ?? [])[0] ?? null

  if (!fulfillmentSet?.id) {
    const result = await createLocationFulfillmentSetWorkflow(container).run({
      input: {
        location_id: stockLocation.id,
        fulfillment_set_data: { name: "3weeq Shipping", type: "shipping" },
      },
    })
    fulfillmentSet = firstResult(result)
  }

  const { data: locationSets } = await query.graph({
    entity: "stock_location",
    fields: [
      "fulfillment_sets.id",
      "fulfillment_sets.name",
      "fulfillment_sets.service_zones.id",
      "fulfillment_sets.service_zones.name",
    ],
    filters: { id: stockLocation.id },
  })
  const fulfillmentSets = locationSets?.[0]?.fulfillment_sets ?? []
  const resolvedSet =
    fulfillmentSets.find((set: any) => set.id === fulfillmentSet?.id) ??
    fulfillmentSets[0]

  if (!resolvedSet?.id) {
    throw new Error("Unable to seed the 3weeq fulfillment set")
  }

  let serviceZone = (resolvedSet.service_zones ?? [])[0] ?? null

  if (!serviceZone?.id) {
    const result = await createServiceZonesWorkflow(container).run({
      input: {
        data: [
          {
            name: "UAE",
            fulfillment_set_id: resolvedSet.id,
            geo_zones: ["sa", "ae", "kw", "qa", "bh", "om"].map(
              (countryCode) => ({
                type: "country" as const,
                country_code: countryCode,
              })
            ),
          },
        ],
      },
    })
    serviceZone = firstResult(result)
  }

  if (!serviceZone?.id) {
    throw new Error("Unable to seed the GCC service zone")
  }

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name", "type"],
    pagination: { skip: 0, take: 20 },
  })
  let shippingProfile =
    shippingProfiles?.find((profile: any) => profile.type === "default") ??
    shippingProfiles?.[0] ??
    null

  if (!shippingProfile?.id) {
    const result = await createShippingProfilesWorkflow(container).run({
      input: {
        data: [{ name: "3weeq Default", type: "default" }],
      },
    })
    shippingProfile = firstResult(result)
  }

  if (!shippingProfile?.id) {
    throw new Error("Unable to seed a shipping profile")
  }

  const { data: fulfillmentProviders } = await query.graph({
    entity: "fulfillment_provider",
    fields: ["id", "name"],
    pagination: { skip: 0, take: 20 },
  })
  const fulfillmentProvider =
    fulfillmentProviders?.find((provider: any) =>
      String(provider.id).startsWith("manual")
    ) ?? fulfillmentProviders?.[0]

  if (!fulfillmentProvider?.id) {
    throw new Error("No fulfillment provider is available")
  }

  // Enable the manual fulfillment provider for this stock location before
  // creating any shipping option. Without this link, Medusa rejects the
  // shipping option with "Providers (...) are not enabled for the service
  // location".
  try {
    await batchLinksWorkflow(container).run({
      input: {
        create: [
          {
            [Modules.STOCK_LOCATION]: {
              stock_location_id: stockLocation.id,
            },
            [Modules.FULFILLMENT]: {
              fulfillment_provider_id: fulfillmentProvider.id,
            },
          },
        ],
      },
    })
  } catch (error) {
    // The link may already exist from a previous seed run; that is harmless.
    logger.info(
      `Fulfillment provider link skipped: ${(error as Error).message}`
    )
  }

  const { data: existingShippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "service_zone_id"],
    filters: { name: "Standard Shipping", service_zone_id: serviceZone.id },
    pagination: { skip: 0, take: 1 },
  })

  if (!existingShippingOptions?.length) {
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standard Shipping",
          service_zone_id: serviceZone.id,
          shipping_profile_id: shippingProfile.id,
          provider_id: fulfillmentProvider.id,
          type: {
            label: "Standard",
            description: "Standard delivery across the GCC",
            code: "standard",
          },
          price_type: "flat",
          prices: [{ amount: 0, currency_code: "aed" }],
        },
      ],
    })
  }

  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "variants.id", "variants.sku"],
    filters: { handle: "rafid" },
    pagination: { skip: 0, take: 1 },
  })
  let product = existingProducts?.[0] ?? null

  if (!product) {
    const result = await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: "RAFID",
            handle: "rafid",
            description:
              "A deep oriental fragrance from Babylon, where clay and blue meet woods and resins.",
            status: "published",
            shipping_profile_id: shippingProfile.id,
            thumbnail: `${storefrontUrl}/images/first_chapter/main_first_chapter.webp`,
            metadata: { chapter: 1, civilization: "babylon" },
            options: [
              {
                title: "Size",
                values: rafidVariantSeeds.map((variant) => variant.title),
              },
            ],
            variants: rafidVariantSeeds.map((variant) => ({
              title: variant.title,
              sku: variant.sku,
              manage_inventory: false,
              allow_backorder: false,
              options: { Size: variant.title },
              prices: [
                {
                  amount: variant.amount,
                  currency_code: "aed",
                },
              ],
            })),
            ...(salesChannel?.id
              ? { sales_channels: [{ id: salesChannel.id }] }
              : {}),
          },
        ],
      },
    })
    product = firstResult(result)
  }

  if (!product?.id) {
    throw new Error("Unable to seed the RAFID product")
  }

  const { data: productDetails } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "variants.id", "variants.sku"],
    filters: { id: product.id },
  })
  const productVariants = productDetails?.[0]?.variants ?? product.variants ?? []
  const variantIdBySku = new Map<string, string>(
    productVariants
      .filter((variant: any) => variant.sku && variant.id)
      .map((variant: any) => [variant.sku, variant.id])
  )

  for (const variant of rafidVariantSeeds) {
    if (!variantIdBySku.has(variant.sku)) {
      throw new Error(`Missing seeded variant for SKU ${variant.sku}`)
    }
  }

  const productId = product.id

  await knex.transaction(async (trx: any) => {
    await upsert(
      trx,
      "catalog.media_asset",
      rafidMedia,
      ["id"],
      [
        "storage_key",
        "url",
        "mime_type",
        "width",
        "height",
        "bytes",
        "alt_ar",
        "alt_en",
        "blurhash",
        "focal_x",
        "focal_y",
        "metadata",
      ]
    )

    await upsert(
      trx,
      "catalog.collection_profile",
      [rafidCollection],
      ["id"],
      [
        "handle",
        "civilization_id",
        "product_type_id",
        "status",
        "sort_order",
        "hero_media_id",
        "launch_at",
        "metadata",
      ]
    )

    await upsert(
      trx,
      "catalog.collection_translation",
      rafidCollectionTranslations,
      ["collection_id", "locale"],
      [
        "title",
        "subtitle",
        "description",
        "story",
        "seo_title",
        "seo_description",
      ]
    )

    await upsert(
      trx,
      "catalog.product_profile",
      [
        {
          product_id: productId,
          civilization_id: "babylon",
          collection_id: rafidCollection.id,
          product_type_id: "fragrance",
          status: "active",
          is_limited: true,
          is_serialized: true,
          edition_size: 500,
          launch_at: "2026-01-01T00:00:00.000Z",
          hero_media_id: "media_rafid_hero",
          olfactory_pyramid: JSON.stringify({
            top: ["saffron", "incense", "bergamot"],
            heart: ["rose", "oud", "balsam"],
            base: ["amber", "sandalwood", "musk"],
          }),
          specifications: JSON.stringify({
            concentration: "extrait",
            origin: "Babylon",
            edition: "500 per variant",
          }),
          metadata: JSON.stringify({ chapter: 1 }),
          max_per_customer: 2,
        },
      ],
      ["product_id"],
      [
        "civilization_id",
        "collection_id",
        "product_type_id",
        "status",
        "is_limited",
        "is_serialized",
        "edition_size",
        "launch_at",
        "hero_media_id",
        "olfactory_pyramid",
        "specifications",
        "metadata",
        "max_per_customer",
      ]
    )

    await upsert(
      trx,
      "catalog.product_translation",
      rafidProductTranslations.map((translation) => ({
        ...translation,
        product_id: productId,
      })),
      ["product_id", "locale"],
      [
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
    )

    await upsert(
      trx,
      "catalog.variant_profile",
      rafidVariantSeeds.map((variant) => ({
        variant_id: variantIdBySku.get(variant.sku),
        product_id: productId,
        size_ml: variant.size_ml,
        concentration:
          variant.key === "discovery" ? "discovery" : "extrait",
        packaging: variant.packaging,
        is_serialized: true,
        edition_size: 500,
        metadata: JSON.stringify({ edition: 500 }),
      })),
      ["variant_id"],
      [
        "product_id",
        "size_ml",
        "concentration",
        "packaging",
        "is_serialized",
        "edition_size",
        "metadata",
      ]
    )

    await upsert(
      trx,
      "catalog.product_media",
      [
        {
          product_id: productId,
          media_id: "media_rafid_hero",
          role: "hero",
          sort_order: 0,
        },
        {
          product_id: productId,
          media_id: "media_rafid_gallery",
          role: "gallery",
          sort_order: 1,
        },
        {
          product_id: productId,
          media_id: "media_rafid_packaging",
          role: "packaging",
          sort_order: 2,
        },
        {
          product_id: productId,
          media_id: "media_rafid_packaging_detail",
          role: "detail",
          sort_order: 3,
        },
      ],
      ["product_id", "media_id", "role"],
      ["sort_order"]
    )

    const serialRows: Row[] = []

    for (const variant of rafidVariantSeeds) {
      const variantId = variantIdBySku.get(variant.sku) as string

      for (let edition = 1; edition <= 500; edition += 1) {
        const paddedEdition = String(edition).padStart(4, "0")
        serialRows.push({
          id: `serial_rafid_${variant.key}_${paddedEdition}`,
          product_id: productId,
          variant_id: variantId,
          serial: `RAFID-${variant.key.toUpperCase()}-${paddedEdition}`,
          edition_number: edition,
          edition_size: 500,
          status: "allocated",
          metadata: JSON.stringify({ variant: variant.title }),
        })
      }
    }

    await insertIgnore(
      trx,
      "catalog.serial_unit",
      serialRows,
      ["id"]
    )

    await upsert(
      trx,
      "engagement.drop",
      [
        {
          id: "drop_rafid_first_chapter",
          slug: "rafid-first-chapter",
          civilization_id: "babylon",
          product_id: productId,
          title_ar: "ط±ط§ظپط¯ â€” ط§ظ„ظپطµظ„ ط§ظ„ط£ظˆظ„",
          title_en: "RAFID â€” The First Chapter",
          status: "live",
          opens_at: "2026-01-01T00:00:00.000Z",
          closes_at: null,
          total_units: 1500,
          per_customer_limit: 2,
          requires_waitlist: false,
          metadata: JSON.stringify({ chapter: 1 }),
        },
      ],
      ["id"],
      [
        "slug",
        "civilization_id",
        "product_id",
        "title_ar",
        "title_en",
        "status",
        "opens_at",
        "closes_at",
        "total_units",
        "per_customer_limit",
        "requires_waitlist",
        "metadata",
      ]
    )

    await upsert(
      trx,
      "engagement.drop_allocation",
      rafidVariantSeeds.map((variant) => ({
        id: `drop_rafid_first_chapter_${variant.key}`,
        drop_id: "drop_rafid_first_chapter",
        variant_id: variantIdBySku.get(variant.sku),
        quantity: 500,
        reserved_quantity: 0,
        sold_quantity: 0,
      })),
      ["drop_id", "variant_id"],
      ["quantity", "reserved_quantity", "sold_quantity"]
    )
  })

  logger.info(
    `Seeded ${civilizations.length} civilizations, ${civilizationTranslations.length} translations, ${productTypes.length} product types, and RAFID (${productId}) with ${rafidVariantSeeds.length} variants and ${rafidVariantSeeds.length * 500} serial units.`
  )

  if (region?.id) {
    logger.info(`Region ready: ${region.id} (${region.currency_code})`)
  }

  if (salesChannel?.id) {
    logger.info(`Sales channel ready: ${salesChannel.id} (${salesChannel.name})`)
  }

  if (publishableKey?.id) {
    logger.info(
      publishableKey.token
        ? `Publishable key created: ${publishableKey.token}`
        : `Publishable key ready: ${publishableKey.id}`
    )
  }

  if (stockLocation?.id && serviceZone?.id) {
    logger.info(
      `Shipping ready: ${stockLocation.id} â†’ ${serviceZone.id} (Standard Shipping)`
    )
  }
}
