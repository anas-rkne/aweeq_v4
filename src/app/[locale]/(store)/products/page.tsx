import { Link, redirect } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"
import { ProductCard } from "@/components/store/product-card"
import { ProductRail } from "@/components/store/product-rail"
import { StoreHero } from "@/components/store/store-hero"
import { CategoryRail } from "@/components/store/category-rail"
import { PromoTrio } from "@/components/store/promo-trio"
import { NewsletterPanel } from "@/components/store/newsletter-panel"
import { TrustRow } from "@/components/store/trust-row"
import { SectionHeader } from "@/components/store/section-header"
import { SortSelect } from "@/components/store/sort-select"
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
  sort?: string | string[]
  offset?: string | string[]
}

type SortOrder = "newest" | "price_asc" | "price_desc"

function resolveSort(value: string): SortOrder {
  return value === "price_asc" || value === "price_desc" ? value : "newest"
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
  const sort = resolveSort(asString(query.sort).trim())
  const offset = asPositiveInt(query.offset)

  const [
    { products, count, facets, error },
    picks,
    civilizations,
    collections,
  ] = await Promise.all([
    getProducts({
      q: q || undefined,
      civilization: civilization || undefined,
      collection: collection || undefined,
      product_type: productType || undefined,
      order: sort,
      limit: STORE_PAGE_SIZE,
      offset,
      locale: storeLocale,
    }),
    getProducts({ limit: 8, locale: storeLocale }),
    getCivilizations(storeLocale),
    getCollections(storeLocale),
  ])

  const typeCounts = facets?.types ?? {}

  const activeFilters = {
    q,
    civilization,
    collection,
    product_type: productType,
    sort,
  }

  const buildHref = (patch: Partial<ProductsSearchParams>) => {
    const next = { ...activeFilters, offset: "", ...patch }
    const search = new URLSearchParams()
    const nextSort = resolveSort(String(next.sort ?? "newest"))

    if (next.q) search.set("q", String(next.q).trim())
    if (next.civilization) search.set("civilization", String(next.civilization))
    if (next.collection) search.set("collection", String(next.collection))
    if (next.product_type) search.set("product_type", String(next.product_type))
    if (nextSort !== "newest") search.set("sort", nextSort)
    if (next.offset) search.set("offset", String(next.offset))

    const search$ = search.toString()
    return search$ ? `/products?${search$}` : "/products"
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
  const typesTotal = Object.values(typeCounts).reduce(
    (sum, value) => sum + value,
    0
  )
  const hasTypeCounts = typesTotal > 0

  return (
    <main>
      <StoreHero />

      <CategoryRail
        activeType={productType}
        counts={hasTypeCounts ? typeCounts : undefined}
        isArabic={isArabic}
      />

      {picks.products.length > 0 && (
        <section className="px-5 pt-12 md:px-10 lg:px-16 lg:pt-16">
          <div className="mx-auto max-w-[84rem]">
            <SectionHeader
              title={t("picksTitle")}
              href="/products#catalogue"
              cta={t("seeAll")}
            />
            <div data-no-reveal className="mt-6">
              <ProductRail products={picks.products} />
            </div>
          </div>
        </section>
      )}

      <PromoTrio />

      {/* ===== the catalogue ===== */}
      <section
        id="catalogue"
        className="scroll-mt-[calc(var(--store-header-h)+1rem)] px-5 pt-14 md:px-10 lg:px-16 lg:pt-20"
      >
        <div className="mx-auto max-w-[84rem]">
          <SectionHeader
            title={t("catalogueTitle")}
            note={t("catalogueNote")}
            id="catalogue-title"
          />

          {/* the type tabs */}
          <div
            data-no-reveal
            className="mt-6 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <TypeTab
              href={buildHref({ product_type: "" })}
              active={!productType}
              count={hasTypeCounts ? typesTotal : undefined}
            >
              {t("all")}
            </TypeTab>

            {STORE_PRODUCT_TYPES.map((type) => (
              <TypeTab
                key={type.code}
                href={buildHref({ product_type: type.code })}
                active={productType === type.code}
                count={hasTypeCounts ? typeCounts[type.code] : undefined}
              >
                {isArabic ? type.labelAr : type.labelEn}
              </TypeTab>
            ))}
          </div>

          {/* search and sort */}
          <div
            data-no-reveal
            className="mt-6 flex flex-col gap-4 border-y border-sand/10 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <form
              action={`/${locale}/products`}
              method="get"
              role="search"
              className="w-full sm:max-w-md"
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
              {sort !== "newest" && (
                <input type="hidden" name="sort" value={sort} />
              )}
              <div className="flex h-12 items-center gap-2 rounded-[var(--store-radius-pill)] border border-sand/15 bg-sand/[0.04] ps-4 pe-1 transition-colors duration-200 focus-within:border-gold/60">
                <label htmlFor="store-search" className="sr-only">
                  {t("searchLabel")}
                </label>
                <input
                  id="store-search"
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder={t("searchPlaceholder")}
                  className="h-11 min-w-0 flex-1 bg-transparent font-primary text-sm text-sand placeholder:text-sand/45 focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label={t("searchLabel")}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sand/70 transition-colors duration-200 hover:text-gold"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.3}
                    strokeLinecap="round"
                    aria-hidden="true"
                    className="h-4 w-4"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m16.5 16.5 4 4" />
                  </svg>
                </button>
              </div>
            </form>

            <SortSelect value={sort} />
          </div>

          {/* the civilisations and collections stay one row below the folds */}
          <div data-no-reveal className="mt-4 space-y-3">
            <FilterRow
              label={t("filters.civilization")}
              allLabel={t("all")}
              allHref={buildHref({ civilization: "" })}
              allActive={!civilization}
              options={civilizations.map((item) => ({
                key: item.id,
                label: item.name,
                href: buildHref({ civilization: item.id }),
                active: civilization === item.id,
              }))}
            />

            <FilterRow
              label={t("filters.collection")}
              allLabel={t("all")}
              allHref={buildHref({ collection: "" })}
              allActive={!collection}
              options={collections.map((item) => ({
                key: item.id,
                label: item.title ?? item.handle,
                href: buildHref({ collection: item.handle }),
                active: collection === item.handle || collection === item.id,
              }))}
            />
          </div>

          {hasAnyFilter && (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-primary text-[11px] uppercase tracking-[0.12em] text-sand/45">
                {t("currentFilters")}
              </span>
              {q && (
                <ActiveFilter
                  label={t("searchResults", { q })}
                  href={buildHref({ q: "" })}
                />
              )}
              {selectedCivilization && (
                <ActiveFilter
                  label={selectedCivilization.name}
                  href={buildHref({ civilization: "" })}
                />
              )}
              {selectedCollection && (
                <ActiveFilter
                  label={selectedCollection.title ?? selectedCollection.handle}
                  href={buildHref({ collection: "" })}
                />
              )}
              {selectedType && (
                <ActiveFilter
                  label={isArabic ? selectedType.labelAr : selectedType.labelEn}
                  href={buildHref({ product_type: "" })}
                />
              )}
              <Link
                href={buildHref({
                  q: "",
                  civilization: "",
                  collection: "",
                  product_type: "",
                })}
                className="inline-flex min-h-11 items-center font-primary text-small text-gold underline-offset-4 transition-colors hover:text-sand hover:underline"
              >
                {t("clearAll")}
              </Link>
            </div>
          )}

          <p className="mt-6 flex flex-wrap items-center justify-between gap-3 font-primary text-[12px] text-sand/60">
            <span>
              {count > 0
                ? t("results", {
                    start: rangeStart,
                    end: rangeEnd,
                    total: count,
                  })
                : t("noResults")}
            </span>
            {totalPages > 1 && (
              <span>{t("page", { current: currentPage, total: totalPages })}</span>
            )}
          </p>

          {products.length === 0 ? (
            <div className="mt-8 rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)] px-6 py-14 text-center md:px-12">
              <h3 className="font-primary text-h3 font-bold text-sand">
                {error ? t("errorTitle") : t("noResultsTitle")}
              </h3>
              <p className="mx-auto mt-3 max-w-[38ch] font-primary text-small leading-[1.7] text-sand/60">
                {error ? t("errorHint") : t("noResultsHint")}
              </p>
              {hasAnyFilter && (
                <Link
                  href="/products#catalogue"
                  className="mt-7 inline-flex h-12 items-center justify-center rounded-[var(--store-radius-sm)] bg-gold px-6 font-primary text-sm font-bold text-royal-navy transition-colors duration-300 hover:bg-sand"
                >
                  {t("viewAll")}
                </Link>
              )}
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

          {totalPages > 1 && (
            <nav
              aria-label={t("breadcrumb")}
              className="mt-14 flex items-center justify-center gap-3"
            >
              {hasPrev ? (
                <Link
                  href={buildHref({ offset: String(offset - STORE_PAGE_SIZE) })}
                  className="flex h-11 items-center rounded-[var(--store-radius-pill)] border border-sand/15 px-5 font-primary text-sm text-sand/70 transition-colors duration-200 hover:border-gold/50 hover:text-gold"
                >
                  {t("prev")}
                </Link>
              ) : (
                <span className="flex h-11 items-center rounded-[var(--store-radius-pill)] border border-sand/10 px-5 font-primary text-sm text-sand/25">
                  {t("prev")}
                </span>
              )}

              <span className="font-primary text-small text-sand/60">
                {currentPage} / {totalPages}
              </span>

              {hasNext ? (
                <Link
                  href={buildHref({ offset: String(offset + STORE_PAGE_SIZE) })}
                  className="flex h-11 items-center rounded-[var(--store-radius-pill)] border border-sand/15 px-5 font-primary text-sm text-sand/70 transition-colors duration-200 hover:border-gold/50 hover:text-gold"
                >
                  {t("next")}
                </Link>
              ) : (
                <span className="flex h-11 items-center rounded-[var(--store-radius-pill)] border border-sand/10 px-5 font-primary text-sm text-sand/25">
                  {t("next")}
                </span>
              )}
            </nav>
          )}
        </div>
      </section>

      <NewsletterPanel />

      <TrustRow />
    </main>
  )
}

function TypeTab({
  href,
  active,
  count,
  children,
}: {
  href: string
  active: boolean
  count?: number
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`flex h-11 shrink-0 items-center gap-2 rounded-[var(--store-radius-pill)] border px-4 font-primary text-[13px] transition-colors duration-200 ${
        active
          ? "border-gold bg-gold text-royal-navy"
          : "border-sand/15 text-sand/70 hover:border-sand/35 hover:text-sand"
      }`}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span
          className={`font-secondary text-[11px] ${
            active ? "text-royal-navy/60" : "text-sand/40"
          }`}
        >
          {count}
        </span>
      )}
    </Link>
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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="font-primary text-[11px] uppercase tracking-[0.12em] text-sand/45">
        {label}
      </span>

      <FilterLink href={allHref} active={allActive}>
        {allLabel}
      </FilterLink>

      {options.map((option) => (
        <FilterLink key={option.key} href={option.href} active={option.active}>
          {option.label}
        </FilterLink>
      ))}
    </div>
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
      aria-current={active ? "true" : undefined}
      className={`inline-flex min-h-11 items-center font-primary text-[13px] transition-colors duration-200 ${
        active ? "text-gold" : "text-sand/60 hover:text-gold"
      }`}
    >
      {children}
    </Link>
  )
}

function ActiveFilter({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--store-radius-pill)] border border-gold/30 bg-gold/10 px-3 font-primary text-[12px] text-gold transition-colors duration-200 hover:border-gold/60 hover:text-sand"
    >
      {label}
      <span aria-hidden="true">×</span>
    </Link>
  )
}
