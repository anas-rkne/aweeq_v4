import { expect, test } from "vitest"
import { formatPrice, stockLabel } from "./format"

test("formatPrice formats AED correctly in Arabic", () => {
  const formatted = formatPrice(850, "aed", "ar")
  expect(formatted).toContain("850")
  expect(formatted).toContain("د.إ")
})

test("formatPrice formats AED correctly in English", () => {
  const formatted = formatPrice(850, "aed", "en")
  expect(formatted).toContain("850")
  expect(formatted).toContain("AED")
})

test("stockLabel indicates out of stock correctly", () => {
  const label = stockLabel({ in_stock: false })
  expect(label).toBe("نفدت الكمية")
})
