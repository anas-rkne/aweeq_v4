"use client"

import * as React from "react"
import { cn } from "@/shared/lib/cn"

/* ── the curved row ──────────────────────────────────────────────
 * One row of images streams from right to left around the inside of a
 * cylinder. The centre faces you flat, the ends bend toward you so each
 * end image curves along its length, and the ends fade into the page.
 *
 * A CSS box can't bend, so every tile is cut into SLICES vertical strips,
 * each a flat facet of the cylinder showing its share of the image. The
 * strips sit still inside their tile, each turned its own few degrees
 * round the cylinder's axis, and the tile (preserve-3d) is what moves: one
 * rotateY about that same axis carries the whole tile along the arc. A
 * tile is one animation, so its strips can never drift apart or show
 * different images. Only a tile's delay differs, and that sets where on
 * the arc it sits. The band is transform-only on the compositor; the fade
 * is a static mask over it.
 *
 * The only JS is a ResizeObserver that sizes the loop, and a handler that
 * hands a tile its next image each time it wraps, out of sight.
 * ─────────────────────────────────────────────────────────────── */

const SLICES = 16
const CAMERA = 1.6

function arc(bend: number) {
  return (CAMERA - 1 + Math.cos(bend)) / (2 * CAMERA * Math.sin(bend))
}

const MAX_WIDTH = 55

function measure(
  width: number,
  height: number,
  tile: number,
  aspect: number,
  gap: number,
  bend: number
) {
  const h = Math.min(
    (tile / 100) * height,
    ((MAX_WIDTH / 100) * width) / aspect
  )
  const radius = width * arc(bend)
  if (!(h > 0) || !(radius > 0))
    return { columns: 2, sweep: 0, unit: 0, limit: 0 }
  const deg = (rad: number) => (rad * 180) / Math.PI
  const unit = deg(h / radius)
  const pitch = (aspect + gap / 100) * unit
  const limit = deg(bend) + (aspect * unit) / 2
  const columns = Math.min(60, Math.max(2, Math.ceil((2 * limit) / pitch)))
  const round = (n: number) => +n.toFixed(4)
  const sweep = round((columns * pitch) / 2)
  return {
    columns,
    sweep,
    unit: round(unit),
    limit: round(Math.min(sweep, limit)),
  }
}

export type TiltedGridImage = {
  src: string
  alt?: string
}

export type TiltedGridHeroProps = {
  images: TiltedGridImage[]
  /** Seconds for the row to advance by one tile. @default 4 */
  speed?: number
  /** Tile height, as a percentage of the hero's height. @default 26 */
  tileHeight?: number
  /** Tile width divided by tile height. @default 16 / 9 */
  aspectRatio?: number
  /** Space between tiles, as a percentage of a tile's height. @default 6 */
  gap?: number
  /** Vertical centre of the row, as a percentage of the hero's height. @default 56 */
  axis?: number
  /** How far the row has bent round by the frame's edge, in degrees (5–85). @default 80 */
  curve?: number
  /** Width of the fade at each end, as a percentage of the hero's width. @default 12 */
  fade?: number
  /** Let the scroll steer the row: scrolling down carries it left, scrolling
   *  back up reverses it smoothly from wherever it stands. The direction and
   *  the easing rate are published on the root as `data-direction` /
   *  `data-rate`, so a shader behind the row can travel with it. */
  reactive?: boolean
  /** Content rendered above the band. */
  children?: React.ReactNode
  className?: string
}

