"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { BRAND_COLORS } from "@/shared/config/brand"

gsap.registerPlugin(ScrollTrigger)

interface FeaturedFragranceProps {
  frameCount?: number
}

export function FeaturedFragrance({
  frameCount = 101,
}: FeaturedFragranceProps) {
  const t = useTranslations("Featured")
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const [images, setImages] = useState<HTMLImageElement[]>([])
  const [loaded, setLoaded] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)

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
    const text = textRef.current
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

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        // the film itself; the gradient at its foot carries the page into
        // Packaging without a curtain or a hard cut
        end: "+=3600",
        scrub: 0.6,
        pin: true,
        anticipatePin: 1,
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

    // ===== the words: appear in the last tenth, then lift off =====
    if (text) {
      gsap.set(text, { opacity: 0, y: 60 })
      tl.to(
        text,
        {
          opacity: 1,
          y: 0,
          duration: 0.08,
          ease: "power2.out",
        },
        0.8
      ).to(
        text,
        {
          opacity: 0,
          y: -40,
          duration: 0.12,
          ease: "power2.in",
        },
        0.88
      )
    }

    // the film loads late, so its pin changes the page height after the first
    // pass; re-measure so the sections below keep their true positions
    ScrollTrigger.refresh()

    return () => {
      window.removeEventListener("resize", resize)
      tl.scrollTrigger?.kill()
      tl.kill()
    }
  }, [loaded, images])

  return (
    <section
      ref={sectionRef}
      id="featured-fragrance"
      className="featured-fragrance-section relative h-screen overflow-hidden bg-royal-navy"
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 z-[1] h-full w-full will-change-transform"
      />

      {/* ===== the scrim: on a wide screen the right half melts into the
          night, on a phone the words rest on the night at the foot ===== */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[15] md:hidden"
        style={{
          backgroundImage:
            "linear-gradient(to top, var(--color-royal-navy) 0%, rgba(10, 22, 40, 0.85) 34%, rgba(10, 22, 40, 0) 68%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-[15] hidden w-1/2 md:block"
        style={{
          backgroundImage:
            "linear-gradient(to left, var(--color-royal-navy) 0%, rgba(10, 22, 40, 0.9) 38%, rgba(10, 22, 40, 0.55) 68%, rgba(10, 22, 40, 0) 100%)",
        }}
      />

      {/* the foot of the section melts into the midnight of the section that
          follows — a gradient only, no space, no divider */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 z-10 h-32 w-full md:h-64"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, var(--color-royal-navy) 100%)",
        }}
      />

      {/* ===== the words: at the foot on a phone, centred on the right of
          the page on a wide screen ===== */}
      <div
        ref={textRef}
        className="pointer-events-none absolute inset-y-0 right-0 z-[20] flex w-full flex-col justify-end px-8 pb-20 text-start md:w-1/2 md:justify-center md:px-24 md:pb-0"
      >
        <h2 className="font-secondary text-[clamp(2.25rem,4.6vw,4.25rem)] leading-[1.04] tracking-[-0.02em] text-gold">
          {t("title")}
        </h2>
        <p className="mt-6 max-w-[30rem] font-primary text-[clamp(1.05rem,1.5vw,1.35rem)] leading-[1.8] text-sand/90">
          {t("body")}
        </p>

        <div className="pointer-events-auto mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
          <Link
            href="/products/rafid"
            className="group relative inline-flex h-10 items-center overflow-hidden whitespace-nowrap bg-gold px-5 font-primary text-[13px] text-royal-navy transition-transform duration-[250ms] ease-out-expo hover:scale-[1.01] active:scale-[0.99] md:h-[44px] md:px-6 md:text-[14px]"
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
    </section>
  )
}
