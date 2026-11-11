"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const FONT_FAMILY = "3WEEQ Cuneiform"
const FONT_URL = "/fonts/noto-sans-cuneiform.woff2"

/* three signs of an inscription, written as escapes so the source stays ASCII */
const SIGNS = ["\u{1202D}", "\u{120F2}", "\u{1223E}"]
const SIGN_X = [60, 180, 300]

const WORD = "3WEEQ"

/* the gold dust: deterministic positions so every render agrees */
const DUST = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  top: (i * 53 + 23) % 100,
  size: 1 + ((i * 7) % 3),
  duration: 2.4 + ((i * 0.13) % 1.6),
  delay: (i * 0.14) % 2,
  drift: 40 + ((i * 11) % 40),
  sway: (i % 2 === 0 ? 1 : -1) * (10 + ((i * 5) % 16)),
}))

/** Never let the curtain outstay its welcome, whatever the device does. */
const HARD_STOP_MS = 6000

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })

/** Register the wall's font for the inscription, but never wait on it for long. */
async function loadSignFont() {
  try {
    if (document.fonts.check(`16px "${FONT_FAMILY}"`)) return
    const face = new FontFace(FONT_FAMILY, `url(${FONT_URL})`, {
      display: "block",
    })
    await face.load()
    document.fonts.add(face)
  } catch {
    /* no font → the signs fall back, the page still reveals */
  }
}

/**
 * Preloader — the cuneiform inscription.
 *
 * Three signs are pressed into the night the way the wall behind the page is
 * impressed: first as bare clay, each sweeping in after the last; then a band
 * of gold climbs across them and leaves the inscription gilded, a light
 * running ahead of the gold. As the gold settles the wordmark rises letter by
 * letter, and gold dust drifts through the dark the whole time. Then the whole
 * thing dissolves into fog and the hero is handed the page.
 *
 * The curtain owns the body's scroll only for as long as it is on screen, and
 * every exit — animation, reduced motion, a stalled frame, an unmount — hands
 * the scroll back. Nothing here may leave `position: sticky` broken.
 */
