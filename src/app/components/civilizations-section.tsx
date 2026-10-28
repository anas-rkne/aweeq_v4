"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useTranslations } from "next-intl"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SectionFade } from "@/shared/ui/section-fade"

gsap.registerPlugin(ScrollTrigger)

const CHINA_FRAMES = 29
const GREECE_FRAMES = 36
const EGYPT_FRAMES = 36
const TOTAL_FRAMES = CHINA_FRAMES + GREECE_FRAMES + EGYPT_FRAMES

/**
 * The frame groups, expressed as scroll progress (0 → 1):
 *   China  → frames 1–29   → 0.000000 → 0.287129
 *   Greece → frames 30–65  → 0.287129 → 0.643564
 *   Egypt  → frames 66–101 → 0.643564 → 1.000000
 */
const CHINA_END = CHINA_FRAMES / TOTAL_FRAMES
const GREECE_END = (CHINA_FRAMES + GREECE_FRAMES) / TOTAL_FRAMES

/**
 * The exported film runs in 0.10s steps (0.00s → 9.90s) and the final frame
 * lands at 9.96s. The names below must match the files on disk exactly.
 */
const FRAME_TIMES = Array.from({ length: TOTAL_FRAMES }, (_, index) =>
  index === TOTAL_FRAMES - 1 ? "9.96" : (index * 0.1).toFixed(2)
)

const CIVILIZATIONS = [
  { id: "china" },
  { id: "greece" },
  { id: "egypt" },
] as const

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

