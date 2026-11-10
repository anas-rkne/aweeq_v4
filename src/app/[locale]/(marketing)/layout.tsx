import { SiteHeader } from "@/app/components/site-header"
import { SmoothScroll } from "@/app/components/smooth-scroll"
import { CartProvider } from "@/app/components/store/cart-provider"
import { CartDrawer } from "@/app/components/store/cart-drawer"
import { Preloader } from "@/app/components/preloader"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CartProvider>
      <Preloader />
      <SiteHeader />
      <SmoothScroll>{children}</SmoothScroll>
      <CartDrawer />
    </CartProvider>
  )
}
