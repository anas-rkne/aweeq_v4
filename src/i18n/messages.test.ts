import { describe, expect, test } from "vitest"
import ar from "../../messages/ar.json"
import en from "../../messages/en.json"

type Json = { [key: string]: Json | string | number | boolean | null }

function flatten(value: Json, prefix = ""): Map<string, string> {
  const entries = new Map<string, string>()

  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key

    if (child && typeof child === "object" && !Array.isArray(child)) {
      for (const [nested, leaf] of flatten(child as Json, path)) {
        entries.set(nested, leaf)
      }
    } else {
      entries.set(path, String(child))
    }
  }

  return entries
}

const arKeys = flatten(ar as Json)
const enKeys = flatten(en as Json)

describe("translation parity", () => {
  test("English has every Arabic key", () => {
    const missing = [...arKeys.keys()].filter((key) => !enKeys.has(key))
    expect(missing).toEqual([])
  })

  test("Arabic has every English key", () => {
    const missing = [...enKeys.keys()].filter((key) => !arKeys.has(key))
    expect(missing).toEqual([])
  })

  test("no translation is empty, except keys the owner fills in", () => {
    // `Featured.price` is intentionally blank until the owner sets the launch
    // price (the component renders nothing instead of a placeholder).
    const intentionallyEmpty = new Set(["Featured.price"])

    const empty = [...arKeys.entries()]
      .filter(([key, value]) => !value.trim() && !intentionallyEmpty.has(key))
      .map(([key]) => `ar:${key}`)
      .concat(
        [...enKeys.entries()]
          .filter(
            ([key, value]) => !value.trim() && !intentionallyEmpty.has(key)
          )
          .map(([key]) => `en:${key}`)
      )

    expect(empty).toEqual([])
  })

  test("Arabic strings are actually Arabic where it matters", () => {
    // Brand names (3WEEQ), the Latin tagline and legal credits are legitimately
    // Latin, so only the UI-heavy namespaces are checked for Arabic script.
    const arabicRequired = [
      "Checkout",
      "Cart",
      "Common",
      "NotFound",
      "Store",
      "Product",
    ]
    const arabicPattern = /[\u0600-\u06FF]/

    const offenders = [...arKeys.entries()]
      .filter(([key]) => arabicRequired.some((ns) => key.startsWith(`${ns}.`)))
      .filter(([, value]) => !arabicPattern.test(value))
      .map(([key]) => key)

    expect(offenders).toEqual([])
  })
})
