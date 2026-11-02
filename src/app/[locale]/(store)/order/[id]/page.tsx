import type { Metadata } from "next"
import { alternates } from "@/lib/seo"
import { OrderConfirmation } from "@/features/checkout/order-confirmation"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}): Promise<Metadata> {
  const { locale, id } = await params
  return {
    title: "تأكيد الطلب | 3WEEQ",
    alternates: alternates(locale, `/order/${id}`),
    robots: { index: false, follow: false },
  }
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { id } = await params
  return <OrderConfirmation orderId={id} />
}
