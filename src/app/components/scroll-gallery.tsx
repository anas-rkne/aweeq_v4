"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"
import { useLocale } from "next-intl"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { getLenis } from "@/shared/lib/lenis-store"
import { SectionFade } from "@/shared/ui/section-fade"

gsap.registerPlugin(ScrollTrigger)

/**
 * ScrollGallery — the boutique's four rooms as one horizontal journey.
 *
 * Three ideas, one track:
 *
 *   1. Scroll-scrubbed. The section is a tall, sticky stage (like the film
 *      above it). Vertical scroll is the playhead: as the page moves down the
 *      belt carries the rooms past, left to right, at a rate the reader owns.
 *
 *   2. Draggable with momentum and snap. The belt can also be grabbed and
 *      thrown. It follows the hand one-to-one, carries its velocity on
 *      release, and settles on the nearest room — Apple's carousel, not a
 *      marquee. Drag and scroll share one source of truth (the scroll
 *      position), so they can never disagree about where the belt is.
 *
 *   3. Parallax + Ken Burns. Inside every card the image pans against the
 *      card's travel and drifts with a very slow zoom, while the caption
 *      slides a touch the other way — three layers of depth behind the glass.
 *
 * Under `prefers-reduced-motion` none of this runs: the section un-pins and
 * the belt becomes a plain swipeable strip.
 */

