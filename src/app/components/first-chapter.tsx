"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SectionFade } from "@/shared/ui/section-fade"
import { GateLight } from "@/components/gate-light"

gsap.registerPlugin(ScrollTrigger)

/**
 * The first chapter: Mesopotamia.
 *
 * A normal section in the flow, right after the store invitation. As it
 * leaves the screen it settles back — the words fade upward, the picture
 * opens a little — and its foot melts into the navy, so the film that follows
 * arrives out of the same night instead of cutting to it.
 */
export function FirstChapter() {
  const t = useTranslations("FirstChapter")
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const imageWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const content = contentRef.current
    const image = imageWrapRef.current
    if (!section || !content || !image) return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      // the entrance: as the section climbs into view the words resolve out
      // of the night — the fade belongs to the scroll, so it stops when the
      // hand stops
      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "top 55%",
            scrub: 1,
            invalidateOnRefresh: true,
          },
        })
        .fromTo(
          content,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, ease: "none" },
          0
        )

      // the exit: from the moment the section fills the screen to the moment
      // it is gone, it steps back into the night
      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            start: "bottom bottom",
            end: "bottom top",
            scrub: 1,
            invalidateOnRefresh: true,
          },
        })
        .to(content, { opacity: 0, y: -48, ease: "none" }, 0)
        .to(image, { scale: 1.06, ease: "none" }, 0)
    }, section)

    ScrollTrigger.refresh()

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="first-chapter"
      className="relative flex min-h-svh items-start justify-center overflow-hidden bg-royal-navy"
    >
      {/* the fog the invitation leaves behind */}
      <SectionFade edge="top" />
      {/* ===== the picture: the gate, edge to edge ===== */}
      <div
        ref={imageWrapRef}
        className="absolute inset-0 z-0 origin-center will-change-transform"
      >
        <Image
          src="/images/first_chapter/main_first_chapter_2.webp"
          alt={t("imageAlt")}
          fill
          quality={90}
          sizes="100vw"
          className="hidden object-cover md:block"
        />

        <img
          src="/images/first_chapter/main_first_chapter_mobile_2.webp"
          alt={t("imageAlt")}
          className="block h-full w-full object-cover md:hidden"
          loading="eager"
          fetchPriority="high"
        />

        {/* the night laid over the stone, to take the glare out of it */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[5] bg-royal-navy/40"
          style={{ mixBlendMode: "multiply" }}
        />
      </div>

      {/* the lamp that walks the gate with the scroll, and the seven stones
          that answer it — gsap fades the whole field with the section */}
      <GateLight />

      {/* ===== the words: top-centre of the screen. بابل carries the section
          alone — the Latin wordmark is gone ===== */}
      <div
        ref={contentRef}
        className="relative z-20 mx-auto w-full max-w-3xl px-6 pb-24 pt-[8svh] text-center will-change-transform sm:px-10 md:px-16"
      >
        <div className="on-photo flex flex-col items-center">
          <h2 className="font-primary text-3xl font-bold leading-[1.25] text-gold sm:text-4xl md:text-5xl md:leading-[1.2]">
            {t("subtitle")}
          </h2>

          <p className="mx-auto mt-5 max-w-[34rem] text-[15px] leading-[1.9] text-sand md:text-base">
            {t("body")}
          </p>

          {/* the way in — the same gold door as the hero */}
          <Link
            href="/products?collection=rafid"
            className="group relative mt-5 inline-flex h-11 items-center overflow-hidden whitespace-nowrap bg-gold px-5 font-primary text-[14px] text-royal-navy transition-transform duration-[250ms] ease-out-expo [text-shadow:none] hover:scale-[1.01] active:scale-[0.99] md:h-[44px] md:px-6"
          >
            <span aria-hidden="true" className="cta-sheen" />
            <span className="relative">{t("cta")}</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.2}
              strokeLinecap="square"
              aria-hidden="true"
              className="relative ms-1.5 h-3.5 w-3.5 -translate-x-1 opacity-0 transition-[transform,opacity] duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 md:ms-2 md:h-4 md:w-4"
            >
              <path d="M19 12H5" />
              <path d="M11 6l-6 6 6 6" />
            </svg>
          </Link>
        </div>
      </div>

      {/* the fog the film rises out of */}
      <SectionFade edge="bottom" />
    </section>
  )
}

export default FirstChapter
