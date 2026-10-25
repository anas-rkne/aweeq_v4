import Image from "next/image"
import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"
import { JOURNAL_POSTS } from "@/components/journal-posts"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  return {
    title: `${locale === "ar" ? "المجلة" : "Journal"} | 3WEEQ`,
    description:
      locale === "ar"
        ? "قصص الحضارات ورموزها وفن العطر — قراءات من عالم 3WEEQ."
        : "Stories of civilizations, their symbols, and the art of fragrance — readings from the world of 3WEEQ.",
  }
}

export default async function JournalIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Journal" })
  const storeT = await getTranslations({ locale, namespace: "Store" })
  const isArabic = locale === "ar"

  return (
    <main className="min-h-svh bg-royal-navy px-5 pb-24 pt-32 sm:px-8 md:px-16 lg:px-24">
      <div className="mx-auto max-w-[84rem]">
        <nav
          aria-label={storeT("breadcrumb")}
          className="mb-10 flex items-center gap-2 font-primary text-xs text-sand/40"
        >
          <Link href="/" className="transition-colors hover:text-gold">
            {storeT("home")}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-sand/65">{t("title")}</span>
        </nav>

        <div className="flex flex-col gap-4 border-b border-sand/10 pb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-secondary text-xs tracking-[0.28em] text-gold/70">
              STORIES &amp; INSPIRATION
            </p>
            <h1 className="mt-4 font-secondary text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] text-gold">
              {t("title")}
            </h1>
          </div>
          <p className="max-w-md font-primary text-sm leading-7 text-sand/55">
            {t("subtitle")}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3">
          {JOURNAL_POSTS.map((post) => (
            <article key={post.slug} className="group">
              <Link href={`/journal/${post.slug}`} className="block">
                <div className="relative aspect-[4/5] overflow-hidden border border-sand/10 transition-colors duration-500 group-hover:border-gold/50">
                  <Image
                    src={post.image}
                    alt={isArabic ? post.altAr : post.altEn}
                    fill
                    quality={85}
                    sizes="(min-width: 64rem) 30vw, (min-width: 48rem) 45vw, 100vw"
                    className="object-cover object-center transition-transform duration-[900ms] ease-out-expo group-hover:scale-[1.035]"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-royal-navy/75 via-transparent to-transparent"
                  />
                </div>

                <h2 className="mt-5 font-secondary text-xl leading-tight text-sand transition-colors group-hover:text-gold">
                  {isArabic ? post.titleAr : post.titleEn}
                </h2>
                <p className="mt-2 font-primary text-sm text-gold">
                  {isArabic ? post.titleEn : post.titleAr}
                </p>
                <p className="mt-3 line-clamp-3 font-primary text-sm leading-7 text-sand/55">
                  {isArabic ? post.excerptAr : post.excerptEn}
                </p>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
