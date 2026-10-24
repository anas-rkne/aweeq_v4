"use client"

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react"
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

/** Each scene is decoded as it is needed, never all at once. The arrays fill
 *  up frame by frame, so a scene can be drawn while the rest is still in
 *  flight. */
const sceneFrames = new Map<string, (HTMLImageElement | undefined)[]>()
const scenePromises = new Map<string, Promise<void>>()
const completeScenes = new Set<string>()

function loadFrame(folder: string, index: number) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new window.Image()
    img.decoding = "async"
    const frameNumber = String(index + 1).padStart(4, "0")
    const seconds = (index * 0.1).toFixed(2)
    img.src = `/${folder}/frame-${frameNumber}-${seconds}s.webp`

    img.onload = () => {
      // Decode once, while the loader is still quiet: drawImage() then never
      // pays the decode cost in the middle of a scroll frame.
      const decoded = img.decode?.()
      if (!decoded) {
        resolve(img)
        return
      }
      void decoded.catch(() => undefined).then(() => resolve(img))
    }
    img.onerror = () => resolve(null)
  })
}

function ensureScene(index: number) {
  const scene = CIVILIZATION_SCENES[index]
  if (!scene) return

  const folder = scene.folder
  if (completeScenes.has(folder) || scenePromises.has(folder)) return

  const frames: (HTMLImageElement | undefined)[] = new Array(scene.frameCount)
  sceneFrames.set(folder, frames)

  const promise = Promise.all(
    Array.from({ length: scene.frameCount }, (_, frameIndex) =>
      loadFrame(folder, frameIndex).then((img) => {
        if (img) frames[frameIndex] = img
      })
    )
  ).then(() => {
    completeScenes.add(folder)
    scenePromises.delete(folder)
  })

  scenePromises.set(folder, promise)
}

function sceneImage(index: number, progress: number) {
  const bounds = SCENE_BOUNDS[index]
  if (!bounds) return null

  const frames = sceneFrames.get(bounds.folder)
  if (!frames || frames.length === 0) return null

  const local = Math.min(
    1,
    Math.max(0, (progress - bounds.start) / (bounds.end - bounds.start))
  )
  const wanted = Math.min(frames.length - 1, Math.floor(local * frames.length))

  // while a scene is still loading, hold the closest frame we already have
  for (let i = wanted; i >= 0; i--) {
    if (frames[i]) return frames[i]!
  }
  for (let i = wanted + 1; i < frames.length; i++) {
    if (frames[i]) return frames[i]!
  }
  return null
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

      // the next scene starts loading as soon as the journey begins, so a whole
      // scene of scrolling time is available before its frames are needed
      ensureScene(sceneIndex)
      if (p > 0) ensureScene(sceneIndex + 1)
      if (blendIndex >= 0) {
        ensureScene(blendIndex)
        ensureScene(blendIndex + 1)
      }

      const fromImage =
        blendIndex >= 0 ? sceneImage(blendIndex, p) : sceneImage(sceneIndex, p)
      const toImage = blendIndex >= 0 ? sceneImage(blendIndex + 1, p) : null

      if (!fromImage && !toImage) return

      // a slow, continuous push-in across the whole journey
      const zoom = 1 + p * 0.045

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
      ctx.globalAlpha = 1
      ctx.fillStyle = BRAND_COLORS.navy
      ctx.fillRect(0, 0, width, height)

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
      ensureScene(0)

      // paint the first frame as soon as it lands, so the section is never a
      // blank rectangle while it scrolls into view
      let raf = 0
      const tick = () => {
        draw(lastProgressRef.current)
        const firstScene = sceneFrames.get(CIVILIZATION_SCENES[0].folder)
        if (!firstScene?.[0]) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)

      return () => cancelAnimationFrame(raf)
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
