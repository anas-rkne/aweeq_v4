"use client"

import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SpotlightCard } from "@/shared/ui/spotlight-card"
import { TextReveal } from "@/shared/ui/text-reveal"
import { JOURNAL_POSTS } from "./journal-posts"

export function JournalSection() {
  const t = useTranslations("Journal")
  const locale = useLocale()
  const sectionRef = useRef<HTMLElement>(null)
  const cardsRef = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const section = sectionRef.current
    if (!section) return

    gsap.registerPlugin(ScrollTrigger)

    const cards = cardsRef.current.filter(
      (card): card is HTMLElement => card !== null
    )

    const ctx = gsap.context(() => {
      gsap.set(cards, { opacity: 0, y: 30 })
      gsap.to(cards, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section,
          start: "top 72%",
          once: true,
        },
      })
    }, section)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="journal"
      className="relative isolate min-h-screen overflow-hidden bg-royal-navy"
    >
      <Image
        src="/images/journal/journal_bg.jpg"
        alt=""
        fill
        quality={90}
        sizes="100vw"
        className="z-0 object-cover object-center"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-royal-navy/80"
      />

      {/* receives the midnight of Beyond without a seam */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-10 h-32 w-full md:h-64"
        style={{
          background:
            "linear-gradient(to bottom, var(--color-royal-navy) 0%, transparent 100%)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[84rem] px-5 py-24 sm:px-8 md:px-16 md:py-28 lg:py-32">
        {/* ===== the header: the words on the right, the way out on the left ===== */}
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="text-start">
            <h2 className="font-secondary text-[clamp(2rem,3.8vw,3.4rem)] leading-[1.05] tracking-[-0.01em] text-gold">
              <TextReveal preset="words" blur>
                {t("title")}
              </TextReveal>
            </h2>
            <p className="mt-4 font-primary text-[clamp(1rem,1.3vw,1.2rem)] leading-[1.8] text-sand/80">
              <TextReveal preset="block">{t("subtitle")}</TextReveal>
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-6 self-start md:self-auto">
            <Link
              href="/products?collection=rafid"
              className="group inline-flex items-center gap-2 font-secondary text-[11px] tracking-[0.28em] text-gold transition-colors duration-300 hover:text-sand"
            >
              {t("shopCollection")}
              <span
                aria-hidden="true"
                className="inline-block transition-transform duration-300 ease-out-expo group-hover:-translate-x-1"
              >
                ←
              </span>
            </Link>

            <Link
              href="/journal"
              className="group inline-flex items-center gap-3 font-secondary text-[11px] tracking-[0.28em] text-sand/70 transition-colors duration-300 hover:text-gold"
            >
              {t("viewAll")}
              <span
                aria-hidden="true"
                className="inline-block transition-transform duration-300 ease-out-expo group-hover:-translate-x-1"
              >
                →
              </span>
            </Link>
          </div>
        </div>

        {/* ===== the gallery ===== */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {JOURNAL_POSTS.map((post, index) => (
            <article
              key={post.slug}
              ref={(element) => {
                cardsRef.current[index] = element
              }}
              className="group"
            >
              <SpotlightCard className="aspect-[4/5] border border-sand/10 transition-colors duration-500 hover:border-gold/50">
                <Image
                  src={post.image}
                  alt={locale === "ar" ? post.titleAr : post.titleEn}
                  fill
                  quality={90}
                  sizes="(min-width: 64rem) 30vw, (min-width: 48rem) 45vw, 100vw"
                  className="object-cover object-center transition-transform duration-[900ms] ease-out-expo group-hover:scale-[1.035]"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-royal-navy/75 via-transparent to-transparent"
                />

                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-5 bottom-5 h-px bg-gold/30 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
              </SpotlightCard>

              <div className="mt-5 flex items-start justify-between gap-5">
                <div className="min-w-0 text-start">
                  <h3 className="font-secondary text-[clamp(1.1rem,1.5vw,1.4rem)] leading-tight tracking-[-0.005em] text-sand">
                    {locale === "ar" ? post.titleAr : post.titleEn}
                  </h3>
                  <p className="mt-2 font-primary text-[13px] leading-none text-gold">
                    {locale === "ar" ? post.titleEn : post.titleAr}
                  </p>
                </div>

                <Link
                  href={`/journal/${post.slug}`}
                  aria-label={`${t("readArticle")}: ${
                    locale === "ar" ? post.titleAr : post.titleEn
                  }`}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold text-gold transition-colors duration-300 hover:bg-gold hover:text-royal-navy"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="h-4 w-4"
                  >
                    <path d="M7 17 17 7" />
                    <path d="M9 7h8v8" />
                  </svg>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* hands the gallery to the Newsletter without a seam */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-32 md:h-64"
        style={{
          background:
            "linear-gradient(to top, var(--color-royal-navy) 0%, transparent 100%)",
        }}
      />
    </section>
  )
}
