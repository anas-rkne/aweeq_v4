"use client"

import { useTranslations } from "next-intl"

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations("Common")

  return (
    <div className="flex min-h-[70svh] flex-col items-center justify-center px-5 py-16 md:px-10">
      <div className="w-full max-w-[34rem]">
        <h1 className="font-primary text-h2 leading-[1.2] text-gold">
          {t("unexpectedError")}
        </h1>

        <div className="mt-8 rounded-[var(--store-radius)] bg-sand px-6 py-10 md:px-10 md:py-12">
          <p className="border-b border-royal-navy/15 pb-6 font-primary text-body leading-[1.7] text-royal-navy/80">
            {t("errorHint")}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="flex h-12 items-center justify-center rounded-[var(--store-radius-sm)] bg-royal-navy px-8 font-primary text-sm font-bold text-sand transition-colors duration-300 hover:bg-navy-800"
            >
              {t("retry")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
