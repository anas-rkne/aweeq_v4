import { getTranslations } from "next-intl/server"
import { ScrollGallery, type GalleryItem } from "@/components/scroll-gallery"

const CATEGORIES = [
  { id: "perfumes", image: "/images/beyond/11-v3.webp" },
  { id: "incense", image: "/images/beyond/22-v3.webp" },
  { id: "smokers", image: "/images/beyond/33-v2.webp" },
  { id: "textiles", image: "/images/beyond/44-v2.webp" },
] as const

export async function BeyondSection({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Beyond" })

  const items: GalleryItem[] = CATEGORIES.map((category) => ({
    image: category.image,
    title: t(`items.${category.id}`),
    description: t(`descriptions.${category.id}`),
  }))

  return (
    /* the tall shell belongs to the document from the first paint; the sticky
       stage inside ScrollGallery is what holds still while the rooms pass.
       under reduced motion the shell collapses to the stage's own height. */
    <section
      id="beyond"
      data-cuneiform-surface
      className="relative isolate h-[280svh] motion-reduce:h-auto motion-reduce:min-h-svh"
    >
      <ScrollGallery title={t("title")} description={t("body")} items={items} />
    </section>
  )
}

export default BeyondSection
