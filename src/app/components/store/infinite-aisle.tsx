"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import * as THREE from "three"

/**
 * InfiniteAisle — the invitation that follows the hero: a dive through the
 * night, each piece surfacing out of the cuneiform wall as you pass.
 *
 * Self-contained Three.js, in the shape of `BottleStage`: it owns its canvas,
 * starts lazily near the section, runs its loop only on screen, disposes on
 * unmount, and is desktop-only.
 *
 * The canvas is transparent, so the site's fixed cuneiform wall stays the
 * background. Three pieces float in that night, each standing on its own
 * glowing mist, keeping its true aspect ratio, and each is revealed by the
 * scroll: it fades and rises as the camera approaches, holds in its gold light
 * (halo, shaft, reflection and a bloom of cuneiform signs), then dissolves as
 * the camera passes through. The parent drives the camera with
 * `setProgress(0…1)`.
 */

export type AisleHandle = {
  setProgress: (p: number) => void
}

export type AisleProduct = {
  image: string
  glow: string
}

/** one stop per piece — near the dive line, receding into the night */
const STOPS = [
  { x: -0.5, z: 10 },
  { x: 0.5, z: 0 },
  { x: -0.5, z: -10 },
]

const CAM_START_Z = 22
const CAM_END_Z = -16
const END_Z = -30
const PRODUCT_HEIGHT = 1.8

function colorRGB(color: string): string {
  const c = new THREE.Color(color)
  return `${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(
    c.b * 255
  )}`
}

/** a soft radial disc, for halos, pedestals and dust */
function radialTexture(color: string, alpha = 1): THREE.Texture {
  const size = 128
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (ctx) {
    const rgb = colorRGB(color)
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    )
    grad.addColorStop(0, `rgba(${rgb}, ${alpha})`)
    grad.addColorStop(0.45, `rgba(${rgb}, ${alpha * 0.4})`)
    grad.addColorStop(1, `rgba(${rgb}, 0)`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
  }
  return new THREE.CanvasTexture(canvas)
}

/** fade the top and bottom of a photograph into transparency, so a product
    reads as surfacing out of the mist rather than as a hard rectangle */
function softenTexture(img: HTMLImageElement): THREE.Texture {
  const w = img.naturalWidth || 1
  const h = img.naturalHeight || 1
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (ctx) {
    ctx.drawImage(img, 0, 0)
    ctx.globalCompositeOperation = "destination-in"
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, "rgba(0,0,0,0)")
    grad.addColorStop(0.08, "rgba(0,0,0,1)")
    grad.addColorStop(0.86, "rgba(0,0,0,1)")
    grad.addColorStop(1, "rgba(0,0,0,0)")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }
  return new THREE.CanvasTexture(canvas)
}

/** a shaft of light: a triangle, bright at its apex and fading to the floor */
function beamTexture(color: string): THREE.Texture {
  const w = 128
  const h = 256
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (ctx) {
    const rgb = colorRGB(color)
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, `rgba(${rgb}, 0.8)`)
    grad.addColorStop(0.45, `rgba(${rgb}, 0.32)`)
    grad.addColorStop(1, `rgba(${rgb}, 0)`)
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(w / 2, 0)
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    ctx.fill()
  }
  return new THREE.CanvasTexture(canvas)
}

