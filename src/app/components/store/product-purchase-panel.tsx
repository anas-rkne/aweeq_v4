"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { useLocale, useTranslations } from "next-intl"
import type { Product, ProductVariant } from "@/types"
import { concentrationLabel, formatPrice, stockLabel } from "@/lib/format"
import { trackAddToCart, trackViewContent } from "@/lib/meta-pixel"
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

  /* A sold-out piece keeps its page: the buy row becomes a waiting list. */
  const soldOut = Boolean(selectedVariant && !selectedVariant.in_stock)

  /* Meta tracking: Content ID is the variant SKU so it matches the catalog. */
  const metaContentId = selectedVariant?.sku ?? selectedVariant?.id ?? null
  const metaCurrency = (
    selectedVariant?.price?.currency_code ?? "aed"
  ).toUpperCase()
  const metaValue = selectedVariant?.price?.amount ?? undefined
  const viewedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!metaContentId || viewedRef.current === product.id) {
      return
    }

    viewedRef.current = product.id
    trackViewContent({
      content_ids: [metaContentId],
      content_type: "product",
      content_name: product.title,
      value: metaValue,
      currency: metaCurrency,
    })
    // fire once per product, not on every variant switch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, metaContentId])

  const purchaseLimit = useMemo(() => {
    const limits = [
      product.max_per_customer,
      selectedVariant?.available_serial_units,
      selectedVariant?.stock_quantity,
    ].filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value)
    )

    return limits.length > 0 ? Math.max(1, Math.min(...limits)) : 10
  }, [
    product.max_per_customer,
    selectedVariant?.available_serial_units,
    selectedVariant?.stock_quantity,
  ])

  async function handleAddToCart() {
    if (!selectedVariant || !selectedVariant.in_stock || isAdding) {
      return
    }

    setAddError(null)

    try {
      await addItem(selectedVariant.id, quantity)

      if (metaContentId) {
        trackAddToCart({
          content_ids: [metaContentId],
          content_type: "product",
          content_name: product.title,
          value:
            metaValue != null
              ? Math.round(metaValue * quantity * 100) / 100
              : undefined,
          currency: metaCurrency,
          quantity,
        })
      }

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

          {selectedVariant && !soldOut && (
            <p className="font-primary text-small text-royal-navy/70">
              {stockLabel(selectedVariant, storeLocale)}
            </p>
          )}
        </div>
      </div>

      {/* variant choice, as text not boxes — only when a piece has more than
          one size, otherwise the single 100 ml is simply stated below */}
      {product.variants.length > 1 && (
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
          {/* the variant title is the measure itself ("100 ml", "100 gm",
              "45 ml"); size_ml stays as the fallback for older pieces */}
          {(selectedVariant.title || selectedVariant.size_ml != null) && (
            <>
              <dt className="text-royal-navy/60">{t("size")}</dt>
              <dd className="text-end text-royal-navy">
                {selectedVariant.title ||
                  (selectedVariant.size_ml != null
                    ? `${selectedVariant.size_ml} ml`
                    : "")}
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
              <dd className="text-end text-royal-navy">
                {selectedVariant.sku}
              </dd>
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

      {/* quantity + the action, or the waiting list when the piece is gone */}
      {soldOut ? (
        <SoldOutBlock handle={product.handle} />
      ) : (
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
      )}
    </div>
  )
}

/**
 * The sold-out face of the purchase card.
 *
 * A piece that ran out keeps its page and earns a waiting list instead of a
 * dead grey button: the wax-seal mark carries «نفدت الكمية», the line under it
 * promises the return, and the only action left is a one-field form. Signups
 * land in the newsletter table with `restock:<handle>` as the source, so the
 * merchant can export exactly this piece's list when it is back.
 */
function SoldOutBlock({ handle }: { handle: string }) {
  const t = useTranslations("Product")
  const locale = useLocale()
  const [email, setEmail] = useState("")
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle")
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (state === "sending") {
      return
    }

    const value = email.trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError(t("notifyInvalid"))
      return
    }

    setState("sending")
    setError(null)

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: value,
          locale,
          source: `restock:${handle}`,
        }),
      })

      if (!response.ok) {
        throw new Error(`newsletter ${response.status}`)
      }

      setState("sent")
      setEmail("")
    } catch {
      setState("idle")
      setError(t("notifyError"))
    }
  }

  return (
    <div className="mt-7 border-t border-royal-navy/15 pt-8">
      {/* the seal: a double gold ring, the house's stamp on a closed run */}
      <div className="relative mx-auto grid h-28 w-28 place-items-center rounded-full border border-gold/60">
        <span
          aria-hidden="true"
          className="absolute inset-[6px] rounded-full border border-gold/25"
        />
        <span className="px-3 text-center">
          <span className="block font-primary text-[13px] font-bold leading-5 text-royal-navy">
            {t("outOfStock")}
          </span>
          <span className="mt-1 block font-primary text-[9px] tracking-[0.3em] text-royal-navy/45">
            3WEEQ
          </span>
        </span>
      </div>

      <p className="mt-5 text-center font-primary text-h3 leading-8 text-royal-navy">
        {t("comingSoon")}
      </p>
      <p className="mx-auto mt-2 max-w-[28ch] text-center font-primary text-small leading-6 text-royal-navy/60">
        {t("soldOutNote")}
      </p>

      <div aria-hidden="true" className="mx-auto mt-5 h-px w-14 bg-gold/40" />

      {state === "sent" ? (
        <p
          role="status"
          className="mx-auto mt-5 max-w-[28ch] text-center font-primary text-small leading-6 text-royal-navy"
        >
          {t("notifySuccess")}
        </p>
      ) : (
        <form className="mt-5 space-y-2" onSubmit={handleSubmit} noValidate>
          <label className="sr-only" htmlFor={`restock-${handle}`}>
            {t("notifyPlaceholder")}
          </label>
          <input
            id={`restock-${handle}`}
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              // The complaint belongs to the attempt, not to the typing.
              if (error) {
                setError(null)
              }
            }}
            placeholder={t("notifyPlaceholder")}
            disabled={state === "sending"}
            className="h-12 w-full rounded-[var(--store-radius-sm)] border border-royal-navy/25 bg-royal-navy/[0.04] px-4 text-center font-primary text-small text-royal-navy placeholder:text-royal-navy/40 focus:border-gold focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={state === "sending"}
            className="h-12 w-full rounded-[var(--store-radius-sm)] bg-royal-navy px-6 font-primary text-sm font-bold text-sand transition-colors duration-300 hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state === "sending" ? t("notifySending") : t("notifyMe")}
          </button>

          {error && (
            <p
              role="alert"
              className="rounded-[var(--store-radius-sm)] border border-red-900/25 bg-red-900/[0.06] px-3 py-2 text-center font-primary text-small leading-6 text-red-900/85"
            >
              {error}
            </p>
          )}
        </form>
      )}
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
