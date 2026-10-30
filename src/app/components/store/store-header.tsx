"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link, usePathname, useRouter } from "@/i18n/navigation"
import { STORE_PRODUCT_TYPES } from "@/lib/catalog"
import { useCart } from "./cart-provider"

/* three rooms only: the story link leaves the store shell (it switches to the
   marketing header), so the shop keeps its visitor inside the store instead. */
const NAV_LINKS = [
  { href: "/", key: "home" },
  { href: "/products", key: "shop" },
  { href: "/collections", key: "collections" },
] as const

function isLinkCurrent(href: string, pathname: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

function SearchIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="M6 7h12l-1 13H7L6 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  )
}

export function StoreHeader() {
  const t = useTranslations("Store")
  const navT = useTranslations("Navbar")
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const { itemCount, openCart } = useCart()

  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const categoriesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [menuOpen])

  useEffect(() => {
    if (!categoriesOpen) return

    const onPointerDown = (event: PointerEvent) => {
      if (!categoriesRef.current?.contains(event.target as Node)) {
        setCategoriesOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCategoriesOpen(false)
    }

    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [categoriesOpen])

  const switchLocale = () => {
    const nextLocale = locale === "ar" ? "en" : "ar"
    router.replace(`${pathname}${window.location.search}`, {
      locale: nextLocale,
    })
  }

  const isArabic = locale === "ar"

  return (
    <>
      {/* only row one sticks: the announcement and the category row scroll away */}
      <header className="sticky top-0 z-50 border-b border-sand/10 bg-royal-navy/95 backdrop-blur-md">
        {/* row one: the mark, the search, the tools */}
        <div className="mx-auto flex h-[var(--store-header-h)] max-w-[84rem] items-center gap-3 px-5 md:gap-6 md:px-10">
          <Link
            href="/"
            aria-label={t("logoLabel")}
            className="flex min-h-11 shrink-0 items-center"
          >
            <Image
              src="/images/logo-mark.png"
              alt="3WEEQ"
              width={2785}
              height={841}
              quality={90}
              sizes="(min-width: 64rem) 7rem, 5rem"
              preload
              className="h-7 w-auto md:h-8"
            />
          </Link>

          {/* the pill search: the reference's widest element on row one */}
          <form
            action={`/${locale}/products`}
            method="get"
            role="search"
            className="mx-auto hidden w-full max-w-[26rem] md:block"
          >
            <div className="flex h-12 items-center gap-2 rounded-[var(--store-radius-pill)] border border-sand/15 bg-sand/[0.06] ps-4 pe-1 transition-colors duration-200 focus-within:border-gold/60">
              <label htmlFor="store-header-search" className="sr-only">
                {t("searchLabel")}
              </label>
              <input
                id="store-header-search"
                name="q"
                type="search"
                placeholder={t("searchPlaceholder")}
                autoComplete="off"
                className="h-11 min-w-0 flex-1 bg-transparent font-primary text-sm text-sand placeholder:text-sand/45 focus:outline-none"
              />
              <button
                type="submit"
                aria-label={t("searchLabel")}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sand/70 transition-colors duration-200 hover:text-gold"
              >
                <SearchIcon className="h-4 w-4" />
              </button>
            </div>
          </form>

          <div className="ms-auto flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={switchLocale}
              aria-label={navT("language")}
              className="flex h-11 min-w-11 items-center justify-center gap-0.5 whitespace-nowrap font-secondary text-[13px] transition-colors duration-200 hover:text-gold"
            >
              <span className={isArabic ? "text-gold" : "text-sand/70"}>
                AR
              </span>
              <span className="mx-0.5 text-sand/30 sm:mx-1">/</span>
              <span className={!isArabic ? "text-gold" : "text-sand/70"}>
                EN
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label={t("search")}
              className="grid h-11 w-11 place-items-center text-sand/70 transition-colors duration-200 hover:text-gold md:hidden"
            >
              <SearchIcon />
            </button>

            <button
              type="button"
              onClick={openCart}
              aria-label={
                itemCount > 0 ? t("cartItems", { count: itemCount }) : t("cart")
              }
              className="relative grid h-11 w-11 place-items-center text-sand/70 transition-colors duration-200 hover:text-gold"
            >
              <CartIcon />
              {itemCount > 0 && (
                <span className="absolute end-0.5 top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold px-1 font-secondary text-[11px] leading-none text-royal-navy">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={navT("menu")}
              aria-expanded={menuOpen}
              className="grid h-11 w-11 place-items-center text-sand/70 transition-colors duration-200 hover:text-gold md:hidden"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>

      {/* row two: categories, then the rooms. It scrolls away with the page.
          The categories button sits outside the scroller so its popover is
          never clipped by the horizontal overflow. */}
      <nav
        aria-label={t("mainNav")}
        className="relative z-10 border-b border-sand/[0.07]"
      >
        <div className="mx-auto flex max-w-[84rem] items-center gap-1 pl-3 md:gap-2 md:pl-10">
          <div ref={categoriesRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setCategoriesOpen((open) => !open)}
              aria-expanded={categoriesOpen}
              aria-haspopup="true"
              className={`flex h-11 items-center gap-2 rounded-[var(--store-radius-sm)] px-3 font-primary text-[13px] transition-colors duration-200 ${
                categoriesOpen ? "text-gold" : "text-sand/75 hover:text-gold"
              }`}
            >
              <GridIcon />
              <span className="whitespace-nowrap">{t("allCategories")}</span>
            </button>

            {categoriesOpen && (
              <div className="absolute start-0 top-full z-50 mt-1 w-60 overflow-hidden rounded-[var(--store-radius)] border border-sand/15 bg-royal-navy p-2 shadow-2xl shadow-black/40">
                <ul>
                  {STORE_PRODUCT_TYPES.map((type) => (
                    <li key={type.code}>
                      <Link
                        href={`/products?product_type=${type.code}`}
                        onClick={() => setCategoriesOpen(false)}
                        className="flex min-h-11 items-center rounded-[var(--store-radius-sm)] px-3 font-primary text-[13px] text-sand/75 transition-colors duration-200 hover:bg-sand/[0.06] hover:text-gold"
                      >
                        {isArabic ? type.labelAr : type.labelEn}
                      </Link>
                    </li>
                  ))}
                  <li className="mt-1 border-t border-sand/10 pt-1">
                    <Link
                      href="/collections"
                      onClick={() => setCategoriesOpen(false)}
                      className="flex min-h-11 items-center rounded-[var(--store-radius-sm)] px-3 font-primary text-[13px] text-gold transition-colors duration-200 hover:bg-sand/[0.06]"
                    >
                      {t("collections")}
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </div>

          <span aria-hidden="true" className="h-4 w-px shrink-0 bg-sand/15" />

          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pe-3 md:gap-2 md:pe-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV_LINKS.map((link) => {
              const current = isLinkCurrent(link.href, pathname)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={current ? "page" : undefined}
                  className={`relative flex h-11 shrink-0 items-center rounded-[var(--store-radius-sm)] px-4 font-primary text-[13px] transition-colors duration-200 ${
                    current ? "text-gold" : "text-sand/70 hover:text-gold"
                  }`}
                >
                  {t(link.key)}
                  {current && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-4 bottom-0 h-px bg-gold"
                    />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      <MobileNav isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <MobileSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        action={`/${locale}/products`}
      />
    </>
  )
}

function MobileNav({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const t = useTranslations("Store")
  const navT = useTranslations("Navbar")
  const pathname = usePathname()
  const locale = useLocale()
  const isArabic = locale === "ar"

  useEffect(() => {
    if (!isOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("mobileNav")}
      className="fixed inset-0 z-[100] overflow-y-auto bg-royal-navy"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={navT("close")}
        className="absolute end-4 top-4 z-10 grid h-11 w-11 place-items-center text-sand/70 transition-colors duration-300 hover:text-gold"
      >
        <CloseIcon />
      </button>

      <nav className="flex min-h-svh flex-col justify-center gap-1 px-6 py-20">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            aria-current={
              isLinkCurrent(link.href, pathname) ? "page" : undefined
            }
            className={`flex min-h-14 items-center font-primary text-2xl transition-colors duration-300 ${
              isLinkCurrent(link.href, pathname)
                ? "text-gold"
                : "text-sand/75 hover:text-gold"
            }`}
          >
            {t(link.key)}
          </Link>
        ))}

        <span
          aria-hidden="true"
          className="my-4 block h-px w-full bg-sand/10"
        />

        {STORE_PRODUCT_TYPES.map((type) => (
          <Link
            key={type.code}
            href={`/products?product_type=${type.code}`}
            onClick={onClose}
            className="flex min-h-12 items-center font-primary text-base text-sand/60 transition-colors duration-300 hover:text-gold"
          >
            {isArabic ? type.labelAr : type.labelEn}
          </Link>
        ))}
      </nav>
    </div>
  )
}

function MobileSearch({
  isOpen,
  onClose,
  action,
}: {
  isOpen: boolean
  onClose: () => void
  action: string
}) {
  const t = useTranslations("Store")
  const navT = useTranslations("Navbar")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    inputRef.current?.focus()
    return () => {
      document.body.style.overflow = previous
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("searchLabel")}
      className="fixed inset-0 z-[100] bg-royal-navy/[0.98] backdrop-blur-md"
    >
      <div className="mx-auto max-w-[84rem] px-5 py-5 md:px-10">
        <div className="flex items-center justify-between">
          <span className="font-primary text-[11px] uppercase tracking-[0.16em] text-sand/50">
            {t("search")}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={navT("close")}
            className="grid h-11 w-11 place-items-center text-sand/70 transition-colors duration-200 hover:text-gold"
          >
            <CloseIcon />
          </button>
        </div>

        <form action={action} method="get" role="search" className="mt-6">
          <div className="flex h-12 items-center gap-3 rounded-[var(--store-radius-sm)] border border-sand/20 bg-sand/[0.06] px-4">
            <SearchIcon className="h-4 w-4 shrink-0 text-sand/50" />
            <label htmlFor="store-mobile-search" className="sr-only">
              {t("searchLabel")}
            </label>
            <input
              ref={inputRef}
              id="store-mobile-search"
              name="q"
              type="search"
              placeholder={t("searchPlaceholder")}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent font-primary text-base text-sand placeholder:text-sand/40 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="mt-4 flex h-12 w-full items-center justify-center rounded-[var(--store-radius-sm)] bg-gold font-primary text-sm font-bold text-royal-navy transition-colors duration-200 hover:bg-sand"
          >
            {t("searchLabel")}
          </button>
        </form>
      </div>
    </div>
  )
}
