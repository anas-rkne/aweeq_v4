import { setRequestLocale } from "next-intl/server"
import { BeyondSection } from "@/components/beyond-section"
import { CivilizationsSection } from "@/components/civilizations-section"
import { CuneiformWall } from "@/components/cuneiform-wall"
import { FeaturedFragrance } from "@/components/featured-fragrance"
import { FirstChapter } from "@/components/first-chapter"
import { Footer } from "@/components/footer"
import { Hero } from "@/components/hero"
import { NewsletterSection } from "@/components/newsletter-section"
import { PackagingSection } from "@/components/packaging-section"
import { ScrollReveal } from "@/components/scroll-reveal"
import { StoreInvitation } from "@/components/store-invitation"

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <main className="flex min-h-svh flex-1 flex-col">
      {/* the shared ground: one fixed wall of impressed cuneiform behind the
          quiet sections. it is out of the flow, so it costs the page no height
          and the sections above it decide where it is seen. */}
      <CuneiformWall />
      {/* one reveal for the whole page: every headline, paragraph, figure,
          link and card fades up as it reaches the screen */}
      <ScrollReveal />
      <Hero />
      <StoreInvitation />
      <FirstChapter />
      {/* a plain block wrapper: a sticky stage needs a flow parent that is not
          a flex container, or its own height would come from the flex line */}
      <div className="relative">
        <FeaturedFragrance frameCount={101} />
      </div>
      <PackagingSection />
      {/* same wrapper for the film below: block parent, sticky stage */}
      <div className="relative">
        <CivilizationsSection />
      </div>
      <BeyondSection locale={locale} />
      <NewsletterSection />
      <Footer />
    </main>
  )
}
