import { notFound } from "next/navigation"
import { cache } from "react"
import { getTranslations } from "next-intl/server"
import { ProductGallery } from "@/components/store/product-gallery"
import { ProductPurchasePanel } from "@/components/store/product-purchase-panel"
import { getProductByHandle } from "@/lib/api"
import { normalizeImageUrl, parseJsonField } from "@/lib/format"
import type { OlfactoryPyramid } from "@/types"

const getProduct = cache(getProductByHandle)

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>
}) {
  const { locale, handle } = await params
  const product = await getProduct(handle, {
    locale: locale === "en" ? "en" : "ar",
  })

  if (!product) {
    notFound()
  }

  const image = normalizeImageUrl(product.thumbnail)
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/$/, "")

  return {
    title: product.seo_title ?? `${product.title} | 3WEEQ`,
    description:
      product.seo_description ??
      product.short_description ??
      product.description ??
      undefined,
    alternates: {
      canonical: `/${locale}/products/${handle}`,
      languages: {
        ar: `${siteUrl}/ar/products/${handle}`,
        en: `${siteUrl}/en/products/${handle}`,
      },
    },
    openGraph: {
      title: product.seo_title ?? product.title,
      description:
        product.seo_description ?? product.short_description ?? undefined,
      images: image ? [{ url: image }] : undefined,
      type: "website",
      url: `${siteUrl}/${locale}/products/${handle}`,
      locale: locale === "ar" ? "ar_AE" : "en_AE",
    },
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>
}) {
  const { locale, handle } = await params
  const t = await getTranslations({ locale, namespace: "Product" })
  const storeLocale = locale === "en" ? "en" : "ar"
  const product = await getProduct(handle, { locale: storeLocale })

  if (!product) {
    notFound()
  }

  const pyramid = parseJsonField<OlfactoryPyramid>(
    product.olfactory_pyramid,
    {}
  )

  const pyramidGroups = [
    { key: "top" as const, label: t("top") },
    { key: "heart" as const, label: t("heart") },
    { key: "base" as const, label: t("base") },
  ]
    .map(({ key, label }) => ({
      label,
      notes: Array.isArray(pyramid[key]) ? (pyramid[key] as string[]) : [],
    }))
    .filter((group) => group.notes.length > 0)

  const currencyCode =
    product.default_variant?.price?.currency_code ??
    product.variants[0]?.price?.currency_code ??
    "aed"
  const structuredPrice =
    product.default_variant?.price?.amount ?? product.price_range?.min

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.short_description ?? product.description ?? undefined,
    image: normalizeImageUrl(product.thumbnail) ?? undefined,
    brand: {
      "@type": "Brand",
      name: "3WEEQ",
    },
    sku: product.default_variant?.sku ?? undefined,
    offers: structuredPrice
      ? {
          "@type": "Offer",
          price: structuredPrice.toFixed(2),
          priceCurrency: currencyCode.toUpperCase(),
          availability: product.variants.some((variant) => variant.in_stock)
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        }
      : undefined,
  }

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* ===== the plate and the swing tag ===== */}
      <section
        data-cuneiform-surface
        className="px-5 pt-6 md:px-10 md:pt-10 lg:px-16"
      >
        <div className="mx-auto max-w-[84rem]">
          <h1 className="font-primary text-display leading-[1.12] text-gold">
            {product.title}
          </h1>

          {(product.subtitle || product.civilization) && (
            <p className="mt-4 font-primary text-body text-sand/70">
              {[product.civilization?.name, product.subtitle]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <ProductGallery product={product} />

            <div className="lg:sticky lg:top-[calc(var(--store-header-h)+1.5rem)] lg:self-start">
              <ProductPurchasePanel product={product} />
            </div>
          </div>
        </div>
      </section>

      {/* ===== the story ===== */}
      {product.story && (
        <section className="px-5 py-16 md:px-10 md:py-20 lg:px-16">
          <div className="mx-auto max-w-[68ch]">
            <h2 className="font-primary text-h2 text-gold">{t("story")}</h2>
            <p className="mt-6 whitespace-pre-line font-primary text-body leading-[1.7] text-sand/70">
              {product.story}
            </p>
          </div>
        </section>
      )}

      {/* ===== the pyramid ===== */}
      {pyramidGroups.length > 0 && (
        <section className="px-5 py-16 md:px-10 md:py-20 lg:px-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-primary text-h2 text-gold">{t("pyramid")}</h2>
            <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
              {pyramidGroups.map((group) => (
                <div
                  key={group.label}
                  className="rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)] p-5 md:p-6"
                >
                  <h3 className="font-primary text-h3 text-sand">
                    {group.label}
                  </h3>
                  <ul className="mt-4 space-y-2">
                    {group.notes.map((note) => (
                      <li
                        key={note}
                        className="font-primary text-small text-sand/70"
                      >
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
