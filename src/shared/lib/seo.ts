import "server-only"

/**
 * Shared SEO helpers so every route can declare its own canonical + hreflang
 * without duplicating the site-URL logic. The root layout still owns the
 * site-wide defaults (title, description, openGraph, twitter); each page adds
 * the one field it must own — `alternates` — so a page never canonicalises to
 * the locale home by accident.
 */

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  )
}

export interface Alternates {
  canonical: string
  languages: Record<string, string>
}

/**
 * `path` is the clean, query-less path (no `?…`, no locale prefix), e.g.
 * `""`, `/products`, `/journal/some-post`. Returns the `alternates` object a
 * page should spread into its `generateMetadata` result.
 */
export function alternates(locale: string, path: string): Alternates {
  const clean = path.startsWith("/") ? path : `/${path}`
  const base = siteUrl()
  return {
    canonical: `/${locale}${clean}`,
    languages: {
      ar: `${base}/ar${clean}`,
      en: `${base}/en${clean}`,
    },
  }
}
