"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import gsap from "gsap"

const FONT_FAMILY = "3WEEQ Cuneiform"
const FONT_URL = "/fonts/noto-sans-cuneiform.woff2"
/* DINGIR — the cuneiform sign for "sky / heaven", the star the brand sails by */
const SIGN = "\u{1202D}"

/**
 * Preloader — the cuneiform inscription.
 *
 * One sign is pressed into the night the way the wall behind the page is
 * impressed: first as bare clay, sweeping in stroke by stroke; then a band of
 * gold climbs across it and leaves the sign gilded — a leading edge of light
 * runs ahead of the gold; then the whole thing dissolves into fog and the hero
 * is handed the page.
 *
 * It runs once per full page load (the marketing shell keeps it mounted across
 * client-side navigation) and stands still under `prefers-reduced-motion`.
 */
export function Preloader() {
  const locale = useLocale()
  const isArabic = locale === "ar"
  const t = useTranslations("Footer")
  const rootRef = useRef<HTMLDivElement>(null)
  const signRef = useRef<HTMLDivElement>(null)
  const drawRectRef = useRef<SVGRectElement>(null)
  const gildRectRef = useRef<SVGRectElement>(null)
  const gleamRectRef = useRef<SVGRectElement>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let disposed = false
    let tl: gsap.core.Timeline | null = null
    let dustCtx: gsap.Context | null = null
    let previousOverflow = ""

    void (async () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setHidden(true)
        return
      }

      try {
        if (!document.fonts.check(`16px "${FONT_FAMILY}"`)) {
          const face = new FontFace(FONT_FAMILY, `url(${FONT_URL})`, {
            display: "block",
          })
          await face.load()
          if (disposed) return
          document.fonts.add(face)
        }
      } catch {
        /* no font → the sign falls back, the page still reveals */
      }
      if (disposed) return

      previousOverflow = document.body.style.overflow
      document.body.style.overflow = "hidden"

      const draw = { w: 0 }
      const gild = { w: 0 }
      const gleam = { x: -32 }

      tl = gsap.timeline({ onComplete: () => setHidden(true) })

      /* 1 · inscribe: the clay sign sweeps in from its left edge */
      tl.to(draw, {
        w: 240,
        duration: 1,
        ease: "power2.inOut",
        onUpdate: () =>
          drawRectRef.current?.setAttribute("width", String(draw.w)),
      })
        /* 2 · gild: gold fills in from the left, a light running at its edge */
        .to(
          gild,
          {
            w: 240,
            duration: 0.75,
            ease: "power2.inOut",
            onUpdate: () =>
              gildRectRef.current?.setAttribute("width", String(gild.w)),
          },
          "+=0.06"
        )
        .to(
          gleam,
          {
            x: 250,
            duration: 0.75,
            ease: "power2.inOut",
            onUpdate: () =>
              gleamRectRef.current?.setAttribute("x", String(gleam.x)),
          },
          "<"
        )
        /* 3 · fog: the sign dissolves, the night lifts */
        .to(
          signRef.current,
          {
            opacity: 0,
            scale: 1.06,
            filter: "blur(12px)",
            duration: 0.45,
            ease: "power2.in",
          },
          "+=0.1"
        )
        .to(rootRef.current, {
          opacity: 0,
          duration: 0.6,
          ease: "power2.inOut",
        })
    })()

    return () => {
      disposed = true
      tl?.kill()
      if (previousOverflow) document.body.style.overflow = previousOverflow
    }
  }, [])

  if (hidden) return null

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden bg-royal-navy"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,var(--color-brand-slate)_0%,transparent_58%)] opacity-25" />

      <div className="relative flex flex-col items-center px-6 text-center">
        <div
          ref={signRef}
          className="will-change-transform"
          style={{ filter: "blur(0px)" }}
        >
          <svg viewBox="0 0 240 240" className="h-[42vh] w-auto">
            <defs>
              <clipPath id="preloader-draw">
                <rect
                  ref={drawRectRef}
                  x="0"
                  y="0"
                  width="0"
                  height="240"
                />
              </clipPath>
              <clipPath id="preloader-gild">
                <rect
                  ref={gildRectRef}
                  x="0"
                  y="0"
                  width="0"
                  height="240"
                />
              </clipPath>
              <clipPath id="preloader-gleam">
                <rect
                  ref={gleamRectRef}
                  x="-32"
                  y="0"
                  width="26"
                  height="240"
                />
              </clipPath>
            </defs>

            <g transform="translate(120,124)">
              {/* the clay, pressed first */}
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="150"
                fill="rgba(246, 230, 214, 0.30)"
                clipPath="url(#preloader-draw)"
                fontFamily={FONT_FAMILY}
              >
                {SIGN}
              </text>

              {/* the gold, filling in behind the light */}
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="150"
                fill="#cd9e61"
                clipPath="url(#preloader-gild)"
                fontFamily={FONT_FAMILY}
              >
                {SIGN}
              </text>

              {/* the light running ahead of the gold */}
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="150"
                fill="#f6e6d6"
                clipPath="url(#preloader-gleam)"
                fontFamily={FONT_FAMILY}
              >
                {SIGN}
              </text>
            </g>
          </svg>
        </div>

        <p className="mt-8 font-secondary text-[11px] uppercase tracking-[0.34em] text-sand/45">
          3WEEQ
        </p>

        <p
          dir={isArabic ? "rtl" : "ltr"}
          className={`mt-3 text-[12px] text-sand/55 ${
            isArabic ? "font-primary" : "font-secondary tracking-[0.2em]"
          }`}
        >
          {t("tagline")}
        </p>
      </div>
    </div>
  )
}

export default Preloader
