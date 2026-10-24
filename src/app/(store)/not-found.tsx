import Link from "next/link"

export default function StoreNotFound() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center"
      dir="rtl"
    >
      <span className="mb-5 font-primary text-3xl text-gold/25">3WEEQ</span>
      <p className="font-secondary text-xs tracking-[0.3em] text-gold/55">
        404
      </p>
      <h1 className="mt-4 font-primary text-3xl text-sand/80">
        الصفحة غير موجودة
      </h1>
      <p className="mt-3 max-w-md font-primary text-sm leading-relaxed text-sand/45">
        ربما انتقلت هذه القطعة أو لم تعد متاحة ضمن المجموعة الحالية.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/products"
          className="border border-gold/40 px-6 py-3 font-primary text-sm text-gold transition-colors hover:bg-gold/10"
        >
          العودة للمتجر
        </Link>
        <Link
          href="/"
          className="border border-sand/15 px-6 py-3 font-primary text-sm text-sand/60 transition-colors hover:border-sand/35 hover:text-sand"
        >
          الرئيسية
        </Link>
      </div>
    </div>
  )
}
