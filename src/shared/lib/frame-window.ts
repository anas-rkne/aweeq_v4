/**
 * A bounded, streaming cache for a scroll-scrubbed image sequence.
 *
 * The old loaders called `Promise.all(allFrames)` and kept every decoded frame
 * alive for the life of the page — 101 × 1920×1080 ≈ 799 MiB for one film, and
 * 1.6 GiB for the story. This replaces that with a window: only the frames
 * around the current position are decoded, and everything outside the window is
 * dropped so the browser can reclaim it.
 *
 * Frames stay at their native resolution (no re-encode) — the visuals are
 * unchanged; only the *amount* of memory held at once changes.
 */

export interface FrameWindow {
  /** Focus the window on `wanted`, loading [wanted-radius, wanted+radius] and
   *  dropping everything else. `frameCount` is the sequence length. */
  focus(wanted: number, frameCount: number): void
  /** Return the decoded frame at `index`, or null if not yet loaded. */
  get(index: number): HTMLImageElement | null
  /** Nearest loaded frame to `index` (for a smooth hold during fast scrub). */
  nearest(index: number, frameCount: number): HTMLImageElement | null
  /** Resolve once frame `index` is decoded (loading it if necessary). */
  whenReady(index: number): Promise<HTMLImageElement | null>
  /** Call `fn` whenever a frame finishes decoding, so a scrub that is holding
   *  still can repaint the moment its frame lands. Returns an unsubscribe. */
  subscribe(fn: (index: number) => void): () => void
  /** Drop all frames and ignore any still in flight. */
  dispose(): void
}

export function createFrameWindow(
  urlFor: (index: number) => string,
  radius = 5
): FrameWindow {
  const cache = new Map<number, HTMLImageElement>()
  const inflight = new Map<number, Promise<HTMLImageElement | null>>()
  let listener: ((index: number) => void) | null = null
  let disposed = false

  function load(index: number): Promise<HTMLImageElement | null> {
    const existing = inflight.get(index)
    if (existing) return existing

    const promise = new Promise<HTMLImageElement | null>((resolve) => {
      const img = new window.Image()
      img.decoding = "async"
      img.src = urlFor(index)
      img.onload = () => {
        const decoded = img.decode?.()
        if (!decoded) {
          resolve(img)
          return
        }
        void decoded.catch(() => undefined).then(() => resolve(img))
      }
      img.onerror = () => resolve(null)
    })

    inflight.set(index, promise)
    void promise.then((img) => {
      inflight.delete(index)
      if (img && !disposed) {
        cache.set(index, img)
        listener?.(index)
      }
    })
    return promise
  }

  function focus(wanted: number, frameCount: number) {
    if (frameCount <= 0) return
    const lo = Math.max(0, wanted - radius)
    const hi = Math.min(frameCount - 1, wanted + radius)

    for (let i = lo; i <= hi; i++) {
      if (!cache.has(i)) void load(i)
    }

    for (const key of [...cache.keys()]) {
      if (key < lo || key > hi) cache.delete(key)
    }
  }

  function get(index: number): HTMLImageElement | null {
    return cache.get(index) ?? null
  }

  function nearest(index: number, frameCount: number): HTMLImageElement | null {
    for (let i = index; i >= 0; i--) {
      const img = cache.get(i)
      if (img) return img
    }
    for (let i = index + 1; i < frameCount; i++) {
      const img = cache.get(i)
      if (img) return img
    }
    return null
  }

  function whenReady(index: number): Promise<HTMLImageElement | null> {
    if (cache.has(index)) return Promise.resolve(cache.get(index)!)
    return load(index)
  }

  function subscribe(fn: (index: number) => void) {
    listener = fn
    return () => {
      if (listener === fn) listener = null
    }
  }

  function dispose() {
    disposed = true
    cache.clear()
  }

  return { focus, get, nearest, whenReady, subscribe, dispose }
}
