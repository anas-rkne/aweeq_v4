import Link from "next/link"
import { getTranslations } from "next-intl/server"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Cart" })
  return {
    title: `${t("title")} | 3WEEQ`,
    description:
      locale === "ar"
        ? "إتمام عملية الشراء وإدخال تفاصيل الشحن والدفع الآمن."
        : "Complete your purchase and enter secure shipping and payment details.",
  }
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Common" })
  const cartT = await getTranslations({ locale, namespace: "Cart" })

  return (
    <main className="min-h-screen bg-royal-navy px-5 py-12 md:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl">
        <nav
          aria-label={cartT("title")}
          className="mb-8 flex items-center gap-2 font-primary text-xs text-sand/40"
        >
          <Link href="/cart" className="transition-colors hover:text-gold">
            {cartT("title")}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-sand/65">
            {locale === "ar" ? "إتمام الطلب" : "Checkout"}
          </span>
        </nav>

        <h1 className="font-primary text-3xl text-gold md:text-4xl">
          {locale === "ar" ? "إتمام الطلب" : "Checkout"}
        </h1>
        <p className="mt-3 font-primary text-sm text-sand/60">
          {locale === "ar"
            ? "نظام إتمام الطلب الآمن مدعوم بـ Stripe — قريباً."
            : "Secure checkout powered by Stripe — coming soon."}
        </p>

        <div className="mt-10 border border-sand/15 bg-navy-950 p-8 text-center">
          <p className="font-primary text-base text-sand/80">
            {locale === "ar"
              ? "بوابة الدفع والشحن قيد التفعيل النهائي."
              : "The payment and shipping gateway is being finalized."}
          </p>
          <Link
            href="/products"
            className="mt-6 inline-block border border-gold px-6 py-3 font-primary text-sm font-bold text-gold transition-colors hover:bg-gold hover:text-royal-navy"
          >
            {t("backToStore")}
          </Link>
        </div>
      </div>
    </main>
  )
}
