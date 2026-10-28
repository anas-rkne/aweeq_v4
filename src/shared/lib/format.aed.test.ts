import { describe, expect, test } from "vitest"
import { formatPrice, formatPriceRange } from "./format"

describe("formatPrice — AED major units", () => {
  test("whole dirhams drop the decimals", () => {
    expect(formatPrice(850, "aed", "en")).not.toContain(".00")
    expect(formatPrice(850, "aed", "en")).toContain("850")
  })

  test("fractional dirhams keep two decimals", () => {
    expect(formatPrice(849.5, "aed", "en")).toContain("849.50")
  })

  test("zero is a real price, not empty", () => {
    expect(formatPrice(0, "aed", "en")).toContain("0")
  })

  test("null and NaN render as an empty string", () => {
    expect(formatPrice(null, "aed", "en")).toBe("")
    expect(formatPrice(undefined, "aed", "en")).toBe("")
    expect(formatPrice(Number.NaN, "aed", "en")).toBe("")
  })

  test("never divides by 100 — 850 must not become 8.50", () => {
    expect(formatPrice(850, "aed", "en")).not.toContain("8.50")
  })
})

describe("formatPriceRange", () => {
  test("collapses a single price", () => {
    const range = formatPriceRange({ min: 850, max: 850 }, "aed", "en")
    expect(range).not.toContain("–")
  })

  test("keeps both ends when they differ", () => {
    const range = formatPriceRange({ min: 850, max: 1200 }, "aed", "en")
    expect(range).toContain("850")
    expect(range).toContain("1,200")
    expect(range).toContain("–")
  })

  test("empty range renders as empty string", () => {
    expect(formatPriceRange(null, "aed", "en")).toBe("")
  })
})
