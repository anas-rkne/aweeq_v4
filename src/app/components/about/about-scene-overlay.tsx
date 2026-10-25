"use client"

import React, { forwardRef } from "react"
import { useLocale } from "next-intl"
import { CIVILIZATION_SCENES } from "./about-data"

interface AboutSceneOverlayProps {
  currentSceneIndex: number
}

export const AboutSceneOverlay = forwardRef<
  HTMLDivElement,
  AboutSceneOverlayProps
>(function AboutSceneOverlay({ currentSceneIndex }, ref) {
  const locale = useLocale()
  const scene = CIVILIZATION_SCENES[currentSceneIndex]
  if (!scene) return null
  const title = locale === "ar" ? scene.titleAr : scene.title
  const body = locale === "ar" ? scene.body : scene.bodyEn

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-6 sm:px-10 md:px-16">
      <div ref={ref} className="relative w-full max-w-2xl text-center">
        {/* a soft pool of night behind the words, just enough contrast */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-10 -inset-y-10 -z-10"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(10,22,40,0.55) 0%, rgba(10,22,40,0.25) 45%, rgba(10,22,40,0) 78%)",
          }}
        />

        <h2 className="mb-5 font-secondary text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] text-gold">
          {title}
        </h2>

        <p className="mx-auto max-w-xl font-primary text-base leading-relaxed text-sand/90 md:text-lg">
          {body}
        </p>
      </div>
    </div>
  )
})
