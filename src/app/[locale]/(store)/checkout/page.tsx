import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { CheckoutFlow } from "@/features/checkout/checkout-flow"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Checkout" })

  return {
    title: `${t("title")} | 3WEEQ`,
    description:
      locale === "ar"
        ? "إتمام عملية الشراء وإدخال تفاصيل الشحن والدفع الآمن."
        : "Complete your purchase and enter secure shipping and payment details.",
    robots: { index: false, follow: false },
  }
}

export default function CheckoutPage() {
  return <CheckoutFlow />
}
