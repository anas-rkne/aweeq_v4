const { chromium } = require("@playwright/test")
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe"
const BASE = "http://localhost:3000"

async function bbox(page, url) {
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
    let minX = w, maxX = -1, minY = h, maxY = -1
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = d[(y * w + x) * 4 + 3]
        if (a > 8) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    return {
      w, h,
      bbox: { minX, maxX, minY, maxY },
      bboxW: maxX - minX + 1,
      bboxH: maxY - minY + 1,
      bboxAspect: +((maxX - minX + 1) / (maxY - minY + 1)).toFixed(3),
      minYPct: +(minY / h * 100).toFixed(1),
      maxYPct: +(maxY / h * 100).toFixed(1),
    }
  }, url)
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })
  const page = await browser.newPage()
  await page.goto(`${BASE}/ar`, { waitUntil: "domcontentloaded" })
  console.log("last-mobile:", JSON.stringify(await bbox(page, `${BASE}/images/hero-2/last-mobile.webp`)))
  console.log("last:       ", JSON.stringify(await bbox(page, `${BASE}/images/hero-2/last.webp`)))
  await browser.close()
}
main().catch((e) => { console.error("FATAL", e); process.exit(1) })
