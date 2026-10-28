"use client"

import { useEffect, useRef } from "react"

/**
 * The shared ground of the quiet sections: one wall of impressed cuneiform,
 * lit like a museum relief, seen through the store, the journal, the cabinet
 * and the footer.
 *
 * One canvas, fixed to the viewport, behind everything (z-0). It never scrolls
 * as an element; instead the shader slides its sampling with the page, a little
 * over half speed, so the wall reads as a surface standing behind the content
 * rather than a picture glued to it.
 *
 * The signs are real: they are drawn from Noto Sans Cuneiform into a 1024²
 * tile, scattered off a grid and wrapped at the edges, then uploaded once. The
 * shader samples that tile at three different scales so the repeat never shows,
 * reads the ink as *depth* (the stylus pressed the clay), and lights it with a
 * low raking light that drifts over about a hundred seconds. That grazing light
 * is the whole illusion — a flat silhouette of a wedge looks like a drawing; a
 * wedge with a lit lower lip and a shadow above it looks pressed.
 *
 * And once per ~2.9 screens of scrolling a band of gold climbs the wall with
 * it — but only across the handful of signs that were ever gilded, so the wall
 * lights up in scattered places instead of turning gold. It is driven by the
 * scroll position, not the clock, so it moves exactly as fast as the hand and
 * stops when the hand stops.
 *
 * What it costs: one draw call over three texture reads per pixel plus a little
 * value noise, capped at 1.5 device pixels, throttled to 30fps, stopped
 * whenever no marked section is on screen, and frozen to a single frame under
 * `prefers-reduced-motion`. If WebGL2 or the font is missing it draws nothing
 * at all and the page falls back to its own navy — the wall is an enrichment,
 * never a requirement.
 */

const FONT_FAMILY = "3WEEQ Cuneiform"
const FONT_URL = "/fonts/noto-sans-cuneiform.woff2"

/** The tile of signs. One tile spans one viewport height of the wall. */
const ATLAS = 1024

/** Unicode Cuneiform. Every sign in this block is drawn by the font above. */
const SIGN_START = 0x12000
const SIGN_END = 0x123ff

