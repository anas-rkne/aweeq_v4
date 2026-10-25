import { StoreHeader } from "@/app/components/store/store-header"
import { CartProvider } from "@/app/components/store/cart-provider"
import { CartDrawer } from "@/app/components/store/cart-drawer"

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CartProvider>
      <div className="flex min-h-svh flex-col bg-royal-navy text-sand">
        <StoreHeader />
        <div className="flex-1 pt-32 md:pt-24">{children}</div>
      </div>
      <CartDrawer />
    </CartProvider>
  )
}
