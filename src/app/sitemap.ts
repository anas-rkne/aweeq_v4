import type { MetadataRoute } from "next"
import { JOURNAL_POSTS } from "@/components/journal-posts"
import { getProducts } from "@/lib/api"
import { routing } from "@/i18n/routing"

const BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "")

const POLICY_SLUGS = ["faq", "shipping", "returns", "terms", "privacy"]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts({ limit: 100, locale: "ar" })

  const paths = [
    "",
    "/products",
    "/collections",
    "/story",
    "/journal",
    ...JOURNAL_POSTS.map((post) => `/journal/${post.slug}`),
    ...POLICY_SLUGS.map((slug) => `/policies/${slug}`),
    ...products.products.map((product) => `/products/${product.handle}`),
  ]

  const uniquePaths = Array.from(new Set(paths))
  const lastModified = new Date()

  return uniquePaths.map((path) => ({
    url: `${BASE_URL}/${routing.defaultLocale}${path}`,
    lastModified,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/products/") ? 0.8 : 0.6,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((locale) => [
          locale,
          `${BASE_URL}/${locale}${path}`,
        ])
      ),
    },
  }))
}
