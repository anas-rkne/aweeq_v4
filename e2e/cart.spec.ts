import { expect, test } from "@playwright/test"

/**
 * The cart flow needs a reachable Medusa backend with seeded products.
 * Run it with:
 *
 *   E2E_CART=1 npm run test:e2e
 */
test.describe("cart flow", () => {
  test.skip(
    !process.env.E2E_CART,
    "Set E2E_CART=1 and start Medusa with seeded products to run the cart flow."
  )

  test("adds a product, changes quantity, and removes it", async ({ page }) => {
    await page.goto("/products")

    const firstCard = page.locator('a[href^="/products/"]').first()
    await expect(firstCard).toBeVisible()
    await firstCard.click()

    await page.getByRole("button", { name: "أضف إلى السلة" }).click()

    const drawer = page.getByRole("dialog", { name: "سلة التسوق" })
    await expect(drawer).toBeVisible()

    const increase = drawer
      .getByRole("button", { name: "زيادة الكمية" })
      .first()
    await increase.click()
    await expect(drawer.locator("li").first()).toContainText("2")

    await drawer.getByRole("button", { name: "إزالة" }).first().click()
    await expect(drawer.getByText("سلتك فارغة")).toBeVisible()
  })

  test("closes the drawer with Escape and restores focus", async ({ page }) => {
    await page.goto("/products")

    const cartButton = page.getByRole("button", { name: /السلة/ }).first()
    await cartButton.click()

    const drawer = page.getByRole("dialog", { name: "سلة التسوق" })
    await expect(drawer).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(drawer).toBeHidden()
    await expect(cartButton).toBeFocused()
  })
})
