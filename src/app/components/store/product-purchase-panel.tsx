"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import type { Product, ProductVariant } from "@/types"
import { concentrationLabel, formatPrice, stockLabel } from "@/lib/format"
import { useCart } from "./cart-provider"

interface ProductPurchasePanelProps {
  product: Product
}

export function ProductPurchasePanel({ product }: ProductPurchasePanelProps) {
  const t = useTranslations("Product")
  const locale = useLocale()
  const storeLocale = locale === "ar" ? "ar" : "en"
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
      setAddError(error instanceof Error ? error.message : t("addError"))
    }
  }

  return (
    /* the purchase card: the light panel on the navy ground */
    <div className="relative rounded-[var(--store-radius)] bg-sand p-6 md:p-8">
      {/* price */}
      <div className="border-t border-royal-navy/15 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p
            className="font-secondary text-h2 leading-none text-royal-navy"
            aria-live="polite"
          >
            {formatPrice(
              selectedVariant?.price?.amount ?? product.price_range?.min,
              selectedVariant?.price?.currency_code ?? "aed",
              storeLocale
            )}
          </p>

          {selectedVariant && (
            <p
              className={`font-primary text-small ${
                selectedVariant.in_stock
                  ? "text-royal-navy/70"
                  : "text-royal-navy/50"
              }`}
            >
              {stockLabel(selectedVariant, storeLocale)}
            </p>
          )}
        </div>
      </div>

      {/* variant choice, as text not boxes */}
      {product.variants.length > 0 && (
        <fieldset className="mt-7">
          <legend className="mb-3 font-primary text-small text-royal-navy/70">
            {t("variant")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((variant) => (
              <VariantButton
                key={variant.id}
                variant={variant}
                selected={variant.id === selectedVariant?.id}
                locale={storeLocale}
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

      {/* the facts of the chosen piece */}
      {selectedVariant && (
        <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-royal-navy/15 pt-6 font-primary text-small">
          {selectedVariant.size_ml != null && (
            <>
              <dt className="text-royal-navy/60">{t("size")}</dt>
              <dd className="text-end text-royal-navy">
                {selectedVariant.size_ml} ml
              </dd>
            </>
          )}
          {selectedVariant.concentration && (
            <>
              <dt className="text-royal-navy/60">{t("concentration")}</dt>
              <dd className="text-end text-royal-navy">
                {concentrationLabel(selectedVariant.concentration)}
              </dd>
            </>
          )}
          {selectedVariant.sku && (
            <>
              <dt className="text-royal-navy/60">{t("sku")}</dt>
              <dd className="text-end text-royal-navy">{selectedVariant.sku}</dd>
            </>
          )}
          {isSerialized && (
            <>
              <dt className="text-royal-navy/60">{t("edition")}</dt>
              <dd className="text-end text-royal-navy">
                {product.edition_size
                  ? t("numberedPieces", { count: product.edition_size })
                  : t("handNumbered")}
              </dd>
            </>
          )}
        </dl>
      )}

      {/* quantity + the action */}
      <div className="mt-7 space-y-3">
        <div className="flex items-stretch gap-3">
          <div className="inline-flex shrink-0 items-center overflow-hidden rounded-[var(--store-radius-sm)] border border-royal-navy/20">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              disabled={quantity <= 1 || isAdding}
              aria-label={t("decrease")}
              className="grid h-11 w-11 place-items-center text-royal-navy/70 transition-colors hover:text-royal-navy disabled:cursor-not-allowed disabled:opacity-30"
            >
              −
            </button>
            <span className="grid h-11 min-w-11 place-items-center border-x border-royal-navy/20 font-secondary text-sm text-royal-navy">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                setQuantity((value) => Math.min(purchaseLimit, value + 1))
              }
              disabled={quantity >= purchaseLimit || isAdding}
              aria-label={t("increase")}
              className="grid h-11 w-11 place-items-center text-royal-navy/70 transition-colors hover:text-royal-navy disabled:cursor-not-allowed disabled:opacity-30"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={() => void handleAddToCart()}
            disabled={!selectedVariant || !selectedVariant.in_stock || isAdding}
            className="h-12 flex-1 rounded-[var(--store-radius-sm)] bg-royal-navy px-6 font-primary text-sm font-bold text-sand transition-colors duration-300 hover:bg-navy-800 disabled:cursor-not-allowed disabled:bg-royal-navy/20 disabled:text-royal-navy/40"
          >
            {!selectedVariant || !selectedVariant.in_stock
              ? t("unavailable")
              : isAdding
                ? t("adding")
                : t("addToCart")}
          </button>
        </div>

        {addError && (
          <p
            role="alert"
            className="rounded-[var(--store-radius-sm)] border border-royal-navy/30 bg-royal-navy/[0.04] px-3 py-2 text-center font-primary text-small leading-6 text-royal-navy"
          >
            {addError}
          </p>
        )}

        <p className="text-center font-primary text-small leading-6 text-royal-navy/70">
          {product.max_per_customer != null
            ? t("maxPurchase", { count: product.max_per_customer })
            : t("shippingTaxesNote")}
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
      className={`min-h-11 min-w-24 rounded-[var(--store-radius-sm)] border px-3 py-2 text-start transition-colors duration-200 ${
        selected
          ? "border-royal-navy bg-royal-navy/[0.06] text-royal-navy"
          : "border-royal-navy/20 text-royal-navy/70 hover:border-royal-navy/40 hover:text-royal-navy"
      } ${!variant.in_stock ? "opacity-55" : ""}`}
    >
      <span className="block font-primary text-sm">{variant.title}</span>
      <span className="mt-1 block font-secondary text-xs text-royal-navy/60">
        {formatPrice(
          variant.price?.amount,
          variant.price?.currency_code ?? "aed",
          locale
        )}
      </span>
    </button>
  )
}
