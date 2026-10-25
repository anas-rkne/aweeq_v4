"use client"

import { useEffect, useRef } from "react"
import { gsap } from "@/shared/motion/gsap"
import { EASING } from "@/shared/motion/tokens"
import { useFinePointer } from "@/shared/motion/use-fine-pointer"
import { useReducedMotion } from "@/shared/motion/use-reduced-motion"

/**
 * A cursor-tracked glow inside a container.
 *
 * The container gets `containerRef`; a `.spotlight-layer` child gets
 * `layerRef`. While the pointer is over the container, `gsap.quickTo` drags the
 * layer (a pre-rendered radial gradient) to follow the cursor — transform only,
 * opacity for the fade, nothing else. Off for coarse pointers and under
 * reduced motion.
 */
export function useSpotlight<T extends HTMLElement = HTMLDivElement>() {
  const containerRef = useRef<T>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const finePointer = useFinePointer()

  useEffect(() => {
    if (reducedMotion || !finePointer) return

    const container = containerRef.current
    const layer = layerRef.current
    if (!container || !layer) return

    const xTo = gsap.quickTo(layer, "x", {
      duration: 0.45,
      ease: EASING.outQuint,
    })
    const yTo = gsap.quickTo(layer, "y", {
      duration: 0.45,
      ease: EASING.outQuint,
    })

    const move = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      xTo(event.clientX - rect.left - layer.offsetWidth / 2)
      yTo(event.clientY - rect.top - layer.offsetHeight / 2)
    }

    const enter = (event: PointerEvent) => {
      move(event)
      gsap.to(layer, { opacity: 1, duration: 0.4, ease: EASING.outQuint })
    }
    const leave = () => {
      gsap.to(layer, { opacity: 0, duration: 0.5, ease: EASING.outExpo })
    }

    container.addEventListener("pointerenter", enter)
    container.addEventListener("pointermove", move)
    container.addEventListener("pointerleave", leave)

    return () => {
      container.removeEventListener("pointerenter", enter)
      container.removeEventListener("pointermove", move)
      container.removeEventListener("pointerleave", leave)
    }
  }, [reducedMotion, finePointer])

  return { containerRef, layerRef }
}
