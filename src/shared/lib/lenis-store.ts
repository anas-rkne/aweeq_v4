import type Lenis from "lenis"

/**
 * A single, module-scoped handle to the page's Lenis instance.
 *
 * SmoothScroll owns the Lenis lifecycle and registers it here on mount; the
 * boutique's carousel reads it back so a drag gesture can halt an in-flight
 * wheel animation before it writes the scroll position itself. Without this,
 * a reader who wheels and then immediately grabs the belt would watch Lenis
 * and the drag fight over the same scroll for the remainder of Lenis's curve.
 */

let lenis: Lenis | null = null

export function setLenis(instance: Lenis | null) {
  lenis = instance
}

export function getLenis() {
  return lenis
}
