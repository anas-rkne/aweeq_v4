"use client"

import { useEffect, useLayoutEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

/**
 * ScrollReveal — one system for the whole home page.
 *
 * Every piece of reading content (headlines, paragraphs, figures, links and
 * cards) arrives with the same gesture: it fades up from a small offset the
 * first time it reaches the lower edge of the screen, and then it is simply
 * there. One controller, one curve, one distance — so the page has a single
 * voice instead of a different entrance per section.
 *
 * What it deliberately does not touch:
 *   • `#featured-fragrance` — its label lives inside a pinned film and is
 *     animated by that film;
 *   • `[data-reveal]` — the store invitation already reveals its own pieces;
 *   • anything that carries a layout transform (a centred or rotated block):
 *     gsap would overwrite the centring, so those are left alone;
 *   • decorative layers (`aria-hidden`), and elements already parked.
 *
 * The transform is handed back to CSS when the reveal finishes, so a card's
 * hover lift or a button's scale keeps working afterwards.
 */

const SELECTOR = [
  "main h1",
  "main h2",
  "main h3",
  "main p",
  "main figure",
  "main blockquote",
  "main a[href]",
].join(",")

const SKIP = "#featured-fragrance, [data-reveal], [data-no-reveal]"

/** useLayoutEffect on the client, useEffect on the server: the hidden state
 *  is painted before the first frame, so nothing flashes in and then hides. */
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect

export function ScrollReveal() {
  useIsomorphicLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(SELECTOR)
    ).filter((element) => {
      if (element.closest(SKIP)) return false
      if (element.closest('[aria-hidden="true"]')) return false
      // a block that is centred or rotated by CSS keeps its own transform
      if (getComputedStyle(element).transform !== "none") return false
      // nothing to reveal on an empty anchor
      if (
        !element.textContent?.trim() &&
        element.tagName !== "FIGURE" &&
        !element.querySelector("img")
      ) {
        return false
      }
      return true
    })

    if (elements.length === 0) return

    const ctx = gsap.context(() => {
      gsap.set(elements, { autoAlpha: 0, y: 28 })

      ScrollTrigger.batch(elements, {
        start: "top 88%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.08,
            overwrite: true,
            clearProps: "transform",
          }),
      })

      /* safety net: a line that sits at the very foot of the page can never
         cross the 88% line (the page ends before it does). When the document
         bottom is reached, anything still hidden is simply shown, so no copy
         can be trapped invisible. */
      ScrollTrigger.create({
        trigger: document.body,
        start: "bottom bottom",
        once: true,
        onEnter: () => {
          const still = elements.filter(
            (element) => getComputedStyle(element).visibility === "hidden"
          )
          if (still.length === 0) return
          gsap.to(still, {
            autoAlpha: 1,
            y: 0,
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.05,
            overwrite: true,
            clearProps: "transform",
          })
        },
      })
    })

    return () => ctx.revert()
  }, [])

  return null
}

export default ScrollReveal
