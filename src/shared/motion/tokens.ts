/**
 * Motion tokens — the single source of truth for easing curves, durations,
 * stagger steps and travel distances.
 *
 * Every GSAP tween and every CSS transition must read from here instead of
 * repeating a raw value. The CSS equivalents of these curves already live in
 * `globals.css` (`--ease-out-expo`); the two stay in sync by hand and this
 * file is the reference.
 */

/** GSAP easing names. */
export const EASING = {
  outExpo: "expo.out",
  outQuint: "power3.out",
  outQuart: "power4.out",
  inOutQuart: "power4.inOut",
  inOutSine: "sine.inOut",
  none: "none",
} as const

/** CSS cubic-bezier equivalents, for transitions outside GSAP. */
export const EASING_CSS = {
  outExpo: "cubic-bezier(0.22, 1, 0.36, 1)",
  inOutQuart: "cubic-bezier(0.76, 0, 0.24, 1)",
  inOutSine: "cubic-bezier(0.37, 0, 0.63, 1)",
  linear: "linear",
} as const

/** Durations in seconds (GSAP's native unit). */
export const DURATION = {
  touch: 0.16,
  ui: 0.28,
  reveal: 0.8,
  cinema: 1.2,
  page: 0.7,
} as const

/** Background drift, in seconds. */
export const LOOP_SLOW = { min: 24, max: 30 } as const

/** Stagger steps in seconds. */
export const STAGGER = {
  heroLine: 0.1,
  sectionWord: 0.05,
  item: 0.07,
} as const

/** Travel distances — pixels, except `mask` (a percentage). */
export const DISTANCE = {
  riseSm: 8,
  riseMd: 14,
  riseLg: 24,
  mask: "110%",
  tiltMax: 3,
  magnetMax: 6,
} as const
