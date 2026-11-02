"use client"

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react"
import { createFrameWindow, type FrameWindow } from "@/shared/lib/frame-window"
import { CIVILIZATION_SCENES } from "./about-data"
import { BRAND_COLORS } from "@/shared/config/brand"

const TOTAL_FRAMES = CIVILIZATION_SCENES.reduce(
  (acc, scene) => acc + scene.frameCount,
  0
)

let frameAccumulator = 0
const SCENE_BOUNDS = CIVILIZATION_SCENES.map((scene) => {
  const start = frameAccumulator / TOTAL_FRAMES
  frameAccumulator += scene.frameCount
  const end = frameAccumulator / TOTAL_FRAMES
  return { start, end, count: scene.frameCount, folder: scene.folder }
})

/* One streaming window per scene folder, created lazily and dropped the moment
 * the scene leaves the runway (see evictDistantScenes). Frames stay at native
 * resolution, but only the ~13 around the current position are decoded at a
 * time — so a full scroll of the story holds tens of MiB, not 1.6 GiB. */
const FRAME_RADIUS = 5
const windows = new Map<string, FrameWindow>()

/* a module-level hook the canvas sets, so any freshly-decoded frame (across
   any scene) can ask the canvas to repaint even while the scroll is still */
let onFrameReady: (() => void) | null = null

function urlFor(folder: string) {
  return (index: number) => {
    const frameNumber = String(index + 1).padStart(4, "0")
    const seconds = (index * 0.1).toFixed(2)
    return `/${folder}/frame-${frameNumber}-${seconds}s.webp`
  }
}

function windowFor(folder: string): FrameWindow {
  let window = windows.get(folder)
  if (!window) {
    window = createFrameWindow(urlFor(folder), FRAME_RADIUS)
    window.subscribe(() => onFrameReady?.())
    windows.set(folder, window)
  }
  return window
}

function localProgress(index: number, progress: number): number {
  const bounds = SCENE_BOUNDS[index]
  if (!bounds) return 0
  return Math.min(
    1,
    Math.max(0, (progress - bounds.start) / (bounds.end - bounds.start))
  )
}

function wantedFrame(index: number, progress: number): number {
  const bounds = SCENE_BOUNDS[index]
  const local = localProgress(index, progress)
  return Math.min(bounds.count - 1, Math.floor(local * bounds.count))
}

function focusScene(index: number, progress: number) {
  const bounds = SCENE_BOUNDS[index]
  if (!bounds) return
  windowFor(bounds.folder).focus(wantedFrame(index, progress), bounds.count)
}

function sceneImage(index: number, progress: number) {
  const bounds = SCENE_BOUNDS[index]
  if (!bounds) return null
  return windowFor(bounds.folder).nearest(
    wantedFrame(index, progress),
    bounds.count
  )
}

function evictDistantScenes(keep: Set<string>) {
  for (const folder of [...windows.keys()]) {
    if (!keep.has(folder)) {
      windows.get(folder)!.dispose()
      windows.delete(folder)
    }
  }
}

export interface AboutCanvasHandle {
  draw: (progress: number) => void
}

/** The canvas paints the frame for the current scroll progress. It is driven
 *  imperatively from the section's ScrollTrigger, so scrolling never causes a
 *  React render. Adjacent scenes are cross-faded over a short window at their
 *  handover, which keeps the journey feeling like one continuous shot. */
