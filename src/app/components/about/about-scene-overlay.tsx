"use client"

import React from "react"
import { CIVILIZATION_SCENES, CivilizationScene } from "./about-data"

interface AboutSceneOverlayProps {
  currentSceneIndex: number
  sceneProgress: number
}

export function AboutSceneOverlay({
  currentSceneIndex,
  sceneProgress,
}: AboutSceneOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 md:p-20 lg:p-24" dir="rtl">
      {/* Top Header info */}
      <div className="flex items-center justify-between">
        <span className="font-secondary text-xs tracking-[0.3em] text-gold uppercase">
          3WEEQ · CINEMATIC ODYSSEY
        </span>
        <span className="font-secondary text-xs tracking-[0.2em] text-sand/50">
          0{currentSceneIndex + 1} / 0{CIVILIZATION_SCENES.length}
        </span>
      </div>

      {/* Central Content */}
      <div className="relative max-w-2xl my-auto">
        {CIVILIZATION_SCENES.map((scene, index) => {
          const isActive = index === currentSceneIndex
          // Calculate individual text fade based on progress
          // Fade in during first 30%, fade out during last 30%
          let opacity = 0
          let translateY = 20

          if (isActive) {
            if (sceneProgress < 0.2) {
              opacity = sceneProgress / 0.2
              translateY = 20 * (1 - opacity)
            } else if (sceneProgress > 0.8) {
              opacity = (1 - sceneProgress) / 0.2
              translateY = -20 * (1 - opacity)
            } else {
              opacity = 1
              translateY = 0
            }
          }

          if (!isActive && opacity <= 0) return null

          return (
            <div
              key={scene.id}
              className={`absolute inset-0 flex flex-col justify-center transition-all duration-300 ${
                isActive ? "pointer-events-auto" : "pointer-events-none"
              }`}
              style={{
                opacity,
                transform: `translateY(${translateY}px)`,
                visibility: isActive ? "visible" : "hidden",
              }}
            >
              <span className="font-secondary text-xs tracking-[0.28em] text-gold mb-3">
                {scene.label}
              </span>
              <h2 className="font-secondary text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] text-sand mb-6">
                {scene.title}
              </h2>
              <p className="font-primary text-base md:text-lg leading-relaxed text-sand/85 max-w-xl mb-4">
                {scene.body}
              </p>
              <p className="font-primary text-xs md:text-sm leading-relaxed text-sand/45 max-w-xl">
                {scene.bodyEn}
              </p>

              <div className="mt-8">
                <a
                  href="/products"
                  className="inline-flex items-center gap-3 border border-gold/40 bg-gold/10 px-6 py-3 font-primary text-sm text-gold transition-colors duration-300 hover:bg-gold hover:text-royal-navy"
                >
                  <span>استكشف عطور الحضارة</span>
                  <span aria-hidden="true">←</span>
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom Scroll Indicator */}
      <div className="flex items-center justify-between border-t border-sand/10 pt-6">
        <span className="font-secondary text-[11px] tracking-[0.2em] text-sand/40">
          SCROLL TO EXPLORE HERITAGE
        </span>
        <div className="flex gap-2">
          {CIVILIZATION_SCENES.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 transition-all duration-500 ${
                idx === currentSceneIndex ? "w-8 bg-gold" : "w-2 bg-sand/20"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
