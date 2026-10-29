"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useTranslations } from "next-intl"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SectionFade } from "@/shared/ui/section-fade"

gsap.registerPlugin(ScrollTrigger)

/**
 * The film is four civilizations concatenated in display order:
 *   Gulf   → 29 frames (khaleg)   → 0.0000 → 0.2231
 *   China  → 29 frames            → 0.2231 → 0.4462
 *   Egypt  → 36 frames            → 0.4462 → 0.7231
 *   Greece → 36 frames            → 0.7231 → 1.0000
 *
 * Egypt plays before Greece, but the exported film on disk runs China →
 * Greece → Egypt, so the manifest points at the files out of their on-disk
 * order rather than re-exporting the film.
 */
type FrameBlock = {
  id: "gulf" | "china" | "egypt" | "greece"
  /** "khaleg" is the sub-folder; "frames" is the combined film */
  dir: "khaleg" | "frames"
  /** first frame number (1-based) inside its own folder */
  from: number
  count: number
}

const BLOCKS: FrameBlock[] = [
  { id: "gulf", dir: "khaleg", from: 1, count: 29 },
  { id: "china", dir: "frames", from: 1, count: 29 },
  { id: "egypt", dir: "frames", from: 66, count: 36 },
  { id: "greece", dir: "frames", from: 30, count: 36 },
]

const TOTAL_FRAMES = BLOCKS.reduce((sum, block) => sum + block.count, 0)

/* scroll-progress boundaries, one per scene */
const GULF_END = 29 / TOTAL_FRAMES
const CHINA_END = 58 / TOTAL_FRAMES
const EGYPT_END = 94 / TOTAL_FRAMES

/**
 * The ordered frame URLs. Filenames carry the timestamp of the frame inside
 * its own film, so a re-ordered block keeps its original timestamps (Egypt's
 * frames stay 6.50s → 9.96s even though they now play third). The combined
 * film stamps its final frame at 9.96s instead of 10.00s.
 */
const FRAME_SOURCES: string[] = (() => {
  const sources: string[] = []

  for (const block of BLOCKS) {
    for (let index = 0; index < block.count; index++) {
      const number = block.from + index
      const time =
        block.dir === "frames" && number === 101
          ? "9.96"
          : ((number - 1) * 0.1).toFixed(2)
      const folder = block.dir === "khaleg" ? "khaleg/" : ""
      sources.push(
        `/images/civil/frames/${folder}frame-${String(number).padStart(4, "0")}-${time}s.webp`
      )
    }
  }

  return sources
})()

const CIVILIZATIONS = [
  { id: "gulf" },
  { id: "china" },
  { id: "egypt" },
  { id: "greece" },
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
  return [FRAME_SOURCES[index]]
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
      // 130 frames over 0 → 1. The clamp is the 0-indexed ceiling (129).
      const nextFrame = Math.min(
        images.length - 1,
        Math.floor(progress * TOTAL_FRAMES)
      )

      if (nextFrame !== frameIndex) {
        frameIndex = nextFrame
        render(nextFrame)
      }

      const nextActive =
        progress >= 0.13 && progress < 0.19
          ? 0
          : progress >= 0.36 && progress < 0.42
            ? 1
            : progress >= 0.59 && progress < 0.68
              ? 2
              : progress >= 0.84 && progress < 0.92
                ? 3
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

    // ===== Gulf — frames 1–29 (progress 0.0000 → 0.2231) =====
    // in 0.03 → 0.13 · hold · out 0.19 → 0.2231
    tl.fromTo(
      textElements[0],
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.1, ease: "power2.out" },
      0.03
    ).to(
      textElements[0],
      {
        opacity: 0,
        y: -16,
        duration: GULF_END - 0.19,
        ease: "power2.in",
      },
      0.19
    )

    // ===== China — frames 30–58 (progress 0.2231 → 0.4462) =====
    // in 0.26 → 0.36 · hold · out 0.42 → 0.4462
    tl.fromTo(
      textElements[1],
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.1, ease: "power2.out" },
      0.26
    ).to(
      textElements[1],
      {
        opacity: 0,
        y: -16,
        duration: CHINA_END - 0.42,
        ease: "power2.in",
      },
      0.42
    )

    // ===== Egypt — frames 59–94 (progress 0.4462 → 0.7231) =====
    // in 0.49 → 0.59 · hold · out 0.68 → 0.7231
    tl.fromTo(
      textElements[2],
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.1, ease: "power2.out" },
      0.49
    ).to(
      textElements[2],
      {
        opacity: 0,
        y: -16,
        duration: EGYPT_END - 0.68,
        ease: "power2.in",
      },
      0.68
    )

    // ===== Greece — frames 95–130 (progress 0.7231 → 1.0000) =====
    // in 0.74 → 0.84 · hold · out 0.92 → 1.00
    tl.fromTo(
      textElements[3],
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.1, ease: "power2.out" },
      0.74
    ).to(
      textElements[3],
      { opacity: 0, y: -16, duration: 0.1, ease: "power2.in" },
      0.92
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
