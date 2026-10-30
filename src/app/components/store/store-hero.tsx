import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"

const FACTS = ["editions", "numbering", "shipping"] as const

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
    >
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  )
}

/* The store's cover: the register's title, the house line, one door into the
   catalogue and one into the collections, over a single product photograph. */
export async function StoreHero() {
  const t = await getTranslations("Store")

  return (
    <section className="px-5 pt-5 md:px-10 md:pt-8 lg:px-16">
      <div className="mx-auto max-w-[84rem]">
        <div
          data-cuneiform-surface
          className="relative overflow-hidden rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)]"
        >
          <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:p-12">
            <div>
              <h1 className="font-primary text-display leading-[1.08] text-gold">
                {t("registerTitle")}
              </h1>

              <p className="mt-4 max-w-[42ch] font-primary text-body leading-[1.8] text-sand/70">
                {t("shopNote")}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/products#catalogue"
                  className="inline-flex h-12 items-center gap-2 rounded-[var(--store-radius-sm)] bg-gold px-6 font-primary text-sm font-bold text-royal-navy transition-colors duration-300 hover:bg-sand"
                >
                  {t("heroCta")}
                  <span aria-hidden="true" className="text-base leading-none">
                    ←
                  </span>
                </Link>

                <Link
                  href="/collections"
                  className="inline-flex h-12 items-center rounded-[var(--store-radius-sm)] border border-sand/20 px-5 font-primary text-sm text-sand transition-colors duration-300 hover:border-sand/40 hover:text-gold"
                >
                  {t("collections")}
                </Link>
              </div>

              <dl className="mt-8 grid gap-3 border-t border-sand/10 pt-5 sm:grid-cols-3">
                {FACTS.map((key) => (
                  <div key={key} className="flex items-start gap-2">
                    <span className="mt-0.5 text-gold/80">
                      <CheckIcon />
                    </span>
                    <div>
                      <dt className="font-primary text-small text-sand">
                        {t(`facts.${key}.value`)}
                      </dt>
                      <dd className="mt-0.5 font-primary text-[11px] leading-5 text-sand/55">
                        {t(`facts.${key}.label`)}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--store-radius-sm)] bg-[var(--store-well)] sm:aspect-[16/10] lg:aspect-square">
                <Image
                  src="/images/packaging_images/5.webp"
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 64rem) 42rem, 100vw"
                  className="object-cover"
                />
              </div>

              <div className="absolute end-0 top-4 rounded-s-[var(--store-radius-sm)] bg-gold px-4 py-2.5 text-center">
                <p className="font-primary text-[10px] leading-none text-royal-navy/75">
                  {t("facts.numbering.value")}
                </p>
                <p className="mt-1 font-primary text-sm font-bold leading-none text-royal-navy">
                  {t("limited")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
