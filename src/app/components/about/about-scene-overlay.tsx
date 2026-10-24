"use client"

import React, { forwardRef } from "react"
import { CIVILIZATION_SCENES } from "./about-data"

interface AboutSceneOverlayProps {
  currentSceneIndex: number
}

export const AboutSceneOverlay = forwardRef<
  HTMLDivElement,
  AboutSceneOverlayProps
>(function AboutSceneOverlay({ currentSceneIndex }, ref) {
  const scene = CIVILIZATION_SCENES[currentSceneIndex]
  if (!scene) return null

  return (
    <div
      dir="rtl"
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-start px-6 sm:px-10 md:px-16 lg:px-24"
    >
      <div ref={ref} className="w-full max-w-xl text-right">
        <h2 className="mb-5 font-secondary text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] text-sand">
          {scene.title}
        </h2>

        <p className="max-w-xl font-primary text-base leading-relaxed text-sand/85 md:text-lg">
          {scene.body}
        </p>
      </div>
    </div>
  )
})
