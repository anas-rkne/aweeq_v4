"use client"

import { useMemo, useState } from "react"
import type { Product, ProductVariant } from "@/types"
import { concentrationLabel, formatPrice, stockLabel } from "@/lib/format"
import { useCart } from "./cart-provider"

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
    product.variants.some(
      (variant) => variant.id === product.default_variant?.id
    )
      ? product.default_variant
      : product.variants[0]

  const [selectedVariantId, setSelectedVariantId] = useState(
    initialVariant?.id ?? ""
  )
  const [quantity, setQuantity] = useState(1)
  const [addError, setAddError] = useState<string | null>(null)
  const { addItem, isAdding } = useCart()

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

  const purchaseLimit = useMemo(() => {
    const limits = [
      product.max_per_customer,
      selectedVariant?.available_serial_units,
    ].filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value)
    )

    return limits.length > 0 ? Math.max(1, Math.min(...limits)) : 10
  }, [product.max_per_customer, selectedVariant?.available_serial_units])

  async function handleAddToCart() {
    if (!selectedVariant || !selectedVariant.in_stock || isAdding) {
      return
    }

    setAddError(null)

    try {
      await addItem(selectedVariant.id, quantity)
      setQuantity(1)
    } catch (error) {
      setAddError(
        error instanceof Error
          ? error.message
          : "تعذر إضافة القطعة إلى السلة. حاول مرة أخرى."
      )
    }
  }

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
                onSelect={() => {
                  setSelectedVariantId(variant.id)
                  setQuantity(1)
                  setAddError(null)
                }}
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
        <div className="flex items-stretch gap-3">
          <div className="inline-flex shrink-0 items-center border border-sand/20">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              disabled={quantity <= 1 || isAdding}
              aria-label="تقليل الكمية"
              className="grid h-full w-11 place-items-center text-sand/60 transition-colors hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
            >
              −
            </button>
            <span className="grid h-full min-w-10 place-items-center border-x border-sand/20 font-secondary text-sm text-sand">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                setQuantity((value) => Math.min(purchaseLimit, value + 1))
              }
              disabled={quantity >= purchaseLimit || isAdding}
              aria-label="زيادة الكمية"
              className="grid h-full w-11 place-items-center text-sand/60 transition-colors hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={() => void handleAddToCart()}
            disabled={!selectedVariant || !selectedVariant.in_stock || isAdding}
            className="flex-1 border border-gold bg-gold px-6 py-4 font-primary text-base font-bold text-royal-navy transition-colors duration-300 hover:bg-gold/85 disabled:cursor-not-allowed disabled:border-gold/35 disabled:bg-gold/10 disabled:text-gold/60 sm:text-lg"
          >
            {!selectedVariant || !selectedVariant.in_stock
              ? "غير متوفر"
              : isAdding
                ? "جارٍ الإضافة..."
                : "أضف إلى السلة"}
          </button>
        </div>

        {addError && (
          <p
            role="alert"
            className="border border-red-400/25 bg-red-950/25 px-3 py-2 text-center font-primary text-xs leading-6 text-red-200/85"
          >
            {addError}
          </p>
        )}

        <p className="text-center font-primary text-xs leading-6 text-sand/40">
          {product.max_per_customer != null
            ? `يمكن شراء ${product.max_per_customer} قطع كحد أقصى لكل عميل.`
            : "الشحن والضرائب تُحسب عند إتمام الطلب."}
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