/** one cuneiform sign, drawn from the house's own font, in gold */
function cuneiformTexture(char: string, color: string): THREE.Texture {
  const size = 128
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (ctx) {
    ctx.font = `${size * 0.8}px "3WEEQ Cuneiform"`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillStyle = color
    ctx.fillText(char, size / 2, size / 2)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export const InfiniteAisle = forwardRef<
  AisleHandle,
  {
    products: AisleProduct[]
    /* fires every paint with the per-piece reveal (0…1) so the parent can
       drive the DOM product cards in lock-step with the float, without a
       React re-render per frame */
    onReveal?: (reveals: number[]) => void
  }
>(function InfiniteAisle({ products, onReveal }, ref) {
  const hostRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef(0)
  const onRevealRef = useRef(onReveal)

  useEffect(() => {
    onRevealRef.current = onReveal
  }, [onReveal])

  useImperativeHandle(
    ref,
    () => ({
      setProgress: (p: number) => {
        targetRef.current = Math.max(0, Math.min(1, p))
      },
    }),
    []
  )

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    /* a lighter scene on phones: no stars, no dust, fewer signs */
    const mobile = window.innerWidth < 768

    let disposed = false
    let started = false
    let onScreen = false
    let frame = 0

    let renderer: THREE.WebGLRenderer | null = null
    let scene: THREE.Scene | null = null
    let camera: THREE.PerspectiveCamera | null = null
    let stars: THREE.Points | null = null

    const halos: THREE.Sprite[] = []
    const pedestals: THREE.Sprite[] = []
    const lights: THREE.PointLight[] = []
    const pieces: THREE.Sprite[] = []
    const bases: { w: number; h: number }[] = []
    const beams: THREE.Sprite[] = []
    const reflections: THREE.Sprite[] = []
    const glyphs: {
      sprite: THREE.Sprite
      parent: number
      baseY: number
      phase: number
    }[] = []
    const reveals: number[] = []

    let current = 0
    let elapsed = 0

    const canvas = document.createElement("canvas")
    canvas.style.display = "block"
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    canvas.setAttribute("aria-hidden", "true")
    host.appendChild(canvas)

    const start = () => {
      if (started || disposed) return
      started = true

      const r = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      })
      r.setPixelRatio(
        Math.min(
          window.devicePixelRatio || 1,
          window.innerWidth < 768 ? 1.5 : 2
        )
      )
      r.toneMapping = THREE.ACESFilmicToneMapping
      r.outputColorSpace = THREE.SRGBColorSpace

      const sc = new THREE.Scene()
      /* transparent: the cuneiform wall behind the page stays the background */
      sc.background = null

      const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
      cam.position.set(0, 1.7, CAM_START_Z)

      renderer = r
      scene = sc
      camera = cam

      /* ---- the night light ---- */
      sc.add(new THREE.HemisphereLight(0x2f4e78, 0x0a1628, 0.55))
      sc.add(new THREE.AmbientLight(0x1b3047, 0.7))

      /* ---- the pieces, surfacing out of their own mist ---- */
      products.forEach((product, index) => {
        const stop = STOPS[index] ?? STOPS[0]
        bases[index] = { w: 1.1, h: PRODUCT_HEIGHT }

        const pedestal = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: radialTexture(product.glow, 0.6),
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false,
          })
        )
        pedestal.scale.set(3.4, 1.4, 1)
        pedestal.position.set(stop.x, 0.5, stop.z)
        sc.add(pedestal)
        pedestals.push(pedestal)

        const halo = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: radialTexture(product.glow),
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false,
          })
        )
        halo.scale.set(3, 3, 1)
        halo.position.set(stop.x, 1.5, stop.z)
        halo.renderOrder = 1
        sc.add(halo)
        halos.push(halo)

        /* the shaft of gold light from above */
        const beam = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: beamTexture(product.glow),
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false,
          })
        )
        beam.scale.set(2.6, 5.6, 1)
        beam.position.set(stop.x, 3, stop.z)
        sc.add(beam)
        beams.push(beam)

        /* the light pooling on the mist floor beneath the piece */
        const reflection = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: radialTexture(product.glow, 0.7),
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false,
          })
        )
        reflection.scale.set(5, 1, 1)
        reflection.position.set(stop.x, 0.18, stop.z)
        sc.add(reflection)
        reflections.push(reflection)

        const piece = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: null,
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            depthWrite: false,
          })
        )
        piece.scale.set(1.1, PRODUCT_HEIGHT, 1)
        piece.position.set(stop.x, 1.5, stop.z)
        piece.renderOrder = 2
        sc.add(piece)
        pieces.push(piece)

        /* load the photograph and keep its true aspect ratio — never squash */
        const image = new Image()
        image.crossOrigin = "anonymous"
        image.onload = () => {
          if (disposed) return
          const naturalW = image.naturalWidth || 1
          const naturalH = image.naturalHeight || 1
          const scale = Math.min(1.7 / naturalW, 1.9 / naturalH)
          const width = naturalW * scale
          const height = naturalH * scale
          bases[index] = { w: width, h: height }
          piece.scale.set(width, height, 1)
          const texture = softenTexture(image)
          texture.colorSpace = THREE.SRGBColorSpace
          const material = piece.material as THREE.SpriteMaterial
          material.map = texture
          material.needsUpdate = true
        }
        image.src = product.image

        const light = new THREE.PointLight(
          new THREE.Color(product.glow),
          0,
          10,
          2
        )
        light.position.set(stop.x, 2.8, stop.z)
        sc.add(light)
        lights.push(light)
      })

      /* ---- the cuneiform signs that drift through the mist ----
         drawn from the house's own font, once it is ready */
      void (async () => {
        try {
          const face = new FontFace(
            "3WEEQ Cuneiform",
            "url(/fonts/noto-sans-cuneiform.woff2)",
            { display: "block" }
          )
          await face.load()
          document.fonts.add(face)
        } catch {
          return
        }
        if (disposed) return

        const textures: THREE.Texture[] = []
        for (let i = 0; i < 16; i++) {
          const code = 0x12000 + Math.floor(Math.random() * 0x400)
          textures.push(cuneiformTexture(String.fromCodePoint(code), "#cd9e61"))
        }

        products.forEach((_, parent) => {
          const stop = STOPS[parent] ?? STOPS[0]
          const glyphCount = mobile ? 4 : 12
          for (let i = 0; i < glyphCount; i++) {
            const material = new THREE.SpriteMaterial({
              map: textures[i % textures.length],
              transparent: true,
              opacity: 0.35,
              depthWrite: false,
            })
            const sprite = new THREE.Sprite(material)
            const size = 0.28 + Math.random() * 0.38
            sprite.scale.set(size, size, 1)
            const y = 0.6 + Math.random() * 2.6
            sprite.position.set(
              stop.x + (Math.random() - 0.5) * 8,
              y,
              stop.z + (Math.random() - 0.5) * 12
            )
            sc.add(sprite)
            glyphs.push({
              sprite,
              parent,
              baseY: y,
              phase: Math.random() * Math.PI * 2,
            })
          }
        })
      })()

      /* ---- the stars: faint gold points high in the night ---- */
      const starGeo = new THREE.BufferGeometry()
      const starCount = 120
      const starPos = new Float32Array(starCount * 3)
      for (let i = 0; i < starCount; i++) {
        starPos[i * 3] = (Math.random() - 0.5) * 13
        starPos[i * 3 + 1] = 2.2 + Math.random() * 3.2
        starPos[i * 3 + 2] = CAM_START_Z - Math.random() * (CAM_START_Z - END_Z)
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3))
      stars = new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({
          map: radialTexture("#e9c48b"),
          size: 0.05,
          transparent: true,
          opacity: 0.55,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      )
      stars.visible = !mobile
      sc.add(stars)

      resize()
    }

    const clamp = (x: number) => Math.max(0, Math.min(1, x))

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
      if (!renderer || !scene || !camera) return
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      elapsed += dt

      current += (targetRef.current - current) * (1 - Math.exp(-6 * dt))

      const p = current * current * (3 - 2 * current)
      const z = CAM_START_Z + (CAM_END_Z - CAM_START_Z) * p
      camera.position.z = z
      camera.position.x = Math.sin(current * Math.PI * 3) * 0.12
      camera.position.y = 1.7 + Math.sin(current * Math.PI * 6) * 0.05
      camera.lookAt(0, 1.55, END_Z - 4)

      /* each piece surfaces as the camera approaches, then dissolves */
      products.forEach((_, index) => {
        const stop = STOPS[index] ?? STOPS[0]
        const ahead = z - stop.z
        /* fade in as we approach (ahead 12 → 5), fade out as we pass (2 → -4) */
        const appear = clamp((12 - ahead) / 7)
        const vanish = clamp((ahead + 4) / 6)
        const reveal = appear * vanish
        reveals[index] = reveal

        const pedestal = pedestals[index]
        if (pedestal) {
          const s = 3.4 + reveal * 1
          pedestal.scale.set(s, s * 0.42, 1)
          ;(pedestal.material as THREE.SpriteMaterial).opacity = reveal * 0.7
        }

        const halo = halos[index]
        if (halo) {
          const s = 2.6 + reveal * 1.4
          halo.scale.set(s, s, 1)
          ;(halo.material as THREE.SpriteMaterial).opacity = reveal * 0.7
        }

        const beam = beams[index]
        if (beam) {
          ;(beam.material as THREE.SpriteMaterial).opacity = reveal * 0.2
        }

        const reflection = reflections[index]
        if (reflection) {
          ;(reflection.material as THREE.SpriteMaterial).opacity = reveal * 0.32
        }

        const light = lights[index]
        if (light) light.intensity = reveal * 3

        const piece = pieces[index]
        if (piece) {
          const base = bases[index] ?? { w: 1.1, h: PRODUCT_HEIGHT }
          const s = 0.88 + reveal * 0.14
          piece.scale.set(base.w * s, base.h * s, 1)
          piece.position.y = 1.28 + reveal * 0.22
          piece.material.opacity = piece.material.map ? reveal : 0
        }
      })

      onRevealRef.current?.(reveals.slice())

      /* the cuneiform signs: they brighten around the piece being passed,
         and drift a little on their own */
      glyphs.forEach((glyph) => {
        const reveal = reveals[glyph.parent] ?? 0
        ;(glyph.sprite.material as THREE.SpriteMaterial).opacity =
          0.35 + reveal * 0.45
        glyph.sprite.position.y =
          glyph.baseY + Math.sin(elapsed * 0.5 + glyph.phase) * 0.16
      })

      /* the stars twinkle, a breath at a time */
      if (stars) {
        ;(stars.material as THREE.PointsMaterial).opacity =
          0.45 + 0.15 * Math.sin(elapsed * 1.6)
      }

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

    start()

    return () => {
      disposed = true
      observer.disconnect()
      ro.disconnect()
      document.removeEventListener("visibilitychange", sync)
      if (frame) window.cancelAnimationFrame(frame)

      scene?.traverse((object) => {
        const disposeMaterial = (
          material: THREE.Material | THREE.Material[]
        ) => {
          const list = Array.isArray(material) ? material : [material]
          for (const mat of list) {
            const anyMat = mat as THREE.Material & {
              map?: THREE.Texture | null
            }
            anyMat.map?.dispose()
            mat.dispose()
          }
        }
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose()
          disposeMaterial(object.material)
        } else if (object instanceof THREE.Sprite) {
          disposeMaterial(object.material)
        } else if (object instanceof THREE.Points) {
          object.geometry?.dispose()
          disposeMaterial(object.material)
        }
      })

      renderer?.dispose()
      canvas.remove()
    }
  }, [products])

  return <div ref={hostRef} className="absolute inset-0" />
})

export default InfiniteAisle
