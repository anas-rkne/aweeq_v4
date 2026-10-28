import { chromium } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"

const outDir = path.resolve("docs/audit")
fs.mkdirSync(outDir, { recursive: true })

const url = process.env.AUDIT_URL || "http://localhost:3000/ar"

async function shoot(browser, name, viewport) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
  })
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 })
  await page.waitForTimeout(4000)

  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  const vh = viewport.height
  const steps = []
  for (let y = 0; y < height - vh * 0.4; y += Math.round(vh * 0.72)) steps.push(y)
  steps.push(Math.max(0, height - vh))

  for (let i = 0; i < steps.length; i++) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), steps[i])
    await page.waitForTimeout(900)
    await page.screenshot({
      path: path.join(outDir, `${name}-${String(i).padStart(2, "0")}.jpg`),
      quality: 82,
      type: "jpeg",
    })
  }
  console.log(name, "height", height, "shots", steps.length)
  await ctx.close()
}

const browser = await chromium.launch()
await shoot(browser, "desktop", { width: 1440, height: 900 })
await shoot(browser, "mobile", { width: 390, height: 844 })
await browser.close()
