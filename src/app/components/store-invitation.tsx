import { getTranslations } from "next-intl/server"
import { StoreCounter } from "@/components/store/store-counter"

/**
 * store-invitation — the shop window that follows the hero.
 *
 * A pinned, horizontal walk of the house's civilizations, in three parallax
 * depths. It is a showcase: an invitation to the store, not a storefront, so
 * it carries no price, size or checkout details — only the photographs and the
 * motion.
 */
export async function StoreInvitation() {
  const t = await getTranslations("StoreInvitation")

  return (
    <div data-no-reveal>
      <span className="sr-only">{t("title")}</span>
      <StoreCounter />
    </div>
  )
}

export default StoreInvitation
