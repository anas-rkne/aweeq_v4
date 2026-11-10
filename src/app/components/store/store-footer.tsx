import Image from "next/image"
import { getLocale, getTranslations } from "next-intl/server"
import { Instagram, Youtube } from "lucide-react"
import { Link } from "@/i18n/navigation"

/* The store's own footer: a two-column stack on a phone (the house runs full
   width, the link lists sit side by side), four columns on a desktop, and a
   quiet bottom bar. It stays a server component — no reveal, no animation — so
   the last thing on the page is always readable and its links always tappable. */

const SHOP_LINKS = [
  { key: "store", href: "/products" },
  { key: "collections", href: "/collections" },
  { key: "story", href: "/story" },
  { key: "journal", href: "/journal" },
] as const

const HELP_LINKS = [
  { key: "faq", href: "/policies/faq" },
  { key: "shipping", href: "/policies/shipping" },
  { key: "returns", href: "/policies/returns" },
] as const

const LEGAL_LINKS = [
  { key: "terms", href: "/policies/terms" },
  { key: "privacy", href: "/policies/privacy" },
] as const

export async function StoreFooter() {
  const locale = await getLocale()
  const isArabic = locale === "ar"
  const t = await getTranslations("Footer")
  const storeT = await getTranslations("Store")

  return (
    <footer
      data-cuneiform-surface
      className="relative z-10 mt-16 border-t border-sand/10 px-5 pb-10 pt-12 md:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-[84rem]">
        <div className="grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-8">
          {/* the house — full width on a phone: mark and socials share one line,
              the tagline sits beneath */}
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/"
                aria-label={t("logoLabel")}
                className="inline-flex items-center"
              >
                <Image
                  src="/images/logo-mark.webp"
                  alt="3WEEQ"
                  width={1310}
                  height={800}
                  quality={90}
                  sizes="6rem"
                  className="h-14 w-auto"
                />
              </Link>

              <div className="flex items-center gap-2">
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="grid h-11 w-11 place-items-center rounded-full border border-sand/15 text-sand/70 transition-colors duration-200 hover:border-gold hover:text-gold"
                >
                  <Instagram className="h-4 w-4" strokeWidth={1.4} />
                </a>

                <a
                  href="https://www.youtube.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Youtube"
                  className="grid h-11 w-11 place-items-center rounded-full border border-sand/15 text-sand/70 transition-colors duration-200 hover:border-gold hover:text-gold"
                >
                  <Youtube className="h-4 w-4" strokeWidth={1.4} />
                </a>
              </div>
            </div>

            <p
              dir={isArabic ? "rtl" : "ltr"}
              className={`mt-6 text-[12px] text-sand/55 ${
                isArabic ? "font-primary" : "font-secondary tracking-[0.12em]"
              }`}
            >
              {t("tagline")}
            </p>
          </div>

          {/* the shop */}
          <FooterColumn title={t("quickTitle")}>
            {SHOP_LINKS.map((link) => (
              <li key={link.key}>
                <Link
                  href={link.href}
                  className="-mx-2.5 inline-flex min-h-10 items-center px-2.5 font-primary text-small text-sand/70 transition-colors duration-200 hover:text-gold"
                >
                  {t(`quick.${link.key}`)}
                </Link>
              </li>
            ))}
          </FooterColumn>

          {/* help */}
          <FooterColumn title={t("helpTitle")}>
            {HELP_LINKS.map((link) => (
              <li key={link.key}>
                <Link
                  href={link.href}
                  className="-mx-2.5 inline-flex min-h-10 items-center px-2.5 font-primary text-small text-sand/70 transition-colors duration-200 hover:text-gold"
                >
                  {t(`help.${link.key}`)}
                </Link>
              </li>
            ))}
          </FooterColumn>

          {/* the paperwork */}
          <FooterColumn title={storeT("legalTitle")}>
            {LEGAL_LINKS.map((link) => (
              <li key={link.key}>
                <Link
                  href={link.href}
                  className="-mx-2.5 inline-flex min-h-10 items-center px-2.5 font-primary text-small text-sand/70 transition-colors duration-200 hover:text-gold"
                >
                  {t(`help.${link.key}`)}
                </Link>
              </li>
            ))}
          </FooterColumn>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-sand/10 pt-6 sm:flex-row sm:items-center">
          <p className="font-primary text-[12px] text-sand/55">{t("rights")}</p>
          <p className="font-secondary text-[11px] text-sand/55">3WEEQ</p>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h2 className="font-primary text-[11px] uppercase tracking-[0.16em] text-gold">
        {title}
      </h2>
      <ul className="mt-2">{children}</ul>
    </div>
  )
}
