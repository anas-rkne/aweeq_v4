"use client"

import { useSpotlight } from "@/shared/motion/use-spotlight"
import { cn } from "@/shared/lib/cn"

/**
 * A card that carries a cursor-tracked spotlight: a soft gold glow that follows
 * the pointer across the media. Replaces the old `box-shadow` hover (shadow
 * bloom is expensive to animate and reads as a plate, not light). The glow is a
 * pre-rendered radial layer moved with `quickTo` — transform and opacity only.
 */
export function SpotlightCard({
  children,
  className,
  layerClassName,
}: {
  children: React.ReactNode
  className?: string
  layerClassName?: string
}) {
  const { containerRef, layerRef } = useSpotlight<HTMLDivElement>()

  return (
    <div
      ref={containerRef}
      className={cn("group relative overflow-hidden", className)}
    >
      {children}
      <div
        ref={layerRef}
        aria-hidden="true"
        className={cn("spotlight-layer z-20", layerClassName)}
      />
    </div>
  )
}