export function Preloader() {
  const locale = useLocale()
  const isArabic = locale === "ar"
  const t = useTranslations("Footer")
  const rootRef = useRef<HTMLDivElement>(null)
  const signRef = useRef<HTMLDivElement>(null)
  const drawRectsRef = useRef<Array<SVGRectElement | null>>([])
  const gildRectRef = useRef<SVGRectElement>(null)
  const gleamRectRef = useRef<SVGRectElement>(null)
  const letterRefs = useRef<Array<HTMLSpanElement | null>>([])
  const dustRefs = useRef<Array<HTMLSpanElement | null>>([])
  const [hidden, setHidden] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      /* Hand the page back without the inscription. Deferred one tick so the
         state update is not synchronous inside the effect body. */
      const id = window.setTimeout(() => {
        setHidden(true)
        setGone(true)
      }, 0)
      return () => window.clearTimeout(id)
    }

    let disposed = false
    let tl: gsap.core.Timeline | null = null
    let dustCtx: gsap.Context | null = null
    let hardStop = 0
    let released = false

    const previousOverflow = document.body.style.overflow

    /* Give the page back: scroll first, then measurements */
    const release = () => {
      if (released) return
      released = true
      window.clearTimeout(hardStop)
      document.body.style.overflow = previousOverflow
      setHidden(true)
      setGone(true)
      ScrollTrigger.refresh()
    }

    document.body.style.overflow = "hidden"
    hardStop = window.setTimeout(release, HARD_STOP_MS)

    void (async () => {
      await Promise.race([loadSignFont(), wait(800)])
      if (disposed) return

      const draw = SIGNS.map(() => ({ w: 0 }))
      const gild = { w: 0 }
      const gleam = { x: -40 }

      tl = gsap.timeline({ onComplete: release })

      /* 1 · inscribe: each clay sign sweeps in after the last */
      SIGNS.forEach((_, i) => {
        tl!.to(
          draw[i],
          {
            w: 110,
            duration: 0.45,
            ease: "power2.inOut",
            onUpdate: () =>
              drawRectsRef.current[i]?.setAttribute("width", String(draw[i].w)),
          },
          i * 0.14
        )
      })

      /* 2 · gild: gold fills in from the left, a light running at its edge */
      tl.to(
        gild,
        {
          w: 360,
          duration: 0.8,
          ease: "power2.inOut",
          onUpdate: () =>
            gildRectRef.current?.setAttribute("width", String(gild.w)),
        },
        "+=0.05"
      ).to(
        gleam,
        {
          x: 380,
          duration: 0.8,
          ease: "power2.inOut",
          onUpdate: () =>
            gleamRectRef.current?.setAttribute("x", String(gleam.x)),
        },
        "<"
      )

      /* 3 · the wordmark rises, letter by letter, while the gold settles */
      tl.fromTo(
        letterRefs.current.filter(Boolean),
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.06,
          ease: "power2.out",
        },
        "-=0.45"
      )

      /* 4 · fog: the inscription dissolves, the night lifts */
      tl.to(
        signRef.current,
        {
          opacity: 0,
          scale: 1.06,
          filter: "blur(12px)",
          duration: 0.45,
          ease: "power2.in",
        },
        "+=0.1"
      ).to(rootRef.current, {
        opacity: 0,
        duration: 0.6,
        ease: "power2.inOut",
        onComplete: () => setGone(true),
      })

      /* the gold dust drifts through the night for the whole curtain */
      dustCtx = gsap.context(() => {
        DUST.forEach((p, i) => {
          const el = dustRefs.current[i]
          if (!el) return
          gsap.to(el, {
            y: -p.drift,
            x: p.sway,
            opacity: 0.12,
            duration: p.duration,
            delay: p.delay,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          })
        })
      })
    })()

    return () => {
      disposed = true
      window.clearTimeout(hardStop)
      tl?.kill()
      dustCtx?.revert()
      /* the cleanup is the last line of defence: the scroll always comes back */
      document.body.style.overflow = previousOverflow
    }
  }, [])

  if (hidden && gone) return null

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden bg-royal-navy ${
        hidden ? "pointer-events-none" : ""
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,var(--color-brand-slate)_0%,transparent_58%)] opacity-25" />

      {/* the gold dust */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {DUST.map((p, i) => (
          <span
            key={i}
            ref={(el) => {
              dustRefs.current[i] = el
            }}
            className="absolute rounded-full"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: "rgba(205, 158, 97, 0.9)",
              boxShadow: "0 0 5px 1px rgba(205, 158, 97, 0.45)",
              opacity: 0.45,
            }}
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center px-6 text-center">
        <div
          ref={signRef}
          className="will-change-transform"
          style={{ filter: "blur(0px)" }}
        >
          <svg viewBox="0 0 360 180" className="h-[26vh] w-auto">
            <defs>
              {SIGNS.map((_, i) => (
                <clipPath key={i} id={`preloader-draw-${i}`}>
                  <rect
                    ref={(el) => {
                      drawRectsRef.current[i] = el
                    }}
                    x={SIGN_X[i] - 55}
                    y="0"
                    width="0"
                    height="180"
                  />
                </clipPath>
              ))}
              <clipPath id="preloader-gild">
                <rect ref={gildRectRef} x="0" y="0" width="0" height="180" />
              </clipPath>
              <clipPath id="preloader-gleam">
                <rect
                  ref={gleamRectRef}
                  x="-40"
                  y="0"
                  width="28"
                  height="180"
                />
              </clipPath>
            </defs>

            {SIGNS.map((sign, i) => (
              <g key={i}>
                {/* the clay, pressed first */}
                <text
                  x={SIGN_X[i]}
                  y="92"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="80"
                  fill="rgba(246, 230, 214, 0.30)"
                  clipPath={`url(#preloader-draw-${i})`}
                  fontFamily={FONT_FAMILY}
                >
                  {sign}
                </text>

                {/* the gold, filling in behind the light */}
                <text
                  x={SIGN_X[i]}
                  y="92"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="80"
                  fill="#cd9e61"
                  clipPath="url(#preloader-gild)"
                  fontFamily={FONT_FAMILY}
                >
                  {sign}
                </text>

                {/* the light running ahead of the gold */}
                <text
                  x={SIGN_X[i]}
                  y="92"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="80"
                  fill="#f6e6d6"
                  clipPath="url(#preloader-gleam)"
                  fontFamily={FONT_FAMILY}
                >
                  {sign}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* the wordmark, revealed letter by letter */}
        <div
          dir="ltr"
          className="mt-6 flex items-center"
          style={{ gap: "0.3em" }}
        >
          {WORD.split("").map((letter, i) => (
            <span
              key={i}
              ref={(el) => {
                letterRefs.current[i] = el
              }}
              className="font-secondary text-[clamp(2.25rem,8vw,4.5rem)] leading-none text-gold"
            >
              {letter}
            </span>
          ))}
        </div>

        <p
          dir={isArabic ? "rtl" : "ltr"}
          className={`mt-4 text-[12px] text-sand/55 ${
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
