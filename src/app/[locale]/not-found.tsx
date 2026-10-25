import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"

export default async function LocaleNotFound() {
  const t = await getTranslations("Common")

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-royal-navy px-6 py-24 text-center">
      <span className="mb-5 font-primary text-3xl text-gold/25">3WEEQ</span>
      <p className="font-secondary text-xs tracking-[0.3em] text-gold/55">
        404
      </p>
      <h1 className="mt-4 font-primary text-3xl text-sand/80">
        {t("pageNotFound")}
      </h1>
      <p className="mt-3 max-w-md font-primary text-sm leading-relaxed text-sand/45">
        {t("pageNotFoundHint")}
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="border border-gold/40 px-6 py-3 font-primary text-sm text-gold transition-colors hover:bg-gold/10"
        >
          {t("home")}
        </Link>
        <Link
          href="/products"
          className="border border-sand/15 px-6 py-3 font-primary text-sm text-sand/60 transition-colors hover:border-sand/35 hover:text-sand"
        >
          {t("backToStore")}
        </Link>
      </div>
    </main>
  )
}