const VERTEX_SHADER = `#version 300 es
in vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform float uScroll;
uniform sampler2D uGlyphs;

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

// Three reaches of the same sign field. At different scales they never line up,
// so the tile does not announce itself as a tile.
float depthAt(vec2 p) {
  float a = texture(uGlyphs, p).r;
  float b = texture(uGlyphs, p * 1.90 + vec2(0.37, 0.19)).r;
  float c = texture(uGlyphs, p * 0.63 + vec2(0.81, 0.52)).r;
  return a * 0.60 + b * 0.22 + c * 0.28;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;

  // one tile per viewport height; the wall travels with the page at a little
  // over half speed, so it stands behind the content
  vec2 p = vec2(uv.x * aspect, uv.y - uScroll);

  // one device pixel, in the same units as p
  float e = 1.0 / uRes.y;

  float d0 = depthAt(p);
  float dx = depthAt(p + vec2(e, 0.0));
  float dy = depthAt(p + vec2(0.0, e));

  // the pressed grooves tilt the surface. the constant is the one dial that
  // decides how deep the wall reads: too high and every sign becomes a canyon
  float relief = 0.0022;
  vec3 n = normalize(vec3((d0 - dx) * relief / e, (d0 - dy) * relief / e, 1.0));

  // a raking light, low and slow, the way a wall is lit in a museum
  float ang = uTime * 0.06;
  vec3 L = normalize(vec3(-0.45 + 0.30 * cos(ang), 0.86, 0.34 + 0.16 * sin(ang)));
  float diff = clamp(dot(n, L), 0.0, 1.0);

  // the stone itself: two reaching noises for grain
  float grain = valueNoise(p * 64.0) * 0.55 + valueNoise(p * 190.0) * 0.45;
  vec3 deep = vec3(0.014, 0.030, 0.052);
  vec3 base = vec3(0.039, 0.086, 0.157);
  vec3 lit  = vec3(0.095, 0.150, 0.225);

  vec3 col = mix(deep, base, 0.45 + 0.55 * grain);
  col = mix(col, lit, diff * 0.50);

  // inside the grooves the stone keeps its own shadow
  col *= 1.0 - 0.30 * clamp(d0, 0.0, 1.0);

  // dust in the air, drifting
  float dust = valueNoise(vec2(p.x * 1.7, p.y * 1.7 + uTime * 0.015));
  col += (dust - 0.5) * 0.010;

  // ===== the lamp that walks the wall with the page =====
  // One pass of gold every ~2.9 screens. It is tied to the scroll and not to
  // the clock, so stopping the wheel stops the gold: the wall answers the hand.
  // It climbs with the wall (both rise as the page descends), which is what
  // makes it read as a vein of light in the stone rather than a reflection on
  // glass. The envelope fades it to nothing at both ends of its cycle, so the
  // wrap from the top back to the bottom is never seen.
  float phase = fract(uScroll * 0.62);
  float lampY = -0.22 + phase * 1.44;
  float tilt = (uv.x - 0.5) * 0.14;
  float profile = smoothstep(0.30, 0.0, abs(uv.y - lampY + tilt));
  float envelope = smoothstep(0.0, 0.12, phase) * smoothstep(1.0, 0.88, phase);
  float sweep = profile * envelope;

  // only the handful of signs that were gilded take the light. the rest of the
  // wall keeps its night, so the gold arrives as scattered signs lighting up
  // one after another, never as a gold wash over the wall. the gilding is baked
  // into the green channel of the atlas, so it lives in the stone and travels
  // with it.
  float gilded = smoothstep(0.12, 0.55, texture(uGlyphs, p).g);
  // a breath of it stays even away from the lamp, the way old leaf keeps a
  // little of the light that once fell on it
  float gleam = gilded * (0.04 + sweep * 0.96);

  // old leaf, not new: a deeper, redder gold. at this strength it reads as a
  // warm scuff on the stone rather than a light source, so the eye passes over
  // it and stays on the words
  vec3 gold = vec3(0.720, 0.470, 0.170);
  float lip = clamp(dot(n, L), 0.0, 1.0);
  col = mix(col, gold * (0.55 + 0.45 * lip), gleam * 0.52);
  // the lip of a groove turns toward the lamp and catches a harder spark
  col += gold * gleam * pow(lip, 4.0) * 0.14;

  // the corners fall away, so the wall never ends at a hard edge
  float vig = smoothstep(1.35, 0.30, length((uv - 0.5) * vec2(aspect, 1.0)) * 1.35);
  col *= 0.86 + 0.14 * vig;

  fragColor = vec4(col, 1.0);
}`

/** Deterministic, so the wall is the same wall on every visit. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Ask the font which code points it really draws. Everything is laid out on a
 * probe sheet and read back in one go: per-character `getImageData` would cost
 * seconds, one read of the whole sheet costs a frame.
 */
function readableSigns(): string[] {
  const cols = 32
  const cellWidth = 40
  const cellHeight = 48
  const total = SIGN_END - SIGN_START + 1
  const rows = Math.ceil(total / cols)

  const sheet = document.createElement("canvas")
  sheet.width = cols * cellWidth
  sheet.height = rows * cellHeight
  const ctx = sheet.getContext("2d", { willReadFrequently: true })
  if (!ctx) return []

  ctx.fillStyle = "#fff"
  ctx.font = `${cellWidth}px "${FONT_FAMILY}"`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  const chars: string[] = []
  for (let index = 0; index < total; index += 1) {
    const char = String.fromCodePoint(SIGN_START + index)
    chars.push(char)
    ctx.fillText(
      char,
      (index % cols) * cellWidth + cellWidth / 2,
      Math.floor(index / cols) * cellHeight + cellHeight / 2
    )
  }

  const { data } = ctx.getImageData(0, 0, sheet.width, sheet.height)
  const signs: string[] = []

  for (let index = 0; index < chars.length; index += 1) {
    const originX = (index % cols) * cellWidth
    const originY = Math.floor(index / cols) * cellHeight
    let ink = 0

    for (let y = originY + 4; y < originY + cellHeight - 4; y += 2) {
      for (let x = originX + 4; x < originX + cellWidth - 4; x += 2) {
        if (data[(y * sheet.width + x) * 4 + 3] > 40) ink += 1
      }
    }

    // an empty cell means the font has no glyph there
    if (ink > 6) signs.push(chars[index])
  }

  return signs
}

