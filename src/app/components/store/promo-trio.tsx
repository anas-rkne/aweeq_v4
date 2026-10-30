import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"

/* Three cards that carry the eye from the catalogue into the rest of the house.
   Each one is a photograph the client already owns, not a stock illustration. */
export async function PromoTrio() {
  const t = await getTranslations("Store")

  const promos = [
    {
      key: "collections",
      href: "/collections",
      image: "/images/packaging_images/1.webp",
      tint: "bg-gold/[0.07]",
    },
    {
      key: "editions",
      href: "/products#catalogue",
      image: "/images/packaging_images/8.webp",
      tint: "bg-sand/[0.05]",
    },
    {
      key: "story",
      href: "/story",
      image: "/images/packaging_images/11.webp",
      tint: "bg-sky/[0.06]",
    },
  ] as const

  return (
    <section className="px-5 pt-12 md:px-10 lg:px-16">
      <div className="mx-auto grid max-w-[84rem] gap-4 sm:grid-cols-3">
        {promos.map((promo) => (
          <Link
            key={promo.key}
            href={promo.href}
            className={`group flex items-center justify-between gap-4 overflow-hidden rounded-[var(--store-radius)] border border-sand/10 p-5 transition-colors duration-300 hover:border-gold/40 ${promo.tint}`}
          >
            <div className="min-w-0">
              <p className="font-primary text-[11px] leading-none text-gold">
                {t(`promos.${promo.key}.eyebrow`)}
              </p>
              <p className="mt-2 font-primary text-lg font-bold leading-6 text-sand transition-colors duration-300 group-hover:text-gold">
                {t(`promos.${promo.key}.title`)}
              </p>
              <p className="mt-3 inline-flex items-center gap-2 font-primary text-[12px] text-sand/70">
                {t(`promos.${promo.key}.cta`)}
                <span
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover:-translate-x-1"
                >
                  ←
                </span>
              </p>
            </div>

            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[var(--store-radius-sm)] bg-[var(--store-well)]">
              <Image
                src={promo.image}
                alt=""
                fill
                sizes="80px"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