function subscribeToReducedMotion(callback: () => void) {
  const media = window.matchMedia(REDUCED_MOTION_QUERY)
  media.addEventListener("change", callback)
  return () => media.removeEventListener("change", callback)
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function frameSources(index: number) {
  const number = index + 1

  return [
    `/images/civil/frames/frame-${String(number).padStart(4, "0")}-${FRAME_TIMES[index]}s.webp`,
    `/civil/frames/frame-${String(number).padStart(3, "0")}.webp`,
  ]
}

export function CivilizationsSection() {
  const t = useTranslations("Civilizations")
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textRefs = useRef<(HTMLDivElement | null)[]>([])

  const [images, setImages] = useState<HTMLImageElement[]>([])
  const [loaded, setLoaded] = useState(false)
  const [active, setActive] = useState(-1)
  const [shouldLoad, setShouldLoad] = useState(false)
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => false
  )

  /* the film waits for its own section to come near instead of competing with
     the hero for the first paint */
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

    const loadFrame = (index: number) =>
      new Promise<HTMLImageElement | null>((resolve) => {
        const sources = frameSources(index)
        const img = new window.Image()
        img.decoding = "async"

        let attempt = 0
        let settled = false

        const settle = (value: HTMLImageElement | null) => {
          if (settled) return
          settled = true
          resolve(value)
        }

        const next = () => {
          if (cancelled) {
            settle(null)
            return
          }

          if (attempt >= sources.length) {
            settle(null)
            return
          }

          img.src = sources[attempt]
          attempt += 1
        }

        img.onload = () => {
          // Decode once, while the page is still quiet: drawImage() then never
          // pays the decode cost in the middle of a scroll frame.
          const decoded = img.decode?.()

          if (!decoded) {
            settle(img)
            return
          }

          void decoded.catch(() => undefined).then(() => settle(img))
        }

        img.onerror = next
        next()
      })

    const preload = async () => {
      const frames = await Promise.all(
        Array.from({ length: TOTAL_FRAMES }, (_, index) => loadFrame(index))
      )

      if (cancelled) return

      const loadedFrames = frames.filter(
        (frame): frame is HTMLImageElement => frame !== null
      )

      if (loadedFrames.length === 0) {
        console.error("No civilizations frames found in /images/civil/frames")
        return
      }

      setImages(loadedFrames)
      setLoaded(true)
    }

    void preload()

    return () => {
      cancelled = true
    }
  }, [shouldLoad])

  useEffect(() => {
    if (!loaded || images.length === 0) return

    const section = sectionRef.current
    const canvas = canvasRef.current
    if (!section || !canvas) return

    const ctx = canvas.getContext("2d", { alpha: false })
    if (!ctx) return

    let currentFrame = -1
    let frameIndex = 0

    const render = (index: number) => {
      const img = images[Math.max(0, Math.min(images.length - 1, index))]
      if (!img) return

      const cw = canvas.width
      const ch = canvas.height
      if (cw === 0 || ch === 0) return

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"

      // cover, never letterbox: the frame fills the viewport and the excess
      // is cropped evenly on both sides
      const scale = Math.max(cw / img.width, ch / img.height)
      const width = img.width * scale
      const height = img.height * scale

      ctx.drawImage(
        img,
        Math.round((cw - width) / 2),
        Math.round((ch - height) / 2),
        Math.ceil(width),
        Math.ceil(height)
      )

      currentFrame = index
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(window.innerWidth * dpr)
      canvas.height = Math.round(window.innerHeight * dpr)
      render(currentFrame < 0 ? 0 : currentFrame)
    }

    resize()
    window.addEventListener("resize", resize)

    const reduced = window.matchMedia(REDUCED_MOTION_QUERY).matches

    if (reduced) {
      return () => {
        window.removeEventListener("resize", resize)
      }
    }

    const applyProgress = (progress: number) => {
      // 101 frames over 0 → 1. The clamp is the 0-indexed ceiling (100).
      const nextFrame = Math.min(
        images.length - 1,
        Math.floor(progress * TOTAL_FRAMES)
      )

      if (nextFrame !== frameIndex) {
        frameIndex = nextFrame
        render(nextFrame)
      }

      const nextActive =
        progress >= 0.15 && progress < 0.25
          ? 0
          : progress >= 0.42 && progress < 0.55
            ? 1
            : progress >= 0.78 && progress < 0.9
              ? 2
              : -1

      setActive((previous) => (previous === nextActive ? previous : nextActive))
    }

    const textElements = textRefs.current.filter(
      (element): element is HTMLDivElement => element !== null
    )

    textElements.forEach((element) => {
      gsap.set(element, { opacity: 0, y: 20 })
    })

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        // the section is 2.2 screens tall in the markup, so the film's length
        // is part of the document instead of a distance added after the frames
        // load. the page no longer re-forms under the reader.
        end: "bottom bottom",
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => applyProgress(self.progress),
        onLeave: () => setActive(-1),
        onLeaveBack: () => setActive(-1),
      },
    })

    // ===== China — frames 1–29 (progress 0.000000 → 0.287129) =====
    // in 0.05 → 0.15 · hold → 0.25 · out 0.25 → 0.287129
    tl.fromTo(
      textElements[0],
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.1, ease: "power2.out" },
      0.05
    ).to(
      textElements[0],
      {
        opacity: 0,
        y: -16,
        duration: CHINA_END - 0.25,
        ease: "power2.in",
      },
      0.25
    )

    // ===== Greece — frames 30–65 (progress 0.287129 → 0.643564) =====
    // in 0.32 → 0.42 · hold → 0.55 · out 0.55 → 0.643564
    tl.fromTo(
      textElements[1],
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.1, ease: "power2.out" },
      0.32
    ).to(
      textElements[1],
      {
        opacity: 0,
        y: -16,
        duration: GREECE_END - 0.55,
        ease: "power2.in",
      },
      0.55
    )

    // ===== Egypt — frames 66–101 (progress 0.643564 → 1.000000) =====
    // in 0.68 → 0.78 · hold → 0.90 · out 0.90 → 1.00
    tl.fromTo(
      textElements[2],
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.1, ease: "power2.out" },
      0.68
    ).to(
      textElements[2],
      { opacity: 0, y: -16, duration: 0.1, ease: "power2.in" },
      0.9
    )

    // paints the frame the visitor is already on (reload / deep link)
    if (tl.scrollTrigger) {
      applyProgress(tl.scrollTrigger.progress)
    }

    // the frames load late; the height they need is already in the markup, so
    // this only picks up font metrics and the first paint of the film
    ScrollTrigger.refresh()

    return () => {
      window.removeEventListener("resize", resize)
      tl.scrollTrigger?.kill()
      tl.kill()
    }
  }, [loaded, images])

  return (
    // the 2.2 screens the film needs are part of the document from the first
    // paint; the stage inside is what sticks while they pass
    <section
      ref={sectionRef}
      id="civilizations"
      className="relative h-[220svh] bg-royal-navy motion-reduce:h-auto motion-reduce:min-h-svh"
    >
      <div className="sticky top-0 h-svh overflow-hidden motion-reduce:relative motion-reduce:h-auto motion-reduce:min-h-svh">
        {/* the fog the packaging leaves behind */}
        <SectionFade edge="top" zIndex={6} />
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 z-0 h-full w-full object-cover motion-reduce:hidden"
        />

        {/* a flat field under the words, so the type never stands on raw pixels */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[5] bg-royal-navy/35 motion-reduce:hidden"
        />

        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center p-8 motion-reduce:relative motion-reduce:inset-auto motion-reduce:gap-20 motion-reduce:py-24">
          {CIVILIZATIONS.map((civilization, index) => {
            const interactive = reducedMotion || active === index

            return (
              <div
                key={civilization.id}
                ref={(element) => {
                  textRefs.current[index] = element
                }}
                className={`absolute inset-0 flex flex-col items-center justify-center px-5 text-center opacity-0 motion-reduce:relative motion-reduce:inset-auto motion-reduce:opacity-100 ${
                  interactive ? "pointer-events-auto" : "pointer-events-none"
                }`}
              >
                <h2 className="max-w-4xl font-primary text-h2 leading-[1.15] text-gold">
                  {t(`${civilization.id}.title`)}
                </h2>

                <p className="mt-6 max-w-[38rem] font-primary text-body leading-[1.75] text-sand">
                  {t(`${civilization.id}.body`)}
                </p>

                <a
                  href="#newsletter"
                  tabIndex={interactive ? 0 : -1}
                  aria-label={t(`${civilization.id}.cta`)}
                  className={`group relative mt-9 inline-flex h-11 items-center justify-center overflow-hidden whitespace-nowrap bg-brand-gold px-7 font-primary text-[14px] leading-none text-royal-navy transition-transform duration-[250ms] ease-out-expo hover:scale-[1.01] active:scale-[0.99] sm:h-[46px] sm:px-9 ${
                    interactive ? "pointer-events-auto" : "pointer-events-none"
                  }`}
                >
                  <span aria-hidden="true" className="cta-sheen" />
                  <span className="relative">
                    {t(`${civilization.id}.cta`)}
                  </span>
                </a>
              </div>
            )
          })}
        </div>

        {/* the fog the boutique rises out of */}
        <SectionFade edge="bottom" zIndex={6} />
      </div>
    </section>
  )
}
