"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { Link } from "@/i18n/navigation"
import { RollingText } from "@/shared/ui/rolling-text"
import { TextReveal } from "@/shared/ui/text-reveal"
import { DarkGradientBg } from "./dark-gradient-bg"

const FRAME_COUNT = 30
const FRAME_INTERVAL = 100

export function Hero() {
  const t = useTranslations("Hero")
  const heroRef = useRef<HTMLElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesRef = useRef<HTMLImageElement[]>([])
  const rafRef = useRef<number | null>(null)
  const framePositionRef = useRef(0)
  const [framesReady, setFramesReady] = useState(false)

  /* the parallax: the picture leans away from the cursor, the words follow
     it. quickTo keeps the movement smooth without a tween on every event. */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const hero = heroRef.current
    const image = imageRef.current
    const text = textRef.current
    if (!hero || !image || !text) return

    const imageX = gsap.quickTo(image, "x", {
      duration: 1.2,
      ease: "power2.out",
    })
    const imageY = gsap.quickTo(image, "y", {
      duration: 1.2,
      ease: "power2.out",
    })
    const textX = gsap.quickTo(text, "x", { duration: 1, ease: "power2.out" })
    const textY = gsap.quickTo(text, "y", { duration: 1, ease: "power2.out" })

    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 2
      const y = (event.clientY / window.innerHeight - 0.5) * 2

      imageX(x * -20)
      imageY(y * -20)
      textX(x * 10)
      textY(y * 10)
    }

    const handleMouseLeave = () => {
      imageX(0)
      imageY(0)
      textX(0)
      textY(0)
    }

    hero.addEventListener("mousemove", handleMouseMove)
    hero.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      hero.removeEventListener("mousemove", handleMouseMove)
      hero.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [])

  /* ---------- Canvas autoplay background ---------- */

  const preloadFrames = async (): Promise<HTMLImageElement[]> => {
    const promises = Array.from({ length: FRAME_COUNT }, (_, i) => {
      const frameNum = (i + 1).toString().padStart(4, "0")
      const timestamp = (i * 0.1).toFixed(2)
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new (
          globalThis as unknown as { Image: new () => HTMLImageElement }
        ).Image()
        img.decoding = "async"
        img.src = `/hero_frames/frame-${frameNum}-${timestamp}s.webp`
        img.onload = () => {
          // decode while the loader is quiet, so the animation never stutters
          // on a decode in the middle of playback
          const decoded = img.decode?.()
          if (!decoded) {
            resolve(img)
            return
          }
          void decoded.catch(() => undefined).then(() => resolve(img))
        }
        img.onerror = () =>
          reject(new Error(`Failed to load frame ${frameNum}`))
      })
    })
    return Promise.all(promises)
  }

  const resizeCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // the image layer is displayed at 1.08×. Render the backing store at that
    // size and at the device pixel ratio, so the browser never has to upscale
    // the frames.
    const displayScale = 1.08
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cssWidth = canvas.offsetWidth || window.innerWidth
    const cssHeight = canvas.offsetHeight || window.innerHeight

    canvas.width = Math.round(cssWidth * displayScale * dpr)
    canvas.height = Math.round(cssHeight * displayScale * dpr)
    drawFrameAt(framePositionRef.current)
  }

  const drawFrameAt = (position: number) => {
    const canvas = canvasRef.current
    const images = imagesRef.current
    if (!canvas) return

    const lower = Math.floor(position)
    const upper = Math.min(FRAME_COUNT - 1, lower + 1)
    const mix = position - lower

    const current = images[lower]
    if (!current) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"

    const drawCover = (img: HTMLImageElement, alpha: number) => {
      const scale = Math.max(width / img.width, height / img.height)
      const drawWidth = img.width * scale
      const drawHeight = img.height * scale
      ctx.globalAlpha = alpha
      ctx.drawImage(
        img,
        (width - drawWidth) / 2,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight
      )
    }

    ctx.clearRect(0, 0, width, height)
    drawCover(current, 1)

    // keep the frame crisp for most of its 100 ms, then dissolve into the next
    // one in the last quarter — smooth, without the permanent softness of a
    // full-length cross-fade
    const next = images[upper]
    const blendStart = 0.75
    if (next && mix > blendStart) {
      const t = (mix - blendStart) / (1 - blendStart)
      drawCover(next, t * t * (3 - 2 * t))
    }

    ctx.globalAlpha = 1
  }

  const startAnimation = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    resizeCanvas()

    const duration = (FRAME_COUNT - 1) * FRAME_INTERVAL
    const startedAt = performance.now()

    const loop = (timestamp: number) => {
      const t = Math.min(1, (timestamp - startedAt) / duration)
      const position = t * (FRAME_COUNT - 1)

      framePositionRef.current = position
      drawFrameAt(position)

      if (t < 1) {
        rafRef.current = requestAnimationFrame(loop)
      } else {
        rafRef.current = null
      }
    }

    rafRef.current = requestAnimationFrame(loop)
  }

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    if (reducedMotion) {
      const img = new (
        globalThis as unknown as { Image: new () => HTMLImageElement }
      ).Image()
      img.src = `/hero_frames/frame-0030-2.90s.webp`
      img.onload = () => {
        const frames: HTMLImageElement[] = []
        frames[FRAME_COUNT - 1] = img
        imagesRef.current = frames
        framePositionRef.current = FRAME_COUNT - 1
        resizeCanvas()
        setFramesReady(true)
      }
      return
    }

    const timer = setTimeout(async () => {
      try {
        imagesRef.current = await preloadFrames()
        framePositionRef.current = 0
        drawFrameAt(0)
        setFramesReady(true)
        startAnimation()
      } catch (err) {
        console.error("Failed to preload hero frames", err)
      }
    }, 500)

    window.addEventListener("resize", resizeCanvas)

    return () => {
      clearTimeout(timer)
      window.removeEventListener("resize", resizeCanvas)
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [])

  return (
    <section
      id="hero"
      ref={heroRef}
      className="relative min-h-svh overflow-hidden"
    >
      <DarkGradientBg className="min-h-svh">
        <div className="relative min-h-svh">
          {/* ===== كتلة النص: تتمركز عمودياً فوق منطقة السماء، وتنتهي قبل خط الآثار ===== */}
          <div
            ref={textRef}
            data-parallax-text
            className="relative z-30 flex min-h-svh items-center px-5 pb-16 pt-28 will-change-transform sm:px-8 sm:pt-32 md:px-16 md:pt-36"
          >
            <div className="relative flex w-full flex-col justify-center text-start md:ml-auto md:w-1/2 md:max-w-[38rem]">
              {/* a very light pool behind the words — just enough to read */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-x-6 -inset-y-10 -z-10"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(10,22,40,0.5) 0%, rgba(10,22,40,0.22) 45%, rgba(10,22,40,0) 78%)",
                }}
              />
              <h1 className="font-primary text-[clamp(2.5rem,4.8vw,4.25rem)] leading-[1.1] text-sand">
                <TextReveal preset="words" blur stagger={0.08}>
                  {`${t("titleLine1")}\n${t("titleLine2")}`}
                </TextReveal>
              </h1>

              <p className="hero-part-3 mt-5 max-w-[31rem] text-body text-sand/80">
                {t("description")}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-start gap-4 md:gap-6">
                <span className="hero-part-4 inline-flex">
                  <Link
                    href="/products/rafid"
                    className="group relative inline-flex h-9 items-center overflow-hidden whitespace-nowrap bg-gold px-4 font-primary text-[13px] text-royal-navy transition-transform duration-150 ease-out active:scale-[0.98] md:h-[40px] md:px-5 md:text-[14px]"
                  >
                    <span aria-hidden="true" className="cta-sheen" />
                    <RollingText>{t("discoverRafid")}</RollingText>
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
                </span>

                <span className="hero-part-5 inline-flex">
                  <a
                    href="#civilizations"
                    className="group inline-flex items-center gap-1.5 whitespace-nowrap font-primary text-[13px] text-sand/80 transition-colors duration-200 ease-out hover:text-gold md:gap-2 md:text-[14px]"
                  >
                    <RollingText>{t("exploreCivilizations")}</RollingText>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeLinecap="square"
                      aria-hidden="true"
                      className="h-4 w-4 transition-transform duration-300 ease-out group-hover:-translate-x-1 md:h-[18px] md:w-[18px]"
                    >
                      <path d="M19 12H5" />
                      <path d="M11 6l-6 6 6 6" />
                    </svg>
                  </a>
                </span>
              </div>
            </div>
          </div>

          {/* ===== the picture behind the whole section =====
              the parallax moves this whole layer away from the cursor;
              the scale keeps its edges out of the frame, and the fade
              travels with it so the seam never opens. */}
          <div
            ref={imageRef}
            data-parallax-image
            className="absolute inset-0 z-0 scale-[1.08] will-change-transform"
          >
            {/* Canvas background: plays once on load, freezes on last frame */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full object-cover"
              aria-hidden="true"
            />

            {/* Static images hidden once canvas frames are loaded */}
            {!framesReady && (
              <>
                <Image
                  src="/images/hero/hero_img.webp"
                  alt={t("imageAlt")}
                  fill
                  preload
                  quality={90}
                  sizes="100vw"
                  className="hidden object-cover md:block"
                />

                <img
                  src="/images/hero/hero_img_mobile.webp"
                  alt={t("imageAlt")}
                  className="block h-full w-full object-cover md:hidden"
                  loading="eager"
                  fetchPriority="high"
                />
              </>
            )}

            {/* a narrow, very light strip on the text side — the frame stays
              clear */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[10%]"
              style={{
                background:
                  "linear-gradient(to left, rgba(10,22,40,0.45) 0%, rgba(10,22,40,0) 100%)",
              }}
            />
          </div>

          {/* the cinematic vignette: the top and bottom shadows carry the
              header and the words, while the radial keeps the centre bright
              and lets the corners fall into the brand navy */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              backgroundImage: [
                "linear-gradient(to bottom, rgba(10, 22, 40, 0.8) 0%, transparent 25%)",
                "linear-gradient(to top, rgba(10, 22, 40, 0.8) 0%, transparent 30%)",
                "radial-gradient(circle at center, transparent 40%, rgba(10, 22, 40, 0.6) 100%)",
              ].join(", "),
            }}
          />
        </div>
      </DarkGradientBg>
    </section>
  )
}
