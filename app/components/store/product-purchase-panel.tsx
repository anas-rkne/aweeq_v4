"use client"

import { useMemo, useState } from "react"
import type { Product, ProductVariant } from "@/types"
import {
  concentrationLabel,
  formatPrice,
  stockLabel,
} from "@/lib/format"

interface ProductPurchasePanelProps {
  product: Product
  locale?: "ar" | "en"
}

export function ProductPurchasePanel({
  product,
  locale = "ar",
}: ProductPurchasePanelProps) {
  const initialVariant =
    product.default_variant &&
    product.variants.some((variant) => variant.id === product.default_variant?.id)
      ? product.default_variant
      : product.variants[0]

  const [selectedVariantId, setSelectedVariantId] = useState(
    initialVariant?.id ?? ""
  )

  const selectedVariant = useMemo(
    () =>
      product.variants.find((variant) => variant.id === selectedVariantId) ??
      product.variants[0] ??
      null,
    [product.variants, selectedVariantId]
  )

  const isSerialized = Boolean(
    selectedVariant?.is_serialized ?? product.is_serialized
  )

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-sand/10 pb-6">
        <p
          className="font-secondary text-2xl text-gold md:text-3xl"
          aria-live="polite"
        >
          {formatPrice(
            selectedVariant?.price?.amount ?? product.price_range?.min,
            selectedVariant?.price?.currency_code ?? "sar",
            locale
          )}
        </p>

        {selectedVariant && (
          <p
            className={`font-primary text-sm ${
              selectedVariant.in_stock ? "text-sand/60" : "text-gold/70"
            }`}
          >
            {stockLabel(selectedVariant)}
          </p>
        )}
      </div>

      {product.variants.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="mb-3 font-primary text-sm text-sand/70">
            الحجم / الخيار
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((variant) => (
              <VariantButton
                key={variant.id}
                variant={variant}
                selected={variant.id === selectedVariant?.id}
                locale={locale}
                onSelect={() => setSelectedVariantId(variant.id)}
              />
            ))}
          </div>
        </fieldset>
      )}

      {selectedVariant && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 font-primary text-sm">
          {selectedVariant.size_ml != null && (
            <>
              <dt className="text-sand/45">الحجم</dt>
              <dd className="text-sand/80">{selectedVariant.size_ml} ml</dd>
            </>
          )}
          {selectedVariant.concentration && (
            <>
              <dt className="text-sand/45">التركيز</dt>
              <dd className="text-sand/80">
                {concentrationLabel(selectedVariant.concentration)}
              </dd>
            </>
          )}
          {selectedVariant.sku && (
            <>
              <dt className="text-sand/45">الرمز</dt>
              <dd className="text-sand/80">{selectedVariant.sku}</dd>
            </>
          )}
          {isSerialized && (
            <>
              <dt className="text-sand/45">الإصدار</dt>
              <dd className="text-sand/80">
                {product.edition_size
                  ? `${product.edition_size} قطعة مرقّمة`
                  : "مرقّم يدوياً"}
              </dd>
            </>
          )}
          {product.max_per_customer != null && (
            <>
              <dt className="text-sand/45">حد الشراء</dt>
              <dd className="text-sand/80">
                {product.max_per_customer} قطع لكل عميل
              </dd>
            </>
          )}
        </dl>
      )}

      <div className="space-y-3">
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed border border-gold/35 bg-gold/10 px-10 py-4 font-primary text-lg font-bold text-gold/70"
        >
          أضف للسلة — قريباً
        </button>
        <p className="text-center font-primary text-xs text-sand/40">
          الشراء المباشر قيد التجهيز. يمكنك استكشاف القطعة وتفاصيلها الآن.
        </p>
      </div>
    </div>
  )
}

function VariantButton({
  variant,
  selected,
  locale,
  onSelect,
}: {
  variant: ProductVariant
  selected: boolean
  locale: "ar" | "en"
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`min-w-28 border px-4 py-3 text-right transition-all duration-300 ${
        selected
          ? "border-gold bg-gold/10 text-gold"
          : "border-sand/20 text-sand/65 hover:border-gold/50 hover:text-sand"
      } ${!variant.in_stock ? "opacity-55" : ""}`}
    >
      <span className="block font-primary text-sm">{variant.title}</span>
      <span className="mt-1 block font-secondary text-xs text-sand/55">
        {formatPrice(
          variant.price?.amount,
          variant.price?.currency_code ?? "sar",
          locale
        )}
      </span>
    </button>
  )
}
