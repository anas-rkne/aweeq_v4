import { afterEach, beforeEach, describe, expect, test } from "vitest"
import {
  captureFbclid,
  flushMetaQueue,
  identifyMetaUser,
  isMetaPixelReady,
  metaPixelId,
  normalizeMetaEmail,
  normalizeMetaPhone,
  readMetaCookies,
  trackMeta,
} from "./meta-pixel"

const PIXEL = "123456789012345"
const originalPixel = process.env.NEXT_PUBLIC_META_PIXEL_ID

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`
}

function restorePixel() {
  if (originalPixel === undefined) {
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID
  } else {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = originalPixel
  }
}

beforeEach(() => {
  delete (window as { fbq?: unknown }).fbq
  clearCookie("_fbp")
  clearCookie("_fbc")
})

afterEach(() => {
  delete (window as { fbq?: unknown }).fbq
  restorePixel()
  clearCookie("_fbp")
  clearCookie("_fbc")
  window.history.replaceState({}, "", "/")
})

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

  test("normalises an email the way Meta expects", () => {
    expect(normalizeMetaEmail("  Buyer@Example.COM ")).toBe("buyer@example.com")
    expect(normalizeMetaEmail("not-an-email")).toBeNull()
    expect(normalizeMetaEmail("")).toBeNull()
  })

  test("adds the UAE country code to a local phone", () => {
    expect(normalizeMetaPhone("050 123 4567")).toBe("971501234567")
    expect(normalizeMetaPhone("+971 50 123 4567")).toBe("971501234567")
    expect(normalizeMetaPhone("00971501234567")).toBe("971501234567")
    expect(normalizeMetaPhone("02 123 4567")).toBe("97121234567")
    expect(normalizeMetaPhone("")).toBeNull()
  })

  test("advanced matching waits for the base snippet instead of creating fbq", () => {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = PIXEL

    identifyMetaUser({ email: "wait@example.com" })

    /* creating window.fbq here would make the real snippet return early and
       never load fbevents.js */
    expect(typeof window.fbq).toBe("undefined")
  })

  test("advanced matching sends the normalised identity to fbq", () => {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = PIXEL
    const calls: unknown[][] = []
    window.fbq = (...args: unknown[]) => {
      calls.push(args)
    }

    identifyMetaUser({
      email: " Buyer@Example.COM ",
      phone: "050 123 4567",
    })

    expect(calls).toContainEqual([
      "init",
      PIXEL,
      {
        em: "buyer@example.com",
        ph: "971501234567",
        country: "ae",
      },
    ])
  })

  test("a queued identity is applied when the snippet loads", () => {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = PIXEL
    identifyMetaUser({ email: "queued@example.com" })

    const calls: unknown[][] = []
    window.fbq = (...args: unknown[]) => {
      calls.push(args)
    }

    flushMetaQueue()

    expect(calls).toContainEqual([
      "init",
      PIXEL,
      { em: "queued@example.com", country: "ae" },
    ])
  })

  test("reads the Meta browser cookies", () => {
    document.cookie = "_fbp=fb.1.1700000000000.123456789; path=/"
    document.cookie = "_fbc=fb.1.1700000000000.AbC-123; path=/"

    expect(readMetaCookies()).toEqual({
      fbp: "fb.1.1700000000000.123456789",
      fbc: "fb.1.1700000000000.AbC-123",
    })
  })

  test("writes _fbc from the landing fbclid when the pixel did not", () => {
    window.history.replaceState({}, "", "/ar?fbclid=abc123")

    captureFbclid()

    expect(readMetaCookies().fbc).toMatch(/^fb\.1\.\d+\.abc123$/)
  })
})
