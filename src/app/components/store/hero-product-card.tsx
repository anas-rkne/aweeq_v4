"use client"

import { useMemo, useState } from "react"
import { Link } from "@/i18n/navigation"
import { useLocale, useTranslations } from "next-intl"
import type { Product, ProductVariant } from "@/types"
import { formatPrice } from "@/lib/format"
import { useCart } from "./cart-provider"

/**
 * hero-product-card — the buyable face of a piece in the store invitation.
 *
 * A small, self-contained purchase strip: the title, the measure and the
 * price on one side, a direct "add to cart" (which opens the drawer) and a
 * "details" link on the other. It is the same action as the product page,
 * just without the full purchase panel, so a visitor can buy the moment the
 * piece surfaces in the night.
 */
export function HeroProductCard({ product }: { product: Product }) {
  const t = useTranslations("Product")
  const locale = useLocale()
  const storeLocale = locale === "ar" ? "ar" : "en"
  const { addItem, isAdding } = useCart()
  const [error, setError] = useState<string | null>(null)

  const variant = useMemo<ProductVariant | null>(() => {
    const fallback = product.variants[0] ?? null
    const preferred = product.default_variant ?? fallback
    return product.variants.some((item) => item.id === preferred?.id)
      ? preferred
      : fallback
  }, [product.default_variant, product.variants])

  const measure = variant?.title ?? null
  const price = variant?.price?.amount ?? product.price_range?.min ?? 0
  const currencyCode = variant?.price?.currency_code ?? "aed"
  const inStock = variant ? variant.in_stock : false

  async function handleBuy() {
    if (!variant || !variant.in_stock || isAdding) return
    setError(null)
    try {
      /* addItem also opens the cart drawer on success */
      await addItem(variant.id, 1)
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : t("addError"))
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--store-radius)] border border-sand/15 bg-royal-navy/90 p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-md md:max-w-sm md:flex-col md:items-stretch md:gap-3 md:p-5">
      <div className="min-w-0">
        <h3 className="truncate font-primary text-base font-bold leading-6 text-sand md:text-lg">
          {product.title}
        </h3>
        <div className="mt-0.5 flex items-baseline gap-2">
          {measure && (
            <span className="whitespace-nowrap font-primary text-xs text-sand/60 md:text-sm">
              {measure}
            </span>
          )}
          <span className="font-secondary text-base leading-none text-gold md:text-xl">
            {formatPrice(price, currencyCode, storeLocale)}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => void handleBuy()}
          disabled={!variant || !inStock || isAdding}
          className="inline-flex h-10 items-center rounded-[var(--store-radius-sm)] bg-gold px-4 font-primary text-sm font-bold text-royal-navy transition-colors duration-150 hover:bg-gold/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 md:h-11 md:flex-1 md:justify-center"
        >
          {!variant || !inStock
            ? t("unavailable")
            : isAdding
              ? t("adding")
              : t("addToCart")}
        </button>
        <Link
          href={`/products/${product.handle}`}
          className="inline-flex h-10 items-center rounded-[var(--store-radius-sm)] border border-sand/25 px-3 font-primary text-sm text-sand transition-colors duration-150 hover:border-gold hover:text-gold md:h-11 md:justify-center"
        >
          {t("details")}
        </Link>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-[var(--store-radius-sm)] border border-red-400/25 bg-red-950/25 px-3 py-2 text-center font-primary text-xs leading-5 text-sand/90"
        >
          {error}
        </p>
      )}
    </div>
  )
}

export default HeroProductCard
