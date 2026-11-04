const { chromium } = require("@playwright/test")

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe"
const BASE = "http://localhost:3000"

async function analyseRows(page, url) {
  return page.evaluate(async (src) => {
    const img = new Image()
    img.src = src
    await img.decode()
    const w = img.naturalWidth
    const h = img.naturalHeight
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, w, h).data
    const px = (x, y) => {
      const i = (y * w + x) * 4
      return [d[i], d[i + 1], d[i + 2], d[i + 3]]
    }
    const corners = [px(2, 2), px(w - 3, 2), px(2, h - 3), px(w - 3, h - 3)]
    const ref = corners[0]
    const rows = []
    for (let y = 0; y < h; y += Math.max(1, Math.floor(h / 30))) {
      let differing = 0
      let alpha = 0
      let count = 0
      for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 50))) {
        const [r, g, b, a] = px(x, y)
        alpha += a
        const dist =
          Math.abs(r - ref[0]) + Math.abs(g - ref[1]) + Math.abs(b - ref[2])
        if (dist > 30) differing++
        count++
      }
      rows.push({
        pct: Math.round((y / h) * 100),
        content: +((differing / count) * 100).toFixed(1),
        alpha: Math.round(alpha / count),
      })
    }
    return { w, h, corners, rows }
  }, url)
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })

  // ---------- 1. raw image content ----------
  const probe = await browser.newPage()
  await probe.goto(`${BASE}/ar`, { waitUntil: "domcontentloaded" })
  for (const file of ["last-mobile.webp", "last.webp"]) {
    const a = await analyseRows(probe, `${BASE}/images/hero-2/${file}`)
    console.log(`=== ${file} ${a.w}x${a.h} aspect=${(a.w / a.h).toFixed(3)} corners=${JSON.stringify(a.corners)}`)
    console.log(a.rows.map((r) => `  ${String(r.pct).padStart(3)}% content=${String(r.content).padStart(5)}% alpha=${r.alpha}`).join("\n"))
  }

  // ---------- 2. rendered page at mobile ----------
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  })
  const logs = []
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") logs.push(`${m.type()}: ${m.text()}`)
  })
  page.on("pageerror", (e) => logs.push("pageerror: " + e.message))
  page.on("requestfailed", (r) => logs.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`))

  await page.goto(`${BASE}/ar`, { waitUntil: "networkidle" })
  await page.waitForTimeout(1500)

  // scroll through the pinned counter section, to the end
  const info = await page.evaluate(async () => {
    const section = document.querySelector("#store-invitation")
    if (!section) return { found: false }
    const rect = section.getBoundingClientRect()
    const top = rect.top + window.scrollY
    // pin lasts 2.2 viewport-heights after the section top
    const target = top + window.innerHeight * 2.2
    window.scrollTo(0, target)
    await new Promise((r) => setTimeout(r, 1200))
    return { found: true, sectionTop: top, scrolledTo: window.scrollY }
  })
  console.log("\n=== RENDERED (390x844) ===")
  console.log(JSON.stringify(info))

  const inspect = await page.evaluate(() => {
    const section = document.querySelector("#store-invitation")
    if (!section) return null
    const imgs = [...section.querySelectorAll("img")]
    return imgs.map((img) => {
      const r = img.getBoundingClientRect()
      const cs = getComputedStyle(img)
      let parentOpacity = 1
      let node = img.parentElement
      const chain = []
      while (node && node !== document.body) {
        const s = getComputedStyle(node)
        chain.push({
          cls: node.className?.toString().slice(0, 90),
          display: s.display,
          opacity: s.opacity,
          visibility: s.visibility,
          overflow: s.overflow,
          h: Math.round(node.getBoundingClientRect().height),
        })
        parentOpacity *= Number(s.opacity)
        node = node.parentElement
      }
      return {
        alt: img.alt,
        currentSrc: img.currentSrc.replace(location.origin, ""),
        complete: img.complete,
        natural: `${img.naturalWidth}x${img.naturalHeight}`,
        loading: img.loading,
        widthAttr: img.getAttribute("width"),
        heightAttr: img.getAttribute("height"),
        rendered: `${Math.round(r.width)}x${Math.round(r.height)}`,
        top: Math.round(r.top),
        left: Math.round(r.left),
        display: cs.display,
        opacity: cs.opacity,
        objectFit: cs.objectFit,
        objectPosition: cs.objectPosition,
        effectiveOpacity: +(parentOpacity * Number(cs.opacity)).toFixed(3),
        chain: chain.filter((c) => c.display === "none" || c.opacity !== "1" || c.overflow === "hidden"),
      }
    })
  })
  console.log(JSON.stringify(inspect, null, 2))

  await page.screenshot({ path: "diag-mobile-ending.png", fullPage: false })
  console.log("\nLOGS:", logs.length ? "\n" + logs.join("\n") : "none")

  await browser.close()
}

main().catch((e) => {
  console.error("FATAL", e)
  process.exit(1)
})