export function TiltedGridHero({
  images,
  speed = 4,
  tileHeight = 26,
  aspectRatio = 16 / 9,
  gap = 6,
  axis = 56,
  curve = 80,
  reactive = false,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & TiltedGridHeroProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const orbit = `tgh-o-${id}`
  const tile = `tgh-t-${id}`
  const bend = (Math.min(85, Math.max(5, curve)) * Math.PI) / 180

  const [layout, setLayout] = React.useState<ReturnType<typeof measure> | null>(
    null
  )

  const [shown, setShown] = React.useState<Record<number, number>>({})

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const next = measure(width, height, tileHeight, aspectRatio, gap, bend)
      setLayout((prev) =>
        prev?.columns === next.columns &&
        prev.sweep === next.sweep &&
        prev.unit === next.unit
          ? prev
          : next
      )
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [tileHeight, aspectRatio, gap, bend])

  // Fetch every image up front. A tile picks up its next one just before
  // it comes back into view, too late to start loading it then.
  React.useEffect(() => {
    for (const { src } of images) new Image().src = src
  }, [images])

  /* The scroll steers the row. The tiles are CSS animations, so their speed
     lives in the Web Animations API: the root publishes a direction, the loop
     eases the playback rate toward it, and the row comes to rest and turns
     instead of snapping. `animation-direction` could not do this without
     throwing every tile to the other end of the arc.
     `data-direction` and `data-rate` are published for the shader behind. */
  React.useEffect(() => {
    if (!reactive) return
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let direction = 1
    let rate = 1
    let last = window.scrollY
    let frame = 0

    const tick = () => {
      const y = window.scrollY
      const delta = y - last
      last = y
      if (Math.abs(delta) > 1.5) direction = delta > 0 ? 1 : -1

      rate += (direction - rate) * 0.12
      if (Math.abs(rate) < 0.04) rate = 0

      el.dataset.direction = String(direction)
      el.dataset.rate = rate.toFixed(3)

      for (const animation of el.getAnimations({ subtree: true })) {
        animation.playbackRate = rate
      }

      frame = window.requestAnimationFrame(tick)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting ?? false
        if (visible && !frame) {
          last = window.scrollY
          frame = window.requestAnimationFrame(tick)
        } else if (!visible && frame) {
          window.cancelAnimationFrame(frame)
          frame = 0
        }
      },
      { rootMargin: "120px" }
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
      if (frame) window.cancelAnimationFrame(frame)
      for (const animation of el.getAnimations({ subtree: true })) {
        animation.playbackRate = 1
      }
      delete el.dataset.direction
      delete el.dataset.rate
    }
  }, [reactive])

  const { columns, sweep, unit, limit } =
    layout ?? measure(1200, 560, tileHeight, aspectRatio, gap, bend)

  const u = (n: number) =>
    `calc(${+n.toFixed(4)} * min(${tileHeight}cqh, ${+(
      MAX_WIDTH / aspectRatio
    ).toFixed(4)}cqw))`

  const r = 100 * arc(bend)
  const radius = `${+r.toFixed(3)}cqw`
  const turn = (deg: number) =>
    `translateZ(${radius}) rotateY(${+deg.toFixed(4)}deg) translateZ(-${radius})`

  const hide = +(((sweep - limit) / (2 * sweep || 1)) * 100).toFixed(4)
  const css =
    `@keyframes ${orbit}{` +
    `from{transform:${turn(-sweep)}}to{transform:${turn(sweep)}}` +
    `0%,${hide}%,${100 - hide}%,100%{visibility:hidden}` +
    `${hide + 0.001}%,${100 - hide - 0.001}%{visibility:visible}}` +
    `@media(prefers-reduced-motion:reduce){.${tile}{animation-play-state:paused}}`

  const share = aspectRatio / SLICES
  const duration = columns * speed

  return (
    <div
      ref={ref}
      data-tilted-grid=""
      className={cn("relative overflow-hidden", className)}
      {...props}
      style={{ containerType: "size", ...props.style }}
    >
      <style>{css}</style>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: layout ? 1 : 0,
          perspective: `${+(r * CAMERA).toFixed(3)}cqw`,
          perspectiveOrigin: `50% ${axis}%`,
        }}
      >
        {Array.from({ length: columns }, (_, t) => {
          const first = columns - 1 - t
          const img = images[(shown[t] ?? first) % Math.max(images.length, 1)]
          return (
            <div
              key={t}
              className={cn(tile, "absolute")}
              style={{
                left: `calc(50% - ${u(aspectRatio / 2)})`,
                top: `calc(${axis}% - ${u(0.5)})`,
                width: u(aspectRatio),
                height: u(1),
                transformStyle: "preserve-3d",
                animation: `${orbit} ${duration}s linear ${-t * speed}s infinite`,
              }}
              onAnimationIteration={(e) => {
                const lap = Math.round(e.elapsedTime / duration)
                setShown((prev) => {
                  const next = lap * columns + first
                  return prev[t] === next ? prev : { ...prev, [t]: next }
                })
              }}
            >
              {Array.from({ length: SLICES }, (_, k) => (
                <div
                  key={k}
                  className={cn(
                    "absolute top-0 overflow-hidden bg-navy-800",
                    k === 0 && "rounded-l-lg",
                    k === SLICES - 1 && "rounded-r-lg"
                  )}
                  style={{
                    left: u((aspectRatio - share) / 2),
                    width:
                      k === SLICES - 1 ? u(share) : `calc(${u(share)} + 1px)`,
                    height: u(1),
                    transform: turn(
                      (aspectRatio / 2 - (k + 0.5) * share) * unit
                    ),
                  }}
                >
                  {img ? (
                    <img
                      src={img.src}
                      alt={k === 0 ? (img.alt ?? "") : ""}
                      draggable={false}
                      className="absolute top-0 max-w-none object-cover"
                      style={{
                        left: u(-k * share),
                        width: u(aspectRatio),
                        height: u(1),
                      }}
                    />
                  ) : null}
                </div>
              ))}

              {img?.alt ? (
                <span
                  className="pointer-events-none absolute inset-x-0 whitespace-nowrap text-center font-primary text-gold"
                  style={{
                    bottom: "100%",
                    paddingBottom: u(0.12),
                    fontSize: u(0.1),
                    lineHeight: 1,
                  }}
                >
                  {img.alt}
                </span>
              ) : null}
            </div>
          )
        })}
      </div>

      {children}
    </div>
  )
}

export default TiltedGridHero
