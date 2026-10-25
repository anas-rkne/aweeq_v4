import { SiteHeader } from "@/app/components/site-header"
import { SmoothScroll } from "@/app/components/smooth-scroll"
import { CartProvider } from "@/app/components/store/cart-provider"
import { CartDrawer } from "@/app/components/store/cart-drawer"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CartProvider>
      <SiteHeader />
      <SmoothScroll>{children}</SmoothScroll>
      <CartDrawer />
    </CartProvider>
  )
}
