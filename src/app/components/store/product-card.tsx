"use client"

import Image from "next/image"
import { Link } from "@/i18n/navigation"
import { useLocale, useTranslations } from "next-intl"
import type { Product } from "@/types"
import { formatPriceRange, normalizeImageUrl } from "@/lib/format"

interface ProductCardProps {
  product: Product
}

/* The retail card of the reference: a light photo well, a badge, a two-line
   title, and the price with the house's round arrow. */
export function ProductCard({ product }: ProductCardProps) {
  const t = useTranslations("Product")
  const locale = useLocale()
  const storeLocale = locale === "ar" ? "ar" : "en"
  const imageUrl = normalizeImageUrl(product.thumbnail)
  const price = formatPriceRange(
    product.price_range,
    product.variants[0]?.price?.currency_code ?? "aed",
    storeLocale
  )
  const hasStock = product.variants.some((variant) => variant.in_stock)

  const origin = [
    product.collection?.title,
    product.product_type?.name,
    product.civilization?.name,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <Link
      href={`/products/${product.handle}`}
      className="group flex h-full flex-col"
    >
      <div className="relative overflow-hidden rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)] p-2 transition-colors duration-300 group-hover:border-gold/40 group-hover:bg-[var(--store-surface-hover)]">
        <div className="relative aspect-square overflow-hidden rounded-[calc(var(--store-radius)-0.25rem)] bg-[var(--store-well)]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.title}
              fill
              sizes="(min-width: 64rem) 20vw, (min-width: 40rem) 44vw, 68vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="font-primary text-xl text-royal-navy/40">
                3WEEQ
              </span>
            </div>
          )}

          {product.is_limited && (
            <span className="absolute start-2 top-2 rounded-full bg-royal-navy/90 px-2.5 py-1 font-primary text-[10px] leading-none text-gold">
              {t("limited")}
            </span>
          )}

          {!hasStock && (
            <span className="absolute end-2 top-2 rounded-full bg-royal-navy/90 px-2.5 py-1 font-primary text-[10px] leading-none text-sand/80">
              {t("outOfStock")}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        <h3 className="line-clamp-2 font-primary text-[15px] font-bold leading-6 text-sand transition-colors duration-300 group-hover:text-gold">
          {product.title}
        </h3>

        {origin && (
          <p className="mt-1 truncate font-primary text-[11px] leading-5 text-sand/60">
            {origin}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          {price && (
            <span className="font-secondary text-base leading-none text-gold">
              {price}
            </span>
          )}

          <span
            aria-hidden="true"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-sand/15 text-sand/70 transition-colors duration-300 group-hover:border-gold group-hover:text-gold"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.3}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 rtl:rotate-180"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  )
}