/**
 * Scatter the signs into a square tile, off any grid, and wrap the ones that
 * fall near an edge so the tile repeats without a seam.
 *
 * Two channels, one sheet: red carries every impression, green carries only the
 * few signs that were gilded. The shader reads red as depth (a groove pressed
 * into the clay) and green as gold leaf sitting in that groove, so the gilding
 * belongs to particular signs and not to a region of the wall. Which signs are
 * gilded is drawn from the same fixed seed as the layout, so the same handful
 * shines on every visit.
 */
function buildAtlas(signs: string[]): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = ATLAS
  canvas.height = ATLAS
  const ctx = canvas.getContext("2d")
  if (!ctx) return canvas

  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, ATLAS, ATLAS)
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  const random = mulberry32(0x3ee9)
  const marks: {
    char: string
    x: number
    y: number
    size: number
    angle: number
    opacity: number
    gilded: boolean
  }[] = []

  const minimumGap = 62
  let guard = 0

  while (marks.length < 150 && guard < 8000) {
    guard += 1
    const x = random() * ATLAS
    const y = random() * ATLAS
    const crowded = marks.some(
      (mark) => Math.hypot(mark.x - x, mark.y - y) < minimumGap
    )
    if (crowded) continue

    marks.push({
      char: signs[Math.floor(random() * signs.length)],
      x,
      y,
      // the depths differ, the way the hand pressed some harder than others
      size: 54 + random() * 34,
      // a few signs stand on their side, as the script itself often did
      angle: random() < 0.18 ? Math.PI / 2 : 0,
      opacity: 0.55 + random() * 0.45,
      // roughly one sign in eleven was ever gilded
      gilded: random() < 0.09,
    })
  }

  for (const mark of marks) {
    ctx.font = `${mark.size}px "${FONT_FAMILY}"`
    ctx.globalAlpha = mark.opacity
    // red only: an impression. white: an impression that still holds gold
    ctx.fillStyle = mark.gilded ? "#fff" : "#f00"

    for (const shiftX of [-ATLAS, 0, ATLAS]) {
      for (const shiftY of [-ATLAS, 0, ATLAS]) {
        const x = mark.x + shiftX
        const y = mark.y + shiftY
        if (x < -140 || x > ATLAS + 140 || y < -140 || y > ATLAS + 140) continue

        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(mark.angle)
        ctx.fillText(mark.char, 0, 0)
        ctx.restore()
      }
    }
  }

  return canvas
}

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("cuneiform wall / shader", gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }

  return shader
}

