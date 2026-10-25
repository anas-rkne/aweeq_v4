import Image from "next/image"
import { getLocale, getTranslations } from "next-intl/server"
import { TextReveal } from "@/shared/ui/text-reveal"

function PerfumeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-8 w-8"
    >
      <path d="M9.5 8.5h5L16 10v8.5a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10l1.5-1.5Z" />
      <path d="M10.5 8.5v-2h3v2" />
      <path d="M11 3h2v3.5h-2z" />
      <path d="M8 13h8" />
    </svg>
  )
}

function IncenseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-8 w-8"
    >
      <path d="M5.5 14h13l-1.1 3.3a2.5 2.5 0 0 1-2.4 1.7H9a2.5 2.5 0 0 1-2.4-1.7L5.5 14Z" />
      <path d="M8 14c0-2.2 1.8-4 4-4s4 1.8 4 4" />
      <path d="M12 10V8.5" />
      <path d="M12 6.5c1.6-.9 1.6-2.1 0-3" opacity=".7" />
      <path d="M9 6.5c1-.8 1-1.7 0-2.5" opacity=".45" />
      <path d="M15 6.5c1-.8 1-1.7 0-2.5" opacity=".45" />
    </svg>
  )
}

function SmokersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-8 w-8"
    >
      <g transform="rotate(-32 12 12)">
        <rect x="4.5" y="9.5" width="12" height="5" rx="2.5" />
        <path d="M7.5 9.5v5" />
        <path d="M13.5 9.5v5" />
        <path d="M16.5 9.5h1.2a1.8 1.8 0 0 1 1.8 1.8v1.4a1.8 1.8 0 0 1-1.8 1.8h-1.2" />
      </g>
      <path d="M17.5 6.5c1.4-.8 1.4-2 0-2.8" opacity=".55" />
      <path d="M20 8.5c1.2-.7 1.2-1.8 0-2.5" opacity=".35" />
    </svg>
  )
}

function TextilesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-8 w-8"
    >
      <path d="M4 9 12 5l8 4-8 4-8-4Z" />
      <path d="m4 13 8 4 8-4" />
      <path d="m4 17 8 4 8-4" />
    </svg>
  )
}

function LeatherIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-8 w-8"
    >
      <rect x="4.5" y="9" width="15" height="11" rx="1.5" />
      <path d="M8.5 9V7.5a3.5 3.5 0 0 1 7 0V9" />
      <path d="M4.5 12.5h15" />
      <path d="M10.5 12.5v2.5h3v-2.5" />
    </svg>
  )
}

function CuratedIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-8 w-8"
    >
      <path d="M9.5 3.5h5" />
      <path d="M10.5 3.5v2.4c0 1.9-1.9 2.8-1.9 5.5 0 4.2 1.3 7.2 3.4 8.6 2.1-1.4 3.4-4.4 3.4-8.6 0-2.7-1.9-3.6-1.9-5.5V3.5" />
      <path d="M8.4 10.2c1.1.8 2.3 1.1 3.6 1.1s2.5-.3 3.6-1.1" />
      <path d="M9 20.2h6" />
    </svg>
  )
}

const ICON_ITEMS = [
  { id: "perfumes", Icon: PerfumeIcon },
  { id: "incense", Icon: IncenseIcon },
  { id: "smokers", Icon: SmokersIcon },
  { id: "textiles", Icon: TextilesIcon },
  { id: "leather", Icon: LeatherIcon },
  { id: "curated", Icon: CuratedIcon },
] as const

export async function BeyondSection() {
  const t = await getTranslations("Beyond")
  const locale = await getLocale()
  const isArabic = locale === "ar"
  return (
    <section
      id="beyond"
      className="relative isolate min-h-screen overflow-hidden bg-royal-navy md:h-screen"
    >
      {/* receives the midnight of Civilizations without a seam */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-20 h-32 w-full md:h-64"
        style={{
          background:
            "linear-gradient(to bottom, var(--color-royal-navy) 0%, transparent 100%)",
        }}
      />

      <Image
        src="/images/beyond/beyound_bg.webp"
        alt={t("imageAlt")}
        fill
        quality={90}
        sizes="100vw"
        className="object-cover object-center"
      />

      {/* the dark room over the photograph, so the words keep their edge */}
      <div aria-hidden="true" className="absolute inset-0 bg-royal-navy/60" />

      {/* hands the room to the Journal without a seam */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-32 md:h-64"
        style={{
          background:
            "linear-gradient(to top, var(--color-royal-navy) 0%, transparent 100%)",
        }}
      />

      {/* words and icons, on the right side of the room */}
      <div
        className={`relative z-10 flex min-h-screen flex-col items-center justify-center px-8 py-16 text-center md:h-screen md:px-16 md:py-12 md:text-start lg:px-24 ${
          isArabic ? "md:items-start" : "md:items-end"
        }`}
      >
        <h2 className="max-w-2xl font-primary text-4xl leading-[1.2] text-gold md:text-5xl lg:text-6xl">
          <TextReveal preset="words" blur>
            {t("title")}
          </TextReveal>
        </h2>

        <p className="mt-6 max-w-xl font-primary text-base leading-[1.9] text-sand/80 md:text-lg">
          <TextReveal preset="block">{t("body")}</TextReveal>
        </p>

        <div className="mt-12 grid w-full max-w-md grid-cols-3 gap-8">
          {ICON_ITEMS.map(({ id, Icon }) => (
            <div
              key={id}
              className="group flex flex-col items-center gap-2.5 text-center"
            >
              <span className="text-gold transition-colors duration-300 group-hover:text-sand">
                <Icon />
              </span>
              <span className="font-primary text-xs leading-tight text-sand/80 md:text-sm">
                {t(`items.${id}`)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
