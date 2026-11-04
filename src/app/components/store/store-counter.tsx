"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SectionFade } from "@/shared/ui/section-fade"
import { InfiniteAisle, type AisleHandle, type AisleProduct } from "./infinite-aisle"

/**
 * The pieces — three distinct products, one per stop in the mist. These are
 * placeholders; they are swapped for the real product photography the moment
 * it is ready, and the aisle keeps their true aspect ratio on its own.
 */
const PRODUCTS: AisleProduct[] = [
  { image: "/images/hero-2/transparent%20(3).webp", glow: "#cd9e61" },
  { image: "/images/hero-2/transparent%20(4).webp", glow: "#2f4e78" },
  { image: "/images/hero-2/transparent%20(5).webp", glow: "#8d7f92" },
]

/** the civilizations banner, glued to the floor at the end */
const ENDING_IMAGE = "/images/hero-2/last.webp"

/** the same banner, recomposed for phones */
const ENDING_IMAGE_MOBILE = "/images/hero-2/last-mobile.webp"

/**
 * store-counter — the invitation that follows the hero.
 *
 * A dive through the night. The scroll drives the camera (the WebGL scene
 * owns its own motion), and at the end the night clears for a line, a gold
 * button and the five-civilization image — the invitation to the store. On a
 * phone there is no WebGL: the same pieces rise out of the dark.
 */
export function StoreCounter() {
  const t = useTranslations("StoreCounter")
  const sectionRef = useRef<HTMLElement>(null)
  const aisleRef = useRef<AisleHandle>(null)
  const endingRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) return

    gsap.registerPlugin(ScrollTrigger)

    const ending = endingRef.current

    const render = (p: number) => {
      aisleRef.current?.setProgress(p)

      if (ending) {
        const fade = Math.max(0, Math.min(1, (p - 0.8) / 0.2))
        ending.style.opacity = String(fade)
        ending.style.transform = `translateY(${(1 - fade) * 34}px)`
        ending.style.pointerEvents = fade > 0.5 ? "auto" : "none"
      }
    }

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => `+=${window.innerHeight * 2.2}`,
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        onUpdate: (self) => render(self.progress),
      })
    }, section)

    render(0)

    return () => ctx.revert()
  }, [])

  return (
    <section
      id="store-invitation"
      ref={sectionRef}
      data-no-reveal
      className="relative isolate bg-royal-navy"
    >
      {/* the background: the civilizations, at a whisper */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-10"
      >
        <Image
          src="/images/hero-2/hero-2-bg-v2.jpg"
          alt=""
          width={1408}
          height={768}
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      <SectionFade edge="top" zIndex={20} />

      {/* ===== the dive through the night (all screens) ===== */}
      <div
        data-stage="shelf"
        className="relative h-svh overflow-hidden"
      >
        {/* the WebGL scene */}
        <InfiniteAisle ref={aisleRef} products={PRODUCTS} />

        {/* the clearing: the invitation to the store */}
        <div
          ref={endingRef}
          className="pointer-events-none absolute inset-0 z-20"
          style={{ opacity: 0 }}
        >
          {/* the invitation, above the banner */}
          <div className="absolute inset-x-0 bottom-[36vh] top-0 z-10 flex items-center justify-center px-[7vw]">
            <div className="flex max-w-xl flex-col items-center gap-9 text-center">
              <p className="font-primary text-4xl font-bold leading-snug text-gold md:text-6xl">
                {t("ending")}
              </p>
              <Link
                href="/products"
                className="group relative inline-flex h-12 items-center overflow-hidden whitespace-nowrap bg-gold px-6 font-primary text-[15px] font-bold text-royal-navy transition-transform duration-150 ease-out [text-shadow:none] active:scale-[0.98] md:h-[52px] md:px-8 md:text-[16px]"
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

          {/* the civilizations banner, glued to the floor, full width */}
          <div className="absolute inset-x-0 bottom-0 h-[36vh] w-full">
            <div className="relative hidden h-full w-full md:block">
              <Image
                src={ENDING_IMAGE}
                alt=""
                width={1955}
                height={544}
                sizes="100vw"
                className="absolute inset-0 h-full w-full object-cover object-top"
              />
            </div>
            <div className="relative h-full w-full md:hidden">
              {/* the phone composition is a tall canvas whose upper half is
                  fully transparent with the banner at its foot. Anchoring it to
                  the floor at its own aspect ratio (h-auto, never cover) shows
                  the whole banner, uncropped — the empty half simply sits over
                  the night above it. */}
              <Image
                src={ENDING_IMAGE_MOBILE}
                alt=""
                width={768}
                height={1376}
                sizes="100vw"
                className="absolute inset-x-0 bottom-0 z-0 h-auto w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== reduced motion: the pieces stacked, still ===== */}
      <div
        data-stage="stack"
        className="hidden mx-auto w-full max-w-xl flex-col gap-0"
      >
        {PRODUCTS.map((product) => (
          <article
            key={product.image}
            data-piece
            className="flex flex-col items-center px-6 py-14"
          >
            <div
              className="relative mt-8 flex aspect-[3/4] w-full max-w-xs items-center justify-center"
              style={{
                background: `radial-gradient(ellipse 70% 55% at 50% 45%, ${product.glow}55 0%, rgba(10,22,40,0) 70%)`,
              }}
            >
              <Image
                src={product.image}
                alt=""
                width={1200}
                height={733}
                sizes="(max-width: 1023px) 320px"
                className="absolute inset-0 h-full w-full object-contain"
              />
            </div>
          </article>
        ))}

        {/* the invitation, at the end of the phone walk */}
        <article data-piece className="flex flex-col items-center px-6 py-20 text-center">
          <p className="max-w-md font-primary text-2xl font-bold leading-snug text-sand">
            {t("ending")}
          </p>
          <Link
            href="/products"
            className="mt-8 inline-flex h-13 items-center rounded-sm bg-gold px-10 font-primary text-base font-bold text-royal-navy"
          >
            {t("cta")}
          </Link>
        </article>
      </div>

      <SectionFade edge="bottom" zIndex={20} />
    </section>
  )
}
