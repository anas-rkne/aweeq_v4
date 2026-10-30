import { StoreHeader } from "@/app/components/store/store-header"
import { StoreAnnouncementBar } from "@/app/components/store/store-announcement-bar"
import { StoreFooter } from "@/app/components/store/store-footer"
import { CartProvider } from "@/app/components/store/cart-provider"
import { CartDrawer } from "@/app/components/store/cart-drawer"
import { CuneiformWall } from "@/components/cuneiform-wall"
import { SmoothScroll } from "@/components/smooth-scroll"

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CartProvider>
      <SmoothScroll>
        <div className="flex min-h-svh flex-col text-sand">
          <StoreAnnouncementBar />
          {/* only the first row sticks; the announcement and the category row
              scroll away, so no page needs to pad for a fixed header */}
          <StoreHeader />
          {/* the shared wall sits at the root z-0, behind the content and the
              footer exactly as on the marketing page (a fixed, opaque canvas
              the sections are painted over) */}
          <CuneiformWall />
          <div className="relative flex-1">{children}</div>
          <StoreFooter />
        </div>
      </SmoothScroll>
      <CartDrawer />
    </CartProvider>
  )
}
