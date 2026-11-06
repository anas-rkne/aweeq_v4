"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"
import { useLocale } from "next-intl"

/**
 * ScrollGallery — the boutique's four rooms on one endless belt.
 *
 * No grid, no tilt, no scroll choreography: a single horizontal track that
 * carries the rooms past the reader at a constant, unhurried pace, doubled so
 * the seam never shows. The belt pauses under the hand and under the keyboard
 * so a room can actually be read, and it stands still for anyone who asked
 * motion to stay out of the way (the copy is then simply laid out in place).
 *
 * Nothing here is scrubbed by scroll: the belt is time, not position, which is
 * what makes it read as a carousel rather than another reveal.
 */

export type GalleryItem = {
  image: string
  title: string
  description: string
}

/* px per second — slow enough to read a room as it passes */
const SPEED = 54

export function ScrollGallery({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: GalleryItem[]
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const locale = useLocale()
  /* the belt's geometry must be one fixed direction, or an RTL track anchors
     to its right edge and the loop drives itself off the page. The rooms
     themselves still read in the page's direction — see `dir` on each card. */
  const textDir = locale === "ar" ? "rtl" : "ltr"

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const set = track.querySelector<HTMLElement>("[data-set]")
    if (!set) return

    const zone = track.parentElement ?? track

    let width = 0
    let offset = 0
    let last = 0
    let paused = false
    let frame = 0

    const measure = () => {
      width = set.getBoundingClientRect().width
      /* a resize can leave the belt stranded past its own seam */
      if (width > 0 && offset <= -width) offset = -(Math.abs(offset) % width)
    }
    measure()

    const resize = new ResizeObserver(measure)
    resize.observe(track)

    const tick = (now: number) => {
      if (!last) last = now
      /* a tab that was asleep must not teleport the belt */
      const dt = Math.min((now - last) / 1000, 0.064)
      last = now

      if (!paused && width > 0) {
        offset -= SPEED * dt
        if (offset <= -width) offset += width
        track.style.transform = `translate3d(${offset.toFixed(2)}px, 0, 0)`
      }

      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    const hold = () => {
      paused = true
    }
    const release = () => {
      paused = false
    }

    zone.addEventListener("pointerenter", hold)
    zone.addEventListener("pointerleave", release)
    zone.addEventListener("focusin", hold)
    zone.addEventListener("focusout", release)

    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      zone.removeEventListener("pointerenter", hold)
      zone.removeEventListener("pointerleave", release)
      zone.removeEventListener("focusin", hold)
      zone.removeEventListener("focusout", release)
    }
  }, [items])

  return (
    <div className="py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="font-secondary text-[1.9rem] leading-[1.2] text-gold sm:text-4xl md:text-5xl">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl font-primary text-base leading-[1.85] text-sand/70 md:mt-5 md:text-lg">
          {description}
        </p>
      </div>

      {/* the belt. the edge fade is a mask, so the rooms dissolve into the
          page instead of being sliced by the viewport */}
      <div
        data-belts
        data-no-reveal
        dir="ltr"
        className="mt-12 overflow-hidden md:mt-16"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, #000 5%, #000 95%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, #000 5%, #000 95%, transparent 100%)",
        }}
      >
        <div ref={trackRef} className="flex w-max will-change-transform">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              data-set
              aria-hidden={copy === 1 ? true : undefined}
              className="flex shrink-0 gap-4 pe-4 md:gap-6 md:pe-6"
            >
              {items.map((item) => (
                <article
                  key={`${copy}-${item.title}`}
                  dir={textDir}
                  className="group relative w-[74vw] shrink-0 sm:w-[54vw] lg:w-[33vw]"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-royal-navy">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 74vw, (max-width: 1024px) 54vw, 33vw"
                      className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.035]"
                    />

                    <div
                      aria-hidden="true"
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(3,10,19,0.94) 0%, rgba(3,10,19,0.55) 32%, rgba(3,10,19,0.05) 66%, rgba(3,10,19,0) 100%)",
                      }}
                    />

                    <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
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
          ))}
        </div>
      </div>
    </div>
  )
}

export default ScrollGallery
