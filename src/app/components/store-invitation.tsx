import { getLocale, getTranslations } from "next-intl/server"
import { StoreCounter } from "@/components/store/store-counter"
import { getProductByHandle, type StoreLocale } from "@/lib/api"
import type { Product } from "@/types"

/**
 * store-invitation — the shop window that follows the hero.
 *
 * A pinned, horizontal walk of the house's pieces, in three parallax depths.
 * The three pieces are the three products of the first chapter, fetched here
 * in their fixed order and handed to the client stage, which turns each one
 * into a buyable card as it surfaces: المخمرية ← البخور ← العطر.
 */

/** the pieces surface in this order — the order of the walk */
const HANDLES = ["mikhmaria", "bakhoor", "rafid"] as const

export async function StoreInvitation() {
  const t = await getTranslations("StoreInvitation")
  const locale = (await getLocale()) as StoreLocale

  const products = (
    await Promise.all(
      HANDLES.map((handle) => getProductByHandle(handle, { locale }))
    )
  ).filter((product): product is Product => product != null)

  return (
    <div data-no-reveal>
      <span className="sr-only">{t("title")}</span>
      <StoreCounter products={products} />
    </div>
  )
}

export default StoreInvitation
