import Link from "next/link"
import { redirect } from "next/navigation"
import { ProductCard } from "@/components/store/product-card"
import {
  asPositiveInt,
  asString,
  STORE_PAGE_SIZE,
  STORE_PRODUCT_TYPES,
} from "@/lib/catalog"
import { getCivilizations, getCollections, getProducts } from "@/lib/api"

export const metadata = {
  title: "المتجر | 3WEEQ",
  description:
    "اكتشف مجموعة 3WEEQ من العطور والقطع المحدودة المستوحاة من الحضارات القديمة.",
}

type ProductsSearchParams = {
  q?: string | string[]
  civilization?: string | string[]
  collection?: string | string[]
  product_type?: string | string[]
  offset?: string | string[]
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<ProductsSearchParams>
}) {
  const params = await searchParams
  const q = asString(params.q).trim()
  const civilization = asString(params.civilization).trim()
  const collection = asString(params.collection).trim()
  const productType = asString(params.product_type).trim()
  const offset = asPositiveInt(params.offset)

  const [{ products, count, error }, civilizations, collections] =
    await Promise.all([
      getProducts({
        q: q || undefined,
        civilization: civilization || undefined,
        collection: collection || undefined,
        product_type: productType || undefined,
        limit: STORE_PAGE_SIZE,
        offset,
      }),
      getCivilizations(),
      getCollections(),
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
    redirect(buildHref({ offset: lastOffset > 0 ? String(lastOffset) : "" }))
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
        <div className="mx-auto max-w-7xl" dir="rtl">
          <nav
            aria-label="مسار التنقل"
            className="mb-8 flex items-center gap-2 font-primary text-xs text-sand/40"
          >
            <Link href="/" className="transition-colors hover:text-gold">
              الرئيسية
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-sand/65">المتجر</span>
          </nav>

          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="mb-3 font-secondary text-xs tracking-[0.25em] text-gold/70">
                3WEEQ COLLECTION
              </p>
              <h1 className="font-primary text-4xl leading-tight text-gold md:text-5xl lg:text-6xl">
                المتجر
              </h1>
              <p className="mt-4 max-w-2xl font-primary text-base leading-relaxed text-sand/65 md:text-lg">
                قطع محدودة ومرقّمة، مستوحاة من حضارات تحمل حكايات لا تُنسى.
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
                ابحث في المتجر
              </label>
              <input
                id="store-search"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="ابحث عن عطر أو قطعة..."
                className="min-w-0 flex-1 bg-transparent px-4 py-3 font-primary text-sm text-sand placeholder:text-sand/35 focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-gold/50"
              />
              <button
                type="submit"
                className="shrink-0 bg-gold px-5 font-primary text-sm font-bold text-royal-navy transition-colors hover:bg-sand"
              >
                بحث
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="border-y border-sand/10 px-5 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl py-5" dir="rtl">
          <div className="space-y-4">
            <FilterRow
              label="الحضارة"
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
              label="المجموعة"
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
              label="النوع"
              allHref={buildHref({ product_type: "", offset: "" })}
              allActive={!productType}
              options={STORE_PRODUCT_TYPES.map((item) => ({
                key: item.code,
                label: item.label,
                href: buildHref({ product_type: item.code, offset: "" }),
                active: productType === item.code,
              }))}
            />
          </div>

          {hasAnyFilter && (
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-sand/10 pt-5">
              <span className="font-primary text-xs text-sand/40">
                التصفية الحالية:
              </span>
              {q && (
                <ActiveFilter
                  label={`بحث: ${q}`}
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
                  label={selectedType.label}
                  href={buildHref({ product_type: "", offset: "" })}
                />
              )}
              <Link
                href="/products"
                className="ms-1 font-primary text-xs text-gold/70 underline-offset-4 transition-colors hover:text-gold hover:underline"
              >
                مسح الكل
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="px-5 py-10 md:px-10 md:py-14 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div
            className="mb-8 flex items-center justify-between gap-4"
            dir="rtl"
          >
            <p className="font-primary text-sm text-sand/45">
              {count > 0
                ? `عرض ${rangeStart}–${rangeEnd} من ${count} قطعة`
                : "لا توجد نتائج"}
            </p>
            {totalPages > 1 && (
              <p className="font-primary text-xs text-sand/35">
                صفحة {currentPage} من {totalPages}
              </p>
            )}
          </div>

          {products.length === 0 ? (
            <div
              className="flex min-h-72 flex-col items-center justify-center border border-sand/10 bg-navy-900/40 px-6 py-16 text-center"
              dir="rtl"
            >
              <span className="mb-5 font-primary text-3xl text-gold/25">
                3WEEQ
              </span>
              <p className="font-primary text-xl text-sand/70">
                {error
                  ? "تعذر الاتصال بالمتجر حالياً"
                  : "لا توجد قطع تطابق اختيارك"}
              </p>
              <p className="mt-3 max-w-md font-primary text-sm leading-relaxed text-sand/40">
                {error
                  ? "تأكد من تشغيل خادم Medusa ثم أعد تحميل الصفحة."
                  : "جرّب إزالة بعض عوامل التصفية أو ابحث بكلمة أخرى."}
              </p>
              {hasAnyFilter && (
                <Link
                  href="/products"
                  className="mt-6 border border-gold/40 px-6 py-3 font-primary text-sm text-gold transition-colors hover:bg-gold/10"
                >
                  عرض كل القطع
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
              aria-label="صفحات المتجر"
              className="mt-14 flex items-center justify-center gap-3"
              dir="rtl"
            >
              {hasPrev ? (
                <Link
                  href={buildHref({ offset: String(offset - STORE_PAGE_SIZE) })}
                  className="border border-sand/20 px-5 py-2.5 font-primary text-sm text-sand/70 transition-colors hover:border-gold/50 hover:text-gold"
                >
                  السابق
                </Link>
              ) : (
                <span className="cursor-not-allowed border border-sand/10 px-5 py-2.5 font-primary text-sm text-sand/25">
                  السابق
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
                  التالي
                </Link>
              ) : (
                <span className="cursor-not-allowed border border-sand/10 px-5 py-2.5 font-primary text-sm text-sand/25">
                  التالي
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
  allHref,
  allActive,
  options,
}: {
  label: string
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
        الكل
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
