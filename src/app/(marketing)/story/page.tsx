import { AboutSection as StoryExperience } from "@/components/about/about-section"
import { Footer } from "@/components/footer"

export const metadata = {
  title: "قصتنا | 3WEEQ",
  description:
    "رحلة 3WEEQ بين خمس حضارات — الخليج وبابل ومصر واليونان والصين — في مشاهد سينمائية متتابعة.",
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
