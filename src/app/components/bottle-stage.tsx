"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"

/**
 * BottleStage — the bottle, standing in the room, turned by the hand.
 *
 * A self-contained Three.js scene for the newsletter section, drawn on a
 * transparent canvas so the cuneiform wall behind it stays the background.
 * The model:
 *   • turns on its own the whole time (a slow 360° about the vertical axis);
 *   • answers the hand — a drag orbits it in any direction (free yaw, a
 *     clamped pitch), carries inertia when released, and the auto-rotation
 *     glides back in afterwards;
 *   • zooms a little: wheel on desktop, two-finger pinch on touch, clamped
 *     to ±20% so the layout can never break.
 *
 * The bottle loads lazily when the section is near (like the films), the
 * render loop runs only while the section is on screen, and everything is
 * disposed on unmount. Under `prefers-reduced-motion` the model is simply
 * still — it can be dragged, but it does not turn by itself. If the model
 * fails to load, the section simply carries on without it.
 */

const MODEL = "/images/bottle-mid.glb"
const AUTO_SPEED = 0.35 // radians per second
const DRAG_SCALE = 0.0075 // radians per dragged pixel
const PITCH_LIMIT = 0.42
const ZOOM_MIN = 0.8
const ZOOM_MAX = 1.2
const INERTIA_DECAY = 0.93
const TARGET_HEIGHT = 3.0 // world units; the camera is placed to fit it
const TARGET_WIDTH = 3.6

