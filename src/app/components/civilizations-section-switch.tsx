"use client"

import { useSyncExternalStore } from "react"
import { AboutSection } from "./about/about-section"
import { CivilizationsSection } from "./civilizations-section"

/**
 * The home page's civilizations block has two lives:
 *
 *   • desktop keeps the existing four-civilization film, untouched;
 *   • phones play the story page's film verbatim — the same five scenes, the
 *     same portrait frames and the same copy — so the home page and `/story`
 *     feel like one continuous piece on a phone.
 *
 * Only one of them is mounted at a time, so the hidden one never loads frames
 * or builds a ScrollTrigger.
 */
const MOBILE_QUERY = "(max-width: 767px)"

function subscribe(callback: () => void) {
  const media = window.matchMedia(MOBILE_QUERY)
  media.addEventListener("change", callback)
  return () => media.removeEventListener("change", callback)
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches
}

/** SSR and the first hydration pass render the desktop block. */
function getServerSnapshot() {
  return false
}

export function CivilizationsSectionSwitch() {
  const isMobile = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  if (isMobile) {
    // the story experience, handed the home page's anchor id
    return <AboutSection sectionId="civilizations" />
  }

  return <CivilizationsSection />
}
