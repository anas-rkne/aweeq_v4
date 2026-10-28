import { getTranslations } from "next-intl/server"
import { SectionFade } from "@/shared/ui/section-fade"
import { TiltedGridHero } from "@/shared/ui/tilted-grid-hero"

const CATEGORIES = [
  { id: "perfumes", image: "/images/beyond/11.webp" },
  { id: "incense", image: "/images/beyond/22.webp" },
  { id: "smokers", image: "/images/beyond/33.webp" },
  { id: "textiles", image: "/images/beyond/44.webp" },
  { id: "leather", image: "/images/beyond/55.webp" },
  { id: "curated", image: "/images/beyond/66.webp" },
] as const

export async function BeyondSection({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Beyond" })

  const images = CATEGORIES.map((category) => ({
    src: category.image,
    alt: t(`items.${category.id}`),
  }))

  return (
    <section
      id="beyond"
      data-cuneiform-surface
      className="relative isolate h-svh overflow-hidden"
    >
      {/* the fog the film leaves behind */}
      <SectionFade edge="top" zIndex={15} />

      {/* the curved row of the six rooms */}
      <TiltedGridHero
        images={images}
        aspectRatio={1376 / 768}
        tileHeight={30}
        gap={6}
        axis={57}
        curve={80}
        fade={14}
        speed={5}
        reactive
        className="absolute inset-0 z-10"
      >
        {/* the title, above the band */}
        <div className="pointer-events-none absolute inset-x-0 top-[12%] z-10 flex justify-center px-6 text-center">
          <h2 className="font-primary text-[clamp(1.75rem,3.4vw,3rem)] leading-[1.25] text-gold">
            {t("title")}
          </h2>
        </div>
      </TiltedGridHero>
    </section>
  )
}
