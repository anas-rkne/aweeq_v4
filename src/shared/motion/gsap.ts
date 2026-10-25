import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

/**
 * The single registration point for GSAP plugins. Every file that needs gsap
 * imports it from here instead of calling `gsap.registerPlugin` itself, so a
 * plugin is never registered twice and the registration order stays fixed.
 */
gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }
