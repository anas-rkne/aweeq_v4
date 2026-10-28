"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { BRAND_COLORS } from "@/shared/config/brand"
import { SectionFade } from "@/shared/ui/section-fade"

gsap.registerPlugin(ScrollTrigger)

interface FeaturedFragranceProps {
  frameCount?: number
}

export function FeaturedFragrance({
  frameCount = 101,
}: FeaturedFragranceProps) {
  const t = useTranslations("Featured")
  const locale = useLocale()
  const isArabic = locale === "ar"
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRefs = useRef<Array<HTMLDivElement | null>>([])
  const progressRef = useRef<HTMLDivElement>(null)
  const [images, setImages] = useState<HTMLImageElement[]>([])
  const [loaded, setLoaded] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)

  /* the label never fades, so its data has to survive any state of the film.
     price/edition are empty by default: the owner fills them once, in both
     locales, and the row appears — no invented numbers in the markup. */
  const price = t("price")
  const edition = t("edition")
  const notes = [
    { label: t("journeyTopLabel"), value: t("journeyTop") },
    { label: t("journeyHeartLabel"), value: t("journeyHeart") },
    { label: t("journeyBaseLabel"), value: t("journeyBase") },
  ].filter((note) => note.value.length > 0)
  const labelClass = isArabic
    ? "font-primary text-[10px] text-sand/45"
    : "font-secondary text-[10px] uppercase tracking-[0.3em] text-sand/45"
  const eyebrowClass = isArabic
    ? "font-primary text-[11px] text-sand/60"
    : "font-secondary text-[11px] uppercase tracking-[0.3em] text-sand/60"

  /* the film is 5.8 MB; it waits until its own section is near instead of
     competing with the hero and the about for the first paint */
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    if (typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setShouldLoad(true), 0)
      return () => window.clearTimeout(timer)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin: "150% 0px" }
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!shouldLoad) return

    let cancelled = false

    const preload = async () => {
      const promises: Promise<HTMLImageElement | null>[] = []

      for (let i = 1; i <= frameCount; i++) {
        const img = new window.Image()
        img.decoding = "async"
        const num = i.toString().padStart(4, "0")
        const seconds = ((i - 1) * 0.1).toFixed(2)
        img.src = `/featured_frames/frame-${num}-${seconds}s.webp`

        promises.push(
          new Promise<HTMLImageElement | null>((resolve) => {
            img.onload = () => {
              const decoded = img.decode?.()
              if (!decoded) {
                resolve(img)
                return
              }
              void decoded.catch(() => undefined).then(() => resolve(img))
            }
            // a missing frame must not hold the whole film hostage
            img.onerror = () => {
              const fallback = new window.Image()
              fallback.src = `/featured_frames/frame-${i
                .toString()
                .padStart(3, "0")}.jpg`
              fallback.onload = () => resolve(fallback)
              fallback.onerror = () => resolve(null)
            }
          })
        )
      }

      const result = await Promise.all(promises)
      if (cancelled) return

      const loadedImages = result.filter(
        (img): img is HTMLImageElement => img !== null
      )

      if (loadedImages.length === 0) {
        console.error("No featured frames found in /featured_frames")
        return
      }

      setImages(loadedImages)
      setLoaded(true)
    }

    preload()
    return () => {
      cancelled = true
    }
  }, [frameCount, shouldLoad])

  useEffect(() => {
    if (!loaded || images.length === 0) return
    const section = sectionRef.current
    const canvas = canvasRef.current
    if (!section || !canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let currentFrame = 0

    const render = (index: number) => {
      const img = images[index]
      if (!img) return

      const cw = canvas.width
      const ch = canvas.height
      ctx.clearRect(0, 0, cw, ch)
      ctx.fillStyle = BRAND_COLORS.navy
      ctx.fillRect(0, 0, cw, ch)

      // the frame fills the section edge to edge: scale up until both axes
      // are covered, then centre the overflow. no letterbox, no margins.
      const scale = Math.max(cw / img.width, ch / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h)
      currentFrame = index
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width =
        canvas.clientWidth || section.clientWidth || window.innerWidth
      const height =
        canvas.clientHeight || section.clientHeight || window.innerHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      render(currentFrame)
    }
    resize()
    window.addEventListener("resize", resize)

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      render(0)
      return () => window.removeEventListener("resize", resize)
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        // the stage is already 2.6 screens tall in the markup: the scroll
        // distance belongs to the document, not to a number GSAP inserts once
        // the film has loaded. nothing below the film moves when it arrives.
        end: "bottom bottom",
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    })

    // ===== the film: the scroll is the playhead =====
    const frameObj = { frame: 0 }
    tl.to(
      frameObj,
      {
        frame: images.length - 1,
        duration: 0.88,
        ease: "none",
        onUpdate: () => {
          render(Math.round(frameObj.frame))
        },
      },
      0
    )

    // ===== the four scenes under the label =====
    // the label (name, price, both doors) is never animated: it is present
    // from the first pixel of the stage to the last, so the product is named
    // for the whole film instead of the last 8% of it. only the
    // detail that sits beneath it changes, in the same slot, so nothing
    // around it shifts while the film advances.
    const scenes = sceneRefs.current.filter(
      (scene): scene is HTMLDivElement => scene !== null
    )
    const windows: Array<[number, number]> = [
      [0.12, 0.36], // the material
      [0.38, 0.6], // the journey
      [0.62, 0.8], // the story
      [0.82, 1], // the decision — holds to the end
    ]

    scenes.forEach((scene, index) => {
      const [inAt, outAt] = windows[index] ?? [1, 1]
      gsap.set(scene, { opacity: 0, y: 16 })
      tl.to(
        scene,
        { opacity: 1, y: 0, duration: 0.04, ease: "power2.out" },
        inAt
      )

      if (outAt < 1) {
        tl.to(
          scene,
          { opacity: 0, y: -12, duration: 0.03, ease: "power2.in" },
          outAt
        )
      }
    })

    // ===== the hairline: how much of the film is left =====
    // anchored to the reading edge, so it fills right-to-left in Arabic and
    // left-to-right in English. it retires in the last stretch: at the seam
    // the page keeps only the fog, never a finished gold rule.
    if (progressRef.current) {
      tl.fromTo(
        progressRef.current,
        { scaleX: 0 },
        { scaleX: 1, duration: 1, ease: "none" },
        0
      )
    }
    tl.to(
      ".film-progress",
      { autoAlpha: 0, duration: 0.05, ease: "none" },
      0.94
    )

    // the scroll geometry can still shift a little (fonts, the film's own
    // first paint), so take one measurement once everything is in place
    ScrollTrigger.refresh()

    return () => {
      window.removeEventListener("resize", resize)
      tl.scrollTrigger?.kill()
      tl.kill()
    }
  }, [loaded, images])

  return (
    // the 2.6 screens belong to the document from the first paint. the stage
    // inside is what sticks, so the page keeps its height when the film
    // finishes loading and nothing below the film ever moves.
    <section
      ref={sectionRef}
      id="featured-fragrance"
      className="featured-fragrance-section relative h-[260svh] bg-royal-navy motion-reduce:h-auto motion-reduce:min-h-svh"
    >
      <div className="sticky top-0 h-svh overflow-hidden motion-reduce:relative motion-reduce:h-auto motion-reduce:min-h-svh">
        {/* the fog the chapter leaves behind */}
        <SectionFade edge="top" />
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 z-[1] h-full w-full will-change-transform"
        />

        {/* ===== on a phone the words rest on the night at the foot; on a wide
          screen the film is left whole — no half-field of navy over it ===== */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-2/3 bg-royal-navy/70 md:hidden"
        />

        {/* ===== the museum label: at the foot on a phone, on the right half of
          a wide screen. it is never faded and never moved — the name, the
          price and both doors stay present for the whole film ===== */}
        <div className="on-photo pointer-events-none absolute inset-y-0 right-0 z-[20] flex w-full flex-col justify-end px-8 pb-20 text-start motion-reduce:relative motion-reduce:inset-auto motion-reduce:py-24 md:w-1/2 md:justify-center md:px-24 md:pb-0">
          <p className={eyebrowClass}>{t("eyebrow")}</p>

          <h2 className="mt-3 font-secondary text-[clamp(2.25rem,4.6vw,4.25rem)] leading-[1.04] tracking-[-0.02em] text-gold">
            {t("title")}
          </h2>

          <p className="mt-4 max-w-[26rem] font-primary text-lead leading-[1.6] text-sand">
            {t("tagline")}
          </p>

          {price || edition ? (
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 font-primary text-[11px] text-sand/55">
              {price ? <span>{price}</span> : null}
              {price && edition ? (
                <span aria-hidden="true" className="h-3 w-px bg-sand/25" />
              ) : null}
              {edition ? <span>{edition}</span> : null}
            </div>
          ) : null}

          {/* the four scenes share one slot, so the label above them never shifts */}
          <div className="relative mt-7 min-h-[7rem] w-full max-w-[30rem] md:min-h-[9rem]">
            {/* 01 · the material */}
            <div
              ref={(element) => {
                sceneRefs.current[0] = element
              }}
              className="absolute inset-x-0 top-0 opacity-0 motion-reduce:relative motion-reduce:opacity-100"
            >
              <p className={labelClass}>{t("materialLabel")}</p>
              <p className="mt-2 font-primary text-[15px] leading-[1.7] text-sand/85 md:text-base">
                {t("materialBody")}
              </p>
              <p className="mt-2 font-primary text-[11px] text-sand/50">
                {t("materialMeta")}
              </p>
            </div>

            {/* 02 · the journey */}
            <div
              ref={(element) => {
                sceneRefs.current[1] = element
              }}
              className="absolute inset-x-0 top-0 opacity-0 motion-reduce:relative motion-reduce:opacity-100"
            >
              <p className={labelClass}>{t("journeyTitle")}</p>

              {notes.length > 0 ? (
                <dl className="mt-2 space-y-1">
                  {notes.map((note) => (
                    <div key={note.label} className="flex items-baseline gap-3">
                      <dt className="w-14 shrink-0 font-primary text-[11px] text-sand/45">
                        {note.label}
                      </dt>
                      <dd className="font-primary text-[13px] text-sand/85 md:text-sm">
                        {note.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              <p className="mt-2 font-primary text-[11px] text-sand/50">
                {t("journeyFoot")}
              </p>
            </div>

            {/* 03 · the story */}
            <div
              ref={(element) => {
                sceneRefs.current[2] = element
              }}
              className="absolute inset-x-0 top-0 opacity-0 motion-reduce:relative motion-reduce:opacity-100"
            >
              <p className="font-primary text-[15px] leading-[1.7] text-sand/85 md:text-base">
                {t("storyQuote")}
              </p>
              <p className="mt-2 font-primary text-[11px] leading-[1.7] text-sand/50">
                {t("storyBody")}
              </p>
            </div>

            {/* 04 · the decision */}
            <div
              ref={(element) => {
                sceneRefs.current[3] = element
              }}
              className="absolute inset-x-0 top-0 opacity-0 motion-reduce:relative motion-reduce:opacity-100"
            >
              <p className="font-primary text-[15px] leading-[1.7] text-sand/85 md:text-base">
                {t("closingTitle")}
              </p>
              <p className="mt-2 font-primary text-[11px] leading-[1.7] text-sand/50">
                {t("closingBody")}
              </p>
            </div>
          </div>

          <div className="pointer-events-auto mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link
              href="/products/rafid"
              className="group relative inline-flex h-10 items-center overflow-hidden whitespace-nowrap bg-gold px-5 font-primary text-[13px] text-royal-navy transition-transform duration-[250ms] ease-out-expo [text-shadow:none] hover:scale-[1.01] active:scale-[0.99] md:h-[44px] md:px-6 md:text-[14px]"
            >
              <span aria-hidden="true" className="cta-sheen" />
              <span className="relative">{t("discover")}</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.2}
                strokeLinecap="square"
                aria-hidden="true"
                className="relative ms-2 h-3.5 w-3.5 -translate-x-1 opacity-0 transition-[transform,opacity] duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 md:h-4 md:w-4"
              >
                <path d="M19 12H5" />
                <path d="M11 6l-6 6 6 6" />
              </svg>
            </Link>

            <Link
              href="/products?collection=rafid"
              className="group inline-flex items-center gap-2 font-primary text-[13px] text-sand/80 transition-colors duration-200 ease-out hover:text-gold md:text-[14px]"
            >
              {t("collection")}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="square"
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-300 ease-out group-hover:-translate-x-1"
              >
                <path d="M19 12H5" />
                <path d="M11 6l-6 6 6 6" />
              </svg>
            </Link>
          </div>
        </div>

        {/* the foot of the film melts into the night */}

        {/* the hairline: how much of the film is left, filled from the reading edge */}
        <div
          aria-hidden="true"
          className="film-progress pointer-events-none absolute inset-x-0 bottom-0 z-[25] h-px bg-sand/10"
        >
          <div
            ref={progressRef}
            className="h-full w-full bg-gold/70"
            style={{ transformOrigin: isArabic ? "right" : "left" }}
          />
        </div>

        {/* the fog the packaging rises out of */}
        <SectionFade edge="bottom" />
      </div>
    </section>
  )
}
