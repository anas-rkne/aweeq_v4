import Image from "next/image"
import Link from "next/link"
import { getCollections } from "@/lib/api"
import { normalizeImageUrl } from "@/lib/format"

export const metadata = {
  title: "المجموعات | 3WEEQ",
  description:
    "استكشف مجموعات 3WEEQ، كل مجموعة تحكي قصة حضارة من خلال قطع محدودة ومرقّمة.",
}

export default async function CollectionsPage() {
  const collections = await getCollections()

  return (
    <main className="min-h-screen bg-[#0a1628]">
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
            <span className="text-sand/65">المجموعات</span>
          </nav>

          <p className="mb-3 font-secondary text-xs tracking-[0.25em] text-gold/70">
            COLLECTIONS
          </p>
          <h1 className="font-primary text-4xl leading-tight text-gold md:text-5xl lg:text-6xl">
            المجموعات
          </h1>
          <p className="mt-4 max-w-2xl font-primary text-base leading-relaxed text-sand/65 md:text-lg">
            كل مجموعة بوابة إلى حضارة: حكاية، رائحة، وقطع محدودة تحمل رموزها.
          </p>
        </div>
      </section>

      <section className="px-5 pb-20 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          {collections.length === 0 ? (
            <div
              className="flex min-h-72 flex-col items-center justify-center border border-sand/10 bg-[#07111c]/40 px-6 py-16 text-center"
              dir="rtl"
            >
              <span className="mb-5 font-primary text-3xl text-gold/25">
                3WEEQ
              </span>
              <p className="font-primary text-xl text-sand/70">
                لا توجد مجموعات حالياً
              </p>
              <p className="mt-3 max-w-md font-primary text-sm text-sand/40">
                تأكد من تشغيل خادم Medusa ثم أعد تحميل الصفحة.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {collections.map((collection) => {
                const heroUrl = normalizeImageUrl(collection.hero_url)

                return (
                  <Link
                    key={collection.id}
                    href={`/products?collection=${encodeURIComponent(
                      collection.handle
                    )}`}
                    className="group relative aspect-[16/10] overflow-hidden bg-[#0a1420]"
                  >
                    {heroUrl ? (
                      <Image
                        src={heroUrl}
                        alt={collection.title ?? collection.handle}
                        fill
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="font-primary text-3xl text-gold/30">
                          3WEEQ
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/45 to-transparent" />

                    <div className="absolute inset-x-0 bottom-0 p-6 md:p-8" dir="rtl">
                      {collection.civilization_name && (
                        <p className="mb-2 font-secondary text-[11px] tracking-[0.22em] text-gold/70">
                          {collection.civilization_name}
                        </p>
                      )}
                      <h2 className="font-primary text-2xl text-gold md:text-3xl">
                        {collection.title ?? collection.handle}
                      </h2>
                      {collection.subtitle && (
                        <p className="mt-2 font-primary text-sm text-sand/70">
                          {collection.subtitle}
                        </p>
                      )}
                      <p className="mt-5 inline-flex items-center gap-2 font-primary text-sm text-sand/60 transition-colors duration-300 group-hover:text-gold">
                        {collection.product_count} قطعة
                        <span aria-hidden="true">←</span>
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
