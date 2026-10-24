import { expect, test } from "@playwright/test"

const WIDTHS = [390, 768, 1024, 1440] as const

/**
 * Visual baselines require a running storefront with real data. Generate them
 * once with:
 *
 *   E2E_VISUAL=1 npx playwright test e2e/visual.spec.ts --update-snapshots
 *
 * then commit the resulting `e2e/__screenshots__` directory.
 */
test.describe("visual baselines", () => {
  test.skip(
    !process.env.E2E_VISUAL,
    "Set E2E_VISUAL=1 to compare or regenerate visual baselines."
  )

  for (const width of WIDTHS) {
    test(`home at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto("/")
      await page.waitForLoadState("networkidle")
      await expect(page).toHaveScreenshot(`home-${width}.png`, {
        fullPage: true,
      })
    })

    test(`products at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto("/products")
      await page.waitForLoadState("networkidle")
      await expect(page).toHaveScreenshot(`products-${width}.png`, {
        fullPage: true,
      })
    })
  }
})
