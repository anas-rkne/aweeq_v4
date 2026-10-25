import { Link } from "@/i18n/navigation"
import { redirect } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"
import { ProductCard } from "@/components/store/product-card"
import {
  asPositiveInt,
  asString,
  STORE_PAGE_SIZE,
  STORE_PRODUCT_TYPES,
} from "@/lib/catalog"
import {
  getCivilizations,
  getCollections,
  getProducts,
  type StoreLocale,
} from "@/lib/api"

type ProductsSearchParams = {
  q?: string | string[]
  civilization?: string | string[]
  collection?: string | string[]
  product_type?: string | string[]
  offset?: string | string[]
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
  const q = asString(query.q).trim()
  const civilization = asString(query.civilization).trim()
  const collection = asString(query.collection).trim()
  const productType = asString(query.product_type).trim()
  const offset = asPositiveInt(query.offset)

  const [{ products, count, error }, civilizations, collections] =
    await Promise.all([
      getProducts({
        q: q || undefined,
        civilization: civilization || undefined,
        collection: collection || undefined,
        product_type: productType || undefined,
        limit: STORE_PAGE_SIZE,
        offset,
        locale: storeLocale,
      }),
      getCivilizations(storeLocale),
      getCollections(storeLocale),
    ])

  const activeFilters = {
    q,
    civilization,
    collection,
    product_type: productType,
  }

  const buildHref = (patch: Partial<ProductsSearchParams>) => {
    const next = { ...activeFilters, offset: "", ...patch }
    const search = new URLSearchParams()

    if (next.q) search.set("q", String(next.q).trim())
    if (next.civilization) search.set("civilization", String(next.civilization))
    if (next.collection) search.set("collection", String(next.collection))
    if (next.product_type) search.set("product_type", String(next.product_type))
    if (next.offset) search.set("offset", String(next.offset))

    const query = search.toString()
    return query ? `/products?${query}` : "/products"
  }

  if (offset > 0 && (count === 0 || offset >= count)) {
    const lastOffset =
      count > 0
        ? Math.floor((count - 1) / STORE_PAGE_SIZE) * STORE_PAGE_SIZE
        : 0
    redirect({
      href: buildHref({ offset: lastOffset > 0 ? String(lastOffset) : "" }),
      locale,
    })
  }

  const selectedCivilization = civilizations.find(
    (item) => item.id === civilization
  )
  const selectedCollection = collections.find(
    (item) => item.handle === collection || item.id === collection
  )
  const selectedType = STORE_PRODUCT_TYPES.find(
    (item) => item.code === productType
  )

  const currentPage = Math.floor(offset / STORE_PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(count / STORE_PAGE_SIZE))
  const hasPrev = offset > 0
  const hasNext = offset + STORE_PAGE_SIZE < count
  const rangeStart = count === 0 ? 0 : offset + 1
  const rangeEnd = Math.min(offset + products.length, count)

  const hasAnyFilter = Boolean(q || civilization || collection || productType)

  return (
    <main className="min-h-screen bg-royal-navy">
      <section className="px-5 py-10 md:px-10 md:py-14 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <nav
            aria-label={t("breadcrumb")}
            className="mb-8 flex items-center gap-2 font-primary text-xs text-sand/40"
          >
            <Link href="/" className="transition-colors hover:text-gold">
              {t("home")}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-sand/65">{t("shop")}</span>
          </nav>

          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="mb-3 font-secondary text-xs tracking-[0.25em] text-gold/70">
                3WEEQ COLLECTION
              </p>
              <h1 className="font-primary text-4xl leading-tight text-gold md:text-5xl lg:text-6xl">
                {t("shop")}
              </h1>
              <p className="mt-4 max-w-2xl font-primary text-base leading-relaxed text-sand/65 md:text-lg">
                {isArabic
                  ? "قطع محدودة ومرقّمة، مستوحاة من حضارات تحمل حكايات لا تُنسى."
                  : "Limited, numbered pieces inspired by civilizations that carry unforgettable stories."}
              </p>
            </div>

            <form
              action="/products"
              method="get"
              role="search"
              className="flex w-full max-w-md items-stretch border border-sand/20 bg-navy-900"
            >
              {civilization && (
                <input type="hidden" name="civilization" value={civilization} />
              )}
              {collection && (
                <input type="hidden" name="collection" value={collection} />
              )}
              {productType && (
                <input type="hidden" name="product_type" value={productType} />
              )}
              <label htmlFor="store-search" className="sr-only">
                {t("searchLabel")}
              </label>
              <input
                id="store-search"
                name="q"
                type="search"
                defaultValue={q}
                placeholder={t("searchPlaceholder")}
                className="min-w-0 flex-1 bg-transparent px-4 py-3 font-primary text-sm text-sand placeholder:text-sand/35 focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-gold/50"
              />
              <button
                type="submit"
                className="shrink-0 bg-gold px-5 font-primary text-sm font-bold text-royal-navy transition-colors hover:bg-sand"
              >
                {t("searchLabel")}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="border-y border-sand/10 px-5 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl py-5">
          <div className="space-y-4">
            <FilterRow
              label={t("filters.civilization")}
              allLabel={t("all")}
              allHref={buildHref({
                civilization: "",
                offset: "",
              })}
              allActive={!civilization}
              options={civilizations.map((item) => ({
                key: item.id,
                label: item.name,
                href: buildHref({ civilization: item.id, offset: "" }),
                active: civilization === item.id,
              }))}
            />

            <FilterRow
              label={t("filters.collection")}
              allLabel={t("all")}
              allHref={buildHref({ collection: "", offset: "" })}
              allActive={!collection}
              options={collections.map((item) => ({
                key: item.id,
                label: item.title ?? item.handle,
                href: buildHref({ collection: item.handle, offset: "" }),
                active: collection === item.handle || collection === item.id,
              }))}
            />

            <FilterRow
              label={t("filters.type")}
              allLabel={t("all")}
              allHref={buildHref({ product_type: "", offset: "" })}
              allActive={!productType}
              options={STORE_PRODUCT_TYPES.map((item) => ({
                key: item.code,
                label: isArabic ? item.labelAr : item.labelEn,
                href: buildHref({ product_type: item.code, offset: "" }),
                active: productType === item.code,
              }))}
            />
          </div>

          {hasAnyFilter && (
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-sand/10 pt-5">
              <span className="font-primary text-xs text-sand/40">
                {t("currentFilters")}
              </span>
              {q && (
                <ActiveFilter
                  label={t("searchResults", { q })}
                  href={buildHref({ q: "", offset: "" })}
                />
              )}
              {selectedCivilization && (
                <ActiveFilter
                  label={selectedCivilization.name}
                  href={buildHref({ civilization: "", offset: "" })}
                />
              )}
              {selectedCollection && (
                <ActiveFilter
                  label={selectedCollection.title ?? selectedCollection.handle}
                  href={buildHref({ collection: "", offset: "" })}
                />
              )}
              {selectedType && (
                <ActiveFilter
                  label={isArabic ? selectedType.labelAr : selectedType.labelEn}
                  href={buildHref({ product_type: "", offset: "" })}
                />
              )}
              <Link
                href="/products"
                className="ms-1 font-primary text-xs text-gold/70 underline-offset-4 transition-colors hover:text-gold hover:underline"
              >
                {t("clearAll")}
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="px-5 py-10 md:px-10 md:py-14 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between gap-4">
            <p className="font-primary text-sm text-sand/45">
              {count > 0
                ? t("results", {
                    start: rangeStart,
                    end: rangeEnd,
                    total: count,
                  })
                : t("noResults")}
            </p>
            {totalPages > 1 && (
              <p className="font-primary text-xs text-sand/35">
                {t("page", { current: currentPage, total: totalPages })}
              </p>
            )}
          </div>

          {products.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center border border-sand/10 bg-navy-900/40 px-6 py-16 text-center">
              <span className="mb-5 font-primary text-3xl text-gold/25">
                3WEEQ
              </span>
              <p className="font-primary text-xl text-sand/70">
                {error ? t("errorTitle") : t("noResultsTitle")}
              </p>
              <p className="mt-3 max-w-md font-primary text-sm leading-relaxed text-sand/40">
                {error ? t("errorHint") : t("noResultsHint")}
              </p>
              {hasAnyFilter && (
                <Link
                  href="/products"
                  className="mt-6 border border-gold/40 px-6 py-3 font-primary text-sm text-gold transition-colors hover:bg-gold/10"
                >
                  {t("viewAll")}
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav
              aria-label={t("breadcrumb")}
              className="mt-14 flex items-center justify-center gap-3"
            >
              {hasPrev ? (
                <Link
                  href={buildHref({ offset: String(offset - STORE_PAGE_SIZE) })}
                  className="border border-sand/20 px-5 py-2.5 font-primary text-sm text-sand/70 transition-colors hover:border-gold/50 hover:text-gold"
                >
                  {t("prev")}
                </Link>
              ) : (
                <span className="cursor-not-allowed border border-sand/10 px-5 py-2.5 font-primary text-sm text-sand/25">
                  {t("prev")}
                </span>
              )}

              <span className="px-4 font-primary text-sm text-sand/45">
                {currentPage} / {totalPages}
              </span>

              {hasNext ? (
                <Link
                  href={buildHref({ offset: String(offset + STORE_PAGE_SIZE) })}
                  className="border border-sand/20 px-5 py-2.5 font-primary text-sm text-sand/70 transition-colors hover:border-gold/50 hover:text-gold"
                >
                  {t("next")}
                </Link>
              ) : (
                <span className="cursor-not-allowed border border-sand/10 px-5 py-2.5 font-primary text-sm text-sand/25">
                  {t("next")}
                </span>
              )}
            </nav>
          )}
        </div>
      </section>
    </main>
  )
}

function FilterRow({
  label,
  allLabel,
  allHref,
  allActive,
  options,
}: {
  label: string
  allLabel: string
  allHref: string
  allActive: boolean
  options: Array<{
    key: string
    label: string
    href: string
    active: boolean
  }>
}) {
  if (options.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="w-16 shrink-0 font-primary text-xs text-sand/35">
        {label}
      </span>

      <Link
        href={allHref}
        aria-current={allActive ? "true" : undefined}
        className={`border-b pb-0.5 font-primary text-sm transition-colors ${
          allActive
            ? "border-gold text-gold"
            : "border-transparent text-sand/55 hover:text-sand"
        }`}
      >
        {allLabel}
      </Link>

      {options.map((option) => (
        <Link
          key={option.key}
          href={option.href}
          aria-current={option.active ? "true" : undefined}
          className={`border-b pb-0.5 font-primary text-sm transition-colors ${
            option.active
              ? "border-gold text-gold"
              : "border-transparent text-sand/55 hover:text-sand"
          }`}
        >
          {option.label}
        </Link>
      ))}
    </div>
  )
}

function ActiveFilter({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 border border-gold/30 bg-gold/5 px-2.5 py-1 font-primary text-[11px] text-gold/80 transition-colors hover:border-gold/60 hover:text-gold"
    >
      {label}
      <span aria-hidden="true">×</span>
    </Link>
  )
}
