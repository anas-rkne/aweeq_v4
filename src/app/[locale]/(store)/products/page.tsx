import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"
import { ProductCard } from "@/components/store/product-card"
import { CategoryRail } from "@/components/store/category-rail"
import { asString, STORE_PRODUCT_TYPES } from "@/lib/catalog"
import { alternates } from "@/lib/seo"
import {
  getCollections,
  getProducts,
  type StoreLocale,
} from "@/lib/api"

type ProductsSearchParams = {
  product_type?: string | string[]
  collection?: string | string[]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Store" })
  return {
    title: `${t("shop")} | 3WEEQ`,
    description:
      locale === "ar"
        ? "اكتشف مجموعة 3WEEQ من العطور والقطع المحدودة المستوحاة من الحضارات القديمة."
        : "Discover 3WEEQ's collection of fragrances and limited pieces inspired by ancient civilizations.",
    alternates: alternates(locale, "/products"),
  }
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<ProductsSearchParams>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Store" })
  const isArabic = locale === "ar"
  const storeLocale: StoreLocale = isArabic ? "ar" : "en"
  const query = await searchParams
  const productType = asString(query.product_type).trim()
  const collection = asString(query.collection).trim()

  const [{ products, error }, collections] = await Promise.all([
    getProducts({
      collection: collection || undefined,
      product_type: productType || undefined,
      limit: 100,
      locale: storeLocale,
    }),
    getCollections(storeLocale),
  ])

  const buildHref = (patch: Partial<ProductsSearchParams>) => {
    const search = new URLSearchParams()
    const nextType = patch.product_type !== undefined ? patch.product_type : productType
    const nextCollection =
      patch.collection !== undefined ? patch.collection : collection
    if (nextType) search.set("product_type", String(nextType))
    if (nextCollection) search.set("collection", String(nextCollection))
    const search$ = search.toString()
    return search$ ? `/products?${search$}#catalogue` : "/products#catalogue"
  }

  const selectedType = STORE_PRODUCT_TYPES.find(
    (item) => item.code === productType
  )

  return (
    <main>
      {/* ===== the register's index ===== */}
      <section
        data-cuneiform-surface
        className="px-5 pb-6 pt-8 md:px-10 md:pt-12 lg:px-16"
      >
        <div className="mx-auto w-full max-w-[84rem]">
          <h1 className="font-primary text-display leading-[1.12] text-gold">
            {t("shop")}
          </h1>
          <p className="mt-5 max-w-[46ch] font-primary text-body leading-[1.7] text-sand/70">
            {t("shopNote")}
          </p>
        </div>
      </section>

      <CategoryRail activeType={productType} isArabic={isArabic} />

      {/* ===== the catalogue: collections and the pieces ===== */}
      <section
        id="catalogue"
        className="scroll-mt-[calc(var(--store-header-h)+1rem)] px-5 pt-10 md:px-10 lg:px-16"
      >
        <div className="mx-auto max-w-[84rem]">
          {/* the collections, one row */}
          {collections.length > 0 && (
            <div
              data-no-reveal
              className="flex flex-wrap items-center gap-x-4 gap-y-1"
            >
              <span className="font-primary text-[11px] uppercase tracking-[0.12em] text-sand/55">
                {t("collections")}
              </span>
              <FilterLink
                href={buildHref({ collection: "" })}
                active={!collection}
              >
                {t("all")}
              </FilterLink>
              {collections.map((item) => (
                <FilterLink
                  key={item.id}
                  href={buildHref({ collection: item.handle })}
                  active={collection === item.handle || collection === item.id}
                >
                  {item.title ?? item.handle}
                </FilterLink>
              ))}
            </div>
          )}

          {selectedType && (
            <p className="mt-6 font-primary text-small text-sand/60">
              {t("searchResults", { q: isArabic ? selectedType.labelAr : selectedType.labelEn })}
            </p>
          )}

          {products.length === 0 ? (
            <div className="mt-8 rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)] px-6 py-14 text-center md:px-12">
              <h3 className="font-primary text-h3 font-bold text-sand">
                {error ? t("errorTitle") : t("noResultsTitle")}
              </h3>
              <p className="mx-auto mt-3 max-w-[38ch] font-primary text-small leading-[1.7] text-sand/60">
                {error ? t("errorHint") : t("noResultsHint")}
              </p>
            </div>
          ) : (
            <div
              data-no-reveal
              className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4"
            >
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center font-primary text-[13px] transition-colors duration-200 ${
        active ? "text-gold" : "text-sand/60 hover:text-gold"
      }`}
    >
      {children}
    </Link>
  )
}
