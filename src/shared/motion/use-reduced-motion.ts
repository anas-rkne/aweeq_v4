"use client"

import { useSyncExternalStore } from "react"

const QUERY = "(prefers-reduced-motion: reduce)"

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
 * `true` when the visitor asked for reduced motion.
 *
 * SSR-safe: the server snapshot is `false` and the real value is read on the
 * client through `matchMedia`, so there is no hydration mismatch. The hook
 * re-renders when the preference changes at runtime.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
