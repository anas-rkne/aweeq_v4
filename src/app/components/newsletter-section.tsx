"use client"

import dynamic from "next/dynamic"
import { useLocale, useTranslations } from "next-intl"
import { useState, type FormEvent } from "react"
import { SectionFade } from "@/shared/ui/section-fade"
import { TextReveal } from "@/shared/ui/text-reveal"

/* the bottle lives behind a dynamic import: three.js is a heavy guest, and
   the page should not pay for it before the section is asked for */
const BottleStage = dynamic(
  () => import("@/components/bottle-stage").then((m) => m.BottleStage),
  { ssr: false }
)

type FormStatus = "idle" | "submitting" | "success" | "error"

export function NewsletterSection() {
  const t = useTranslations("Newsletter")
  const locale = useLocale()
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<FormStatus>("idle")
  const [message, setMessage] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const value = email.trim()
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

    if (!valid) {
      setStatus("error")
      setMessage(t("invalidEmail"))
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
        const data = (await response.json().catch(() => null)) as {
          error?: string
        } | null

        setStatus("error")
        setMessage(
          data?.error === "invalid_email" ? t("invalidEmail") : t("error")
        )
        return
      }

      setStatus("success")
      setMessage(t("success"))
      setEmail("")
    } catch {
      setStatus("error")
      setMessage(t("network"))
    }
  }

  const isSubmitting = status === "submitting"

  return (
    <section
      id="newsletter"
      data-cuneiform-surface
      // the shared wall is the room: no photograph, the cuneiform carries it
      className="relative isolate flex min-h-svh flex-col justify-center overflow-hidden"
    >
      {/* the fog the journal leaves behind */}
      <SectionFade edge="top" zIndex={6} />

      <div className="relative z-10 mx-auto grid w-full max-w-[84rem] gap-12 px-6 py-24 md:grid-cols-2 md:items-center md:gap-16 md:px-16 md:py-32">
        {/* ===== the words and the door: on the reading side on wide screens,
            under the bottle on a phone ===== */}
        <div className="order-2 flex flex-col items-center text-center md:order-1 md:items-start md:text-start">
          <h2 className="font-secondary text-4xl leading-tight tracking-[-0.01em] text-gold md:text-5xl">
            <TextReveal preset="words" blur>
              {t("title")}
            </TextReveal>
          </h2>

          <p className="mt-4 max-w-xl font-primary text-lg leading-[1.8] text-sand">
            <TextReveal preset="block">{t("subtitle")}</TextReveal>
          </p>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-10 flex w-full max-w-lg flex-row"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              {t("emailLabel")}
            </label>

            <div className="focus-beam-wrap relative min-w-0 flex-1">
              <input
                id="newsletter-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={t("placeholder")}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  if (status !== "idle") {
                    setStatus("idle")
                    setMessage("")
                  }
                }}
                disabled={isSubmitting}
                aria-invalid={status === "error"}
                aria-describedby="newsletter-message"
                className="w-full border border-sand/30 border-e-0 bg-royal-navy/60 px-6 py-4 font-primary text-sand placeholder:text-sand/40 transition-colors focus:border-gold focus:bg-royal-navy/75 focus:text-sand focus:outline-none focus:ring-0 focus-visible:outline-none! focus-visible:ring-0! disabled:opacity-60"
              />
              <span aria-hidden="true" className="focus-beam" />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="shrink-0 cursor-pointer bg-gold px-6 py-4 font-primary text-lg font-bold text-royal-navy transition-colors hover:bg-sand disabled:cursor-not-allowed disabled:opacity-60 sm:px-8"
            >
              <span className="sr-only">
                {isSubmitting ? t("submitting") : t("submit")}
              </span>
              <span aria-hidden="true">{isSubmitting ? "…" : "←"}</span>
            </button>
          </form>

          <p
            id="newsletter-message"
            aria-live="polite"
            className={`mt-4 min-h-6 font-primary text-sm ${
              status === "error" ? "text-gold" : "text-sand/80"
            }`}
          >
            {message}
          </p>
        </div>

        {/* ===== the bottle: turns on its own, turns by the hand ===== */}
        <div className="order-1 h-[36vh] min-h-72 md:order-2 md:h-[64vh] md:min-h-[28rem]">
          <BottleStage className="h-full w-full" />
        </div>
      </div>

      {/* the fog the footer sits in */}
      <SectionFade edge="bottom" zIndex={6} />
    </section>
  )
}

export default NewsletterSection
