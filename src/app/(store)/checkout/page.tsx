import Link from "next/link"

export const metadata = {
  title: "إتمام الطلب | 3WEEQ",
  description: "إتمام عملية الشراء وإدخال تفاصيل الشحن والدفع الآمن.",
}

export default function CheckoutPage() {
  return (
    <main
      className="min-h-screen bg-[#0a1628] px-5 py-12 md:px-10 lg:px-16"
      dir="rtl"
    >
      <div className="mx-auto max-w-3xl">
        <nav
          aria-label="مسار التنقل"
          className="mb-8 flex items-center gap-2 font-primary text-xs text-sand/40"
        >
          <Link href="/cart" className="transition-colors hover:text-gold">
            السلة
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-sand/65">إتمام الطلب</span>
        </nav>

        <h1 className="font-primary text-3xl text-gold md:text-4xl">
          إتمام الطلب
        </h1>
        <p className="mt-3 font-primary text-sm text-sand/60">
          نظام إتمام الطلب الآمن مدعوم بـ Stripe — قريباً.
        </p>

        <div className="mt-10 border border-sand/15 bg-[#050d18] p-8 text-center">
          <p className="font-primary text-base text-sand/80">
            بوابة الدفع والشحن قيد التفعيل النهائي.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-block border border-gold px-6 py-3 font-primary text-sm font-bold text-gold transition-colors hover:bg-gold hover:text-royal-navy"
          >
            العودة للمتجر
          </Link>
        </div>
      </div>
    </main>
  )
}