export function BottleStage({ className = "" }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let disposed = false
    let started = false
    let onScreen = false
    let frame = 0

    let renderer: THREE.WebGLRenderer | null = null
    let scene: THREE.Scene | null = null
    let camera: THREE.PerspectiveCamera | null = null
    let group: THREE.Group | null = null

    const canvas = document.createElement("canvas")
    canvas.style.display = "block"
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    canvas.style.cursor = "grab"
    canvas.style.touchAction = "pan-y"
    canvas.setAttribute("aria-hidden", "true")
    host.appendChild(canvas)

    /* ===== interaction state ===== */
    const yaw = { value: 0 }
    const pitch = { value: 0 }
    const velocity = { yaw: 0, pitch: 0 }
    const zoom = { target: 1, current: 1 }
    const pointers = new Map<number, { x: number; y: number }>()
    let pinchDistance = 0
    let pinching = false
    let dragging = false
    let lastT = 0

    const start = () => {
      if (started || disposed) return
      started = true

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.toneMapping = THREE.ACESFilmicToneMapping

      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50)
      camera.position.set(0, 0, 6)

      /* a soft studio room for the base, then one warm gold rim so the glass
         belongs to the brand and not to a default white studio */
      const pmrem = new THREE.PMREMGenerator(renderer)
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
      pmrem.dispose()

      const rim = new THREE.DirectionalLight(0xe9c48b, 2.4)
      rim.position.set(2.5, 1.8, 2)
      const fill = new THREE.DirectionalLight(0x8fa8c8, 0.9)
      fill.position.set(-2, -0.6, 1.6)
      scene.add(rim, fill)

      group = new THREE.Group()
      scene.add(group)

      /* the bottle is Draco-compressed; the decoder lives beside the site in
         /public/draco so the model never depends on a remote CDN */
      const draco = new DRACOLoader()
      draco.setDecoderPath("/draco/")
      draco.preload()
      const loader = new GLTFLoader()
      loader.setDRACOLoader(draco)

      loader.load(
        MODEL,
        (gltf) => {
          if (disposed || !group) return
          const model = gltf.scene
          const box = new THREE.Box3().setFromObject(model)
          const size = box.getSize(new THREE.Vector3())
          const scale = Math.min(
            TARGET_HEIGHT / Math.max(size.y, 0.001),
            TARGET_WIDTH / Math.max(size.x, 0.001)
          )
          model.scale.setScalar(scale)
          box.setFromObject(model)
          const center = box.getCenter(new THREE.Vector3())
          model.position.sub(center)
          group.add(model)
        },
        undefined,
        () => {
          /* the section carries on without the bottle */
        }
      )

      resize()
    }

    const resize = () => {
      if (!renderer || !camera) return
      const width = host.clientWidth || 1
      const height = host.clientHeight || 1
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    let last = 0
    const paint = (now: number) => {
      if (!renderer || !scene || !camera || !group) return
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      if (dragging || pinching) {
        velocity.yaw *= INERTIA_DECAY
        velocity.pitch *= INERTIA_DECAY
      } else {
        /* inertia decays into the auto-rotation, which takes over once the
           throw has spent itself */
        yaw.value += velocity.yaw
        pitch.value = Math.max(
          -PITCH_LIMIT,
          Math.min(PITCH_LIMIT, pitch.value + velocity.pitch)
        )
        velocity.yaw *= INERTIA_DECAY
        velocity.pitch *= INERTIA_DECAY
        if (!reduced) yaw.value += AUTO_SPEED * dt
      }

      zoom.current += (zoom.target - zoom.current) * 0.14

      group.rotation.y = yaw.value
      group.rotation.x = pitch.value
      group.scale.setScalar(zoom.current)

      renderer.render(scene, camera)
    }

    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick)
      paint(now)
    }

    const sync = () => {
      const shouldRun = onScreen && document.visibilityState === "visible"
      if (shouldRun && !frame) {
        last = 0
        frame = window.requestAnimationFrame(tick)
      } else if (!shouldRun && frame) {
        window.cancelAnimationFrame(frame)
        frame = 0
      }
    }

    /* ===== the hand: drag orbits, pinch and wheel zoom ===== */
    const onPointerDown = (event: PointerEvent) => {
      canvas.setPointerCapture(event.pointerId)
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      lastT = performance.now()
      if (pointers.size === 1) {
        dragging = true
        canvas.style.cursor = "grabbing"
      } else if (pointers.size === 2) {
        pinching = true
        const [a, b] = [...pointers.values()]
        pinchDistance = Math.hypot(a.x - b.x, a.y - b.y)
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return
      const prev = pointers.get(event.pointerId)
      if (!prev) return
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

      if (pinching && pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        const distance = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinchDistance > 0) {
          zoom.target = Math.max(
            ZOOM_MIN,
            Math.min(ZOOM_MAX, zoom.target * (distance / pinchDistance))
          )
        }
        pinchDistance = distance
        return
      }

      if (!dragging) return
      const dx = event.clientX - prev.x
      const dy = event.clientY - prev.y
      yaw.value += dx * DRAG_SCALE
      pitch.value = Math.max(
        -PITCH_LIMIT,
        Math.min(PITCH_LIMIT, pitch.value - dy * DRAG_SCALE)
      )

      const now = performance.now()
      const dtMs = Math.max(8, now - lastT)
      velocity.yaw = (dx / dtMs) * DRAG_SCALE * 16
      velocity.pitch = (-dy / dtMs) * DRAG_SCALE * 16
      lastT = now
    }

    const endPointer = (event: PointerEvent) => {
      pointers.delete(event.pointerId)
      if (pointers.size < 2) {
        pinching = false
        pinchDistance = 0
      }
      if (pointers.size === 0) {
        dragging = false
        canvas.style.cursor = "grab"
        /* the throw carries the inertia; the loop decays it back into the
           auto-rotation */
      }
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      zoom.target = Math.max(
        ZOOM_MIN,
        Math.min(ZOOM_MAX, zoom.target * (1 - event.deltaY * 0.0012))
      )
    }

    canvas.addEventListener("pointerdown", onPointerDown)
    canvas.addEventListener("pointermove", onPointerMove)
    canvas.addEventListener("pointerup", endPointer)
    canvas.addEventListener("pointercancel", endPointer)
    canvas.addEventListener("wheel", onWheel, { passive: false })

    const observer = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? false
        if (onScreen) start()
        sync()
      },
      { rootMargin: "200px" }
    )
    observer.observe(host)

    const onResize = () => resize()
    const ro = new ResizeObserver(onResize)
    ro.observe(host)
    document.addEventListener("visibilitychange", sync)

    /* the model may sit above the fold on a short page */
    start()

    return () => {
      disposed = true
      observer.disconnect()
      ro.disconnect()
      document.removeEventListener("visibilitychange", sync)
      if (frame) window.cancelAnimationFrame(frame)
      canvas.removeEventListener("pointerdown", onPointerDown)
      canvas.removeEventListener("pointermove", onPointerMove)
      canvas.removeEventListener("pointerup", endPointer)
      canvas.removeEventListener("pointercancel", endPointer)
      canvas.removeEventListener("wheel", onWheel)
      scene?.traverse((object) => {
        const mesh = object as THREE.Mesh
        if (mesh.isMesh) {
          mesh.geometry?.dispose()
          const materials = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material]
          for (const material of materials) {
            const mat = material as THREE.MeshStandardMaterial
            mat.map?.dispose()
            mat.dispose()
          }
        }
      })
      renderer?.dispose()
      canvas.remove()
    }
  }, [])

  return <div ref={hostRef} className={className} />
}

export default BottleStage