export type GalleryItem = {
  image: string
  title: string
  description: string
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"

/* how hard a release throws the belt, in milliseconds of carry */
const FLING_MS = 260

export function ScrollGallery({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: GalleryItem[]
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  const beltRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const locale = useLocale()
  /* the belt's geometry must be one fixed direction, or an RTL track anchors
     to its right edge and the loop drives itself off the page. The rooms
     themselves still read in the page's direction — see `dir` on each card. */
  const textDir = locale === "ar" ? "rtl" : "ltr"

  useEffect(() => {
    const stage = stageRef.current
    const belt = beltRef.current
    const track = trackRef.current
    if (!stage || !belt || !track) return
    if (window.matchMedia(REDUCED_MOTION).matches) return

    const section = stage.parentElement ?? stage
    const cards = Array.from(track.querySelectorAll<HTMLElement>("[data-card]"))
    if (cards.length === 0) return

    const imgLayers = cards.map((card) =>
      card.querySelector<HTMLElement>("[data-img-parallax]")
    )
    const txtLayers = cards.map((card) =>
      card.querySelector<HTMLElement>("[data-text-parallax]")
    )
    const kbLayers = cards.map((card) =>
      card.querySelector<HTMLElement>("[data-kenburns]")
    )
    /* each card's Ken Burns drift starts at its own phase, so neighbours never
       pulse in unison */
    const phases = cards.map((_, i) => (i / cards.length) * Math.PI * 2)

    /* the horizontal distance the belt can travel: track width minus the
       viewport, plus breathing room so the last room can reach the middle */
    let maxX = 0
    let cardMetrics: Array<{ center: number; width: number }> = []

    const measure = () => {
      const pad = Math.max(window.innerWidth * 0.06, 48)
      maxX = Math.max(0, track.scrollWidth - window.innerWidth + pad)
      cardMetrics = cards.map((card) => {
        const width = card.offsetWidth
        return { center: card.offsetLeft + width / 2, width }
      })
    }
    measure()

    /* the one source of truth: how far (0 → 1) through the belt's travel the
       scroll currently sits. Scroll writes it; drag writes it; the render loop
       only ever reads it. */
    let progress = 0

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        progress = self.progress
      },
    })
    progress = st.progress

    const scrollDistance = () => Math.max(1, st.end - st.start)

    const setScroll = (value: number) => {
      const clamped = gsap.utils.clamp(st.start, st.end, value)
      st.scroll(clamped)
      progress = (clamped - st.start) / scrollDistance()
      return clamped
    }

    const toScroll = (trackX: number) =>
      st.start + (-trackX / Math.max(1, maxX)) * scrollDistance()

    /* ===== drag: momentum + snap ===== */
    let dragging = false
    let startX = 0
    let startScroll = 0
    let lastX = 0
    let lastT = 0
    let velocity = 0
    let snapTween: gsap.core.Tween | null = null

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return
      dragging = true
      startX = e.clientX
      lastX = e.clientX
      lastT = performance.now()
      velocity = 0
      startScroll = st.scroll()
      snapTween?.kill()
      snapTween = null
      /* a wheel still easing under the hand must not fight the drag */
      getLenis()?.stop()
      if (e.pointerType === "mouse") belt.setPointerCapture(e.pointerId)
    }

    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      const now = performance.now()
      const dt = Math.max(1, now - lastT)
      const instant = (e.clientX - lastX) / dt
      velocity = velocity * 0.75 + instant * 0.25
      lastX = e.clientX
      lastT = now

      const dx = e.clientX - startX
      const factor = scrollDistance() / Math.max(1, maxX)
      setScroll(startScroll - dx * factor)
    }

    const onUp = (e: PointerEvent) => {
      if (!dragging) return
      dragging = false
      getLenis()?.start()
      if (e.pointerType === "mouse" && e.pointerId != null) {
        try {
          belt.releasePointerCapture(e.pointerId)
        } catch {
          /* the pointer may already be released */
        }
      }

      if (cardMetrics.length === 0 || maxX <= 0) return

      /* throw the current position forward by the release velocity, then land
         on whichever room ends up nearest the centre of the screen */
      const trackX = -progress * maxX
      const projected = trackX + velocity * FLING_MS
      const viewportC = window.innerWidth / 2

      let best = 0
      let bestDist = Infinity
      cardMetrics.forEach((m, i) => {
        const d = Math.abs(m.center + projected - viewportC)
        if (d < bestDist) {
          bestDist = d
          best = i
        }
      })

      const targetScroll = toScroll(viewportC - cardMetrics[best].center)
      const from = st.scroll()
      const duration = gsap.utils.clamp(
        0.35,
        0.9,
        Math.abs(targetScroll - from) / 1400
      )

      const proxy = { s: from }
      snapTween = gsap.to(proxy, {
        s: targetScroll,
        duration,
        ease: "expo.out",
        overwrite: "auto",
        onUpdate: () => setScroll(proxy.s),
        onComplete: () => {
          snapTween = null
        },
      })
    }

    belt.addEventListener("pointerdown", onDown)
    belt.addEventListener("pointermove", onMove)
    belt.addEventListener("pointerup", onUp)
    belt.addEventListener("pointercancel", onUp)

    /* ===== render: belt travel + parallax + Ken Burns ===== */
    const start = performance.now()
    let raf = 0

    const render = (now: number) => {
      const trackX = -progress * maxX
      track.style.transform = `translate3d(${trackX.toFixed(2)}px, 0, 0)`

      const viewportC = window.innerWidth / 2
      const elapsed = now - start

      for (let i = 0; i < cards.length; i++) {
        const m = cardMetrics[i]
        if (!m) continue

        /* distance of the card's centre from the viewport centre, in px */
        const t = m.center + trackX - viewportC

        const img = imgLayers[i]
        if (img) {
          /* the image counter-pans, so it reads as a deeper layer than the card */
          const p = gsap.utils.clamp(-m.width * 0.05, m.width * 0.05, -t * 0.1)
          img.style.transform = `translate3d(${p.toFixed(2)}px, 0, 0)`
        }

        const txt = txtLayers[i]
        if (txt) {
          /* the caption leans a little into the travel, a nearer layer still */
          const p = gsap.utils.clamp(
            -m.width * 0.015,
            m.width * 0.015,
            t * 0.03
          )
          txt.style.transform = `translate3d(${p.toFixed(2)}px, 0, 0)`
        }

        const kb = kbLayers[i]
        if (kb) {
          const s = 1.05 + 0.045 * Math.sin(elapsed * 0.00005 + phases[i])
          kb.style.transform = `scale(${s.toFixed(4)})`
        }
      }

      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)

    const resize = new ResizeObserver(() => {
      measure()
      ScrollTrigger.refresh()
    })
    resize.observe(track)

    ScrollTrigger.refresh()

    return () => {
      cancelAnimationFrame(raf)
      resize.disconnect()
      belt.removeEventListener("pointerdown", onDown)
      belt.removeEventListener("pointermove", onMove)
      belt.removeEventListener("pointerup", onUp)
      belt.removeEventListener("pointercancel", onUp)
      snapTween?.kill()
      getLenis()?.start()
      st.kill()
      track.style.transform = ""
      for (const layer of [...imgLayers, ...txtLayers, ...kbLayers]) {
        if (layer) layer.style.transform = ""
      }
    }
  }, [items])

  return (
    <div
      ref={stageRef}
      className="sticky top-0 flex h-svh flex-col overflow-hidden motion-reduce:relative motion-reduce:h-auto motion-reduce:min-h-svh motion-reduce:py-24"
    >
      {/* the fog the film above leaves behind */}
      <SectionFade edge="top" zIndex={20} />

      <header className="relative z-10 mx-auto w-full max-w-4xl shrink-0 px-6 pt-20 text-center md:pt-24">
        <h2 className="font-secondary text-[1.9rem] leading-[1.2] text-gold sm:text-4xl md:text-5xl">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl font-primary text-base leading-[1.85] text-sand/70 md:mt-5 md:text-lg">
          {description}
        </p>
      </header>

      {/* the belt. the edge fade is a mask, so the rooms dissolve into the
          page instead of being sliced by the viewport. `pan-y` leaves vertical
          touch scrolling to the browser while handing horizontal drags to us. */}
      <div
        ref={beltRef}
        data-belts
        data-no-reveal
        dir="ltr"
        className="relative z-10 flex flex-1 cursor-grab items-center overflow-hidden select-none [touch-action:pan-y] active:cursor-grabbing motion-reduce:mt-12 motion-reduce:block"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, #000 6%, #000 94%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, #000 6%, #000 94%, transparent 100%)",
        }}
      >
        <div ref={trackRef} className="flex w-max will-change-transform">
          {items.map((item) => (
            <article
              key={item.title}
              data-card
              dir={textDir}
              className="group relative w-[82vw] shrink-0 pe-4 sm:w-[60vw] md:pe-6 lg:w-[40vw]"
            >
              <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-royal-navy">
                {/* the image rides a wider-than-card layer so its parallax never
                    uncovers an edge, and a Ken Burns layer scales beneath it */}
                <div
                  data-img-parallax
                  aria-hidden="true"
                  className="absolute -left-[6%] top-0 h-full w-[112%] will-change-transform"
                >
                  <div
                    data-kenburns
                    className="absolute inset-0 will-change-transform"
                  >
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 82vw, (max-width: 1024px) 60vw, 40vw"
                      className="object-cover"
                    />
                  </div>
                </div>

                <div
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(3,10,19,0.94) 0%, rgba(3,10,19,0.55) 32%, rgba(3,10,19,0.05) 66%, rgba(3,10,19,0) 100%)",
                  }}
                />

                <div
                  data-text-parallax
                  className="absolute inset-x-0 bottom-0 p-5 will-change-transform md:p-7"
                >
                  <h3 className="font-secondary text-2xl leading-tight text-gold md:text-3xl">
                    {item.title}
                  </h3>
                  <p className="mt-2 max-w-[38ch] font-primary text-[0.85rem] leading-[1.7] text-sand/75 md:text-sm">
                    {item.description}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* the fog the newsletter rises out of */}
      <SectionFade edge="bottom" zIndex={20} />
    </div>
  )
}

export default ScrollGallery
