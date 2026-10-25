"use client"

import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

/**
 * The first chapter: Mesopotamia.
 *
 * The section is a fixed layer behind the About, held shut by a round door
 * (`circle(0% at 50% 50%)`) until the portal transition opens it.
 *
 * After the door opens, the section owns a tall, empty spacer in the flow so
 * the scroll has room to play its exit: the gate zooms into the archway and
 * a black sheet closes over it. The FeaturedFragrance section starts exactly
 * where that spacer ends, so the black sheet is what the canvas is revealed
 * from once it begins scrubbing.
 */
export function FirstChapter() {
  const t = useTranslations("FirstChapter")
  const locale = useLocale()
  const isArabic = locale === "ar"
  const sectionRef = useRef<HTMLElement>(null)
  const imageWrapRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const spacerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (spacerRef.current) spacerRef.current.style.height = "0px"
      return
    }

    const section = sectionRef.current
    const imageWrap = imageWrapRef.current
    const overlay = overlayRef.current
    const spacer = spacerRef.current
    if (!section || !imageWrap || !overlay || !spacer) return

    const ctx = gsap.context(() => {
      // ===== the exit: zoom into the archway, then close to black =====
      gsap
        .timeline({
          scrollTrigger: {
            trigger: spacer,
            start: "top top",
            end: "bottom top",
            scrub: 1,
            invalidateOnRefresh: true,
          },
        })
        .to(
          imageWrap,
          {
            scale: 2.6,
            transformOrigin: "50% 58%",
            ease: "none",
          },
          0
        )
        .fromTo(
          overlay,
          { opacity: 0 },
          { opacity: 1, ease: "none", duration: 0.5 },
          0.5
        )

      // ===== the reveal: the black sheet lifts off the canvas =====
      // starts exactly where the spacer ends, which is where the canvas
      // section takes the screen and begins scrubbing its frames
      gsap
        .timeline({
          scrollTrigger: {
            trigger: spacer,
            start: "bottom top",
            end: "+=900",
            scrub: 1,
            invalidateOnRefresh: true,
          },
        })
        .to(section, { autoAlpha: 0, ease: "none" })
    }, section)

    ScrollTrigger.refresh()

    return () => ctx.revert()
  }, [])

  return (
    <>
      <section
        ref={sectionRef}
        id="first-chapter"
        className="fixed inset-0 z-[5] overflow-hidden bg-royal-navy"
        style={{ clipPath: "circle(0% at 50% 50%)" }}
      >
        {/* everything inside the door, and it grows a little as the door opens */}
        <div
          id="first-chapter-content"
          className="absolute inset-0 will-change-transform"
        >
          {/* ===== the picture: the gate, edge to edge ===== */}
          <div
            ref={imageWrapRef}
            className="absolute inset-0 z-0 origin-center will-change-transform"
          >
            <Image
              src="/images/first_chapter/main_first_chapter.webp"
              alt={t("imageAlt")}
              fill
              quality={90}
              sizes="100vw"
              className="hidden object-cover md:block"
            />

            <img
              src="/images/first_chapter/main_first_chapter_mobile.webp"
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

          {/* ===== the scrim: the right half melts into the night ===== */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 md:hidden"
            style={{
              backgroundImage:
                "linear-gradient(to top, var(--color-royal-navy) 0%, rgba(10, 22, 40, 0.9) 32%, rgba(10, 22, 40, 0.55) 58%, rgba(10, 22, 40, 0.18) 78%, transparent 100%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 hidden md:block"
            style={{
              backgroundImage:
                "linear-gradient(to left, var(--color-royal-navy) 0%, rgba(10, 22, 40, 0.9) 26%, rgba(10, 22, 40, 0.52) 50%, rgba(10, 22, 40, 0.18) 72%, transparent 92%)",
            }}
          />

          {/* ===== the words, on the right of the page ===== */}
          <div
            className={`relative z-20 mx-auto flex h-full w-full max-w-[84rem] flex-col justify-center px-5 pb-16 pr-12 pt-32 sm:px-8 sm:pr-16 md:px-16 md:pb-0 md:pr-24 md:pt-0 lg:pr-32 ${
              isArabic ? "items-start" : "items-end"
            }`}
          >
            <div className="w-full max-w-xl text-start">
              <p className="font-secondary text-[12px] tracking-[0.34em] text-gold">
                {t("eyebrow")}
              </p>

              <h2 className="mt-5 font-secondary text-[clamp(2rem,4vw,4rem)] leading-[1.06] tracking-[-0.015em] text-sand">
                {t("title")}
              </h2>

              <p className="mt-6 font-primary text-[clamp(1.25rem,2.1vw,1.7rem)] leading-[1.5] text-gold">
                {t("subtitle")}
              </p>

              <p className="mt-6 max-w-[30rem] text-body text-sand/85">
                {t("body")}
              </p>

              {/* the way in — the same gold door as the hero */}
              <Link
                href="/products?collection=rafid"
                className="group relative mt-12 inline-flex h-9 items-center overflow-hidden whitespace-nowrap bg-gold px-4 font-primary text-[13px] text-royal-navy transition-transform duration-[250ms] ease-out-expo hover:scale-[1.01] active:scale-[0.99] md:h-[40px] md:px-5 md:text-[14px]"
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
        </div>

        {/* the black sheet that closes the chapter and opens the film */}
        <div
          ref={overlayRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[50] bg-black opacity-0"
        />
      </section>

      {/* the scroll room the chapter's exit plays through — no visual of its own */}
      <div
        ref={spacerRef}
        aria-hidden="true"
        className="relative h-[250vh] w-full shrink-0"
      />
    </>
  )
}
