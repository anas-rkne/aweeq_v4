import Image from "next/image"
import { Link } from "@/i18n/navigation"
import { notFound } from "next/navigation"
import { cache } from "react"
import { getTranslations } from "next-intl/server"
import { ProductCard } from "@/components/store/product-card"
import { ProductGallery } from "@/components/store/product-gallery"
import { ProductPurchasePanel } from "@/components/store/product-purchase-panel"
import { getProductByHandle, getRelatedProducts } from "@/lib/api"
import { normalizeImageUrl, parseJsonField } from "@/lib/format"
import type { OlfactoryPyramid, ProductSpecifications } from "@/types"

const getProduct = cache(getProductByHandle)

const POLICY_LINKS = [
  { key: "shipping", href: "/policies/shipping" },
  { key: "returns", href: "/policies/returns" },
  { key: "faq", href: "/policies/faq" },
] as const

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

const SPECIFICATION_KEYS: Array<{
  key: keyof ProductSpecifications
  label: string
}> = [
  { key: "concentration", label: "concentration" },
  { key: "origin", label: "origin" },
  { key: "edition", label: "edition" },
]

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>
}) {
  const { locale, handle } = await params
  const t = await getTranslations({ locale, namespace: "Product" })
  const footerT = await getTranslations({ locale, namespace: "Footer" })
  const storeLocale = locale === "en" ? "en" : "ar"
  const product = await getProduct(handle, { locale: storeLocale })

  if (!product) {
    notFound()
  }

  const related = await getRelatedProducts(product, 4, storeLocale)
  const pyramid = parseJsonField<OlfactoryPyramid>(
    product.olfactory_pyramid,
    {}
  )
  const specifications = parseJsonField<ProductSpecifications>(
    product.specifications,
    {}
  )

  const currencyCode =
    product.default_variant?.price?.currency_code ??
    product.variants[0]?.price?.currency_code ??
    "aed"

  const packagingMedia = (product.media ?? []).filter(
    (media) => media.role === "packaging" || media.role === "detail"
  )
  const packagingImage = packagingMedia.length
    ? normalizeImageUrl(packagingMedia[0].url)
    : normalizeImageUrl(product.thumbnail)

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

  const specificationRows = Object.entries(specifications).filter(
    ([, value]) => value !== null && value !== undefined && value !== ""
  )

  /* the register's headline facts: concentration, origin, edition */
  const facts = SPECIFICATION_KEYS.map(({ key, label }) => {
    const value = specifications[key]
    if (value == null || value === "") return null
    return { label: t(label), value: String(value) }
  }).filter((fact): fact is { label: string; value: string } => fact !== null)

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
              {[
                product.civilization?.name,
                product.subtitle,
              ]
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

      {/* ===== the numbers of the piece ===== */}
      {facts.length > 0 && (
        <section className="px-5 py-14 md:px-10 md:py-16 lg:px-16">
          <div className="mx-auto max-w-[84rem] rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)] p-6 md:p-8">
            <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-6">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="font-primary text-h3 text-gold">
                    {fact.value}
                  </dt>
                  <dd className="mt-2 font-primary text-small text-sand/70">
                    {fact.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

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

      {/* ===== the details ===== */}
      <section className="px-5 py-16 md:px-10 md:py-20 lg:px-16">
        <div className="mx-auto max-w-5xl space-y-14">
          {product.description && (
            <div>
              <h2 className="font-primary text-h2 text-gold">
                {t("description")}
              </h2>
              <p className="mt-6 whitespace-pre-line font-primary text-body leading-[1.7] text-sand/70">
                {product.description}
              </p>
            </div>
          )}

          {(product.ingredients || product.ritual) && (
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
              {product.ingredients && (
                <div className="rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)] p-5 md:p-6">
                  <h3 className="font-primary text-h3 text-sand">
                    {t("ingredients")}
                  </h3>
                  <p className="mt-3 font-primary text-small leading-[1.7] text-sand/70">
                    {product.ingredients}
                  </p>
                </div>
              )}
              {product.ritual && (
                <div className="rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)] p-5 md:p-6">
                  <h3 className="font-primary text-h3 text-sand">
                    {t("ritual")}
                  </h3>
                  <p className="mt-3 font-primary text-small leading-[1.7] text-sand/70">
                    {product.ritual}
                  </p>
                </div>
              )}
            </div>
          )}

          {specificationRows.length > 0 && (
            <div>
              <h2 className="font-primary text-h2 text-gold">{t("details")}</h2>
              <dl className="mt-6">
                {specificationRows.map(([key, value]) => {
                  const specLabel = SPECIFICATION_KEYS.find(
                    (item) => item.key === key
                  )?.label

                  return (
                    <div
                      key={key}
                      className="flex items-start justify-between gap-4 border-b border-dotted border-sand/15 py-4"
                    >
                      <dt className="font-primary text-small text-sand/70">
                        {specLabel ? t(specLabel) : key}
                      </dt>
                      <dd className="text-end font-primary text-body text-sand">
                        {String(value)}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </div>
          )}
        </div>
      </section>

      {/* ===== before you order ===== */}
      <section className="px-5 py-14 md:px-10 md:py-16 lg:px-16">
        <div className="mx-auto grid max-w-[84rem] grid-cols-1 gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div>
            <h2 className="font-primary text-h2 text-gold">
              {t("beforeYouOrder")}
            </h2>
            <div className="mt-8 overflow-hidden rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)]">
              {POLICY_LINKS.map((link, index) => (
                <Link
                  key={link.key}
                  href={link.href}
                  className={`flex min-h-14 items-center justify-between gap-4 px-5 transition-colors duration-200 hover:bg-[var(--store-surface-hover)] ${
                    index > 0 ? "border-t border-sand/10" : ""
                  }`}
                >
                  <span className="font-primary text-body text-sand/70">
                    {footerT(`help.${link.key}`)}
                  </span>
                  <span className="shrink-0 font-primary text-small text-gold">
                    {t("policyLink")}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {packagingImage && (
            <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-well)]">
              <Image
                src={packagingImage}
                alt={product.title}
                fill
                className="object-cover"
                sizes="(min-width: 64rem) 33vw, 100vw"
              />
            </div>
          )}
        </div>
      </section>

      {/* ===== more pieces ===== */}
      {related.length > 0 && (
        <section className="px-5 py-14 md:px-10 md:py-16 lg:px-16">
          <div className="mx-auto max-w-[84rem]">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-primary text-h2 text-gold">{t("related")}</h2>
              <Link
                href="/products#catalogue"
                className="-mx-2 inline-flex min-h-11 items-center px-2 font-primary text-small text-sand/70 transition-colors hover:text-gold"
              >
                {t("viewAll")}
              </Link>
            </div>

            <div
              data-no-reveal
              className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4"
            >
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
