/**
 * Image catalog.
 *
 * One place for every raster asset on the site: the path, the intrinsic size
 * Next.js needs to build the srcset, the alternative text, the focal point
 * (`position` maps to CSS `object-position`) and the `sizes` hint that tells
 * the browser how wide the picture really is on screen.
 *
 * The hero frames are the four civilizations the site opens with — Babylon,
 * Egypt, China, Greece — cut from the same night scene so the picture can
 * change under the type without the light changing with it. Each frame fills
 * the section from edge to edge: the desktop masters are 16:9, and on a phone
 * the frame is cut to a narrow vertical slice, so the focal point moves to the
 * lit side (`positionNarrow`).
 *
 * The masters were re-encoded to WebP by `scripts/optimize-images.mjs`
 * (2.9 MB → 338 KB for the Babylon frame). Next.js still serves responsive
 * derivatives of these files — AVIF where the browser takes it, WebP
 * otherwise — so the browser never downloads the source.
 */
export type HeroFrame = {
  /** stable id, also the key of the frame and the name of its file */
  id: string
  /** short name for the gallery tabs */
  label: string
  src: string
  width: number
  height: number
  alt: string
  position: string
  positionNarrow: string
}

export const HERO_FRAMES: HeroFrame[] = [
  {
    id: "babylon",
    label: "بابل",
    src: "/images/hero/babylon.webp",
    width: 1672,
    height: 941,
    alt: "بوابة بابل الزرقاء عند الليل، تستقبل ضوءاً دافئاً",
    position: "50% 50%",
    positionNarrow: "76% 50%",
  },
  {
    id: "egypt",
    label: "مصر",
    src: "/images/hero/egypt.webp",
    width: 1365,
    height: 768,
    alt: "أهرامات مصر عند الغروب، والرمل مذهّب",
    position: "50% 50%",
    positionNarrow: "50% 50%",
  },
  {
    id: "china",
    label: "الصين",
    src: "/images/hero/china.webp",
    width: 1365,
    height: 768,
    alt: "سور الصين العظيم يمتد بين الجبال عند الفجر",
    position: "50% 50%",
    positionNarrow: "50% 50%",
  },
  {
    id: "greece",
    label: "اليونان",
    src: "/images/hero/greece.webp",
    width: 1365,
    height: 768,
    alt: "الأكروبوليس في أثينا فوق البحر",
    position: "50% 50%",
    positionNarrow: "50% 50%",
  },
]

/** The picture fills the screen: one hundred per cent of the viewport. */
export const HERO_SIZES = "100vw"
