import {
  Briefcase,
  Droplet,
  Flame,
  Gem,
  Landmark,
  Layers,
  LayoutGrid,
} from "lucide-react"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { STORE_PRODUCT_TYPES } from "@/lib/catalog"

const ICONS = {
  fragrance: Droplet,
  incense: Flame,
  jewelry: Gem,
  textile: Layers,
  leather: Briefcase,
  artifact: Landmark,
} as const

/* The reference's pastel circles, drawn with the house palette instead. */
const TINTS = [
  "bg-gold/10 text-gold",
  "bg-sand/10 text-sand",
  "bg-sky/10 text-sky",
  "bg-olive/10 text-olive",
  "bg-gold/10 text-gold",
  "bg-sand/10 text-sand",
  "bg-sand/[0.06] text-sand/70",
]

export async function CategoryRail({
  activeType,
  counts,
  isArabic,
}: {
  activeType?: string
  counts?: Record<string, number>
  isArabic: boolean
}) {
  const t = await getTranslations("Store")

  const allHref = "/products#catalogue"
  const entries = [
    {
      code: "",
      label: t("all"),
      href: allHref,
      icon: LayoutGrid,
      count: counts
        ? Object.values(counts).reduce((sum, value) => sum + value, 0)
        : undefined,
    },
    ...STORE_PRODUCT_TYPES.map((type) => ({
      code: type.code,
      label: isArabic ? type.labelAr : type.labelEn,
      href: `/products?product_type=${type.code}#catalogue`,
      icon: ICONS[type.code as keyof typeof ICONS] ?? LayoutGrid,
      count: counts?.[type.code],
    })),
  ]

  return (
    <section
      aria-labelledby="store-categories-title"
      className="px-5 pt-10 md:px-10 lg:px-16 lg:pt-14"
    >
      <div className="mx-auto max-w-[84rem]">
        <h2
          id="store-categories-title"
          className="font-primary text-small text-sand/60"
        >
          {t("categoriesTitle")}
        </h2>

        <ul className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4">
          {entries.map((entry, index) => {
            const Icon = entry.icon
            const active = entry.code === (activeType ?? "")

            return (
              <li key={entry.code || "all"} className="shrink-0 snap-start">
                <Link
                  href={entry.href}
                  aria-current={active ? "page" : undefined}
                  className="group flex w-[5.5rem] flex-col items-center gap-2 text-center sm:w-24"
                >
                  <span
                    className={`grid h-16 w-16 place-items-center rounded-full border transition-colors duration-300 ${
                      active
                        ? "border-gold bg-gold/15 text-gold"
                        : `border-transparent ${TINTS[index % TINTS.length]} group-hover:border-sand/20`
                    }`}
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.1} aria-hidden="true" />
                  </span>

                  <span
                    className={`font-primary text-[11px] leading-4 transition-colors duration-300 ${
                      active
                        ? "text-gold"
                        : "text-sand/70 group-hover:text-sand"
                    }`}
                  >
                    {entry.label}
                    {entry.count !== undefined && entry.count > 0 && (
                      <span className="ms-1 font-secondary text-[10px] text-sand/55">
                        {entry.count}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
