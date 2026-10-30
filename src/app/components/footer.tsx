"use client"

import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"
import { Instagram, Youtube } from "lucide-react"
import { Link, usePathname } from "@/i18n/navigation"
import { RollingText } from "@/shared/ui/rolling-text"
import { TextReveal } from "@/shared/ui/text-reveal"

const QUICK_LINKS = [
  { key: "home", href: "#hero" },
  { key: "store", href: "/products" },
  { key: "rafid", href: "/products/rafid" },
  { key: "story", href: "/story" },
  { key: "journal", href: "/journal" },
  { key: "newsletter", href: "#newsletter" },
] as const

const HELP_LINKS = [
  { key: "faq", href: "/policies/faq" },
  { key: "shipping", href: "/policies/shipping" },
  { key: "returns", href: "/policies/returns" },
  { key: "terms", href: "/policies/terms" },
  { key: "privacy", href: "/policies/privacy" },
] as const

export function Footer({ className = "" }: { className?: string }) {
  const t = useTranslations("Footer")
  const locale = useLocale()
  const pathname = usePathname()
  const isHome = pathname === "/"
  const links = QUICK_LINKS
  const sectionHref = (href: string) =>
    href.startsWith("#")
      ? isHome
        ? href
        : `/${locale}${href}`
      : `/${locale}${href}`

  return (
    <footer
      id="footer"
      data-cuneiform-surface
      className={`relative pb-12 pt-12 ${className}`}
    >
      <div className="relative z-10 mx-auto grid w-full max-w-[84rem] grid-cols-2 items-center gap-8 px-5 sm:px-8 md:flex md:flex-row md:items-center md:justify-between md:gap-12 md:px-16">
        {/* far right: the mark */}
        <div className="col-start-1 row-start-1 flex justify-start">
          <a
            href={isHome ? "#hero" : `/${locale}`}
            aria-label={t("logoLabel")}
            className="inline-flex"
          >
            <Image
              src="/images/logo-mark.png"
              alt="3WEEQ"
              width={2785}
              height={841}
              quality={90}
              sizes="(min-width: 64rem) 12rem, 8rem"
              className="pointer-events-none h-full w-full select-none object-cover mix-blend-screen"
              style={{ objectPosition: "50% 20%" }}
            />
          </a>
        </div>

        {/* middle right: quick links */}
        <div className="col-start-1 row-start-2 text-start">
          <h3 className="mb-6 font-primary text-lg text-gold">
            <TextReveal preset="eyebrow">{t("quickTitle")}</TextReveal>
          </h3>

          <ul className="space-y-4">
            {links.map((link) => (
              <li key={link.key}>
                <a
                  href={sectionHref(link.href)}
                  className="group font-primary text-sm text-sand transition-colors duration-300 hover:text-gold"
                >
                  <RollingText>{t(`quick.${link.key}`)}</RollingText>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* middle left: help */}
        <div className="col-start-2 row-start-2 text-start">
          <h3 className="mb-6 font-primary text-lg text-gold">
            <TextReveal preset="eyebrow">{t("helpTitle")}</TextReveal>
          </h3>

          <ul className="space-y-4">
            {HELP_LINKS.map((link) => (
              <li key={link.key}>
                <Link
                  href={link.href}
                  className="group font-primary text-sm text-sand transition-colors duration-300 hover:text-gold"
                >
                  <RollingText>{t(`help.${link.key}`)}</RollingText>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* far left: follow */}
        <div className="col-start-2 row-start-1 flex items-center  gap-3 text-start md:block">
          <div className="flex items-center justify-end gap-3">
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="inline-flex rounded-full bg-gold p-2 text-royal-navy transition-colors duration-300 hover:bg-sand"
            >
              <Instagram className="h-4 w-4" strokeWidth={1.4} />
            </a>

            <a
              href="https://www.youtube.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Youtube"
              className="inline-flex rounded-full bg-gold p-2 text-royal-navy transition-colors duration-300 hover:bg-sand"
            >
              <Youtube className="h-4 w-4" strokeWidth={1.4} />
            </a>
          </div>
        </div>
      </div>

      {/* the full-bleed golden panel */}
      <div className="relative z-10 w-full overflow-hidden pt-8">
        <div className="aspect-[18/1] w-full overflow-hidden md:aspect-auto md:h-20">
          <Image
            src="/images/footer/footer_ornament.webp"
            alt=""
            width={1376}
            height={768}
            quality={90}
            sizes="100vw"
            className="pointer-events-none h-full w-full select-none object-cover mix-blend-screen"
            style={{ objectPosition: "50% 0%" }}
          />
        </div>
      </div>

      <div className="relative z-10 px-5 sm:px-8 md:px-16">
        <div className="mx-auto mt-8 flex w-full max-w-[84rem] flex-col items-center justify-between gap-4 text-sm text-sand/80 md:flex-row">
          {/* the last two lines sit at the very foot of the page: they are
              always readable, never part of the scroll reveal */}
          <p data-no-reveal className="font-primary">
            {t("rights")}
          </p>

          <p
            data-no-reveal
            dir="ltr"
            className="font-secondary text-[13px] md:text-left"
          >
            {t("tagline")}
          </p>
        </div>
      </div>
    </footer>
  )
}
