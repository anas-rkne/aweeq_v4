import { getTranslations } from "next-intl/server"
import { SectionFade } from "@/shared/ui/section-fade"
import { ScrollGallery, type GalleryItem } from "@/components/scroll-gallery"

const CATEGORIES = [
  { id: "perfumes", image: "/images/beyond/11.webp" },
  { id: "incense", image: "/images/beyond/22.webp" },
  { id: "smokers", image: "/images/beyond/33.webp" },
  { id: "textiles", image: "/images/beyond/44.webp" },
] as const

export async function BeyondSection({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Beyond" })

  const items: GalleryItem[] = CATEGORIES.map((category) => ({
    image: category.image,
    title: t(`items.${category.id}`),
    description: t(`descriptions.${category.id}`),
  }))

  return (
    <section id="beyond" data-cuneiform-surface className="relative isolate">
      <SectionFade edge="top" zIndex={15} />

      <ScrollGallery
        title={t("title")}
        description={t("body")}
        items={items}
      />
    </section>
  )
}

export default BeyondSection
