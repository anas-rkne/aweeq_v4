import { getTranslations } from "next-intl/server"
import { alternates } from "@/lib/seo"
import { AboutSection as StoryExperience } from "@/components/about/about-section"
import { CuneiformWall } from "@/components/cuneiform-wall"
import { Footer } from "@/components/footer"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Story" })

  return {
    title: t("title"),
    description: t("description"),
    alternates: alternates(locale, "/story"),
  }
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Story" })

  return (
    <main className="min-h-svh">
      {/* the shared cuneiform wall, like the homepage: it shows through the
          footer and any gap around the full-screen film, which stays opaque */}
      <CuneiformWall />
      {/* the page's one heading: visually hidden so the cinematic scene titles
          keep the visible hierarchy, but present for assistive tech and SEO */}
      <h1 className="sr-only">{t("heading")}</h1>
      {/* a plain block wrapper: ScrollTrigger will not add pin spacing to a
          pinned element whose parent is a flex container */}
      <div className="relative">
        <StoryExperience />
      </div>
      <Footer />
    </main>
  )
}
