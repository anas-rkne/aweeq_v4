"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

/**
 * GateLight — the lamp that walks the gate.
 *
 * A transparent WebGL layer over the First Chapter's photograph. It draws two
 * things and nothing else:
 *
 *   • the sweep — one pass of warm light climbs the gate while the section is
 *     on screen. It is tied to the scroll position, not the clock: the light
 *     moves exactly as fast as the hand and stops when the hand stops, and it
 *     reverses when the visitor scrolls back. A relief noise breaks the band
 *     up, so the light reads as catching the glazed brick instead of lying on
 *     top of it like a bar.
 *   • the diamonds — seven sparse stones (deterministic, the same seven on
 *     every visit) with their own slow twinkle. When the lamp passes over a
 *     stone, the stone ignites and answers it with a short spark, then falls
 *     back to its resting twinkle.
 *
 * GSAP owns the one dial that matters: the whole field fades in as the section
 * climbs into view and fades out as it leaves, scrubbed to the scroll, so the
 * light belongs to the section and never outshines the words.
 *
 * What it costs: one fullscreen draw of a few dozen instructions, capped at 1.5
 * device pixels, throttled to 30fps, stopped whenever the section is off
 * screen, and never started at all under `prefers-reduced-motion` or without
 * WebGL2. The photograph beneath it is untouched.
 */

const VERTEX_SHADER = `#version 300 es
in vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform float uEnergy;
uniform float uProgress; // where the section sits in the viewport, -0.5..2
uniform vec2 uDiamonds[7];

out vec4 fragColor;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 px = gl_FragCoord.xy;

  // the light itself is hotter than the leaf gold of the buttons
  vec3 warm = vec3(0.960, 0.730, 0.430);
  vec3 gold = vec3(0.804, 0.620, 0.380);

  vec3 col = vec3(0.0);

  // ===== the lamp: one pass while the section is on screen =====
  float phase = clamp(uProgress * 0.6 + 0.05, 0.0, 1.0);
  float lampY = mix(-0.30, 1.30, phase);
  float tilt = (uv.x - 0.5) * 0.10;

  // the envelope fades the light to nothing at both ends of its travel, so
  // it is never seen arriving or leaving — it is simply present, then not
  float envelope = smoothstep(0.0, 0.12, phase) * smoothstep(1.0, 0.88, phase);

  float band = smoothstep(0.34, 0.0, abs(uv.y - lampY + tilt));

  // the light does not fall flat: a relief noise breaks it into patches, the
  // way a raking lamp catches the raised brick and leaves the joints dark
  float relief =
    valueNoise(uv * vec2(5.0, 20.0)) * 0.55 +
    valueNoise(uv * vec2(40.0, 80.0)) * 0.45;
  float lit = band * (0.35 + 0.65 * relief);

  col += warm * lit * envelope * 0.18;

  // ===== the diamonds: stones that answer the lamp =====
  for (int i = 0; i < 7; i++) {
    vec2 d = (uv - uDiamonds[i]) * uRes;
    vec2 q = abs(d);

    // a stone is a 45° square with a four-point star around it
    float core = exp(-(q.x + q.y) * (q.x + q.y) * 0.0022);
    float star =
      exp(-q.x * 0.22) * exp(-d.y * d.y * 0.00012) +
      exp(-q.y * 0.22) * exp(-d.x * d.x * 0.00012);

    // each stone has its own slow clock
    float clock = hash21(vec2(float(i) + 0.5, 3.1)) * 6.283;
    float tw = pow(0.5 + 0.5 * sin(uTime * 0.5 + clock), 8.0);

    // when the lamp passes over the stone, the stone ignites
    float dy = abs(uDiamonds[i].y - lampY + (uDiamonds[i].x - 0.5) * 0.10);
    float ignite = smoothstep(0.14, 0.0, dy) * envelope;

    float spark = tw * 0.10 + ignite * 0.85;
    col += gold * (core * 0.9 + star * 0.35) * spark;
  }

  // gsap owns this dial: the field rises and falls with the section
  col *= uEnergy;

  // straight-alpha output, so the light adds to the photograph beneath
  float a = max(col.r, max(col.g, col.b));
  fragColor = vec4(col, a);
}`

