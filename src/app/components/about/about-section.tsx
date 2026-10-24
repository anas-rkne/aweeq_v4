"use client"

import React, { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { CIVILIZATION_SCENES } from "./about-data"
import { AboutCanvas, type AboutCanvasHandle } from "./about-canvas"
import { AboutSceneOverlay } from "./about-scene-overlay"

export function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const roomRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<AboutCanvasHandle>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const sceneIndexRef = useRef(0)

  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)

  useEffect(() => {
    const section = sectionRef.current
    const room = roomRef.current
    if (!section || !room) return

    gsap.registerPlugin(ScrollTrigger)

    const totalFrames = CIVILIZATION_SCENES.reduce(
      (acc, scene) => acc + scene.frameCount,
      0
    )
    const totalRunway = totalFrames * 70

    room.style.height = `${totalRunway}px`

    let st: ScrollTrigger | undefined

    const ctx = gsap.context(() => {
      st = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: `+=${totalRunway}`,
        pin: true,
        pinSpacing: false,
        scrub: 1,
        anticipatePin: 1,
        onUpdate: (self) => {
          const progress = self.progress

          // the canvas is driven directly — no React render per scroll frame
          canvasRef.current?.draw(progress)

          const targetFrame = Math.min(
            totalFrames - 0.0001,
            progress * totalFrames
          )

          let accumulatedFrames = 0
          let sceneIndex = 0
          let localFrame = 0

          for (let i = 0; i < CIVILIZATION_SCENES.length; i++) {
            const count = CIVILIZATION_SCENES[i].frameCount
            if (targetFrame < accumulatedFrames + count) {
              sceneIndex = i
              localFrame = targetFrame - accumulatedFrames
              break
            }
            accumulatedFrames += count
            sceneIndex = i
            localFrame = count
          }

          const scene = CIVILIZATION_SCENES[sceneIndex]
          const local = Math.min(1, localFrame / scene.frameCount)

          if (sceneIndex !== sceneIndexRef.current) {
            sceneIndexRef.current = sceneIndex
            setCurrentSceneIndex(sceneIndex)
          }

          // the words leave just before the dissolve and return with the new
          // scene, also without a React render
          const text = textRef.current
          if (text) {
            let opacity = 1
            let translateY = 0

            if (sceneIndex > 0 && local < 0.12) {
              opacity = local / 0.12
              translateY = 20 * (1 - opacity)
            }
            if (local > 0.88) {
              opacity = (1 - local) / 0.12
              translateY = -20 * (1 - opacity)
            }

            text.style.opacity = String(Math.max(0, Math.min(1, opacity)))
            text.style.transform = `translateY(${translateY}px)`
          }
        },
      })
    }, section)

    const refresh = () => ScrollTrigger.refresh()
    void document.fonts?.ready.then(refresh)
    window.addEventListener("load", refresh)

    return () => {
      window.removeEventListener("load", refresh)
      ctx.revert()
      st?.kill()
      if (room) room.style.height = ""
    }
  }, [])

  return (
    <>
      <section
        id="story"
        ref={sectionRef}
        className="relative z-10 h-screen w-screen overflow-hidden bg-royal-navy"
      >
        <AboutCanvas ref={canvasRef} />

        {/* a light scrim on the text side only — the scene stays clear, the
            words on the right keep their contrast */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            backgroundImage:
              "linear-gradient(to left, rgba(10, 22, 40, 0.7) 0%, rgba(10, 22, 40, 0.35) 34%, rgba(10, 22, 40, 0) 70%)",
          }}
        />

        {/* the divider shared by the rest of the page: the top of the section
            melts into the midnight of the hero above */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-[11] h-32 w-full md:h-64"
          style={{
            background:
              "linear-gradient(to bottom, var(--color-royal-navy) 0%, transparent 100%)",
          }}
        />

        <AboutSceneOverlay
          ref={textRef}
          currentSceneIndex={currentSceneIndex}
        />
      </section>

      <div id="about-room" ref={roomRef} aria-hidden="true" />
    </>
  )
}
