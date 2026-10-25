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
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <span className="mb-5 font-primary text-3xl text-gold/25">3WEEQ</span>
      <h1 className="font-primary text-2xl text-sand/80">
        {t("unexpectedError")}
      </h1>
      <p className="mt-3 max-w-md font-primary text-sm leading-relaxed text-sand/45">
        {t("errorHint")}
      </p>
      {error.digest && (
        <p className="mt-2 font-secondary text-[10px] text-sand/25">
          {error.digest}
        </p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-6 border border-gold/40 px-6 py-3 font-primary text-sm text-gold transition-colors hover:bg-gold/10"
      >
        {t("retry")}
      </button>
    </div>
  )
}
