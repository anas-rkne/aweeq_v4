"use client"

import { useEffect } from "react"
import Lenis from "lenis"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

/**
 * Smooth scroll for the whole page.
 *
 * One engine, two jobs: Lenis gives the page its own curve on the wheel,
 * and ScrollTrigger reads that curve. The two are wired the way GSAP expects
 * — Lenis never runs its own requestAnimationFrame, GSAP's ticker drives it
 * and hands every frame to ScrollTrigger — so a trigger and the scroll it
 * follows can never disagree about where the page is.
 *
 * Lenis measures the document height once and caches the maximum scroll
 * position. Pinned sections are created (and refresh) *after* the first paint,
 * which grows the document. Without a forced re-measure, Lenis keeps the old
 * limit and the wheel stops dead at the height the page had on load. Every
 * ScrollTrigger refresh therefore re-measures Lenis as well.
 *
 * Lenis writes the *real* scroll position of the document, so the browser's
 * own scroll timelines (`animation-timeline: scroll()`) stay true to what is
 * on screen.
 *
 * Under `prefers-reduced-motion: reduce` none of this runs: the page keeps
 * the browser's own scrolling, untouched.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    gsap.registerPlugin(ScrollTrigger)

    const lenis = new Lenis({
      autoRaf: false,
      smoothWheel: true,
      syncTouch: false,
      duration: 1.1,
    })

    const onScroll = () => ScrollTrigger.update()
    lenis.on("scroll", onScroll)

    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    // pinned sections change the document height long after Lenis measured it
    const syncLimit = () => lenis.resize()
    ScrollTrigger.addEventListener("refresh", syncLimit)

    const refresh = () => {
      ScrollTrigger.refresh()
    }
    void document.fonts?.ready.then(refresh)
    window.addEventListener("load", refresh)
    lenis.resize()

    // anchors travel on the same curve as the wheel
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const anchor = (event.target as HTMLElement | null)?.closest?.(
        "a[href^='#']"
      ) as HTMLAnchorElement | null
      if (!anchor) return

      const hash = anchor.getAttribute("href")
      if (!hash || hash === "#") return

      const target = document.querySelector(hash)
      if (!target) return

      event.preventDefault()
      lenis.scrollTo(target as HTMLElement, { offset: 0 })
    }

    document.addEventListener("click", onClick)

    return () => {
      document.removeEventListener("click", onClick)
      ScrollTrigger.removeEventListener("refresh", syncLimit)
      window.removeEventListener("load", refresh)
      gsap.ticker.remove(raf)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
