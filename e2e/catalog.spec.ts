import { expect, test } from "@playwright/test"

test.describe("catalogue", () => {
  test("renders the store heading and search form", async ({ page }) => {
    const pageErrors: string[] = []
    page.on("pageerror", (error) => pageErrors.push(error.message))

    await page.goto("/products")

    await expect(
      page.getByRole("heading", { level: 1, name: "المتجر" })
    ).toBeVisible()
    await expect(page.getByRole("search")).toBeVisible()

    expect(pageErrors, pageErrors.join("\n")).toEqual([])
  })

  test("shows either products or the deliberate degraded state", async ({
    page,
  }) => {
    await page.goto("/products")

    const cards = page.locator('a[href^="/products/"]')
    const degraded = page.getByText("تعذر الاتصال بالمتجر حالياً")
    const empty = page.getByText("لا توجد قطع تطابق اختيارك")

    await expect(cards.first().or(degraded).or(empty)).toBeVisible()
  })

  test("keeps the filter row reachable by keyboard", async ({ page }) => {
    await page.goto("/products")

    const allFilter = page.getByRole("link", { name: "الكل" }).first()
    await allFilter.focus()
    await expect(allFilter).toBeFocused()
  })
})
