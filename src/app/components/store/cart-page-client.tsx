"use client"

import Image from "next/image"
import { Link } from "@/i18n/navigation"
import { useLocale, useTranslations } from "next-intl"
import { formatPrice, normalizeImageUrl } from "@/lib/format"
import { cartItemLimit } from "@/lib/cart"
import type { CartItem } from "@/types"
import { useCart } from "./cart-provider"

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="square"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function BagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-12 w-12"
    >
      <path d="M6 7h12l-1 13H7L6 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  )
}

export function CartPageClient() {
  const t = useTranslations("Cart")
  const locale = useLocale()
  const storeLocale = locale === "en" ? "en" : "ar"
  const {
    cart,
    status,
    error,
    actionError,
    refreshCart,
    updateItem,
    removeItem,
    pendingItemId,
    itemCount,
    currencyCode,
    clearActionError,
  } = useCart()

  const items = cart?.items ?? []
  const subtotal = cart?.subtotal ?? 0
  const total = cart?.total ?? subtotal

  async function changeQuantity(item: CartItem, quantity: number) {
    try {
      await updateItem(item.id, quantity)
    } catch {}
  }

  async function handleRemove(itemId: string) {
    try {
      await removeItem(itemId)
    } catch {}
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 pb-24 pt-8 md:px-10 md:pt-12">
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-primary text-h2 leading-[1.2] text-gold">
            {t("title")}
          </h1>
          <p
            className="mt-2 font-primary text-small text-sand/70"
            aria-live="polite"
          >
            {itemCount > 0 ? t("items", { count: itemCount }) : t("noItems")}
          </p>
        </div>
        <Link
          href="/products#catalogue"
          className="inline-flex min-h-11 items-center font-primary text-small text-sand/70 underline-offset-4 transition-colors hover:text-gold hover:underline"
        >
          {t("continueShopping")}
        </Link>
      </div>

      {actionError && (
        <div
          role="alert"
          className="mt-6 flex items-start justify-between gap-4 border border-red-400/25 bg-red-950/25 px-4 py-3 font-primary text-sm leading-7 text-red-200/85"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={clearActionError}
            aria-label={t("dismiss")}
            className="shrink-0 text-red-200/60 transition-colors hover:text-red-100"
          >
            <CloseIcon />
          </button>
        </div>
      )}

      {status === "loading" && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            {[0, 1].map((row) => (
              <div
                key={row}
                className="flex animate-pulse gap-5 rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)] p-3"
              >
                <div className="h-36 w-28 shrink-0 rounded-[var(--store-radius-sm)] bg-sand/5" />
                <div className="flex-1 space-y-4 py-2">
                  <div className="h-4 w-2/3 bg-sand/10" />
                  <div className="h-3 w-1/3 bg-sand/5" />
                  <div className="h-9 w-32 bg-sand/5" />
                </div>
              </div>
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-[var(--store-radius)] border border-sand/10 bg-sand/[0.02]" />
        </div>
      )}

      {status === "error" && items.length === 0 && (
        <div className="mt-8 rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)] px-6 py-16 text-center">
          <p className="font-primary text-base leading-8 text-sand/65">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void refreshCart()}
            className="mt-6 h-11 rounded-[var(--store-radius-sm)] border border-gold/40 px-6 font-primary text-sm text-gold transition-colors hover:bg-gold hover:text-royal-navy"
          >
            {t("retry")}
          </button>
        </div>
      )}

      {status !== "loading" && status !== "error" && items.length === 0 && (
        <div className="mt-8 flex min-h-[420px] flex-col items-center justify-center rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)] px-6 text-center">
          <span className="text-gold/40">
            <BagIcon />
          </span>
          <h2 className="mt-6 font-primary text-2xl text-sand">
            {t("emptyTitle")}
          </h2>
          <p className="mt-3 max-w-sm font-primary text-sm leading-7 text-sand/50">
            {t("emptyPage")}
          </p>
          <Link
            href="/products#catalogue"
            className="mt-8 flex h-12 items-center justify-center rounded-[var(--store-radius-sm)] bg-gold px-8 font-primary text-sm font-bold text-royal-navy transition-colors duration-300 hover:bg-sand"
          >
            {t("browseStore")}
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <ul className="divide-y divide-sand/10 overflow-hidden rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)]">
            {items.map((item) => {
              const image = normalizeImageUrl(item.thumbnail)
              const limit = cartItemLimit(item)
              const pending = pendingItemId === item.id
              const productHref = item.product_handle
                ? `/products/${item.product_handle}`
                : null
              const variantLabel =
                item.variant_title ||
                (item.variant_profile?.size_ml != null
                  ? `${item.variant_profile.size_ml} ml`
                  : null)

              return (
                <li key={item.id} className="flex gap-4 p-4 sm:gap-6 sm:p-5">
                  <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-[var(--store-radius-sm)] bg-[var(--store-well)] sm:h-40 sm:w-32">
                    {image ? (
                      <Image
                        src={image}
                        alt={item.product_title || item.title || ""}
                        fill
                        sizes="(min-width: 640px) 128px, 96px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center font-secondary text-sm tracking-[0.2em] text-royal-navy/30">
                        3W
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        {productHref ? (
                          <Link
                            href={productHref}
                            className="block font-primary text-base text-sand transition-colors hover:text-gold sm:text-lg"
                          >
                            {item.product_title || item.title}
                          </Link>
                        ) : (
                          <p className="font-primary text-base text-sand sm:text-lg">
                            {item.product_title || item.title}
                          </p>
                        )}
                        {variantLabel && (
                          <p className="mt-1.5 font-primary text-sm text-sand/45">
                            {variantLabel}
                          </p>
                        )}
                        {item.unit_price != null && (
                          <p className="mt-1 font-secondary text-xs text-sand/35">
                            {formatPrice(
                              item.unit_price,
                              currencyCode,
                              storeLocale
                            )}{" "}
                            {t("perItem")}
                          </p>
                        )}
                      </div>

                      <p className="shrink-0 font-secondary text-base text-gold sm:text-lg">
                        {formatPrice(
                          item.total ?? (item.unit_price ?? 0) * item.quantity,
                          currencyCode,
                          storeLocale
                        )}
                      </p>
                    </div>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-5">
                      <div className="inline-flex items-center overflow-hidden rounded-[var(--store-radius-sm)] border border-sand/15">
                        <button
                          type="button"
                          onClick={() =>
                            void changeQuantity(item, item.quantity - 1)
                          }
                          disabled={pending || item.quantity <= 1}
                          aria-label={t("decrease")}
                          className="grid h-11 w-11 place-items-center text-sand/60 transition-colors hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          −
                        </button>
                        <span className="grid h-11 min-w-11 place-items-center border-x border-sand/15 font-secondary text-sm text-sand">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            void changeQuantity(item, item.quantity + 1)
                          }
                          disabled={pending || item.quantity >= limit}
                          aria-label={t("increase")}
                          className="grid h-11 w-11 place-items-center text-sand/60 transition-colors hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleRemove(item.id)}
                        disabled={pending}
                        className="inline-flex min-h-11 items-center font-primary text-xs text-sand/45 underline-offset-4 transition-colors hover:text-red-300 hover:underline disabled:opacity-40"
                      >
                        {t("remove")}
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          <aside className="rounded-[var(--store-radius)] bg-sand p-6 lg:sticky lg:top-[calc(var(--store-header-h)+1.5rem)]">
            <h2 className="font-primary text-h3 text-royal-navy">
              {t("orderSummary")}
            </h2>

            <dl className="mt-6 space-y-4 border-b border-royal-navy/15 pb-5 font-primary text-small">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-royal-navy/60">{t("subtotal")}</dt>
                <dd className="text-royal-navy">
                  {formatPrice(subtotal, currencyCode, storeLocale)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-royal-navy/60">{t("shipping")}</dt>
                <dd className="text-royal-navy/60">{t("calculatedAtCheckout")}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-royal-navy/60">{t("taxes")}</dt>
                <dd className="text-royal-navy/60">{t("calculatedAtCheckout")}</dd>
              </div>
            </dl>

            <div className="mt-5 flex items-baseline justify-between gap-4">
              <span className="font-primary text-body text-royal-navy">
                {t("total")}
              </span>
              <span className="font-secondary text-h3 leading-none text-royal-navy">
                {formatPrice(total, currencyCode, storeLocale)}
              </span>
            </div>

            <Link
              href="/checkout"
              className="mt-6 flex h-14 w-full items-center justify-center rounded-[var(--store-radius-sm)] bg-royal-navy font-primary text-sm font-bold text-sand transition-colors duration-300 hover:bg-navy-800"
            >
              {t("checkout")}
            </Link>
            <p className="mt-3 text-center font-primary text-small leading-5 text-royal-navy/60">
              {t("checkoutNote")}
            </p>

            <Link
              href="/products#catalogue"
              className="mt-4 flex min-h-11 items-center justify-center text-center font-primary text-small text-royal-navy/60 underline-offset-4 transition-colors hover:text-royal-navy hover:underline"
            >
              {t("continueShopping")}
            </Link>
          </aside>
        </div>
      )}
    </main>
  )
}
