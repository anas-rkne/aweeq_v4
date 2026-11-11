"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { resolveScenes, type StoryMode } from "./about-data"
import { AboutCanvas, type AboutCanvasHandle } from "./about-canvas"
import { AboutSceneOverlay } from "./about-scene-overlay"

/** Phones get the dedicated portrait frame run; everything wider keeps the
 *  desktop folders. Matches the `md` breakpoint used across the site. */
const MOBILE_QUERY = "(max-width: 767px)"

export function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const roomRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<AboutCanvasHandle>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const sceneIndexRef = useRef(-1)

  const [mode, setMode] = useState<StoryMode>("desktop")
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)

  // pick the frame set for the current viewport
  const scenes = useMemo(() => resolveScenes(mode), [mode])

  // follow the breakpoint so a resize (or rotation) swaps the frame set live
  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY)
    const sync = () => setMode(query.matches ? "mobile" : "desktop")
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    const room = roomRef.current
    if (!section || !room) return

    gsap.registerPlugin(ScrollTrigger)

    const totalFrames = scenes.reduce(
      (acc, scene) => acc + scene.frameCount,
      0
    )
    const totalRunway = totalFrames * 70

    room.style.height = `${totalRunway}px`
    // force the overlay to announce the scene on the first update
    sceneIndexRef.current = -1

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

          for (let i = 0; i < scenes.length; i++) {
            const count = scenes[i].frameCount
            if (targetFrame < accumulatedFrames + count) {
              sceneIndex = i
              localFrame = targetFrame - accumulatedFrames
              break
            }
            accumulatedFrames += count
            sceneIndex = i
            localFrame = count
          }

          const scene = scenes[sceneIndex]
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
  }, [scenes])

  return (
    <>
      <section
        id="story"
        ref={sectionRef}
        className="relative z-10 h-screen w-screen overflow-hidden bg-royal-navy"
      >
        <AboutCanvas ref={canvasRef} scenes={scenes} mode={mode} />

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
          scene={scenes[currentSceneIndex]}
        />
      </section>

      <div id="about-room" ref={roomRef} aria-hidden="true" />
    </>
  )
}
