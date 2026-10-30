import Image from "next/image"
import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"
import { getCollections } from "@/lib/api"
import { normalizeImageUrl } from "@/lib/format"
import type { CollectionProfile } from "@/types"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Store" })
  return {
    title: `${t("collections")} | 3WEEQ`,
    description:
      locale === "ar"
        ? "استكشف مجموعات 3WEEQ، كل مجموعة تحكي قصة حضارة من خلال قطع محدودة ومرقّمة."
        : "Explore 3WEEQ collections — each one tells the story of a civilization through limited, numbered pieces.",
  }
}

export default async function CollectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Store" })
  const invitationT = await getTranslations({ locale, namespace: "StoreInvitation" })
  const isArabic = locale === "ar"
  const collections = await getCollections(isArabic ? "ar" : "en")

  return (
    <main>
      {/* ===== the register's index ===== */}
      <section
        data-cuneiform-surface
        className="px-5 pb-10 pt-8 md:px-10 md:pt-12 lg:px-16"
      >
        <div className="mx-auto w-full max-w-[84rem]">
          <h1 className="font-primary text-display leading-[1.12] text-gold">
            {t("collections")}
          </h1>
          <p className="mt-5 max-w-[46ch] font-primary text-body leading-[1.7] text-sand/70">
            {t("collectionsIntro")}
          </p>
        </div>
      </section>

      {/* ===== the collections as spreads ===== */}
      {collections.length === 0 ? (
        <section className="px-5 pb-20 md:px-10 lg:px-16">
          <div className="mx-auto max-w-[84rem] rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)] px-6 py-16 text-center">
            <h2 className="font-primary text-h3 font-bold text-sand">
              {t("noCollections")}
            </h2>
            <p className="mx-auto mt-3 max-w-[38ch] font-primary text-small leading-[1.7] text-sand/60">
              {t("noCollectionsHint")}
            </p>
          </div>
        </section>
      ) : (
        <section className="space-y-14 px-5 pb-20 md:px-10 lg:space-y-20 lg:px-16">
          {collections.map((collection, index) => (
            <CollectionSpread
              key={collection.id}
              collection={collection}
              reversed={index % 2 === 1}
              piecesLabel={t("pieces", { count: collection.product_count })}
              viewAllLabel={t("viewAll")}
            />
          ))}
        </section>
      )}

      {/* ===== the house note ===== */}
      <section className="px-5 pb-16 md:px-10 lg:px-16">
        <div className="mx-auto max-w-[84rem] rounded-[var(--store-radius)] border border-gold/20 bg-gold/[0.06] p-6 md:p-10">
          <p className="max-w-[60ch] font-primary text-body leading-[1.7] text-sand/70">
            {invitationT("body")}
          </p>
          <p className="mt-6 font-primary text-h3 text-gold">3WEEQ</p>
          <Link
            href="/story"
            className="-mx-2.5 mt-3 inline-flex min-h-11 items-center px-2.5 font-primary text-small text-gold underline-offset-4 transition-colors hover:text-sand hover:underline"
          >
            {t("story")}
          </Link>
        </div>
      </section>
    </main>
  )
}

function CollectionSpread({
  collection,
  reversed,
  piecesLabel,
  viewAllLabel,
}: {
  collection: CollectionProfile
  reversed: boolean
  piecesLabel: string
  viewAllLabel: string
}) {
  const heroUrl = normalizeImageUrl(collection.hero_url)
  const title = collection.title ?? collection.handle
  const body = collection.description ?? collection.subtitle

  return (
    <article className="grid grid-cols-1 gap-8 lg:grid-cols-[5fr_7fr] lg:items-center lg:gap-12">
      {/* the plate */}
      <div className={reversed ? "lg:order-2" : undefined}>
        <div className="rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)] p-2">
          <div className="relative aspect-square overflow-hidden rounded-[calc(var(--store-radius)-0.25rem)] bg-[var(--store-well)]">
            {heroUrl ? (
              <Image
                src={heroUrl}
                alt={collection.hero_alt_ar ?? title}
                fill
                className="object-cover"
                sizes="(min-width: 64rem) 42vw, 100vw"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="font-primary text-3xl text-royal-navy/30">
                  3WEEQ
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* the words */}
      <div className={reversed ? "lg:order-1" : undefined}>
        {collection.civilization_name && (
          <p className="font-primary text-[11px] uppercase tracking-[0.14em] text-gold">
            {collection.civilization_name}
          </p>
        )}
        <h2 className="mt-3 font-primary text-h2 leading-[1.2] text-sand">
          {title}
        </h2>
        {body && (
          <p className="mt-4 max-w-xl font-primary text-body leading-[1.7] text-sand/70">
            {body}
          </p>
        )}
        <div className="mt-7 flex flex-wrap items-center gap-5">
          <Link
            href={`/products?collection=${encodeURIComponent(
              collection.handle
            )}#catalogue`}
            className="flex h-12 items-center justify-center rounded-[var(--store-radius-sm)] bg-gold px-6 font-primary text-sm font-bold text-royal-navy transition-colors duration-300 hover:bg-sand"
          >
            {viewAllLabel}
          </Link>
          <span className="font-primary text-small text-sand/60">
            {piecesLabel}
          </span>
        </div>
      </div>
    </article>
  )
}
