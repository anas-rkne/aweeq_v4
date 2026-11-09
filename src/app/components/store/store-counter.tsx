"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SectionFade } from "@/shared/ui/section-fade"
import type { Product } from "@/types"
import { mediaProxyUrl } from "@/lib/format"
import { HeroProductCard } from "./hero-product-card"
import { InfiniteAisle, type AisleHandle, type AisleProduct } from "./infinite-aisle"

/**
 * each piece keeps its own halo colour — the same glow the WebGL scene casts,
 * so the DOM card and the floating piece read as one object */
const GLOW: Record<string, string> = {
  mikhmaria: "#cd9e61",
  bakhoor: "#2f4e78",
  rafid: "#8d7f92",
}

const FALLBACK_GLOW = "#cd9e61"

/** the civilizations banner, glued to the floor at the end */
const ENDING_IMAGE = "/images/hero-2/last.webp"

/** the same banner, recomposed for phones */
const ENDING_IMAGE_MOBILE = "/images/hero-2/last-mobile.webp"

/**
 * store-counter — the invitation that follows the hero.
 *
 * A dive through the night. The scroll drives the camera (the WebGL scene
 * owns its own motion), and at the end the night clears for a line, a gold
 * button and the five-civilization image — the invitation to the store.
 *
 * The three pieces are now the three products themselves: each floats in the
 * mist as before, but a buyable card (title, measure, price, add-to-cart and
 * a details link) surfaces beside it as it comes into view — left, right,
 * left on a desktop, and a bottom bar on a phone. On a phone there is still
 * the WebGL float, but the card rides at the foot of the stage.
 */
export function StoreCounter({ products }: { products: Product[] }) {
  const t = useTranslations("StoreCounter")
  const sectionRef = useRef<HTMLElement>(null)
  const aisleRef = useRef<AisleHandle>(null)
  const endingRef = useRef<HTMLDivElement>(null)
  const cardEls = useRef<(HTMLDivElement | null)[]>([])

  /* the WebGL layer only needs the photograph and its glow. the float prefers
     the transparent "float" cut-out (hero-2 only) and falls back to the full
     thumbnail when the piece has no cut-out yet. the texture is read through
     our own origin (`mediaProxyUrl`) so the canvas is never tainted by a
     missing CORS header on the file API. */
  const aisleProducts = useMemo<AisleProduct[]>(
    () =>
      products.map((product) => {
        const float = (product.media ?? []).find(
          (media) => media.role === "float"
        )
        return {
          image: mediaProxyUrl(float?.url ?? product.thumbnail) ?? "",
          glow: GLOW[product.handle] ?? FALLBACK_GLOW,
        }
      }),
    [products]
  )

  /* the cards follow the float, so reveal is driven from the scene's paint
     loop — a direct style write, never a React re-render per frame */
  const handleReveal = useCallback((reveals: number[]) => {
    reveals.forEach((reveal, index) => {
      const el = cardEls.current[index]
      if (!el) return
      const opacity = Math.max(0, Math.min(1, reveal))
      el.style.opacity = String(opacity)
      el.style.pointerEvents = opacity > 0.02 ? "auto" : "none"
    })
  }, [])

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

  /* the card positions: a phone shows each as a bottom bar; a desktop puts
     them at the sides, alternating left / right / left */
  const cardPosition = [
    "left-4 right-4 bottom-5 md:left-10 md:right-auto md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:w-80",
    "left-4 right-4 bottom-5 md:right-10 md:left-auto md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:w-80",
    "left-4 right-4 bottom-5 md:left-10 md:right-auto md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:w-80",
  ]

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
        <InfiniteAisle
          ref={aisleRef}
          products={aisleProducts}
          onReveal={handleReveal}
        />

        {/* the buyable cards, riding on the float */}
        {products.map((product, index) => (
          <div
            key={product.id}
            ref={(el) => {
              cardEls.current[index] = el
            }}
            className={`pointer-events-none absolute z-10 ${cardPosition[index] ?? cardPosition[0]}`}
            style={{ opacity: 0 }}
          >
            <HeroProductCard product={product} />
          </div>
        ))}

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
                className="absolute inset-x-0 bottom-0 z-0 mx-auto h-auto w-full max-w-[59svh]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== reduced motion: the pieces stacked, still, and buyable ===== */}
      <div
        data-stage="stack"
        className="hidden mx-auto w-full max-w-xl flex-col gap-0"
      >
        {products.map((product, index) => {
          const glow = aisleProducts[index]?.glow ?? FALLBACK_GLOW
          return (
            <article
              key={product.id}
              data-piece
              className="flex flex-col items-center px-6 py-14"
            >
              <div
                className="relative mt-8 flex aspect-[3/4] w-full max-w-xs items-center justify-center"
                style={{
                  background: `radial-gradient(ellipse 70% 55% at 50% 45%, ${glow}55 0%, rgba(10,22,40,0) 70%)`,
                }}
              >
                {aisleProducts[index]?.image ? (
                  <Image
                    src={aisleProducts[index].image}
                    alt={product.title}
                    width={1200}
                    height={733}
                    sizes="(max-width: 1023px) 320px"
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                ) : null}
              </div>
              <div className="mt-6 w-full max-w-sm">
                <HeroProductCard product={product} />
              </div>
            </article>
          )
        })}

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

export default StoreCounter
