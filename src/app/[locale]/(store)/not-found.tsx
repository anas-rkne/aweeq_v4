import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"

export default async function StoreNotFound() {
  const t = await getTranslations("Common")

  return (
    <div className="flex min-h-[70svh] flex-col items-center justify-center px-5 py-16 md:px-10">
      <div className="w-full max-w-[34rem]">
        <h1 className="font-primary text-h2 leading-[1.2] text-gold">
          {t("pageNotFound")}
        </h1>

        {/* the missing entry: a blank line in the register */}
        <div className="mt-8 rounded-[var(--store-radius)] bg-sand px-6 py-10 md:px-10 md:py-12">
          <p className="border-b border-royal-navy/15 pb-6 font-primary text-body leading-[1.7] text-royal-navy/80">
            {t("pageNotFoundHint")}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/products#catalogue"
              className="flex h-12 items-center justify-center rounded-[var(--store-radius-sm)] bg-royal-navy px-8 font-primary text-sm font-bold text-sand transition-colors duration-300 hover:bg-navy-800"
            >
              {t("backToStore")}
            </Link>
            <Link
              href="/"
              className="flex min-h-11 items-center px-3 font-primary text-small text-royal-navy/70 transition-colors hover:text-royal-navy"
            >
              {t("home")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
