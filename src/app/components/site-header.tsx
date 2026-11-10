"use client"

import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { useCart } from "./store/cart-provider"
import { usePathname, useRouter } from "@/i18n/navigation"
import { RollingText } from "@/shared/ui/rolling-text"
import { SearchModal } from "./search-modal"

const STORE_PREFIXES = ["/products", "/collections", "/cart", "/checkout"]

const NAV_LINKS = [
  { href: "#hero", key: "home", current: true },
  { href: "/products", key: "store", current: false },
  { href: "/story", key: "story", current: false },
  { href: "#civilizations", key: "civilizations", current: false },
  { href: "/journal", key: "journal", current: false },
] as const

function navHref(href: string, pathname: string, locale: string) {
  if (href.startsWith("#")) {
    return pathname === "/" ? href : `/${locale}${href}`
  }
  return `/${locale}${href}`
}

function isLinkCurrent(link: (typeof NAV_LINKS)[number], pathname: string) {
  if (link.href === "#hero") return pathname === "/"
  if (link.href === "/story") return pathname === "/story"
  if (link.href === "/products") return pathname.startsWith("/products")
  if (link.href === "/journal") return pathname.startsWith("/journal")
  return link.current
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="square"
      aria-hidden="true"
      className="h-[21px] w-[21px]"
    >
      <circle cx="10.75" cy="10.75" r="6.75" />
      <path d="M15.75 15.75 21 21" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="square"
      aria-hidden="true"
      className="h-[21px] w-[21px]"
    >
      <path d="M5 8h14l1 12.5H4L5 8Z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </svg>
  )
}

