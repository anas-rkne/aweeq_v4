const { chromium } = require("@playwright/test")
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe"
const BASE = "http://localhost:3000"

async function audit(page, path, width) {
  await page.setViewportSize({ width, height: 900 })
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(1200)
  const rows = await page.evaluate(() => {
    return [...document.querySelectorAll("img")].map((img) => {
      const cs = getComputedStyle(img)
      return {
        src: (img.currentSrc || img.src).replace(location.origin, "").slice(0, 90),
        loading: img.loading,
        w: img.getAttribute("width"),
        h: img.getAttribute("height"),
        aspect: cs.aspectRatio,
        display: cs.display,
        box: `${Math.round(img.getBoundingClientRect().width)}x${Math.round(img.getBoundingClientRect().height)}`,
      }
    })
  })
  const offending = rows.filter(
    (r) => r.loading === "lazy" && !r.w && !r.h && r.display !== "none"
  )
  console.log(`\n=== ${path} @ ${width} — ${offending.length} lazy img without dimensions (of ${rows.length}) ===`)
  for (const r of offending) {
    console.log(`  ${r.box.padEnd(11)} aspect=${String(r.aspect).padEnd(14)} ${r.src}`)
  }
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })
  const page = await browser.newPage()
  await audit(page, "/ar", 390)
  await audit(page, "/ar", 1440)
  await audit(page, "/ar/story", 1440)
  await browser.close()
}
main().catch((e) => { console.error("FATAL", e); process.exit(1) })
