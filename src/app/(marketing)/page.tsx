import { AboutSection } from "@/components/about-section"
import { BeyondSection } from "@/components/beyond-section"
import { CivilizationsSection } from "@/components/civilizations-section"
import { FeaturedFragrance } from "@/components/featured-fragrance"
import { FirstChapter } from "@/components/first-chapter"
import { Footer } from "@/components/footer"
import { Hero } from "@/components/hero"
import { JournalSection } from "@/components/journal-section"
import { NewsletterSection } from "@/components/newsletter-section"
import { PackagingSection } from "@/components/packaging-section"
import { PortalTransition } from "@/components/portal-transition"
import { ScrollOver } from "@/components/scroll-over"

export default function Home() {
  return (
    <main className="flex min-h-svh flex-1 flex-col">
      <ScrollOver hero={<Hero />} about={<AboutSection />} />
      {/* the golden door — it stands between the two chapters */}
      <PortalTransition />
      <FirstChapter />
      {/* a plain block wrapper: ScrollTrigger will not add pin spacing to a
          pinned element whose parent is a flex container */}
      <div className="relative">
        <FeaturedFragrance frameCount={101} />
      </div>
      <PackagingSection />
      {/* a plain block wrapper for the pinned canvas section, same reason as
          the film above */}
      <div className="relative">
        <CivilizationsSection />
      </div>
      <BeyondSection />
      <JournalSection />
      <NewsletterSection />
      <Footer />
    </main>
  )
}