export function CuneiformWall() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let disposed = false
    let frame = 0
    let context: WebGL2RenderingContext | null = null
    let program: WebGLProgram | null = null
    let geometry: WebGLBuffer | null = null
    let vao: WebGLVertexArrayObject | null = null
    let texture: WebGLTexture | null = null

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let width = 0
    let height = 0
    let devicePixelRatio = 1

    const onScreen = new Set<Element>()

    const uniforms = {
      uRes: null as WebGLUniformLocation | null,
      uTime: null as WebGLUniformLocation | null,
      uScroll: null as WebGLUniformLocation | null,
    }

    const resize = () => {
      // the canvas is inset-0, so it spans the *layout* viewport without the
      // scrollbar. sizing it from innerWidth instead would stretch the sign
      // field by the width of the scrollbar.
      const cssWidth = document.documentElement.clientWidth
      const cssHeight = document.documentElement.clientHeight
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

    const paint = (seconds: number) => {
      if (!context || !program || !texture) return
      const gl = context

      gl.viewport(0, 0, width, height)
      gl.useProgram(program)
      gl.uniform2f(uniforms.uRes, width, height)
      gl.uniform1f(uniforms.uTime, seconds)
      gl.uniform1f(
        uniforms.uScroll,
        (window.scrollY / Math.max(1, window.innerHeight)) * 0.55
      )
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    let last = 0

    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick)
      if (now - last < 33) return
      last = now
      paint(now / 1000)
    }

    const sync = () => {
      const shouldRun =
        !reduced && onScreen.size > 0 && document.visibilityState === "visible"

      if (shouldRun && !frame) {
        last = 0
        frame = window.requestAnimationFrame(tick)
      } else if (!shouldRun && frame) {
        window.cancelAnimationFrame(frame)
        frame = 0
      }
    }

    const setup = async () => {
      try {
        const face = new FontFace(FONT_FAMILY, `url(${FONT_URL})`, {
          display: "block",
        })
        await face.load()
        document.fonts.add(face)
      } catch {
        return
      }
      if (disposed) return

      const signs = readableSigns()
      if (!signs.length) return

      const atlas = buildAtlas(signs)

      const gl = canvas.getContext("webgl2", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "low-power",
      } as WebGLContextAttributes)

      if (!gl) return
      context = gl

      const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
      const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
      if (!vertex || !fragment) return

      program = gl.createProgram()
      if (!program) return
      gl.attachShader(program, vertex)
      gl.attachShader(program, fragment)
      gl.linkProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn("cuneiform wall / program", gl.getProgramInfoLog(program))
        return
      }

      // one triangle, big enough to cover the viewport
      geometry = gl.createBuffer()
      vao = gl.createVertexArray()
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

      texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        atlas
      )
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR
      )
      gl.generateMipmap(gl.TEXTURE_2D)

      const anisotropic = gl.getExtension("EXT_texture_filter_anisotropic")
      if (anisotropic) {
        gl.texParameterf(
          gl.TEXTURE_2D,
          anisotropic.TEXTURE_MAX_ANISOTROPY_EXT,
          Math.min(4, gl.getParameter(anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT))
        )
      }

      gl.useProgram(program)
      gl.activeTexture(gl.TEXTURE0)
      gl.uniform1i(gl.getUniformLocation(program, "uGlyphs"), 0)
      uniforms.uRes = gl.getUniformLocation(program, "uRes")
      uniforms.uTime = gl.getUniformLocation(program, "uTime")
      uniforms.uScroll = gl.getUniformLocation(program, "uScroll")

      resize()
      // the first frame is drawn now, not on the next tick: a wall that appears
      // a frame late is a wall that flickers in
      paint(reduced ? 0 : performance.now() / 1000)

      sync()
    }

    const surfaces = Array.from(
      document.querySelectorAll("[data-cuneiform-surface]")
    )

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) onScreen.add(entry.target)
          else onScreen.delete(entry.target)
        }
        sync()
      },
      { rootMargin: "120px" }
    )
    for (const surface of surfaces) observer.observe(surface)

    const onResize = () => {
      resize()
      paint(reduced ? 0 : performance.now() / 1000)
    }

    window.addEventListener("resize", onResize)
    document.addEventListener("visibilitychange", sync)

    void setup()

    return () => {
      disposed = true
      observer.disconnect()
      window.removeEventListener("resize", onResize)
      document.removeEventListener("visibilitychange", sync)
      if (frame) window.cancelAnimationFrame(frame)
      if (context) {
        if (texture) context.deleteTexture(texture)
        if (geometry) context.deleteBuffer(geometry)
        if (vao) context.deleteVertexArray(vao)
        if (program) context.deleteProgram(program)
        context.getExtension("WEBGL_lose_context")?.loseContext()
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  )
}
