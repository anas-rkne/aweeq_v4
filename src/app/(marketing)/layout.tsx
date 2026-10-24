import { SiteHeader } from "@/app/components/site-header"
import { SmoothScroll } from "@/app/components/smooth-scroll"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <SiteHeader />
      <SmoothScroll>{children}</SmoothScroll>
    </>
  )
}
