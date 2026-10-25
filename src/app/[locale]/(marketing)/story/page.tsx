import { getTranslations } from "next-intl/server"
import { AboutSection as StoryExperience } from "@/components/about/about-section"
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
  }
}

export default function StoryPage() {
  return (
    <main className="min-h-svh bg-royal-navy">
      {/* a plain block wrapper: ScrollTrigger will not add pin spacing to a
          pinned element whose parent is a flex container */}
      <div className="relative">
        <StoryExperience />
      </div>
      <Footer />
    </main>
  )
}
