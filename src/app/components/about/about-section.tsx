"use client"

import React, { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { CIVILIZATION_SCENES } from "./about-data"
import { AboutCanvas } from "./about-canvas"
import { AboutSceneOverlay } from "./about-scene-overlay"

export function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const roomRef = useRef<HTMLDivElement>(null)

  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [sceneProgress, setSceneProgress] = useState(0)

  useEffect(() => {
    const section = sectionRef.current
    const room = roomRef.current
    if (!section || !room) return

    gsap.registerPlugin(ScrollTrigger)

    const totalScenes = CIVILIZATION_SCENES.length
    const runwayPerScene = 2400
    const totalRunway = totalScenes * runwayPerScene

    room.style.height = `${totalRunway}px`

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: `+=${totalRunway}`,
      pin: true,
      pinSpacing: false,
      scrub: 1,
      anticipatePin: 1,
      onUpdate: (self) => {
        const progress = self.progress // 0 to 1
        const scaled = progress * totalScenes
        const sceneIndex = Math.min(
          totalScenes - 1,
          Math.floor(scaled)
        )
        const localProgress = scaled - sceneIndex

        setCurrentSceneIndex(sceneIndex)
        setSceneProgress(localProgress)
      },
    })

    const refresh = () => ScrollTrigger.refresh()
    void document.fonts?.ready.then(refresh)
    window.addEventListener("load", refresh)

    return () => {
      window.removeEventListener("load", refresh)
      st.kill()
      if (room) room.style.height = ""
    }
  }, [])

  return (
    <>
      <section
        id="story"
        ref={sectionRef}
        className="relative z-10 h-screen w-screen overflow-hidden bg-[#0a1628]"
      >
        <AboutCanvas
          currentSceneIndex={currentSceneIndex}
          sceneProgress={sceneProgress}
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/35 to-[#0a1628]/60 pointer-events-none"
        />

        <AboutSceneOverlay
          currentSceneIndex={currentSceneIndex}
          sceneProgress={sceneProgress}
        />
      </section>

      <div
        id="about-room"
        ref={roomRef}
        aria-hidden="true"
      />
    </>
  )
}
