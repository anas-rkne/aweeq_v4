"use client"

import Image from "next/image"
import { useState, type FormEvent } from "react"

type FormStatus = "idle" | "success" | "error"

export function NewsletterSection() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<FormStatus>("idle")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const value = email.trim()
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

    if (!valid) {
      setStatus("error")
      return
    }

    setStatus("success")
    setEmail("")
  }

  return (
    <section
      id="newsletter"
      className="relative isolate flex min-h-screen flex-col justify-center overflow-hidden bg-[#0a1628]"
    >
      <Image
        src="/images/newletter/newsletter_bg.webp"
        alt=""
        fill
        quality={90}
        sizes="100vw"
        className="z-0 object-cover object-center"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-[#0a1628]/50"
      />

      {/* receives the midnight of the Journal without a seam */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-10 h-32 w-full md:h-64"
        style={{
          background:
            "linear-gradient(to bottom, #0a1628 0%, transparent 100%)",
        }}
      />

      <div className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center px-6 py-24 text-center md:py-32">
        <h2 className="font-secondary text-4xl leading-tight tracking-[-0.01em] text-gold md:text-5xl">
          Be Part of the Journey
        </h2>

        <p className="mt-4 max-w-xl font-primary text-lg leading-[1.8] text-sand">
          كن جزءاً من رحلتنا. وكن أول من يعرف عن الإصدارات القادمة
        </p>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-10 flex w-full max-w-lg flex-row"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            بريدك الإلكتروني
          </label>

          <input
            id="newsletter-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="بريدك الإلكتروني"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              if (status !== "idle") setStatus("idle")
            }}
            aria-invalid={status === "error"}
            aria-describedby="newsletter-message"
            className="min-w-0 flex-1 border border-sand/30 bg-[#0a1628]/60 px-6 py-4 font-primary text-sand placeholder:text-sand/40 backdrop-blur-sm transition-colors focus:border-gold focus:bg-[#0a1628]/75 focus:text-sand focus:outline-none focus:ring-0 focus-visible:outline-none! focus-visible:ring-0! border-e-0"
          />

          <button
            type="submit"
            className="shrink-0 cursor-pointer bg-gold px-6 py-4 font-primary text-lg font-bold text-royal-navy transition-colors hover:bg-sand sm:px-8"
          >
            <span className="sr-only">اشترك في النشرة البريدية</span>
            <span aria-hidden="true">←</span>
          </button>
        </form>

        <p
          id="newsletter-message"
          aria-live="polite"
          className={`mt-4 min-h-6 font-primary text-sm ${
            status === "error" ? "text-gold" : "text-sand/80"
          }`}
        >
          {status === "error" && "يرجى إدخال بريد إلكتروني صحيح."}
          {status === "success" && "شكراً لك، أصبحت جزءاً من الرحلة."}
        </p>
      </div>

      {/* hands the journey to the Footer without a seam */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-32 md:h-64"
        style={{
          background: "linear-gradient(to top, #0a1628 0%, transparent 100%)",
        }}
      />
    </section>
  )
}
