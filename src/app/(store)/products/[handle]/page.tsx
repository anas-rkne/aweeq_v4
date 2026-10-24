import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { cache } from "react"
import { ProductCard } from "@/components/store/product-card"
import { ProductGallery } from "@/components/store/product-gallery"
import { ProductPurchasePanel } from "@/components/store/product-purchase-panel"
import { getProductByHandle, getRelatedProducts } from "@/lib/api"
import { normalizeImageUrl, parseJsonField } from "@/lib/format"
import type { OlfactoryPyramid, ProductSpecifications } from "@/types"

const getProduct = cache(getProductByHandle)

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  const product = await getProduct(handle)

  if (!product) {
    notFound()
  }

  const image = normalizeImageUrl(product.thumbnail)

  return {
    title: product.seo_title ?? `${product.title} | 3WEEQ`,
    description:
      product.seo_description ??
      product.short_description ??
      product.description ??
      undefined,
    openGraph: {
      title: product.seo_title ?? product.title,
      description:
        product.seo_description ?? product.short_description ?? undefined,
      images: image ? [{ url: image }] : undefined,
      type: "website",
    },
  }
}

const PYRAMID_LABELS: Array<{
  key: keyof OlfactoryPyramid
  label: string
}> = [
  { key: "top", label: "المقدمة" },
  { key: "heart", label: "القلب" },
  { key: "base", label: "القاعدة" },
]

