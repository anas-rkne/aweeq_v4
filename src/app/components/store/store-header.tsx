"use client"

import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"
import { Link, usePathname, useRouter } from "@/i18n/navigation"
import { useCart } from "./cart-provider"

const NAV_LINKS = [
  { href: "/", key: "home" },
  { href: "/products", key: "shop" },
  { href: "/collections", key: "collections" },
  { href: "/story", key: "story" },
] as const

export function StoreHeader() {
  const t = useTranslations("Store")
  const navT = useTranslations("Navbar")
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const { itemCount, openCart } = useCart()

  const switchLocale = () => {
    const nextLocale = locale === "ar" ? "en" : "ar"
    router.replace(`${pathname}${window.location.search}`, {
      locale: nextLocale,
    })
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-sand/10 bg-royal-navy/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-5 md:h-24 md:px-10">
        <Link
          href="/"
          aria-label={t("logoLabel")}
          className="inline-flex shrink-0 items-center"
        >
          <Image
            src="/images/logo-mark.png"
            alt="3WEEQ"
            width={2785}
            height={841}
            quality={90}
            sizes="(min-width: 64rem) 7rem, 5rem"
            priority
            className="h-6 w-auto md:h-8"
          />
        </Link>

        <nav aria-label={t("mainNav")} className="hidden md:block">
          <ul className="flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="font-primary text-sm text-sand/65 transition-colors duration-300 hover:text-gold"
                >
                  {t(link.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={switchLocale}
            aria-label={navT("language")}
            className="whitespace-nowrap font-secondary text-[11px] tracking-[0.12em] text-sand/80 transition-colors duration-200 ease-out hover:text-gold"
          >
            <span className={locale === "ar" ? "text-gold" : "text-sand/40"}>
              AR
            </span>
            <span className="mx-0.5 text-sand/30">/</span>
            <span className={locale === "en" ? "text-gold" : "text-sand/40"}>
              EN
            </span>
          </button>

          <Link
            href="/products"
            aria-label={t("search")}
            className="p-1 text-sand/70 transition-colors duration-300 hover:text-gold"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.2}
              strokeLinecap="round"
              aria-hidden="true"
              className="h-5 w-5"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" />
            </svg>
          </Link>

          <button
            type="button"
            onClick={openCart}
            aria-label={
              itemCount > 0 ? t("cartItems", { count: itemCount }) : t("cart")
            }
            className="relative p-1 text-sand/70 transition-colors duration-300 hover:text-gold"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-5 w-5"
            >
              <path d="M6 7h12l-1 13H7L6 7Z" />
              <path d="M9 7a3 3 0 0 1 6 0" />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -end-1.5 -top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-gold px-1 font-secondary text-[9px] leading-none text-royal-navy">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <nav
        aria-label={t("mobileNav")}
        className="border-t border-sand/10 px-5 py-3 md:hidden"
      >
        <ul className="flex items-center justify-between gap-4">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="font-primary text-xs text-sand/65 transition-colors duration-300 hover:text-gold"
              >
                {t(link.key)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
