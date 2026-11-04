const { chromium } = require("@playwright/test")

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe"
const BASE = "http://localhost:3001"

const FILES = [
  "/images/hero-2/last.webp",
  "/images/hero-2/last-mobile.webp",
  "/images/hero-2/hero-2-bg.jpg",
  "/images/hero-2/%20transparent%20(3).webp".replace("%20transparent", "transparent").replace(/%20/g, "%20"),
  "/images/hero-2/transparent%20(3).webp",
  "/images/hero-2/bab.webp",
  "/images/beyond/11.webp",
]

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })
  const page = await browser.newPage()
  await page.goto(`${BASE}/ar`, { waitUntil: "domcontentloaded" })

  for (const path of FILES) {
    const result = await page.evaluate(async (src) => {
      try {
        const res = await fetch(src)
        const blob = await res.blob()
        const bitmap = await createImageBitmap(blob)
        const out = {
          ok: true,
          status: res.status,
          type: blob.type,
          bytes: blob.size,
          w: bitmap.width,
          h: bitmap.height,
        }
        bitmap.close()
        return out
      } catch (error) {
        let status = null
        let meta = null
        try {
          const res = await fetch(src)
          status = res.status
          meta = {
            type: res.headers.get("content-type"),
            len: res.headers.get("content-length"),
          }
        } catch {}
        return { ok: false, status, meta, error: String(error) }
      }
    }, path)
    console.log(path, JSON.stringify(result))
  }

  // what does the next/image optimizer do with it?
  const opt = `/_next/image?url=${encodeURIComponent("/images/hero-2/last-mobile.webp")}&w=1080&q=75`
  const optRes = await page.evaluate(async (url) => {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    return {
      status: res.status,
      type: res.headers.get("content-type"),
      bytes: buf.byteLength,
      head: Array.from(new Uint8Array(buf.slice(0, 16))),
    }
  }, opt)
  console.log("OPTIMIZER", opt, JSON.stringify(optRes))

  // and the desktop one for comparison
  const opt2 = `/_next/image?url=${encodeURIComponent("/images/hero-2/last.webp")}&w=1080&q=75`
  const optRes2 = await page.evaluate(async (url) => {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    return {
      status: res.status,
      type: res.headers.get("content-type"),
      bytes: buf.byteLength,
    }
  }, opt2)
  console.log("OPTIMIZER", opt2, JSON.stringify(optRes2))

  await browser.close()
}

main().catch((e) => {
  console.error("FATAL", e)
  process.exit(1)
})
