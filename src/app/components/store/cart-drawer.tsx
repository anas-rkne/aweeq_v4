"use client"

import Image from "next/image"
import { Link } from "@/i18n/navigation"
import { useEffect, useRef, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
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
      className="h-5 w-5"
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
      className="h-10 w-10"
    >
      <path d="M6 7h12l-1 13H7L6 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  )
}

export function CartDrawer() {
  const t = useTranslations("Cart")
  const locale = useLocale()
  const isRtl = locale === "ar"
  const {
    cart,
    status,
    error,
    actionError,
    isOpen,
    closeCart,
    clearActionError,
    refreshCart,
    updateItem,
    removeItem,
    pendingItemId,
    itemCount,
    currencyCode,
  } = useCart()
  const panelRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const focusTimer = window.setTimeout(
      () => closeButtonRef.current?.focus(),
      60
    )

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeCart()
        return
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return
      }

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.offsetParent !== null)

      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", onKeyDown)
      previousFocus?.focus()
    }
  }, [closeCart, isOpen])

  const items = cart?.items ?? []
  const subtotal = cart?.subtotal ?? 0

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

  const drawer = (
    <div
      className={`fixed inset-0 z-[9999] transition-[pointer-events] ${
        isOpen ? "" : "pointer-events-none"
      }`}
    >
      <button
        type="button"
        aria-label={t("close")}
        aria-hidden={!isOpen}
        tabIndex={isOpen ? 0 : -1}
        onClick={closeCart}
        className={`absolute inset-0 bg-royal-navy/75 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={`absolute inset-y-0 end-0 flex h-full w-full max-w-md flex-col bg-navy-950 transition-transform duration-300 ease-out ${
          isOpen
            ? "translate-x-0"
            : isRtl
              ? "-translate-x-full"
              : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 sm:px-7">
          <div>
            <h2
              id="cart-drawer-title"
              className="font-primary text-xl text-sand"
            >
              {t("title")}
            </h2>
            <p
              className="mt-1 font-secondary text-[13px] text-sand/60"
              aria-live="polite"
            >
              {itemCount > 0 ? t("items", { count: itemCount }) : t("empty")}
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeCart}
            aria-label={t("close")}
            className="grid h-11 w-11 place-items-center text-sand/55 transition-colors duration-200 hover:text-gold"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          {actionError && (
            <div
              role="alert"
              className="mb-4 flex items-start justify-between gap-3 rounded-[var(--store-radius-sm)] border border-red-400/25 bg-red-950/25 px-3 py-2.5 font-primary text-xs leading-6 text-red-200/85"
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
            <div className="space-y-4" aria-label={t("loading")}>
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex animate-pulse gap-4">
                  <div className="h-24 w-20 shrink-0 bg-sand/5" />
                  <div className="flex-1 space-y-3 py-1">
                    <div className="h-3 w-2/3 bg-sand/10" />
                    <div className="h-3 w-1/3 bg-sand/5" />
                    <div className="h-8 w-28 bg-sand/5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {status === "error" && !actionError && (
            <div className="rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)] px-5 py-10 text-center">
              <p className="font-primary text-sm leading-7 text-sand/65">
                {error}
              </p>
              <button
                type="button"
                onClick={() => void refreshCart()}
                className="mt-5 h-11 rounded-[var(--store-radius-sm)] border border-gold/40 px-5 font-primary text-sm text-gold transition-colors hover:bg-gold hover:text-royal-navy"
              >
                {t("retry")}
              </button>
            </div>
          )}

          {status === "ready" && items.length === 0 && (
            <div className="flex min-h-72 flex-col items-center justify-center text-center">
              <span className="text-gold/45">
                <BagIcon />
              </span>
              <h3 className="mt-5 font-primary text-lg text-sand">
                {t("emptyTitle")}
              </h3>
              <p className="mt-2 max-w-xs font-primary text-sm leading-7 text-sand/45">
                {t("emptyMessage")}
              </p>
              <Link
                href="/products#catalogue"
                onClick={closeCart}
                className="mt-6 flex h-11 items-center justify-center rounded-[var(--store-radius-sm)] border border-gold/40 px-6 font-primary text-sm text-gold transition-colors duration-300 hover:bg-gold hover:text-royal-navy"
              >
                {t("browseStore")}
              </Link>
            </div>
          )}

          {items.length > 0 && (
            <ul className="divide-y divide-sand/10">
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
                  <li key={item.id} className="flex gap-4 py-5 first:pt-0">
                    <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-[var(--store-radius-sm)] bg-[var(--store-well)]">
                      {image ? (
                        <Image
                          src={image}
                          alt={item.product_title || item.title || ""}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="absolute inset-0 grid place-items-center font-secondary text-xs tracking-[0.2em] text-gold/30">
                          3W
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {productHref ? (
                            <Link
                              href={productHref}
                              onClick={closeCart}
                              className="block truncate font-primary text-sm text-sand transition-colors hover:text-gold"
                            >
                              {item.product_title || item.title}
                            </Link>
                          ) : (
                            <p className="truncate font-primary text-sm text-sand">
                              {item.product_title || item.title}
                            </p>
                          )}
                          {variantLabel && (
                            <p className="mt-1 font-primary text-xs text-sand/45">
                              {variantLabel}
                            </p>
                          )}
                        </div>

                        <p className="shrink-0 font-secondary text-sm text-gold">
                          {formatPrice(
                            item.total ??
                              (item.unit_price ?? 0) * item.quantity,
                            currencyCode,
                            isRtl ? "ar" : "en"
                          )}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
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
                          <span className="grid h-11 min-w-11 place-items-center border-x border-sand/15 font-secondary text-xs text-sand">
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
                          className="inline-flex min-h-11 items-center font-primary text-[11px] text-sand/45 underline-offset-4 transition-colors hover:text-red-300 hover:underline disabled:opacity-40"
                        >
                          {t("remove")}
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-sand/10 bg-navy-975 px-5 py-5 sm:px-7">
            <div className="flex items-baseline justify-between">
              <span className="font-primary text-sm text-sand/55">
                {t("subtotal")}
              </span>
              <span className="font-secondary text-lg text-gold">
                {formatPrice(subtotal, currencyCode, isRtl ? "ar" : "en")}
              </span>
            </div>
            <p className="mt-2 font-primary text-[11px] leading-5 text-sand/35">
              {t("shippingNote")}
            </p>

            <div className="mt-4 grid gap-2">
              <Link
                href="/cart"
                onClick={closeCart}
                className="flex h-12 w-full items-center justify-center rounded-[var(--store-radius-sm)] bg-gold px-6 text-center font-primary text-sm font-bold text-royal-navy transition-colors duration-300 hover:bg-sand"
              >
                {t("viewCart")}
              </Link>
              <Link
                href="/checkout"
                onClick={closeCart}
                className="flex h-12 w-full items-center justify-center rounded-[var(--store-radius-sm)] border border-sand/20 px-6 text-center font-primary text-sm text-sand transition-colors duration-300 hover:border-gold/60 hover:text-gold"
              >
                {t("checkout")}
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  )

  if (!mounted) {
    return null
  }

  return createPortal(drawer, document.body)
}
