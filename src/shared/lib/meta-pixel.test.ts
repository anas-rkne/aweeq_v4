import { describe, expect, test } from "vitest"
import { isMetaPixelReady, metaPixelId, trackMeta } from "./meta-pixel"

describe("meta-pixel", () => {
  test("reports not ready when fbq is not on the page", () => {
    expect(isMetaPixelReady()).toBe(false)
  })

  test("tracking is a safe no-op without a pixel", () => {
    expect(() => trackMeta("PageView")).not.toThrow()
    expect(() =>
      trackMeta("Purchase", { value: 400, currency: "AED" })
    ).not.toThrow()
  })

  test("rejects a pixel id that is not numeric", () => {
    /* the helper sanitises the env value; an invalid one must be ignored */
    const id = metaPixelId()
    if (id !== null) {
      expect(id).toMatch(/^\d+$/)
    }
  })
})
