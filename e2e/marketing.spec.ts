import { expect, test } from "@playwright/test"

test.describe("marketing home", () => {
  test("renders the header and a hero heading", async ({ page }) => {
    const pageErrors: string[] = []
    page.on("pageerror", (error) => pageErrors.push(error.message))

    await page.goto("/")

    await expect(page.locator("header").first()).toBeVisible()
    await expect(page.locator("h1").first()).toBeVisible()

    expect(pageErrors, pageErrors.join("\n")).toEqual([])
  })

  test("keeps the document in Arabic and right-to-left", async ({ page }) => {
    await page.goto("/")

    await expect(page.locator("html")).toHaveAttribute("lang", "ar")
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  })
})
