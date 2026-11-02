import type { Metadata, Viewport } from "next"
import { hasLocale, NextIntlClientProvider } from "next-intl"
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server"
import { notFound } from "next/navigation"
import { BRAND_COLORS } from "@/shared/config/brand"
import { routing } from "@/i18n/routing"
import { siteUrl } from "@/shared/lib/seo"
import { fontPreloads } from "../fonts"
import "../globals.css"

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Metadata" })
  const base = siteUrl()

  return {
    metadataBase: new URL(base),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ar: `${base}/ar`,
        en: `${base}/en`,
      },
    },
    openGraph: {
      type: "website",
      siteName: "3WEEQ",
      locale: locale === "ar" ? "ar_AE" : "en_AE",
      title: t("title"),
      description: t("description"),
      url: `${base}/${locale}`,
      images: [
        {
          url: `${base}/images/hero/hero_img.webp`,
          width: 2048,
          height: 1152,
          alt: t("title"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: [`${base}/images/hero/hero_img.webp`],
    },
    icons: {
      icon: "/favicon.ico",
    },
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: BRAND_COLORS.navy,
  viewportFit: "cover",
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="h-full antialiased"
    >
      <head>
        {fontPreloads.map((href) => (
          <link
            key={href}
            rel="preload"
            href={href}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        ))}
        {/* Site-wide entity markup: the brand identity Google uses for the
            knowledge panel and sitelinks search box. Static and locale-free. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "3WEEQ",
                url: siteUrl(),
                logo: `${siteUrl()}/images/logo.png`,
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "3WEEQ",
                url: siteUrl(),
              },
            ]),
          }}
        />
        {/* Without scripting the reveal observer never runs, so the content it
            would have hidden must be shown again. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
