"use client"

import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"
import { useState, type FormEvent } from "react"
import { SectionFade } from "@/shared/ui/section-fade"

type FormStatus = "idle" | "submitting" | "success" | "error"

/**
 * NewsletterSection — the invitation stands on the brand plate.
 *
 * The plate (bg.webp) is the floor: it covers the section edge to edge and its
 * transparent corners let the site's own cuneiform wall show through. The copy
 * and the form sit centred on the plate, over a neutral night scrim.
 */
export function NewsletterSection() {
  const t = useTranslations("Newsletter")
  const locale = useLocale()
  const isRtl = locale === "ar"

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
  const done = status === "success"

  return (
    <section
      id="newsletter"
      data-cuneiform-surface
      className="relative isolate flex w-full flex-col justify-end overflow-hidden md:min-h-[92svh]"
    >
      {/* the plate: full width, full image, sitting on the floor of the section */}
      <Image
        src="/images/newsletter/bg.webp"
        alt=""
        width={1376}
        height={768}
        sizes="100vw"
        loading="eager"
        draggable={false}
        className="pointer-events-none relative z-0 block h-auto w-full max-w-none select-none"
      />

      {/* the night the words sit in */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse 46% 40% at 50% 52%, rgba(3,10,19,0.74) 0%, rgba(3,10,19,0.48) 52%, rgba(3,10,19,0.12) 76%, rgba(3,10,19,0) 100%)",
        }}
      />

      {/* ===== the invitation =====
          phones: sits in the flow directly above the plate, so the section is
          only as tall as its content and the plate — no dead stage above.
          md and up: absolutely centred on the plate, as on desktop. */}
      <div className="relative z-20 order-first mx-auto w-full max-w-5xl px-6 pb-14 pt-16 sm:pt-20 md:absolute md:inset-0 md:order-0 md:flex md:items-center md:justify-center md:py-0">
        <div data-no-reveal className="w-full max-w-xl text-center">
          <h2
            className="font-secondary text-[clamp(2rem,3.6vw,3.1rem)] leading-[1.12] tracking-[-0.01em] text-sand"
            style={{ textShadow: "0 2px 34px rgba(3,10,19,0.9)" }}
          >
            {t("title")}
          </h2>

          <p
            className="mx-auto mt-5 max-w-lg font-primary text-base leading-[1.8] text-sand/85 sm:text-lg"
            style={{ textShadow: "0 2px 26px rgba(3,10,19,0.95)" }}
          >
            {t("subtitle")}
          </p>

          {done ? null : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="mx-auto mt-9 flex w-full max-w-lg flex-row"
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
                  className="w-full border border-sand/30 border-e-0 bg-[#050d18]/70 px-5 py-3.5 font-primary text-sand backdrop-blur-sm placeholder:text-sand/50 transition-colors focus:border-gold focus:bg-[#07111c]/85 focus:text-sand focus:outline-none focus:ring-0 focus-visible:outline-none! focus-visible:ring-0! disabled:opacity-60 md:px-6 md:py-4"
                />
                <span aria-hidden="true" className="focus-beam" />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="shrink-0 cursor-pointer bg-gold px-5 py-3.5 font-primary text-lg font-bold text-royal-navy transition-[transform,background-color] duration-150 ease-out hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 md:py-4 sm:px-8"
              >
                <span className="sr-only">
                  {isSubmitting ? t("submitting") : t("submit")}
                </span>
                <span aria-hidden="true">
                  {isSubmitting ? "…" : isRtl ? "←" : "→"}
                </span>
              </button>
            </form>
          )}

          <p
            id="newsletter-message"
            aria-live="polite"
            className={`mx-auto min-h-6 max-w-lg font-primary leading-[1.7] ${
              done
                ? "mt-9 text-[17px] text-sand"
                : "mt-4 text-[13px] " +
                  (status === "error" ? "text-gold" : "text-sand/60")
            }`}
            style={{ textShadow: "0 2px 18px rgba(3,10,19,0.9)" }}
          >
            {message}
          </p>

          <p
            className="mt-2 font-primary text-[13px] text-sand/50 md:mt-8"
            style={{ textShadow: "0 2px 18px rgba(3,10,19,0.9)" }}
          >
            {t("fact")}
          </p>
        </div>
      </div>

      {/* the mist that joins the section to the footer — the same divider used
          between the other sections on this page */}
      <SectionFade edge="bottom" />
    </section>
  )
}

export default NewsletterSection
