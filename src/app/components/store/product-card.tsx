"use client"

import Image from "next/image"
import { Link } from "@/i18n/navigation"
import { useLocale, useTranslations } from "next-intl"
import type { Product } from "@/types"
import { formatPriceRange, normalizeImageUrl } from "@/lib/format"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const t = useTranslations("Product")
  const locale = useLocale()
  const storeLocale = locale === "ar" ? "ar" : "en"
  const imageUrl = normalizeImageUrl(product.thumbnail)
  const price = formatPriceRange(
    product.price_range,
    product.variants[0]?.price?.currency_code ?? "sar",
    storeLocale
  )
  const hasStock = product.variants.some((variant) => variant.in_stock)

  return (
    <Link
      href={`/products/${product.handle}`}
      className="group block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/70"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-navy-800">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-primary text-2xl text-gold/35">3WEEQ</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-royal-navy/75 via-transparent to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-100" />

        <div className="absolute inset-x-0 top-0 flex flex-wrap justify-end gap-1.5 p-3">
          {product.is_limited && (
            <span className="border border-gold/40 bg-royal-navy/75 px-2 py-1 font-primary text-[10px] text-gold backdrop-blur-sm">
              {t("limited")}
            </span>
          )}
          {product.is_serialized && (
            <span className="border border-sand/20 bg-royal-navy/75 px-2 py-1 font-primary text-[10px] text-sand/80 backdrop-blur-sm">
              {t("serialized")}
            </span>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 translate-y-2 p-4 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="inline-flex items-center gap-2 font-primary text-sm text-gold">
            {t("discover")}
            <span aria-hidden="true">←</span>
          </span>
        </div>
      </div>

      <div className="space-y-1.5 pt-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-primary text-lg leading-snug text-sand transition-colors duration-300 group-hover:text-gold">
            {product.title}
          </h3>
          {price && (
            <p className="shrink-0 font-secondary text-sm text-gold">{price}</p>
          )}
        </div>

        {product.subtitle && (
          <p className="line-clamp-1 font-primary text-sm text-sand/55">
            {product.subtitle}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="font-primary text-xs text-sand/40">
            {product.product_type?.name ??
              product.collection?.title ??
              product.civilization?.name ??
              "3WEEQ"}
          </p>
          {!hasStock && (
            <span className="font-primary text-[11px] text-sand/40">
              {t("outOfStock")}
            </span>
          )}
          {hasStock && !price && (
            <span className="font-primary text-[11px] text-sand/40">
              {t("priceOnRequest")}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