function SimpleMenuIcon() {
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

function MobileNav({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations("Navbar")
  const router = useRouter()
  const shellRef = useRef<HTMLDivElement>(null)

  const switchLocale = () => {
    const nextLocale = locale === "ar" ? "en" : "ar"
    router.replace(`${pathname}${window.location.search}`, {
      locale: nextLocale,
    })
  }
  const contentRef = useRef<HTMLDivElement>(null)
  const linksRef = useRef<(HTMLAnchorElement | null)[]>([])
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap
        .timeline()
        .fromTo(
          contentRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.4, ease: "power2.out" },
          0
        )
        .fromTo(
          linksRef.current,
          { y: 26, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            stagger: 0.07,
            ease: "power2.out",
          },
          0.08
        )
    }, shellRef)

    return () => ctx.revert()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previous
    }
  }, [isOpen])

  /* focus management: trap Tab inside the dialog, close on Escape, move focus
     in on open and return it to the trigger on close */
  useEffect(() => {
    if (!isOpen) return

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    const focusTimer = window.setTimeout(
      () => closeButtonRef.current?.focus(),
      40
    )

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
        return
      }

      if (event.key !== "Tab" || !shellRef.current) return

      const focusable = Array.from(
        shellRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.offsetParent !== null)

      if (focusable.length === 0) return

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
      document.removeEventListener("keydown", onKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={shellRef}
      role="dialog"
      aria-modal="true"
      aria-label={t("menu")}
      className="fixed inset-0 z-[100] overflow-y-auto bg-royal-navy"
    >
      {/* the brand field: solid navy with the house glow, no photograph */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,var(--color-brand-slate)_0%,transparent_58%)] opacity-35"
      />

      <div ref={contentRef} className="relative flex min-h-svh flex-col">
        {/* top bar: the mark and the close control */}
        <div className="flex h-16 items-center justify-between px-5 sm:px-8">
          <a
            href={pathname === "/" ? "#hero" : `/${locale}`}
            onClick={onClose}
            aria-label={t("logoLabel")}
            className="inline-flex"
          >
            <Image
              src="/images/logo-mark.webp"
              alt="3WEEQ"
              width={1310}
              height={800}
              quality={90}
              sizes="6rem"
              className="h-10 w-auto"
            />
          </a>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="grid h-10 w-10 place-items-center rounded-full border border-sand/20 text-sand/70 transition-colors duration-300 ease-out hover:border-gold/60 hover:text-gold"
          >
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
          </button>
        </div>

        {/* the rooms */}
        <nav
          aria-label={t("mainNav")}
          className="flex flex-1 items-center px-5 sm:px-8"
        >
          <ul className="w-full border-t border-sand/10">
            {NAV_LINKS.map((link, index) => {
              const current = isLinkCurrent(link, pathname)
              return (
                <li key={link.href} className="border-b border-sand/10">
                  <a
                    ref={(element) => {
                      linksRef.current[index] = element
                    }}
                    href={navHref(link.href, pathname, locale)}
                    onClick={onClose}
                    aria-current={current ? "page" : undefined}
                    className="group flex items-center justify-between gap-6 py-5"
                  >
                    <span className="flex items-baseline gap-5">
                      <span className="font-secondary text-[11px] tabular-nums tracking-[0.2em] text-gold/60">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`font-primary text-[2rem] leading-none transition-colors duration-300 ease-out sm:text-5xl ${
                          current
                            ? "text-gold"
                            : "text-sand group-hover:text-gold"
                        }`}
                      >
                        {t(link.key)}
                      </span>
                    </span>

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.2}
                      strokeLinecap="square"
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 text-gold/0 transition-colors duration-300 ease-out group-hover:text-gold rtl:-scale-x-100"
                    >
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* footer: the line and the language */}
        <div className="flex items-center justify-between gap-4 px-5 py-7 sm:px-8">
          <p className="font-primary text-[11px] leading-relaxed text-sand/45">
            {t("navTagline")}
          </p>

          <button
            type="button"
            onClick={switchLocale}
            aria-label={t("language")}
            className="whitespace-nowrap font-secondary text-[13px] text-sand/70 transition-colors duration-200 ease-out hover:text-gold"
          >
            <span className={locale === "ar" ? "text-gold" : "text-sand/55"}>
              AR
            </span>
            <span className="mx-0.5 text-sand/55 sm:mx-1">/</span>
            <span className={locale === "en" ? "text-gold" : "text-sand/55"}>
              EN
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations("Navbar")
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const { itemCount, openCart } = useCart()

  const switchLocale = () => {
    const nextLocale = locale === "ar" ? "en" : "ar"
    router.replace(`${pathname}${window.location.search}`, {
      locale: nextLocale,
    })
  }

  const isStoreRoute = STORE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  const isHome = pathname === "/"

  if (isStoreRoute) {
    return null
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 h-[64px] bg-transparent px-4 sm:h-[76px] sm:px-8 md:h-[104px] md:px-16">
        <div className="grid h-full grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-4 md:gap-6">
          {/* the tools, on the right side of the RTL bar */}
          <div className="flex shrink-0 items-center justify-start gap-2 sm:gap-3 md:gap-5">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label={t("menu")}
              aria-expanded={isMenuOpen}
              className="p-1 text-sand/70 transition-colors duration-200 ease-out hover:text-gold md:hidden"
            >
              <SimpleMenuIcon />
            </button>

            <button
              type="button"
              onClick={switchLocale}
              aria-label={t("language")}
              className="whitespace-nowrap font-secondary text-[13px] text-sand/80 transition-colors duration-200 ease-out hover:text-gold"
            >
              <span className={locale === "ar" ? "text-gold" : "text-sand/55"}>
                AR
              </span>
              <span className="mx-0.5 text-sand/55 sm:mx-1">/</span>
              <span className={locale === "en" ? "text-gold" : "text-sand/55"}>
                EN
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label={t("search")}
              aria-haspopup="dialog"
              className="shrink-0 p-1 text-sand/70 transition-colors duration-200 ease-out hover:text-gold"
            >
              <SearchIcon />
            </button>

            <button
              type="button"
              onClick={openCart}
              aria-label={
                itemCount > 0 ? t("cartItems", { count: itemCount }) : t("cart")
              }
              aria-haspopup="dialog"
              className="relative shrink-0 p-1 text-sand/70 transition-colors duration-200 ease-out hover:text-gold"
            >
              <CartIcon />
              {itemCount > 0 && (
                <span className="absolute -end-1.5 -top-0.5 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-gold px-1 font-secondary text-[9px] leading-none text-royal-navy sm:-end-2 sm:-top-1.5">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </button>
          </div>

          {/* the five rooms, in the middle of the bar */}
          <nav
            aria-label={t("mainNav")}
            className="hidden min-w-0 items-center justify-center gap-5 md:flex lg:gap-7"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={navHref(link.href, pathname, locale)}
                aria-current={
                  isLinkCurrent(link, pathname) ? "page" : undefined
                }
                className={`group relative whitespace-nowrap font-primary text-[13px] transition-colors duration-300 ${
                  isLinkCurrent(link, pathname)
                    ? "text-gold"
                    : "text-sand/75 hover:text-gold"
                }`}
              >
                <RollingText>{t(link.key)}</RollingText>
              </a>
            ))}
          </nav>

          {/* the mark, on the left side */}
          <div className="flex shrink-0 justify-end">
            <a
              href={isHome ? "#hero" : `/${locale}`}
              aria-label={t("logoLabel")}
              className="inline-flex w-fit items-center"
            >
              <Image
                src="/images/logo-mark.webp"
                alt="3WEEQ"
                width={1310}
                height={800}
                quality={90}
                sizes="(min-width: 64rem) 10rem, 6rem"
                preload
                className="h-[50px] w-auto sm:h-[64px] md:h-[96px]"
              />
            </a>
          </div>
        </div>
      </header>

      <MobileNav isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  )
}
