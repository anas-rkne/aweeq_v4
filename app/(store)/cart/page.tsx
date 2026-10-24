import type { Metadata } from "next"
import { CartPageClient } from "@/components/store/cart-page-client"

export const metadata: Metadata = {
  title: "سلة التسوق | 3WEEQ",
  description: "راجع قطعك المختارة قبل إتمام الطلب من 3WEEQ.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function CartPage() {
  return <CartPageClient />
}
