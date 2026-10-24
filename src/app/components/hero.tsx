"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { DarkGradientBg } from "./dark-gradient-bg"

const FRAME_COUNT = 16
const FRAME_INTERVAL = 200

export function Hero() {
  const heroRef = useRef<HTMLElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesRef = useRef<HTMLImageElement[]>([])
  const rafRef = useRef<number | null>(null)
  const frameIndexRef = useRef(0)
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
      const timestamp = (i * 0.2).toFixed(2)
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new (globalThis as unknown as { Image: new () => HTMLImageElement }).Image()
        img.src = `/hero_frames/frame-${frameNum}-${timestamp}s.webp`
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error(`Failed to load frame ${frameNum}`))
      })
    })
    return Promise.all(promises)
  }

  const resizeCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvas.offsetWidth || window.innerWidth
    canvas.height = canvas.offsetHeight || window.innerHeight
    drawFrame(frameIndexRef.current)
  }

  const drawFrame = (index: number) => {
    const canvas = canvasRef.current
    const img = imagesRef.current[index]
    if (!canvas || !img) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  }

  const startAnimation = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    resizeCanvas()

    let lastTimestamp = performance.now()
    let accumulated = 0

    const loop = (timestamp: number) => {
      const delta = timestamp - lastTimestamp
      lastTimestamp = timestamp
      accumulated += delta

      while (
        accumulated >= FRAME_INTERVAL &&
        frameIndexRef.current < FRAME_COUNT - 1
      ) {
        accumulated -= FRAME_INTERVAL
        frameIndexRef.current++
        drawFrame(frameIndexRef.current)
      }

      if (frameIndexRef.current < FRAME_COUNT - 1) {
        rafRef.current = requestAnimationFrame(loop)
      }
    }

    drawFrame(0)
    rafRef.current = requestAnimationFrame(loop)
  }

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    if (reducedMotion) {
      const img = new (globalThis as unknown as { Image: new () => HTMLImageElement }).Image()
      img.src = `/hero_frames/frame-0016-3.00s.webp`
      img.onload = () => {
        const frames: HTMLImageElement[] = []
        frames[FRAME_COUNT - 1] = img
        imagesRef.current = frames
        frameIndexRef.current = FRAME_COUNT - 1
        resizeCanvas()
        setFramesReady(true)
      }
      return
    }

    const timer = setTimeout(async () => {
      try {
        imagesRef.current = await preloadFrames()
        drawFrame(0)
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
            <div className="flex w-full flex-col justify-center text-right md:ml-auto md:w-1/2 md:max-w-[38rem]">
              <h1 className="hero-part-2 font-primary text-[clamp(2.5rem,4.8vw,4.25rem)] leading-[1.1] text-sand">
                حضارات
                <br />
                تروى بالعطر
              </h1>

              <p className="hero-part-3 mt-5 max-w-[31rem] text-body text-sand/80">
                بوابتك إلى كنوز الحضارات: من بابل إلى مصر، الصين، اليونان،
                والخليج
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-start gap-4 md:gap-6">
                <span className="hero-part-4 inline-flex">
                  <a
                    href="#rafid"
                    className="group relative inline-flex h-9 items-center overflow-hidden whitespace-nowrap bg-gold px-4 font-primary text-[13px] text-royal-navy transition-transform duration-[250ms] ease-out-expo hover:scale-[1.01] active:scale-[0.99] md:h-[40px] md:px-5 md:text-[14px]"
                  >
                    <span aria-hidden="true" className="cta-sheen" />
                    <span className="relative">اكتشف عطر رافد</span>
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
                  </a>
                </span>

                <span className="hero-part-5 inline-flex">
                  <a
                    href="#civilizations"
                    className="group inline-flex items-center gap-1.5 whitespace-nowrap font-primary text-[13px] text-sand/80 transition-colors duration-200 ease-out hover:text-gold md:gap-2 md:text-[14px]"
                  >
                    استكشف الحضارات القادمة
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
                  alt="الأهرامات وبابل واليونان والصين في مدينة واحدة"
                  fill
                  priority
                  quality={90}
                  sizes="100vw"
                  className="hidden object-cover md:block"
                />

                <img
                  src="/images/hero/hero_img_mobile.webp"
                  alt="الأهرامات وبابل واليونان والصين في مدينة واحدة"
                  className="block h-full w-full object-cover md:hidden"
                  loading="eager"
                  fetchPriority="high"
                />
              </>
            )}

            {/* the night keeps the words readable */}
            <div
              aria-hidden="true"
              className="absolute inset-0 z-10"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(10,22,40,0.72) 0%, rgba(10,22,40,0.18) 45%, rgba(10,22,40,0.55) 100%)",
              }}
            />

            {/* Cinematic Gradient Fade */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-0 z-20 h-64 w-full"
              style={{
                backgroundImage:
                  "linear-gradient(to top, #0a1628 0%, transparent 100%)",
              }}
            />
          </div>

          {/* the navy scrim under the words, so the right half stays legible */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              background:
                "linear-gradient(to left, #0a1628 0%, transparent 100%)",
            }}
          />
        </div>
      </DarkGradientBg>
    </section>
  )
}
