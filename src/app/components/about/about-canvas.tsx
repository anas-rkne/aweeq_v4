"use client"

import React, { useEffect, useRef } from "react"
import { CIVILIZATION_SCENES } from "./about-data"

interface AboutCanvasProps {
  currentSceneIndex: number
  sceneProgress: number // 0 to 1 within the current scene
}

export function AboutCanvas({
  currentSceneIndex,
  sceneProgress,
}: AboutCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesCacheRef = useRef<Map<string, HTMLImageElement[]>>(new Map())
  const loadedRef = useRef<boolean>(false)

  // Preload all frames on mount
  useEffect(() => {
    let isMounted = true

    async function loadAllFrames() {
      const cache = imagesCacheRef.current

      for (const scene of CIVILIZATION_SCENES) {
        if (cache.has(scene.folder)) continue
        const imgArray: HTMLImageElement[] = []

        const promises = Array.from(
          { length: scene.frameCount },
          (_, index) => {
            return new Promise<void>((resolve) => {
              const img = new window.Image()
              const frameNum = String(index + 1).padStart(4, "0")
              // e.g. /0_frame/frame-0001-0.00s.webp
              // Let's check naming format: frame-0001-0.00s.webp
              // We can construct the exact filenames dynamically or match what exists
              // Let's verify exact naming from earlier check: frame-0001-0.00s.webp
              // Notice index 0 is 0001, 1 is 0002... increments of 0.20s: 0.00s, 0.20s, 0.40s...
              // Let's generate seconds correctly: (index * 0.2).toFixed(2)
              const seconds = (index * 0.2).toFixed(2)
              img.src = `/${scene.folder}/frame-${frameNum}-${seconds}s.webp`

              img.onload = () => {
                imgArray[index] = img
                resolve()
              }
              img.onerror = () => {
                // Fallback attempt without seconds or standard numbering
                img.src = `/${scene.folder}/frame-${frameNum}.webp`
                img.onload = () => {
                  imgArray[index] = img
                  resolve()
                }
                img.onerror = () => resolve() // skip missing gracefully
              }
            })
          }
        )

        await Promise.all(promises)
        if (isMounted) {
          cache.set(scene.folder, imgArray)
        }
      }

      loadedRef.current = true
    }

    void loadAllFrames()

    return () => {
      isMounted = false
    }
  }, [])

  // Render canvas frame on progress change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const cache = imagesCacheRef.current
    const currentScene = CIVILIZATION_SCENES[currentSceneIndex]
    if (!currentScene) return

    const images = cache.get(currentScene.folder)
    if (!images || images.length === 0) return

    // Calculate frame index based on sceneProgress (0 to 1)
    const frameIndex = Math.min(
      images.length - 1,
      Math.floor(sceneProgress * images.length)
    )

    const img = images[frameIndex] || images[0]
    if (!img) return

    // Resize canvas to match display size with DPR
    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr
      canvas.height = height * dpr
    }

    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)

    // Draw image with object-fit: cover equivalent
    const imgRatio = img.width / img.height
    const canvasRatio = width / height

    let renderWidth = width
    let renderHeight = height
    let offsetX = 0
    let offsetY = 0

    if (canvasRatio > imgRatio) {
      renderHeight = width / imgRatio
      offsetY = (height - renderHeight) / 2
    } else {
      renderWidth = height * imgRatio
      offsetX = (width - renderWidth) / 2
    }

    ctx.drawImage(img, offsetX, offsetY, renderWidth, renderHeight)
    ctx.restore()
  }, [currentSceneIndex, sceneProgress])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full object-cover"
    />
  )
}
