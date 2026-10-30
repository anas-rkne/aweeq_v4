"use client"

import { useLocale, useTranslations } from "next-intl"
import { useState, type FormEvent } from "react"

type FormStatus = "idle" | "submitting" | "success" | "error"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/* The closing band of the reference: title, one field, one button. The copy
   lives under `Store.newsletter`; the route is the same the marketing page
   already uses. */
export function NewsletterPanel() {
  const t = useTranslations("Store")
  const locale = useLocale()
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<FormStatus>("idle")
  const [message, setMessage] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const value = email.trim()

    if (!EMAIL_PATTERN.test(value)) {
      setStatus("error")
      setMessage(t("newsletter.invalid"))
      return
    }

    setStatus("submitting")
    setMessage("")

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, locale }),
      })

      if (!response.ok) {
        throw new Error("newsletter_failed")
      }

      setStatus("success")
      setMessage(t("newsletter.success"))
      setEmail("")
    } catch {
      setStatus("error")
      setMessage(t("newsletter.error"))
    }
  }

  const busy = status === "submitting"

  return (
    <section className="px-5 pt-12 md:px-10 lg:px-16">
      <div className="mx-auto max-w-[84rem]">
        <div className="grid gap-8 rounded-[var(--store-radius)] border border-gold/20 bg-gold/[0.06] p-6 md:p-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16 lg:p-12">
          <div>
            <h2 className="font-primary text-h3 font-bold leading-tight text-gold">
              {t("newsletter.title")}
            </h2>
            <p className="mt-3 max-w-[40ch] font-primary text-small leading-[1.7] text-sand/70">
              {t("newsletter.body")}
            </p>
          </div>

          <div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label htmlFor="store-newsletter-email" className="sr-only">
                  {t("newsletter.placeholder")}
                </label>
                <input
                  id="store-newsletter-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (status !== "idle") {
                      setStatus("idle")
                      setMessage("")
                    }
                  }}
                  placeholder={t("newsletter.placeholder")}
                  aria-invalid={status === "error" ? true : undefined}
                  className="h-12 w-full min-w-0 rounded-[var(--store-radius-sm)] border border-sand/20 bg-royal-navy/40 px-4 font-primary text-sm text-sand placeholder:text-sand/40 focus:border-gold focus:outline-none sm:w-auto sm:flex-1"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex h-12 shrink-0 items-center justify-center rounded-[var(--store-radius-sm)] bg-gold px-6 font-primary text-sm font-bold text-royal-navy transition-colors duration-300 hover:bg-sand disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? t("newsletter.submitting") : t("newsletter.cta")}
                </button>
              </div>
            </form>

            <p
              role={status === "error" ? "alert" : "status"}
              aria-live="polite"
              className={`mt-3 font-primary text-[12px] leading-5 ${
                status === "error"
                  ? "text-gold"
                  : status === "success"
                    ? "text-sand"
                    : "text-sand/50"
              }`}
            >
              {message || t("newsletter.note")}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
