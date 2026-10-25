import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { CartPageClient } from "@/components/store/cart-page-client"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Cart" })

  return {
    title: `${t("title")} | 3WEEQ`,
    description:
      locale === "ar"
        ? "راجع قطعك المختارة قبل إتمام الطلب من 3WEEQ."
        : "Review your selected pieces before completing your 3WEEQ order.",
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default function CartPage() {
  return <CartPageClient />
}
