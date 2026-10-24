"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

/**
 * The cover.
 *
 * The hero is held in place while the about section — one screen tall and
 * opaque — rises over it like a curtain being drawn across the city.
 *
 * The DOM does the heavy lifting:
 *
 *   <div class="relative">
 *     <div class="relative z-0">{hero}</div>   ← pinned, stays put
 *     <div class="relative z-10">{about}</div> ← slides up over it
 *   </div>
 *
 * The about sits directly after the hero in the flow, so it starts exactly
 * one screen below the fold and, while the hero is pinned, the scroll carries
 * it up until it covers the viewport. Its content then keeps scrolling as
 * usual.
 *
 * Under `prefers-reduced-motion: reduce` nothing is pinned: the page simply
 * scrolls from the hero into the about.
 */
export function ScrollOver({
  hero,
  about,
}: {
  hero: React.ReactNode
  about: React.ReactNode
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const aboutRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    gsap.registerPlugin(ScrollTrigger)

    const wrap = wrapRef.current
    const heroEl = heroRef.current
    const aboutEl = aboutRef.current
    if (!wrap || !heroEl || !aboutEl) return

    const ctx = gsap.context(() => {
      // the hero is held in place; the about, one screen below it, is
      // carried up over the hero by the scroll itself
      gsap.timeline({
        scrollTrigger: {
          trigger: heroEl,
          start: "top top",
          end: "bottom top",
          scrub: 1,
          pin: true,
          pinSpacing: false,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })
    }, wrap)

    const refresh = () => ScrollTrigger.refresh()
    void document.fonts?.ready.then(refresh)
    window.addEventListener("load", refresh)

    return () => {
      window.removeEventListener("load", refresh)
      ctx.revert()
    }
  }, [])

  return (
    <div ref={wrapRef} className="relative">
      {/* the hero waits behind the curtain */}
      <div ref={heroRef} className="relative z-0">
        {hero}
      </div>
      {/* the about comes over it — it starts one screen below the hero, so
          the scroll carries it up until it covers the viewport */}
      <div ref={aboutRef} className="relative z-10">
        {about}
      </div>
    </div>
  )
}
