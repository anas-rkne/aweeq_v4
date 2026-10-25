"use client"

import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "next-intl"
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
      <nav
        aria-label={t("title")}
        className="font-primary text-xs text-sand/40"
      >
        <Link href="/" className="transition-colors hover:text-gold">
          {t("continueShopping")}
        </Link>
        <span className="mx-2 text-sand/20">/</span>
        <span className="text-sand/65">{t("title")}</span>
      </nav>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-sand/10 pb-6">
        <div>
          <h1 className="font-primary text-3xl text-sand md:text-4xl">
            {t("title")}
          </h1>
          <p
            className="mt-2 font-secondary text-[11px] tracking-[0.16em] text-sand/40"
            aria-live="polite"
          >
            {itemCount > 0 ? t("items", { count: itemCount }) : t("noItems")}
          </p>
        </div>
        <Link
          href="/products"
          className="font-primary text-sm text-sand/55 underline-offset-4 transition-colors hover:text-gold hover:underline"
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
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            {[0, 1].map((row) => (
              <div
                key={row}
                className="flex animate-pulse gap-5 border-b border-sand/10 pb-5"
              >
                <div className="h-36 w-28 shrink-0 bg-sand/5" />
                <div className="flex-1 space-y-4 py-2">
                  <div className="h-4 w-2/3 bg-sand/10" />
                  <div className="h-3 w-1/3 bg-sand/5" />
                  <div className="h-9 w-32 bg-sand/5" />
                </div>
              </div>
            ))}
          </div>
          <div className="h-72 animate-pulse border border-sand/10 bg-sand/[0.02]" />
        </div>
      )}

      {status === "error" && items.length === 0 && (
        <div className="mt-10 border border-sand/10 px-6 py-16 text-center">
          <p className="font-primary text-base leading-8 text-sand/65">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void refreshCart()}
            className="mt-6 border border-gold/40 px-6 py-3 font-primary text-sm text-gold transition-colors hover:bg-gold hover:text-royal-navy"
          >
            {t("retry")}
          </button>
        </div>
      )}

      {status !== "loading" && status !== "error" && items.length === 0 && (
        <div className="mt-10 flex min-h-[420px] flex-col items-center justify-center border border-sand/10 px-6 text-center">
          <span className="text-gold/40">
            <BagIcon />
          </span>
          <h2 className="mt-6 font-primary text-2xl text-sand">
            {t("emptyTitle")}
          </h2>
          <p className="mt-3 max-w-sm font-primary text-sm leading-7 text-sand/45">
            {t("emptyPage")}
          </p>
          <Link
            href="/products"
            className="mt-8 border border-gold bg-gold px-8 py-3.5 font-primary text-sm font-bold text-royal-navy transition-colors duration-300 hover:bg-gold/85"
          >
            {t("browseStore")}
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <ul className="divide-y divide-sand/10 border-t border-sand/10">
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
                <li key={item.id} className="flex gap-4 py-6 sm:gap-6">
                  <div className="relative h-32 w-24 shrink-0 overflow-hidden border border-sand/10 bg-sand/[0.03] sm:h-40 sm:w-32">
                    {image ? (
                      <Image
                        src={image}
                        alt={item.product_title || item.title || ""}
                        fill
                        sizes="(min-width: 640px) 128px, 96px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center font-secondary text-sm tracking-[0.2em] text-gold/30">
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
                            {formatPrice(item.unit_price, currencyCode)}{" "}
                            {t("perItem")}
                          </p>
                        )}
                      </div>

                      <p className="shrink-0 font-secondary text-base text-gold sm:text-lg">
                        {formatPrice(
                          item.total ?? (item.unit_price ?? 0) * item.quantity,
                          currencyCode
                        )}
                      </p>
                    </div>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-5">
                      <div className="inline-flex items-center border border-sand/15">
                        <button
                          type="button"
                          onClick={() =>
                            void changeQuantity(item, item.quantity - 1)
                          }
                          disabled={pending || item.quantity <= 1}
                          aria-label={t("decrease")}
                          className="grid h-9 w-9 place-items-center text-sand/60 transition-colors hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          −
                        </button>
                        <span className="grid h-9 min-w-9 place-items-center border-x border-sand/15 font-secondary text-sm text-sand">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            void changeQuantity(item, item.quantity + 1)
                          }
                          disabled={pending || item.quantity >= limit}
                          aria-label={t("increase")}
                          className="grid h-9 w-9 place-items-center text-sand/60 transition-colors hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleRemove(item.id)}
                        disabled={pending}
                        className="font-primary text-xs text-sand/35 underline-offset-4 transition-colors hover:text-red-300 hover:underline disabled:opacity-40"
                      >
                        {t("remove")}
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          <aside className="border border-sand/10 bg-sand/[0.02] p-6 lg:sticky lg:top-32">
            <h2 className="font-primary text-xl text-sand">
              {t("orderSummary")}
            </h2>

            <dl className="mt-6 space-y-4 border-b border-sand/10 pb-5 font-primary text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sand/50">{t("subtotal")}</dt>
                <dd className="text-sand/85">
                  {formatPrice(subtotal, currencyCode)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sand/50">{t("shipping")}</dt>
                <dd className="text-sand/45">{t("calculatedAtCheckout")}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sand/50">{t("taxes")}</dt>
                <dd className="text-sand/45">{t("calculatedAtCheckout")}</dd>
              </div>
            </dl>

            <div className="mt-5 flex items-baseline justify-between gap-4">
              <span className="font-primary text-base text-sand">
                {t("total")}
              </span>
              <span className="font-secondary text-xl text-gold">
                {formatPrice(total, currencyCode)}
              </span>
            </div>

            <button
              type="button"
              disabled
              className="mt-6 w-full cursor-not-allowed border border-sand/10 px-6 py-4 font-primary text-sm text-sand/35"
            >
              {t("checkoutSoon")}
            </button>
            <p className="mt-3 text-center font-primary text-[11px] leading-5 text-sand/35">
              {t("checkoutNote")}
            </p>

            <Link
              href="/products"
              className="mt-5 block text-center font-primary text-xs text-sand/45 underline-offset-4 transition-colors hover:text-gold hover:underline"
            >
              {t("continueShopping")}
            </Link>
          </aside>
        </div>
      )}
    </main>
  )
}
