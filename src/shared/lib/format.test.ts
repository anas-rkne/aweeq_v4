import { expect, test } from "vitest"
import { formatPrice, stockLabel } from "./format"

test("formatPrice formats currency correctly in Arabic", () => {
  const formatted = formatPrice(15000, "sar", "ar")
  expect(formatted).toContain("ر.س")
})

test("stockLabel indicates out of stock correctly", () => {
  const label = stockLabel({ in_stock: false })
  expect(label).toBe("نفدت الكمية")
})
