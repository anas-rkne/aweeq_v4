"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SectionFade } from "@/shared/ui/section-fade"

gsap.registerPlugin(ScrollTrigger)

/* every image in public/images/hero-2 */
const IMAGES = ["1", "2", "3", "4", "5", "6", "7", "8"].map(
  (n) => `/images/hero-2/${n}.webp`
)

/**
 * The track holds two identical groups and travels exactly one group before
 * wrapping: the frame it resets on is identical to the frame it started from,
 * so the seam is invisible and the strip is never empty. One group is 16 cards
 * (~4,900px on a wide screen), which is wider than a 4K viewport, so there is
 * no bare edge at any point of the cycle.
 */
const GROUP = [...IMAGES, ...IMAGES]
const TRACK = [...GROUP, ...GROUP]

/* the strip's resting drift, in pixels per second */
const DRIFT = 44
/* how quickly the drift returns after a drag — larger is snappier */
const RETURN_RATE = 2.6
/* how quickly the strip settles under the pointer — larger is snappier */
const SETTLE_RATE = 10
/* a fling is clamped so the wrap can never jump a whole card in one frame */
const MAX_FLING = 1800

/**
 * hero-2 — an invitation to the store.
 *
 * A calm, centred invitation in the top half — huge gold headline, a short
 * description and one gold CTA — and beneath it a full-width marquee of the
 * civilizations, gliding from right to left without a seam.
 *
 * Each card is a mounted print rather than a bare rectangle: a bevelled
 * metallic mat, a deep cast shadow, a vignette that gives the photograph
 * volume and a single raking highlight across the glass.
 *
 * The strip is driven by hand rather than by a CSS keyframe, because it has to
 * answer the pointer: it drifts on its own, settles to a stop when the pointer
 * rests on it, and can be dragged with a fling that decays back into the
 * drift. Every frame is a single `translate3d` on one element, so the work
 * stays on the compositor and the 32 cards never re-layout.
 */
