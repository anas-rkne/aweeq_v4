"use client"

import { useEffect, useRef, useState } from "react"

/**
 * The scroll cue at the foot of the hero: a chevron that lifts while it is on
 * screen and stops the moment it is not. The loop is driven by CSS, this
 * component only reports whether the mark is in view so the animation can be
 * paused off screen (and it never runs under reduced motion — see the
 * `prefers-reduced-motion` block in globals.css).
 *
 * The mark is drawn inside a 56px box: the touch target stays generous while
 * the chevron itself keeps its small, quiet weight.
 */
export function ScrollCue({
  target = "#chapter-one",
  label = "انتقل إلى الفصل الأول",
}: {
  target?: string
  label?: string
}) {
  const ref = useRef<HTMLAnchorElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <a
      ref={ref}
      href={target}
      aria-label={label}
      data-playing={inView ? "true" : "false"}
      className="inline-flex h-14 w-14 shrink-0 items-center justify-center text-gold transition-colors duration-200 ease-out hover:text-sand"
    >
      <svg
        viewBox="0 0 56 56"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="square"
        aria-hidden="true"
        className="scroll-cue-mark h-14 w-14"
      >
        <path d="M20 24l8 8 8-8" />
      </svg>
    </a>
  )
}