/** Deterministic, so the stones are the same stones on every visit. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Seven stones, spread out, none of them crowding the title. */
function diamondLayout(): Float32Array {
  const random = mulberry32(0xb4b1)
  const points: Array<[number, number]> = []
  const minimum = 0.19

  let guard = 0
  while (points.length < 7 && guard < 4000) {
    guard += 1
    const x = 0.1 + random() * 0.8
    const y = 0.08 + random() * 0.82
    const crowded = points.some(
      ([px, py]) => Math.hypot(px - x, py - y) < minimum
    )
    if (crowded) continue
    points.push([x, y])
  }

  const layout = new Float32Array(14)
  points.forEach(([x, y], index) => {
    layout[index * 2] = x
    layout[index * 2 + 1] = y
  })
  return layout
}

export function GateLight() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const section = canvas.closest("section")
    if (!section) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) return

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    } as WebGLContextAttributes)
    if (!gl) return

    const compile = (
      type: number,
      source: string
    ): WebGLShader | null => {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn("gate light / shader", gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    if (!vertex || !fragment) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("gate light / program", gl.getProgramInfoLog(program))
      return
    }

    const geometry = gl.createBuffer()
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, geometry)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    )
    const position = gl.getAttribLocation(program, "aPos")
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    gl.useProgram(program)
    const uniforms = {
      uRes: gl.getUniformLocation(program, "uRes"),
      uTime: gl.getUniformLocation(program, "uTime"),
      uEnergy: gl.getUniformLocation(program, "uEnergy"),
      uProgress: gl.getUniformLocation(program, "uProgress"),
      uDiamonds: gl.getUniformLocation(program, "uDiamonds[0]"),
    }

    const diamonds = diamondLayout()

    let width = 0
    let height = 0
    let devicePixelRatio = 1

    const resize = () => {
      const cssWidth = canvas.clientWidth || 1
      const cssHeight = canvas.clientHeight || 1
      devicePixelRatio = Math.min(
        window.devicePixelRatio || 1,
        cssWidth < 768 ? 1.25 : 1.5
      )
      width = Math.round(cssWidth * devicePixelRatio)
      height = Math.round(cssHeight * devicePixelRatio)
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
    }

    // gsap owns the one dial: the field enters with the section and leaves
    // with it, scrubbed to the scroll
    const energy = { v: 0 }
    const gsapContext = gsap.context(() => {
      gsap.to(energy, {
        v: 1,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top 92%",
          end: "top 48%",
          scrub: 0.5,
        },
      })
      gsap.to(energy, {
        v: 0,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "bottom 55%",
          end: "bottom 105%",
          scrub: 0.5,
        },
      })
    }, section)

    const paint = (seconds: number) => {
      // where the section sits in the viewport: -1 as it enters, 1 as it
      // leaves. the lamp climbs the gate exactly once on the way through.
      const rect = section.getBoundingClientRect()
      const progress = (window.innerHeight - rect.top) / window.innerHeight

      gl.viewport(0, 0, width, height)
      gl.useProgram(program)
      gl.uniform2f(uniforms.uRes, width, height)
      gl.uniform1f(uniforms.uTime, seconds)
      gl.uniform1f(uniforms.uEnergy, energy.v)
      gl.uniform1f(uniforms.uProgress, progress)
      gl.uniform2fv(uniforms.uDiamonds, diamonds)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    let frame = 0
    let last = 0
    let onScreen = false

    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick)
      if (now - last < 33) return
      last = now
      paint(now / 1000)
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
        sync()
      },
      { rootMargin: "200px" }
    )
    observer.observe(canvas)

    const onResize = () => {
      resize()
      paint(reduced ? 0 : performance.now() / 1000)
    }

    resize()
    paint(performance.now() / 1000)
    sync()

    window.addEventListener("resize", onResize)
    document.addEventListener("visibilitychange", sync)

    return () => {
      gsapContext.revert()
      observer.disconnect()
      window.removeEventListener("resize", onResize)
      document.removeEventListener("visibilitychange", sync)
      if (frame) window.cancelAnimationFrame(frame)
      // no WEBGL_lose_context here: in dev, StrictMode runs this effect twice,
      // and losing the context would hand the second run a dead one
      gl.deleteBuffer(geometry)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(program)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[6] h-full w-full"
    />
  )
}