const SPECIFICATION_LABELS: Record<string, string> = {
  concentration: "التركيز",
  origin: "المصدر",
  edition: "الإصدار",
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  const product = await getProduct(handle)

  if (!product) {
    notFound()
  }

  const related = await getRelatedProducts(product)
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
    "sar"

  const packagingMedia = (product.media ?? []).filter(
    (media) => media.role === "packaging" || media.role === "detail"
  )

  const pyramidGroups = PYRAMID_LABELS.map(({ key, label }) => ({
    label,
    notes: Array.isArray(pyramid[key]) ? (pyramid[key] as string[]) : [],
  })).filter((group) => group.notes.length > 0)

  const specificationRows = Object.entries(specifications).filter(
    ([, value]) => value !== null && value !== undefined && value !== ""
  )

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
          price: (structuredPrice / 100).toFixed(2),
          priceCurrency: currencyCode.toUpperCase(),
          availability: product.variants.some((variant) => variant.in_stock)
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        }
      : undefined,
  }

  return (
    <main className="min-h-screen bg-royal-navy">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <section className="px-5 pt-8 md:px-10 md:pt-10 lg:px-16">
        <div className="mx-auto max-w-7xl" dir="rtl">
          <nav
            aria-label="مسار التنقل"
            className="mb-8 flex flex-wrap items-center gap-2 font-primary text-xs text-sand/40"
          >
            <Link href="/" className="transition-colors hover:text-gold">
              الرئيسية
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href="/products"
              className="transition-colors hover:text-gold"
            >
              المتجر
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-sand/65">{product.title}</span>
          </nav>
        </div>
      </section>

      <section className="px-5 pb-16 md:px-10 lg:px-16">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <ProductGallery product={product} />

          <div className="lg:sticky lg:top-32 lg:self-start" dir="rtl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {product.civilization && (
                <span className="border border-gold/25 bg-gold/5 px-2.5 py-1 font-primary text-[11px] text-gold/80">
                  {product.civilization.name}
                </span>
              )}
              {product.is_limited && (
                <span className="border border-sand/15 px-2.5 py-1 font-primary text-[11px] text-sand/55">
                  إصدار محدود
                </span>
              )}
              {product.is_serialized && (
                <span className="border border-sand/15 px-2.5 py-1 font-primary text-[11px] text-sand/55">
                  مرقّم يدوياً
                </span>
              )}
            </div>

            <h1 className="font-primary text-4xl leading-tight text-gold md:text-5xl">
              {product.title}
            </h1>

            {product.subtitle && (
              <p className="mt-3 font-primary text-lg text-sand/70">
                {product.subtitle}
              </p>
            )}

            {product.short_description && (
              <p className="mt-5 max-w-xl font-primary text-base leading-relaxed text-sand/55">
                {product.short_description}
              </p>
            )}

            <div className="mt-8">
              <ProductPurchasePanel product={product} />
            </div>

            <div className="mt-8 border-t border-sand/10 pt-6">
              <dl className="space-y-2.5 font-primary text-sm">
                {product.collection && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-sand/40">المجموعة</dt>
                    <dd className="text-sand/75">{product.collection.title}</dd>
                  </div>
                )}
                {product.product_type && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-sand/40">النوع</dt>
                    <dd className="text-sand/75">
                      {product.product_type.name}
                    </dd>
                  </div>
                )}
                {product.edition_size != null && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-sand/40">حجم الإصدار</dt>
                    <dd className="text-sand/75">
                      {product.edition_size} قطعة
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {product.story && (
        <section className="border-y border-sand/10 bg-navy-850 px-5 py-16 md:px-10 md:py-24 lg:px-16">
          <div className="mx-auto max-w-4xl text-center" dir="rtl">
            <p className="mb-4 font-secondary text-xs tracking-[0.25em] text-gold/70">
              THE STORY
            </p>
            <h2 className="font-primary text-2xl text-gold md:text-3xl">
              حكاية القطعة
            </h2>
            <p className="mx-auto mt-6 max-w-3xl font-primary text-base leading-loose text-sand/65 md:text-lg">
              {product.story}
            </p>
          </div>
        </section>
      )}

      {pyramidGroups.length > 0 && (
        <section className="px-5 py-16 md:px-10 md:py-20 lg:px-16">
          <div className="mx-auto max-w-5xl" dir="rtl">
            <h2 className="mb-10 text-center font-primary text-2xl text-gold md:text-3xl">
              الهرم العطري
            </h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {pyramidGroups.map((group, index) => (
                <div
                  key={group.label}
                  className="border-t border-gold/25 pt-5 text-center"
                >
                  <p className="font-secondary text-[11px] text-gold/60">
                    0{index + 1}
                  </p>
                  <h3 className="mt-2 font-primary text-xl text-sand">
                    {group.label}
                  </h3>
                  <ul className="mt-4 space-y-1.5">
                    {group.notes.map((note) => (
                      <li
                        key={note}
                        className="font-primary text-sm text-sand/55"
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

      <section className="px-5 pb-16 md:px-10 md:pb-24 lg:px-16">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-12" dir="rtl">
            {product.description && (
              <div>
                <h2 className="mb-4 font-primary text-2xl text-gold">الوصف</h2>
                <p className="whitespace-pre-line font-primary text-base leading-loose text-sand/60">
                  {product.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              {product.ingredients && (
                <div className="border-t border-sand/10 pt-5">
                  <h3 className="mb-3 font-primary text-lg text-sand/85">
                    المكونات
                  </h3>
                  <p className="font-primary text-sm leading-loose text-sand/50">
                    {product.ingredients}
                  </p>
                </div>
              )}
              {product.ritual && (
                <div className="border-t border-sand/10 pt-5">
                  <h3 className="mb-3 font-primary text-lg text-sand/85">
                    طريقة الاستخدام
                  </h3>
                  <p className="font-primary text-sm leading-loose text-sand/50">
                    {product.ritual}
                  </p>
                </div>
              )}
            </div>

            {specificationRows.length > 0 && (
              <div>
                <h2 className="mb-4 font-primary text-2xl text-gold">
                  التفاصيل
                </h2>
                <dl className="divide-y divide-sand/10 border-y border-sand/10">
                  {specificationRows.map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-start justify-between gap-4 py-3 font-primary text-sm"
                    >
                      <dt className="text-sand/40">
                        {SPECIFICATION_LABELS[key] ?? key}
                      </dt>
                      <dd className="text-left text-sand/70">
                        {String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>

          {packagingMedia.length > 0 && (
            <div className="space-y-3">
              {packagingMedia.slice(0, 2).map((media) => {
                const url = normalizeImageUrl(media.url)
                if (!url) return null

                return (
                  <div
                    key={media.id}
                    className="relative aspect-[4/5] overflow-hidden bg-navy-800"
                  >
                    <Image
                      src={url}
                      alt={media.alt || product.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 40vw"
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="border-t border-sand/10 px-5 py-16 md:px-10 md:py-20 lg:px-16">
          <div className="mx-auto max-w-7xl" dir="rtl">
            <div className="mb-10 flex items-end justify-between gap-4">
              <div>
                <p className="mb-2 font-secondary text-xs tracking-[0.25em] text-gold/60">
                  CONTINUE EXPLORING
                </p>
                <h2 className="font-primary text-2xl text-gold md:text-3xl">
                  قطع أخرى
                </h2>
              </div>
              <Link
                href="/products"
                className="font-primary text-sm text-sand/55 transition-colors hover:text-gold"
              >
                كل القطع ←
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
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
