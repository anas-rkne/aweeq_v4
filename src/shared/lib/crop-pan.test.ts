import { describe, expect, it } from "vitest"
import { cropPan } from "./crop-pan"

describe("cropPan", () => {
  it("leaves a wide screen exactly as it was: centred for the whole film", () => {
    for (const progress of [0, 0.1, 0.5, 0.9, 1]) {
      expect(cropPan(progress, false), String(progress)).toBe(0.5)
    }
  })

  it("sweeps from the left edge and locks on the bottle at 55%", () => {
    expect(cropPan(0, true)).toBe(0)
    expect(cropPan(0.55, true)).toBe(0.5)
  })

  it("holds the bottle centred for the rest of the film", () => {
    expect(cropPan(0.7, true)).toBe(0.5)
    expect(cropPan(1, true)).toBe(0.5)
  })

  it("never moves backwards and never overshoots the centre", () => {
    let previous = -1

    for (let step = 0; step <= 100; step += 1) {
      const pan = cropPan(step / 100, true)

      expect(pan).toBeGreaterThanOrEqual(previous)
      expect(pan).toBeGreaterThanOrEqual(0)
      expect(pan).toBeLessThanOrEqual(0.5)
      previous = pan
    }
  })

  it("still settles when the scrub reports a little past the end", () => {
    expect(cropPan(1.4, true)).toBe(0.5)
    expect(cropPan(-0.2, true)).toBe(0)
  })
})
