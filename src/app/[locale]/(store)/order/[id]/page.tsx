import type { Metadata } from "next"
import { OrderConfirmation } from "@/features/checkout/order-confirmation"

export const metadata: Metadata = {
  title: "تأكيد الطلب | 3WEEQ",
  robots: { index: false, follow: false },
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { id } = await params
  return <OrderConfirmation orderId={id} />
}
