"use client"

import { useSyncExternalStore } from "react"

const QUERY = "(pointer: fine)"

function subscribe(onStoreChange: () => void) {
  const query = window.matchMedia(QUERY)
  query.addEventListener("change", onStoreChange)
  return () => query.removeEventListener("change", onStoreChange)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

function getServerSnapshot() {
  return false
}

/**
 * `true` when the primary pointer is precise (mouse / trackpad), as opposed to
 * a coarse touch screen. Magnetic pull, tilt and spotlights only make sense
 * with a hoverable cursor, so every pointer micro-interaction gates on this.
 * SSR-safe (server snapshot `false`).
 */
export function useFinePointer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