export const AboutCanvas = forwardRef<AboutCanvasHandle>(
  function AboutCanvas(_props, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const lastProgressRef = useRef(0)

    const draw = useCallback((progress: number) => {
      lastProgressRef.current = progress

      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d", { alpha: false })
      if (!ctx) return

      const cssWidth = canvas.clientWidth || window.innerWidth
      const cssHeight = canvas.clientHeight || window.innerHeight
      if (cssWidth === 0 || cssHeight === 0) return

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const pixelWidth = Math.round(cssWidth * dpr)
      const pixelHeight = Math.round(cssHeight * dpr)
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
      }

      const width = canvas.width
      const height = canvas.height
      const p = Math.min(1, Math.max(0, progress))

      let sceneIndex = CIVILIZATION_SCENES.length - 1
      for (let i = 0; i < SCENE_BOUNDS.length; i++) {
        if (p < SCENE_BOUNDS[i].end) {
          sceneIndex = i
          break
        }
      }

      /* a short dissolve centred on each handover */
      const blend = 0.02
      let blendIndex = -1
      let blendAmount = 0
      for (let i = 0; i < SCENE_BOUNDS.length - 1; i++) {
        const boundary = SCENE_BOUNDS[i].end
        if (Math.abs(p - boundary) <= blend) {
          blendIndex = i
          const raw = (p - (boundary - blend)) / (blend * 2)
          blendAmount = raw * raw * (3 - 2 * raw)
          break
        }
      }

      // keep the current scene (and, when blending, the two being dissolved)
      // loaded; the next scene warms up a whole runway ahead of when it is seen
      const keep = new Set<string>()
      focusScene(sceneIndex, p)
      keep.add(SCENE_BOUNDS[sceneIndex].folder)
      if (p > 0 && sceneIndex + 1 < SCENE_BOUNDS.length) {
        focusScene(sceneIndex + 1, p)
        keep.add(SCENE_BOUNDS[sceneIndex + 1].folder)
      }
      if (blendIndex >= 0) {
        focusScene(blendIndex, p)
        focusScene(blendIndex + 1, p)
        keep.add(SCENE_BOUNDS[blendIndex].folder)
        keep.add(SCENE_BOUNDS[blendIndex + 1].folder)
      }
      evictDistantScenes(keep)

      const fromImage =
        blendIndex >= 0 ? sceneImage(blendIndex, p) : sceneImage(sceneIndex, p)
      const toImage = blendIndex >= 0 ? sceneImage(blendIndex + 1, p) : null

      // a slow, continuous push-in across the whole journey
      const zoom = 1 + p * 0.045

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
      ctx.globalAlpha = 1
      ctx.fillStyle = BRAND_COLORS.navy
      ctx.fillRect(0, 0, width, height)

      // while a frame is still in flight the navy ground stands in, so the
      // canvas is never a transparent (black) flash
      if (!fromImage && !toImage) return

      const drawCover = (img: HTMLImageElement, alpha: number) => {
        const scale = Math.max(width / img.width, height / img.height) * zoom
        const drawWidth = img.width * scale
        const drawHeight = img.height * scale
        ctx.globalAlpha = alpha
        ctx.drawImage(
          img,
          (width - drawWidth) / 2,
          (height - drawHeight) / 2,
          drawWidth,
          drawHeight
        )
      }

      if (fromImage) drawCover(fromImage, 1)
      if (toImage) drawCover(toImage, blendAmount)
      ctx.globalAlpha = 1
    }, [])

    useEffect(() => {
      // repaint the current frame the moment any freshly-decoded frame lands,
      // so a scrub that is held still still advances to the newest pixels
      onFrameReady = () => draw(lastProgressRef.current)
      return () => {
        onFrameReady = null
      }
    }, [draw])

    useEffect(() => {
      // paint the navy ground immediately, then the first frame the moment it
      // is decoded — no 60 fps poll waiting for it to land
      draw(0)
      const firstFolder = SCENE_BOUNDS[0].folder
      void windowFor(firstFolder)
        .whenReady(0)
        .then(() => draw(lastProgressRef.current))
    }, [draw])

    useEffect(() => {
      const onResize = () => draw(lastProgressRef.current)
      window.addEventListener("resize", onResize)
      return () => window.removeEventListener("resize", onResize)
    }, [draw])

    useImperativeHandle(ref, () => ({ draw }), [draw])

    return (
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 z-0 h-full w-full"
      />
    )
  }
)