export function StoreInvitation() {
  const t = useTranslations("StoreInvitation")
  const sectionRef = useRef<HTMLElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track) return

    const cards = Array.from(track.children) as HTMLElement[]
    const half = Math.floor(cards.length / 2)
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    /* with reduced motion the strip is parked and only answers a drag */
    const drift = reduced ? 0 : DRIFT

    /* width of one group: where the strip wraps without a visible seam */
    let span = 0
    const measure = () => {
      const first = cards[0]
      const middle = cards[half]
      const step = first && middle ? middle.offsetLeft - first.offsetLeft : 0
      span = step > 0 ? step : track.scrollWidth / 2
    }
    measure()

    let offset = 0
    let speed = 0
    let target = drift
    let raf = 0
    let prev = 0
    let onScreen = true
    let hovered = false
    let dragging = false
    let pointer: number | null = null
    let lastX = 0
    let lastT = 0
    let fling = 0

    const paint = () => {
      if (span <= 0) return
      const wrapped = ((offset % span) + span) % span
      track.style.transform = `translate3d(${-wrapped}px, 0, 0)`
    }

    const frame = (now: number) => {
      raf = 0
      const dt = prev ? Math.min((now - prev) / 1000, 0.05) : 0
      prev = now

      if (dragging) {
        raf = requestAnimationFrame(frame)
        return
      }

      /* exponential approach: frame-rate independent, and it reads as weight
         rather than as a linear tween */
      const rate = target === 0 ? SETTLE_RATE : RETURN_RATE
      speed += (target - speed) * (1 - Math.exp(-rate * dt))
      offset += speed * dt
      paint()

      /* come to rest completely rather than crawling at 0.4px a second */
      if (target === 0 && Math.abs(speed) < 0.04) {
        speed = 0
        prev = 0
        return
      }

      raf = requestAnimationFrame(frame)
    }

    const run = () => {
      if (raf || document.hidden || !onScreen) return
      prev = 0
      raf = requestAnimationFrame(frame)
    }

    const halt = () => {
      if (!raf) return
      cancelAnimationFrame(raf)
      raf = 0
    }

    paint()
    run()

    const endDrag = (event: PointerEvent) => {
      if (!dragging) return
      if (pointer !== null && event.pointerId !== pointer) return

      dragging = false
      if (pointer !== null && viewport.hasPointerCapture(pointer)) {
        viewport.releasePointerCapture(pointer)
      }
      pointer = null

      /* the throw keeps its momentum, then decays into the drift */
      speed = Math.max(-MAX_FLING, Math.min(MAX_FLING, fling))
      if (Math.abs(speed) < 2) speed = 0

      /* capture can swallow the leave event, so ask where the pointer really
         ended up: released outside the strip means it should drift again */
      const box = viewport.getBoundingClientRect()
      hovered =
        event.clientX >= box.left &&
        event.clientX <= box.right &&
        event.clientY >= box.top &&
        event.clientY <= box.bottom

      target = hovered ? 0 : drift
      prev = 0
      run()
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return
      if (span <= 0) return

      dragging = true
      pointer = event.pointerId
      hovered = event.pointerType === "mouse"
      lastX = event.clientX
      lastT = event.timeStamp
      fling = 0
      speed = 0
      viewport.setPointerCapture(event.pointerId)
      prev = 0
      run()
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== pointer) return

      const dx = event.clientX - lastX
      const dt = Math.max(8, event.timeStamp - lastT) / 1000

      offset -= dx
      /* smoothed so one jittery sample cannot fling the strip across */
      fling = fling * 0.55 + (-dx / dt) * 0.45
      lastX = event.clientX
      lastT = event.timeStamp
      paint()
    }

    const onEnter = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return
      hovered = true
      target = 0
      run()
    }

    const onLeave = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return
      hovered = false
      if (!dragging) target = drift
      run()
    }

    const onVisibility = () => {
      if (document.hidden) halt()
      else run()
    }

    /* the strip is decorative repetition: park it when it is off screen */
    const intersection = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? true
        if (onScreen) run()
        else halt()
      },
      { rootMargin: "300px" }
    )
    intersection.observe(viewport)

    /* the group changes width when a breakpoint flips */
    const resize = new ResizeObserver(() => {
      measure()
      paint()
    })
    resize.observe(track)

    document.addEventListener("visibilitychange", onVisibility)
    viewport.addEventListener("pointerdown", onPointerDown)
    viewport.addEventListener("pointermove", onPointerMove)
    viewport.addEventListener("pointerup", endDrag)
    viewport.addEventListener("pointercancel", endDrag)
    viewport.addEventListener("pointerenter", onEnter)
    viewport.addEventListener("pointerleave", onLeave)

    return () => {
      halt()
      intersection.disconnect()
      resize.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
      viewport.removeEventListener("pointerdown", onPointerDown)
      viewport.removeEventListener("pointermove", onPointerMove)
      viewport.removeEventListener("pointerup", endDrag)
      viewport.removeEventListener("pointercancel", endDrag)
      viewport.removeEventListener("pointerenter", onEnter)
      viewport.removeEventListener("pointerleave", onLeave)
      if (pointer !== null && viewport.hasPointerCapture(pointer)) {
        viewport.releasePointerCapture(pointer)
      }
    }
  }, [])

  /* ===== fade & slide reveal: every element of the invitation — headline,
     description, door and the whole strip of cards — rises into place once,
     in reading order, as the section crosses into view ===== */
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      const elements = gsap.utils.toArray<HTMLElement>(
        section.querySelectorAll("[data-reveal]")
      )

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 62%",
          once: true,
        },
      })

      tl.fromTo(
        elements,
        { autoAlpha: 0, y: 36 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          stagger: 0.14,
        }
      )
      // the door keeps its own hover lift: hand the transform back to CSS
      tl.set(elements, { clearProps: "transform" })
    }, section)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="store-invitation"
      data-cuneiform-surface
      className="relative isolate flex min-h-svh flex-col justify-center overflow-visible pb-14 pt-28 md:pb-16 md:pt-32"
    >
      {/* the fog the hero leaves behind */}
      <SectionFade edge="top" zIndex={20} />

      {/* ===== the two glows that give the room its depth ===== */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 22%, rgba(47,78,120,0.32) 0%, rgba(10,22,40,0) 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 40% at 50% 92%, rgba(205,158,97,0.08) 0%, rgba(10,22,40,0) 70%)",
        }}
      />

      {/* ===== top half: the invitation ===== */}
      <div className="relative z-10 mx-auto w-full max-w-4xl px-6 text-center">
        <h2
          data-reveal
          className="font-primary text-5xl font-bold leading-[1.1] text-gold md:text-7xl"
        >
          {t("title")}
        </h2>

        <p
          data-reveal
          className="mx-auto mt-6 max-w-2xl font-primary text-lg leading-[1.8] text-sand/70"
        >
          {t("body")}
        </p>

        <Link
          data-reveal
          href="/products"
          className="group relative mt-8 inline-flex h-12 items-center overflow-hidden whitespace-nowrap rounded-sm bg-gold px-10 font-primary text-base font-bold text-royal-navy transition-transform duration-300 ease-out hover:scale-105"
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
            className="relative ms-2 h-4 w-4 -translate-x-1 opacity-0 transition-[transform,opacity] duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
          >
            <path d="M19 12H5" />
            <path d="M11 6l-6 6 6 6" />
          </svg>
        </Link>
      </div>

      {/* ===== bottom half: the marquee =====
          dir="ltr" is load-bearing: on an RTL page a track wider than its box
          hugs the right edge and overflows to the left, so translating it
          leftwards uncovers a growing gap on the right. Pinned to ltr it
          starts at the left edge and overflows right, so the strip stays
          wider than the screen for the whole cycle. */}
      <div
        ref={viewportRef}
        data-reveal
        dir="ltr"
        aria-hidden="true"
        className="relative z-10 mt-10 w-full cursor-grab touch-pan-y overflow-hidden py-6 select-none active:cursor-grabbing md:mt-14"
      >
        <div
          ref={trackRef}
          className="store-marquee flex w-max items-stretch will-change-transform"
        >
          {TRACK.map((src, index) => (
            <div
              key={index}
              className="relative mr-4 w-56 shrink-0 sm:w-64 md:mr-5 md:w-72"
            >
              {/* the mount: a bevelled metal mat, no outline. the highlight
                  sits on the top edge and the shadow falls under the foot —
                  that is what lifts the print off the wall, not a drawn line.
                  depth is written inline, so the element carries no ring. */}
              <div
                className="relative rounded-[3px] p-1.5 transition-transform duration-500 ease-out hover:-translate-y-1.5 md:p-2"
                style={{
                  background:
                    "linear-gradient(152deg, #1c2e48 0%, #0b1626 46%, #17283e 100%)",
                  boxShadow:
                    "0 18px 38px -18px rgba(0,0,0,0.9), 0 1px 0 0 rgba(246,230,214,0.07) inset",
                }}
              >
                {/* 9:16 is the photographs' own proportion (0.565 / 0.576), not
                    3:4 — the earlier frame was a third wider than the picture,
                    so cover had to crop the glass out of every frame. */}
                <div className="relative aspect-[9/16] overflow-hidden bg-royal-navy">
                  <Image
                    src={src}
                    alt=""
                    fill
                    draggable={false}
                    sizes="(min-width: 1024px) 288px, (min-width: 640px) 256px, 224px"
                    className="pointer-events-none object-cover"
                  />

                  {/* vignette — the corners fall away so the centre reads forward */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(ellipse 78% 62% at 50% 36%, rgba(10,22,40,0) 38%, rgba(10,22,40,0.52) 100%)",
                    }}
                  />

                  {/* the raking light across the glass, top-left to bottom-right */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(148deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.025) 30%, rgba(255,255,255,0) 52%)",
                    }}
                  />

                  {/* the foot of every card melts into the navy */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-royal-navy via-royal-navy/35 to-transparent"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* the fog the first chapter rises out of */}
      <SectionFade edge="bottom" zIndex={20} />
    </section>
  )
}

export default StoreInvitation
