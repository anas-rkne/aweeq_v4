/**
 * Where the 16:9 film is cropped on a portrait screen.
 *
 * A wide screen already fits the frame, so 0.5 (centre) is returned for the
 * whole film and nothing about the desktop crop changes. A phone sees only a
 * narrow slice of that frame: the slice starts at the left edge, sweeps to the
 * bottle over the first 55% of the film and then holds centred, so the product
 * is framed for the rest of the scroll instead of sliding out of view.
 *
 * The curve starts and ends without a jerk: it leaves the first frame at the
 * same speed as a plain sweep and arrives at the lock at zero speed.
 */
export function cropPan(progress: number, portrait: boolean) {
  if (!portrait) {
    return 0.5
  }

  const clamped = Math.min(Math.max(progress, 0), 1)
  const settle = Math.min(clamped / 0.55, 1)

  return 0.5 * (-(settle ** 3) + settle ** 2 + settle)
}
