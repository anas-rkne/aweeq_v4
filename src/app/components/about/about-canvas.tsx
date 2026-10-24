"use client"

import React, { useEffect, useRef } from "react"
import { CIVILIZATION_SCENES } from "./about-data"

interface AboutCanvasProps {
  currentSceneIndex: number
  sceneProgress: number
}

export function AboutCanvas({
  currentSceneIndex,
  sceneProgress,
}: AboutCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesCacheRef = useRef<Map<string, HTMLImageElement[]>>(new Map())

  // Robust multi-pattern frame loader
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
              const frameNumPadded = String(index + 1).padStart(4, "0")
              const frameNumSimple = String(index + 1)
              const seconds = (index * 0.2).toFixed(2)

              img.src = `/${scene.folder}/frame-${frameNumPadded}-${seconds}s.webp`

              img.onload = () => {
                imgArray[index] = img
                resolve()
              }
              img.onerror = () => {
                const imgFallback = new window.Image()
                imgFallback.src = `/${scene.folder}/frame-${frameNumPadded}.webp`
                imgFallback.onload = () => {
                  imgArray[index] = imgFallback
                  resolve()
                }
                imgFallback.onerror = () => {
                  const imgSimple = new window.Image()
                  imgSimple.src = `/${scene.folder}/frame-${frameNumSimple}.webp`
                  imgSimple.onload = () => {
                    imgArray[index] = imgSimple
                    resolve()
                  }
                  imgSimple.onerror = () => resolve()
                }
              }
            })
          }
        )

        await Promise.all(promises)
        if (isMounted) {
          cache.set(scene.folder, imgArray)
        }
      }
    }

    void loadAllFrames()

    return () => {
      isMounted = false
    }
  }, [])

  // Canvas render loop with object-fit: cover scaling
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

    const validImages = images.filter(Boolean)
    if (validImages.length === 0) return

    const frameIndex = Math.min(
      validImages.length - 1,
      Math.floor(sceneProgress * validImages.length)
    )

    const img = validImages[frameIndex] || validImages[0]
    if (!img) return

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
