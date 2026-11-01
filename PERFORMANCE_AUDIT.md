# 3WEEQ — Performance, Accessibility & SEO Audit

> **Audit snapshot:** 2026-10-30
> **Mode:** read-only static audit. **No source file was modified**; this document is the only file created.
> **Scope:** the entire Next.js app (`src/`), `next.config.ts`, `public/`, `messages/`, plus a light pass over `medusa/` admin.
> **Target:** Lighthouse 100/100/100/100 (Performance, Accessibility, Best Practices, SEO) and a locked 60 fps on a mid-range Android.
> **Runtime caveat:** the Medusa backend (`http://localhost:9000`) was unreachable during the audit (ECONNREFUSED) and Playwright browsers are not installed on this machine. Every number below is therefore measured from the repository (file sizes, frame dimensions, decoded-bitmap arithmetic, code paths) — not from a live Lighthouse trace. Where a claim needs a live measurement it is labelled **[needs trace]**.

---

## 0. Executive Summary

The codebase is in better shape than the score will suggest. RTL is genuinely correct, i18n has no leaking hardcoded strings in the storefront, GSAP/ScrollTrigger and Lenis are wired the right way, most canvases pause when off-screen, the cart drawer has a real focus trap, and the commerce layer is ISR-tagged. None of the foundations need to be thrown away.

But **the site cannot reach 100 today, and it will not reach 60 fps on a phone, for six structural reasons** — each one a single decision that propagates everywhere:

| # | Root cause | One-line evidence | Blocks |
|---|---|---|---|
| 1 | Every page canonicalises to the locale home | `src/app/[locale]/layout.tsx:33-39` — `alternates` is set on the layout and **no page except the PDP re-declares it** | SEO 100 (impossible) |
| 2 | The reveal system hides the LCP text after it has already painted | `src/app/components/scroll-reveal.tsx:30-38, 72` — `main h1, main p, main a[href]…` get `autoAlpha: 0` in a layout effect | Performance (LCP), CLS-adjacent flash |
| 3 | The whole marketing page is four canvas films decoded at full 1080p, all at once | `featured_frames` 101 × 1920×1080, `images/civil` 130 frames, `0_frame…china_frames` 205 frames | Performance (TBT/INP), memory crash on mobile |
| 4 | The hero downloads **two** LCP images on every viewport | `hero.tsx:341-357` — a `preload` desktop `<Image>` plus a raw `fetchPriority="high"` mobile `<img>`, both fetched regardless of CSS | Performance (LCP), Best Practices |
| 5 | The cuneiform wall runs ~250 ms of synchronous canvas work in one task at mount | `cuneiform-wall.tsx:426-439` → `readableSigns()` + `buildAtlas()` + `getImageData(1280×1536)` | INP, TBT, mobile jank |
| 6 | Text contrast sits at 3.9:1 in 34 places and 4.5:1 in 14 | `text-sand/45`, `text-sand/40`, `text-sand/25` — e.g. `products/page.tsx:311` | Accessibility 100 (impossible) |

### Headline numbers

| Metric | Value | Source |
|---|---|---|
| Static media shipped in `public/` | **73.22 MB** across **525 files** | measured, `public/` |
| Bytes a single marketing homepage visit can pull | **≈ 32 MB** (hero 8.30 + featured 5.81 + civil 7.06 + photos 5.5 + GLB 0.32) | measured per folder |
| Decoded bitmaps the homepage can hold at once | **≈ 1.6 GiB** peak (30 + 101 + 130 frames at 1080p/720p RGBA) | `w×h×4` arithmetic |
| `/story` frame payload | **39.0 MB / 205 frames @ 1920×1080 = 1.62 GiB decoded**, retained forever in a module-level `Map` | `about-canvas.tsx:29`, `about-data.ts:12-68` |
| Sync main-thread work at first paint (wall) | 1024 glyph probes + 7.86 MB `getImageData` + 164k alpha reads + ~1 350 `fillText` | `cuneiform-wall.tsx:186-234, 296-315` |
| Elements hidden then re-shown by `ScrollReveal` on `/` | the whole readable page (`main h1/h2/h3/p/figure/blockquote/a[href]`) | `scroll-reveal.tsx:30-38` |
| `getComputedStyle` calls during hydration | one per matched element (≈ 60–120 on `/`) | `scroll-reveal.tsx:51-67` |
| Full-screen WebGL loops | 3 (`CuneiformWall`, `GateLight`, about) + 1 Three.js scene | see §4 |
| `text-sand/45` or lower text utilities | 34 (3.88:1 or worse; a few are placeholders, which axe does not score) | grep + WCAG math |
| `<h1>` on `/story` | **0** | `about-scene-overlay.tsx:34` |
| Skip-to-content link | **none anywhere** | grep, `src/` |

### Verdict

- **SEO 100:** impossible until #1 is fixed. One line of metadata is currently poisoning every route in the site.
- **Accessibility 100:** impossible until #6 is fixed, and the mobile menu / gallery lightbox focus handling is repaired.
- **Best Practices 100:** blocked by two raw `<img fetchPriority="high">` bypassing the optimiser, the deprecated `priority` prop, and an `openGraph` with no image on a `summary_large_image` card.
- **Performance 100 → realistically 85–95:** achievable, but only after the frames pipeline is rebuilt (#3) and the hero stops downloading twice (#4). No amount of tuning will fix a 799 MiB decode of 101 frames.

---

## 1. What is already correct — do not regress it

| Area | Evidence | Why it matters |
|---|---|---|
| RTL is done properly | logical utilities throughout (`start-`, `end-`, `ms-`, `ps-`), `rtl:rotate-180` on arrows (`product-packaging-gallery.tsx:158`), `dir` on `<html>` (`layout.tsx:82`) | no LTR patching needed later |
| Lenis ↔ GSAP wiring | `smooth-scroll.tsx:8-26`, GSAP ticker drives Lenis, `ScrollTrigger.refresh()` re-measures | the correct integration; keep |
| Cart drawer a11y | `cart-drawer.tsx:87, 92, 117-130, 172` — focus move, trap, restore, `inert`, Escape | the template the other dialogs should copy |
| Reduced motion | honoured in `scroll-reveal.tsx:49`, `text-reveal.tsx:57`, `hero.tsx:197`, `cuneiform-wall.tsx:413`, `gate-light.tsx:319`, `bottle-stage.tsx:45`, `store-invitation.tsx:67` | rare and valuable |
| Off-screen pausing | `cuneiform-wall.tsx:411-422`, `gate-light.tsx:318-327`, `bottle-stage.tsx` IntersectionObserver | keeps idle cost near zero |
| ISR tags | `product.repository.ts:48, 74`, `collection.repository.ts:13`, `civilization.repository.ts:13` | cache invalidation is already designed |
| Image optimizer config | `next.config.ts:21-33` — AVIF first, 30-day TTL, explicit qualities | correct defaults already chosen |
| Product JSON-LD | `products/[handle]/page.tsx:167-197`, with `<` escaped | good foundation, needs 3 fields |
| Parallel data fetching | `products/page.tsx:75-94` — `Promise.all` for catalogue, picks, civilizations, collections | no request waterfall |
| Rail / pagination hit areas | `product-rail.tsx:48, 57` and `product-packaging-gallery.tsx:108, 148` are 44×44 | the rest of the app should match |

---

## 2. Critical Blockers (P0 — fix before any score work)

### B1 — Every route declares the wrong canonical URL (SEO)

`src/app/[locale]/layout.tsx:33-39`

```ts
alternates: {
  canonical: `/${locale}`,
  languages: { ar: `${siteUrl}/ar`, en: `${siteUrl}/en` },
},
```

Next.js shallow-merges metadata: a child that returns `title`/`description` **does not** replace the parent's `alternates`. In the whole app, only the root layout and the PDP declare it:

```
src/app/[locale]/layout.tsx:33
src/app/[locale]/(store)/products/[handle]/page.tsx:47
src/app/sitemap.ts:34
```

So `/en/products`, `/en/products?product_type=fragrance&offset=12`, `/en/collections`, `/en/story`, `/en/journal`, `/en/journal/<slug>`, `/en/policies/<slug>`, `/en/cart` and `/en/checkout` all emit:

```html
<link rel="canonical" href="https://site/en">
<link rel="alternate" hreflang="ar" href="https://site/ar">
<link rel="alternate" hreflang="en" href="https://site/en">
```

**Impact:** Google is told that 20+ pages are duplicates of the homepage. Lighthouse's "Document has a valid `rel=canonical`" audit checks the link resolves to the document's own URL and will fail. This is the single highest-leverage fix in the report.

**Fix:** `generateMetadata` in each page returns its own `alternates.canonical` + `languages` (the PDP pattern at `page.tsx:47-53` is the correct one). For `/products`, the canonical must be the unfiltered `/products` — filter and pagination query strings must canonicalise to the clean path, not to the locale home.

---

### B2 — `ScrollReveal` hides the LCP element after first paint (Performance + AX)

`src/app/components/scroll-reveal.tsx:30-38`

```ts
const SELECTOR = ["main h1","main h2","main h3","main p","main figure","main blockquote","main a[href]"].join(",")
```

`src/app/components/scroll-reveal.tsx:51-72`

```ts
const elements = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR))
  .filter((element) => {
    if (element.closest(SKIP)) return false
    if (element.closest('[aria-hidden="true"]')) return false
    if (getComputedStyle(element).transform !== "none") return false   // ← forced style recalc, per element
    …
gsap.set(elements, { autoAlpha: 0, y: 28 })                            // ← opacity:0; visibility:hidden
```

Three separate problems in one component:

1. **It hides the hero `<h1>` (`hero.tsx:265`) and hero `<p>` (`hero.tsx:271`) — the LCP candidates.** `ScrollReveal` is mounted on the marketing home only (`(marketing)/page.tsx:30`), and the hero is the first block inside that `<main>`. The server HTML paints them; then hydration runs this layout effect, paints them `visibility: hidden`, and the `ScrollTrigger.batch` tween (`:74-87`, `duration: 0.9`) brings them back. LCP moves from "first paint" to "end of hydration + 0.9 s". That alone can cost 1–2 s of LCP on mobile.
2. **`getComputedStyle()` inside a `.filter()` over 60–120 nodes** forces a synchronous style recalculation per element during hydration — classic TBT.
3. **It fights `TextReveal` on the same element.** `hero.tsx:266` wraps the H1's words in `<TextReveal preset="words" blur>`, which already animates each word (`text-reveal.tsx:65-82`), while `ScrollReveal` hides the *parent* H1. Two systems, one element.

**Fix:** exclude the hero explicitly (`#hero` added to `SKIP`, `scroll-reveal.tsx:40`), replace the `getComputedStyle` filter with a `data-no-reveal` opt-out attribute (the codebase already has the attribute — `footer.tsx:153`), and never apply the hidden state to anything already in the viewport at mount.

---

### B3 — The hero downloads two LCP images, then upscales to a 4K canvas

`src/app/components/hero.tsx:339-358`

```tsx
{!framesReady && (
  <>
    <Image src="/images/hero/hero_img.webp" … fill preload quality={90} sizes="100vw"
           className="hidden object-cover md:block" />
    <img src="/images/hero/hero_img_mobile.webp" … loading="eager" fetchPriority="high"
         className="block h-full w-full object-cover md:hidden" />
  </>
)}
```

- `hidden md:block` and `md:hidden` are **CSS only**. Both elements are in the DOM, so both are fetched, on every viewport.
- `preload` on `<Image>` (`hero.tsx:345`) emits `<link rel="preload" as="image" imagesrcset=… imagesizes="100vw">` in `<head>`. On a 390 px DPR-2 phone the browser resolves that to the 750 w candidate — an image that is then **never displayed**.
- The raw `<img>` bypasses `next/image` entirely: 251 KB at 768×1376, upscaled to 1170 px wide on a DPR-3 phone (visibly soft), with no AVIF negotiation.
- `hero_img.webp` is 2048×1152 (579 KB source); the canvas that replaces it is sized in `resizeCanvas()` (`hero.tsx:103-118`) as `cssWidth × 1.08 × min(dpr, 2)` — on a 1440×780 CSS viewport at DPR 2 that is a **3110×1685** backing store (21 MB) redrawn inside a 2.9 s `requestAnimationFrame` loop (`:171-194`).

**Impact:** a mobile visit pays roughly 150 KB for a preload that can never be displayed, 251 KB for the real LCP image, and then **8.30 MB** of frames 500 ms later (`:217-227`) — the frame download competes directly with the LCP image for the same bandwidth.

**Fix:** one `<picture>`-style `next/image` with a real `sizes`, `preload` only on the variant that matches the breakpoint (or `fetchPriority="high"` + `loading="eager"` on a single element), and cap the canvas at `min(dpr, 1.5)`.

---

### B4 — 466 full-resolution frames are decoded into memory with no cap (Performance / crash)

| Component | Frames | Dimensions | Decoded (RGBA) | Trigger |
|---|---|---|---|---|
| `hero.tsx:76-101` | 30 | 1920×1080 | **237 MiB** | 500 ms after mount |
| `featured-fragrance.tsx:78-127` | 101 | 1920×1080 | **799 MiB** | `rootMargin: "150% 0px"` |
| `civilizations-section.tsx:187-207` | 101 + 29 | 1280×720 / 1920×1080 | **584 MiB** | `rootMargin: "150% 0px"` |
| `about/about-canvas.tsx:84-90` | 41 per scene, 205 total | 1920×1080 | **324 MiB per scene, 1 621 MiB total** | per scene, on scroll |

Each loader is `Promise.all(allFrames)` — there is no concurrency limit, no `createImageBitmap` with eviction, and no cap on decoded size.

`featured-fragrance.tsx:111`:

```ts
const result = await Promise.all(promises)   // 101 images, all in flight
```

`civilizations-section.tsx:188-190`:

```ts
const frames = await Promise.all(
  Array.from({ length: TOTAL_FRAMES }, (_, index) => loadFrame(index))
)
```

**The `/story` leak is worse than the peak.** `about-canvas.tsx:29-32` keeps every decoded frame in **module-scope maps that are never evicted**:

```ts
const sceneFrames = new Map<string, (HTMLImageElement | undefined)[]>()
const scenePromises = new Map<string, Promise<void>>()
const completeScenes = new Set<string>()
const sceneAttempts = new Map<string, number>()
```

A visitor who scrolls the whole story retains all 205 frames (≈ 1.6 GiB). Mid-range Android will kill the tab. iOS Safari will reload the page.

**Fix:** decode on demand with a small ring buffer (current ± 2 frames, keep ≤ 12 decoded), never `Promise.all` more than ~10 frames, and prefer `createImageBitmap` + `close()` so the bitmap can actually be freed. For `/story`, evict a scene when it leaves the runway.

---

### B5 — The cuneiform wall blocks the main thread on mount (INP / TBT)

`src/app/components/cuneiform-wall.tsx:424-439`

```ts
const face = new FontFace(FONT_FAMILY, `url(${FONT_URL})`)   // 467 KB woff2
await face.load()
document.fonts.add(face)
const signs = readableSigns()    // 1024 fillText + getImageData(1280×1536)
const atlas = buildAtlas(signs)  // ~1 350 fillText with save/rotate/restore
… gl.texImage2D(… atlas) … gl.generateMipmap(…)
```

Measured cost of the synchronous part (`readableSigns` + `buildAtlas`):

- probe sheet `32 cols × 40 px` × `1 024` code points → **1280×1536** canvas;
- one `getImageData` over **7.86 MB** (`:215`);
- nested pixel scan over **163 840** samples (`:223-227`);
- up to 150 marks × 9 wrapped draws with `ctx.save/translate/rotate/fillText` (`:296-315`);
- one 1024² RGBA texture upload + mipmap chain (`:486-502`).

All of it in a single task, immediately after a 467 KB font download, on **both** the marketing home and every store page (`(store)/layout.tsx:6,25`). This is the largest single INP contributor at load and the reason a "quiet" page still shows a long task.

Two supporting problems:

- `tick` (`:404-409`) requests the next frame **before** the 33 ms throttle, so `requestAnimationFrame` runs at 60/120 Hz to paint at 30 fps, forever, while any surface is on screen.
- `document.querySelectorAll("[data-cuneiform-surface]")` runs **once** (`:528-530`). The store layout keeps the wall mounted across client-side navigation, so a surface rendered later (e.g. the PDP's `products/[handle]/page.tsx:201`) is never observed and the wall silently freezes on that route.

**Fix:** build the atlas inside a `requestIdleCallback` (or in a Worker with `OffscreenCanvas`), defer it until the first surface is actually visible, throttle by comparing timestamps only after `rAF` resolves, and re-query surfaces on route change (or use a `MutationObserver`).

---

### B6 — `openGraph` has no image, on a `summary_large_image` card (SEO / Best Practices)

`src/app/[locale]/layout.tsx:40-52`

```ts
openGraph: { type: "website", siteName: "3WEEQ", locale: …, title: …, description: …, url: … },
twitter: { card: "summary_large_image", title: …, description: … },
```

No `images` key in either. Every share on WhatsApp / X / LinkedIn renders a blank card, and `summary_large_image` without an image is a card-validation failure. `logo.png` (172 KB) and `logo-mark.png` (55 KB) exist in `public/images/` and are unused for this.

Also missing globally: `icons` (only the implicit `favicon.ico`), `manifest`, and `Organization` / `WebSite` JSON-LD (no sitelinks search box).

---

### B7 — 34 text nodes are below 4.5:1, 14 sit exactly on the line (Accessibility)

Sand `#f6e6d6` on navy `#0a1628` gives 14.86:1 at full opacity. Alpha-composited over the navy:

| Token | Composited | Contrast | Verdict |
|---|---|---|---|
| `text-sand/70` | — | 7.72:1 | pass |
| `text-sand/60` | — | 5.86:1 | pass |
| `text-sand/55` | — | 5.18:1 | pass |
| `text-sand/50` | `rgb(128,126,127)` | **4.50:1** | borderline — axe rounds to a fail |
| `text-sand/45` | `rgb(116,116,118)` | **3.88:1** | **fail** |
| `text-sand/40` | `rgb(104,105,110)` | **3.33:1** | **fail** |
| `text-sand/30` | `rgb(81,84,92)` | **2.44:1** | **fail** |
| `text-sand/25` | `rgb(69,74,84)` | **2.10:1** | fail (disabled controls are exempt) |

Representative failures that a real user reads:

| File:line | Text | Token |
|---|---|---|
| `(store)/products/page.tsx:311` | filter caption "الحضارة / CIVILIZATION" | `text-sand/45` |
| `(store)/products/page.tsx:500` | filter caption "المجموعة / COLLECTION" | `text-sand/45` |
| `(store)/products/page.tsx:466` | inactive type-tab count | `text-sand/40` |
| `store/cart-drawer.tsx:264, 327` | cart empty-state copy, line item meta | `text-sand/45` |
| `story` breadcrumb, `journal/page.tsx:36`, `journal/[slug]/page.tsx:59`, `policies/[slug]/page.tsx:297` | breadcrumbs | `text-sand/40` |
| `store/store-footer.tsx:132` | footer wordmark | `text-sand/40` |
| `featured-fragrance.tsx:42-43, 345` | note labels | `text-sand/45` |
| `marketing/error.tsx:25, 29` | error copy + hint | `text-sand/45`, `text-sand/25` |

**Fix:** floor every text token at `sand/60`; introduce `--text-muted: 0.62` and forbid raw `/45`-class values in review. Disabled controls may stay at `/25` but must be real `disabled` elements, not `<span>` look-alikes (`products/page.tsx:408, 425`).

---

### B8 — `/story` has no `<h1>`, and no page has a skip link (Accessibility + SEO)

- `(marketing)/story/page.tsx:23-31` renders `<main>` → `StoryExperience` → `AboutSection`. The only headings in the whole experience are `<h2>` scene titles (`about-scene-overlay.tsx:34`). There is **no `<h1>`** on a top-level, indexable page. Fails WCAG 1.3.1 / 2.4.6 and wastes the page's strongest on-page signal.
- `grep -r "skip" src/` returns one CSS comment. **There is no "skip to content" link anywhere**, on a site with a sticky header, a five-item nav, an announcement bar and a category rail on every store page. Fails WCAG 2.4.1 (Level A).

---

### B9 — Two modal surfaces do not manage focus (Accessibility)

`src/app/components/site-header.tsx:145-220` — mobile menu

```tsx
<div role="dialog" aria-modal="true" aria-label={t("menu")} className="fixed inset-0 z-[100] …">
```

- no `keydown` handler for Escape (the file has one only for the *store* search, `store-header.tsx:143`);
- no focus move into the dialog, no trap, no restore on close;
- the close button (`:171-176`) has **no padding around a 24 px icon** → 24×24 hit area;
- the menu trigger (`:254-262`) is `p-1` around a 24 px icon → 32×32.

`src/app/components/store/product-packaging-gallery.tsx:93-99` — packaging lightbox

```tsx
<div role="dialog" aria-modal="true" aria-label={t("packagingTitle")} …>
```

Escape, arrows, scroll lock and 44 px buttons are all correct (`:108, 148`), but focus stays on the thumbnail behind the overlay, so <kbd>Tab</kbd> walks the page underneath. Copy the cart-drawer implementation (`cart-drawer.tsx:87-130`).

Also: `site-header.tsx:259` mobile trigger is 32 px, `footer.tsx:125` social links are `p-2` + `h-4` = 32 px.

---

### B10 — `/products` duplicates its own catalogue and mislabels its pager (SEO + AX)

`(store)/products/page.tsx:75-94` fetches the catalogue **and** a "picks" rail with no filter:

```ts
getProducts({ …, limit: STORE_PAGE_SIZE, offset })   // catalogue
getProducts({ limit: 8, locale: storeLocale })       // picks → same first 8 products
```

The first eight products therefore appear twice on the same URL, with two different `alt`/link contexts. Google sees a 30 %-duplicated page; the user sees the same card twice.

`(store)/products/page.tsx:396-397`:

```tsx
<nav aria-label={t("breadcrumb")} …>   // ← the pagination landmark
```

The pager is announced as "breadcrumb" to every screen reader. `aria-current="true"` (`:455, 529`) should be `aria-current="page"`.

---

## 3. Performance Bottlenecks (P1)

### 3.1 Network / TTFB

| ID | Location | Finding | Cost |
|---|---|---|---|
| PE-01 | `shared/lib/medusa-fetch.ts:29-34` | no `AbortSignal.timeout`; a hung Medusa holds SSR until the platform timeout | TTFB → LCP on every dynamic render |
| PE-02 | `(store)/products/page.tsx:56-94` | `searchParams` makes the **route** dynamic (no full-route cache); the per-fetch data cache at `product.repository.ts:48` still applies, but the client pays an RSC round-trip for every facet, sort and page change | ~4 server renders per browsing session where a client-side filter would need 0 |
| PE-03 | `(store)/products/[handle]/page.tsx:84-90` | `getProduct` then `getRelatedProducts` sequentially (not `Promise.all`) | +1 backend RTT per PDP |
| PE-04 | `sitemap.ts:13` | `getProducts({ limit: 100 })` at build; if Medusa is down the sitemap ships zero products, and it is not revalidated | stale/empty sitemap |
| PE-05 | `sitemap.ts:27` | `lastModified: new Date()` on every request | every URL claims "changed now" — Google ignores lastmod entirely |
| PE-06 | `sitemap.ts:30` | only `/{defaultLocale}{path}` is emitted as `<loc>`; the `en` tree is reachable only via `alternates` | weak EN discovery |
| PE-07 | `product.repository.ts:51-58` | a backend error is converted into `{ products: [], count: 0 }` and rendered as HTTP 200 | soft-404 category pages get indexed |
| PE-08 | `newsletter-section.tsx:11-14, 152` | `dynamic(…, { ssr: false })` is rendered unconditionally → **the three.js chunk downloads on homepage load**, not on view | ~150 KB gz + parse on the critical path for a section 6 screens down |
| PE-09 | `next.config.ts` + `package.json:17` | `"analyze": "ANALYZE=true next build"` exists but `next.config.ts` never reads `process.env.ANALYZE` | the analyzer is dead configuration |

### 3.2 Images and media

| ID | Location | Finding |
|---|---|---|
| PE-10 | `first-chapter.tsx:100-106` | raw `<img loading="eager" fetchPriority="high">` for a section *below the fold*; 403 KB unoptimised, fetched on desktop too (CSS `md:hidden` does not stop the fetch) |
| PE-11 | `(store)/product-gallery.tsx:70`, `store-hero.tsx:90` | `priority` is deprecated in Next 16 — `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`: *"Starting with Next.js 16, the `priority` property has been deprecated in favor of the `preload` property"* |
| PE-12 | `store-hero.tsx:87-93` | `priority` + `quality` default on a `42rem`-wide hero; the store's LCP image is shipped at 1× source resolution with no `quality` reduction |
| PE-13 | `shared/ui/tilted-grid-hero.tsx:140-142` | `for (const { src } of images) new Image().src = src` — preloads all six `beyond` photos at mount, competing with LCP, and never uses the optimiser |
| PE-14 | `tilted-grid-hero.tsx:25, 297-327` | `SLICES = 16` → every tile is 16 stacked `<img>` elements with full-size `object-cover` and a per-slice `transform: rotateY()`; roughly 6–8 tiles × 16 = 96–128 image elements, all inside one animated subtree |
| PE-15 | `packaging-section.tsx:36, 212/231/249/269/284` | `filter: drop-shadow(0 18px 20px …)` on five large images that GSAP simultaneously scales and rotates — a filtered layer must be re-rasterised on every transform |
| PE-16 | `newsletter-section.tsx` footer image `footer.tsx:136-145` | `mix-blend-screen` over a 499 KB `quality={90}` ornament clipped to `18:1` — a full-width blend group for a decorative strip |
| PE-17 | `public/` | 511 `.webp` files, **68 MB**; `noto-sans-cuneiform.woff2` is **467 KB** and is fetched after hydration by `cuneiform-wall.tsx:426` |

### 3.3 Compositing and paint

| ID | Location | Finding |
|---|---|---|
| PE-18 | `(store)/store-header.tsx:166` | `sticky … bg-royal-navy/95 backdrop-blur-md` — a full-width backdrop blur that repaints on **every** scroll frame, over the fixed WebGL wall, for **5 %** of transparency. Pure cost, no visible benefit |
| PE-19 | `product-packaging-gallery.tsx:98`, `store-header.tsx:485` | `backdrop-blur-sm/md` on surfaces that are `97–98 %` opaque — same trade, same zero payoff |
| PE-20 | `globals.css:133` | `body { background-attachment: fixed }` with a radial gradient — forces a full-viewport repaint per scroll on mobile, behind an **opaque** canvas that hides it anyway |
| PE-21 | `globals.css:135` | `text-rendering: optimizeLegibility` on `body` — enables kerning/ligature shaping on every text node; MDN explicitly discourages it as a performance cost |
| PE-22 | `about-section.tsx:120` | `h-screen w-screen` — `100vh` breaks under the mobile URL bar, `100vw` includes the scrollbar and overflows horizontally on desktop |
| PE-23 | `store-invitation.tsx:96-133` | continuous `requestAnimationFrame` marquee writing `track.style.transform` every frame while the section is visible; `paint()` writes even for sub-pixel deltas |
| PE-24 | `shared/ui/text-reveal.tsx:68-72` | `filter: blur(10px) → blur(0)` **per word**; each word becomes a filtered layer, and `mask.offsetHeight` (`:69`) forces a layout read per word before the animation starts |
| PE-25 | 14 × `will-change` (e.g. `hero.tsx:253`, `packaging-section.tsx:195, 204-205`) | `will-change: transform` on elements that animate for <1 s keeps a GPU layer alive for the whole session |

### 3.4 Layout thrash

| ID | Location | Finding |
|---|---|---|
| PE-26 | `gate-light.tsx:291-305` | `section.getBoundingClientRect()` **inside `paint()`**, called ~30×/s while on screen, interleaved with GSAP writes to the same section → forced synchronous layout every painted frame |
| PE-27 | `about-canvas.tsx:145-155` | reads `canvas.clientWidth/clientHeight`, then writes `canvas.width/height`, inside the `ScrollTrigger.onUpdate` scrub callback |
| PE-28 | `scroll-reveal.tsx:57` | `getComputedStyle` per matched element during hydration (see B2) |
| PE-29 | `about-section.tsx:30-32` | `room.style.height = ${totalFrames * 70}px` → **14 350 px** applied in `useEffect`, after the browser has already laid out the page. On `/story` this is a guaranteed CLS event (the page height grows by 14 350 px one tick after first paint) |

### 3.5 Dead weight in the tree

| File | Status |
|---|---|
| `src/app/components/about-section.tsx` (9.9 KB) | never imported; its six `/images/about/*` assets **do not exist** (`public/images/about` is absent) |
| `src/app/components/portal-transition.tsx` | 0 references |
| `src/app/components/scroll-over.tsx` | 0 references |
| `src/app/components/scroll-cue.tsx` | 0 references (its `.scroll-cue-mark` CSS survives at `globals.css:360-367`) |
| `src/app/components/reveal.tsx` | 0 references |
| `src/shared/lib/stripe.ts` | 0 references; `@stripe/stripe-js` + `@stripe/react-stripe-js` are unused dependencies |
| `globals.css:328-350` | `.hero-part-1`, `.hero-part-2`, `.hero-part-6` — no markup uses them |
| `globals.css:506` | `.gallery-warm` — unused |
| `medusa/src/admin/components/studio/media-tab.tsx` | modified, unverified at runtime |

---

## 4. Animation & Canvas Warnings

Ten live render surfaces. All of them are hand-written, none is disposed incorrectly — the problem is *when* and *how much*.

| # | Surface | File | Thread | Rate | Pause | Verdict |
|---|---|---|---|---|---|---|
| 1 | Cuneiform wall | `cuneiform-wall.tsx` | main | `rAF` 60/120, paints 30 | off-screen, hidden tab | ⚠️ sync mount cost (B5), stale surface set |
| 2 | Hero frame film | `hero.tsx` | main | 60 | `cancelAnimationFrame` on unmount | ⚠️ 4K backing store, 237 MiB decoded |
| 3 | Gate light | `gate-light.tsx` | main | 30 | IO + visibility | ⚠️ `getBoundingClientRect` per paint |
| 4 | Featured film | `featured-fragrance.tsx` | main | scrub | n/a | ⚠️ 799 MiB decoded |
| 5 | Civilizations film | `civilizations-section.tsx` | main | scrub | n/a | ⚠️ 584 MiB decoded |
| 6 | Story film | `about/about-canvas.tsx` | main | scrub + 60 fps warm-up | `cancelAnimationFrame` | ❌ 1.6 GiB retained, 8 s redraw loop |
| 7 | Bottle | `bottle-stage.tsx` | main (WebGL) | 60 | IO + visibility | ⚠️ `antialias: true` + DPR 2 + ACES per pixel |
| 8 | Store marquee | `store-invitation.tsx` | main | 60 | off-screen | ⚠️ write per frame, never settles |
| 9 | Tilted grid | `tilted-grid-hero.tsx` | compositor (CSS) | Web Animations API | — | ⚠️ 16 slices × N tiles of `<img>` |
| 10 | Word reveals | `text-reveal.tsx` | main + GPU | 0.8 s | — | ⚠️ `blur()` per word, layout read per word |

### AN-01 — Three canvas loops share one main thread with Lenis

`CuneiformWall` (paints constantly), `GateLight` (30 fps), `BottleStage` (60 fps WebGL) and the `store-invitation` marquee (60 fps style writes) can all be live at the same time on `/`. Each is individually cheap; together they leave no idle frame budget for Lenis, ScrollTrigger and the GSAP scrub, which is exactly what "60 fps on mobile" needs. On a Redmi-class device this configuration will sit at 25–40 fps during scroll.

**Fix:** one scheduler. A single `rAF` pump that asks each surface "do you need a frame this tick?" — and a hard rule that at most **one** full-screen WebGL surface is active at a time.

### AN-02 — The throttling pattern wakes up 60–120 times a second to do nothing

`cuneiform-wall.tsx:404-409` and `gate-light.tsx:311-316` are identical:

```ts
const tick = (now: number) => {
  frame = window.requestAnimationFrame(tick)   // ← always schedules
  if (now - last < 33) return                  // ← then bails
  last = now
  paint(now / 1000)
}
```

The callback still runs on every vsync (so 120×/s on a 120 Hz phone) to compare two numbers. Multiply by the number of live surfaces.

### AN-03 — The about film redraws the full canvas at 60 fps for up to 8 seconds

`about-canvas.tsx:227-244`

```ts
let raf = 0
const startedAt = performance.now()
const tick = () => {
  draw(lastProgressRef.current)                                  // full-canvas drawImage ×2
  const firstScene = sceneFrames.get(CIVILIZATION_SCENES[0].folder)
  const stillWaiting = !firstScene?.[0] && performance.now() - startedAt < 8000
  if (stillWaiting) raf = requestAnimationFrame(tick)
}
```

`draw()` re-reads `clientWidth/clientHeight`, may reallocate the backing store, and blits two 1920×1080 images — **60 times a second, for 8 seconds**, to display a frame that is not there yet. Use a static poster image until frame 0 lands, then draw once.

### AN-04 — The story runway is created after paint (CLS)

`about-section.tsx:30-32` sets a 14 350 px height in `useEffect`. Before that effect runs the section is `h-screen`; after it runs the document is 14 350 px taller. Any element measured before that point moves. On `/story` Lighthouse will report CLS and the scrollbar will jump.

### AN-05 — `filter: blur()` is animated on the LCP text

`text-reveal.tsx:71, 77`, invoked from `hero.tsx:266` (`<TextReveal preset="words" blur …>`). Filter animation is not compositor-accelerated in the way `transform`/`opacity` are: each blurred word needs a render-surface-sized offscreen buffer and a re-rasterisation on every frame of the 0.8 s tween. On the H1 this competes directly with LCP.

### AN-06 — `/story` completely ignores `prefers-reduced-motion`

Every other surface has a branch: `scroll-reveal.tsx:49`, `text-reveal.tsx:57`, `hero.tsx:197`, `cuneiform-wall.tsx:413`, `gate-light.tsx:319`, `bottle-stage.tsx:45`, `store-invitation.tsx:67`, and `tilted-grid-hero.tsx:250` even pauses the CSS tiles via `@media(prefers-reduced-motion:reduce){…animation-play-state:paused}`.

`grep -r "prefers-reduced-motion" src/app/components/about/` returns **nothing**. The story is a 14 350 px scroll-scrubbed film (`about-section.tsx:30-42`) with a cross-fading canvas and a 60 fps warm-up loop — the single most motion-heavy page on the site, and the only one with no opt-out. A reduced-motion visitor gets the full effect.

### AN-07 — Two animation systems own the same elements

`globals.css:327-350` animates `.hero-part-3/4/5` with a `hero-rise` keyframe using `animation-fill-mode: both`, while `ScrollReveal` also sets `opacity`/`transform`/`visibility` on the same `p`/`a` nodes (`hero.tsx:271, 276, 298`). CSS animations outrank inline styles for the animated properties, so the two systems silently disagree about who owns the element's opacity. This is the classic source of "the text flashes, disappears, then fades in".

### AN-08 — The tilted grid walks its whole animation tree twice a second

`shared/ui/tilted-grid-hero.tsx:191-200`

```ts
if (collect === 0) {
  animations = el.getAnimations({ subtree: true })   // ← walk 96–128 nodes
  collect = 30
}
collect -= 1
if (Math.abs(rate - lastRate) > 0.01) {
  for (const animation of animations) animation.playbackRate = rate   // ← hundreds of writes
}
```

`getAnimations({ subtree: true })` traverses every animated descendant and allocates an array of `Animation` objects — twice a second, forever, while the section is visible. When the rate changes (any scroll direction change) it writes `playbackRate` on every one of them. The `rAF` loop itself (`:202`) never stops while visible, reads `window.scrollY` every frame, and writes two `dataset` attributes every frame (which invalidates style for any attribute selector).

---

## 5. Accessibility & SEO Failures (P1)

### 5.1 Accessibility

| ID | WCAG | Location | Failure |
|---|---|---|---|
| AX-01 | 2.4.1 (A) | whole app | no skip link |
| AX-02 | 1.4.3 (AA) | 34 nodes, see B7 | contrast 2.10–3.88:1 |
| AX-03 | 1.4.3 (AA) | `text-sand/50` × 14 | 4.50:1 exactly — rounding-dependent pass/fail |
| AX-04 | 2.1.1 / 2.4.3 | `site-header.tsx:145-220` | mobile dialog: no Escape, no focus trap, no restore |
| AX-05 | 2.4.3 | `product-packaging-gallery.tsx:93-99` | lightbox: focus never enters the dialog |
| AX-06 | 2.5.8 (AA) | `site-header.tsx:171-176` (24 px), `:254-262` (32 px), `footer.tsx:125` (32 px) | pointer targets below 24 px / 44 px |
| AX-07 | 1.3.1 | `(marketing)/story/page.tsx` | page has no `<h1>` |
| AX-08 | 3.3.1 / 4.1.3 | `checkout-flow.tsx:388-390` | form error is a bare `<p>` — no `role="alert"`, no `aria-describedby`, no focus move |
| AX-09 | 2.4.6 | `products/page.tsx:396-397` | pagination landmark labelled "breadcrumb" |
| AX-10 | 4.1.2 | `products/page.tsx:455, 529` | `aria-current="true"` instead of `"page"` |
| AX-11 | 1.1.1 | `store-hero.tsx:88` | the store's main hero photograph has `alt=""` — it is content, not decoration |
| AX-12 | 1.1.1 | `products/[handle]/page.tsx:125` | gallery alt is `${title} ${index+1}` — no information beyond the title |
| AX-13 | 2.4.7 | `products/page.tsx` (filter links) | filter changes are full navigations; focus returns to `<body>`, so a keyboard user loses their place on every facet click |

### 5.2 SEO

| ID | Location | Failure |
|---|---|---|
| SEO-01 | `[locale]/layout.tsx:33-39` | canonical + hreflang inherited by every non-PDP route (B1) |
| SEO-02 | `[locale]/layout.tsx:40-52` | `openGraph` / `twitter` without `images` (B6) |
| SEO-03 | `products/page.tsx:49-52` | two long descriptions hardcoded in the page, bypassing `messages/*.json` (also violates the project's copy rule) |
| SEO-04 | no `title.template` in `[locale]/layout.tsx`; eight pages hand-concatenate `\| 3WEEQ` (`products/page.tsx:48`, `collections/page.tsx:16`, `cart/page.tsx:14`, `checkout/page.tsx:14`, `journal/page.tsx:13`, `journal/[slug]/page.tsx:20`, `policies/[slug]/page.tsx:268`, `order/[id]/page.tsx:5`) | the brand suffix lives in eight places and drifts: `Story.title` already contains it, `journal`/`policies`/`order` hardcode the Arabic name inline instead of reading `messages/`, and `order/[id]/page.tsx:5` ships an Arabic `<title>` on the **English** site |
| SEO-05 | `products/page.tsx` | no `robots: { index: false }` on filtered/paginated views, and no canonical to the clean path → unbounded crawlable facet URLs |
| SEO-06 | `products/[handle]/page.tsx:167-188` | JSON-LD `Product` has no `url`, no `offers.url`, no `itemCondition`; `image` is a single string |
| SEO-07 | PDP | no `BreadcrumbList` JSON-LD, and no visible breadcrumb on the PDP (the only breadcrumb `<nav>` in the store is the pager) |
| SEO-08 | `[locale]/layout.tsx` | no `Organization` / `WebSite` JSON-LD → no sitelinks search box |
| SEO-09 | `robots.ts:12` | `disallow: ["/api/", "/*/cart", "/*/checkout"]` — `/order/*` (the confirmation page, which is `noindex` at the page level) is not blocked; harmless but inconsistent |
| SEO-10 | `sitemap.ts:30` | sitemap `<loc>` only covers the default locale (PE-06) |
| SEO-11 | `sitemap.ts:27` | `lastModified: new Date()` (PE-05) |
| SEO-12 | `story/page.tsx` | no `<h1>`, and the page title/description come from `Story.*` only — no `alternates` |
| SEO-13 | `.env.local` | `NEXT_PUBLIC_SITE_URL=http://localhost:3000` → `metadataBase`, canonical, hreflang, OG `url` and `sitemap.xml` all point at **another project's dev server**. A deploy that forgets this env var ships a site that canonicalises itself to localhost |

### 5.3 Best Practices

| ID | Location | Failure |
|---|---|---|
| BP-01 | `first-chapter.tsx:100`, `hero.tsx:351` | raw `<img>` with `fetchPriority="high"` bypasses `next/image` → no AVIF, no responsive srcset, no optimizer cache |
| BP-02 | `product-gallery.tsx:70`, `store-hero.tsx:90` | deprecated `priority` prop (Next 16) |
| BP-03 | `next.config.ts` | no security headers at all: `Content-Security-Policy`, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`, `Strict-Transport-Security` |
| BP-04 | `hero.tsx:225`, `featured-fragrance.tsx:119`, `civilizations-section.tsx:199` | `console.error` ships to production (Lighthouse "Issues were logged in the console") |
| BP-05 | `product.repository.ts:51-58` | backend failure renders HTTP 200 with an empty catalogue (Lighthouse "Page has a soft 404" pattern) |

---

## 6. Prioritized Action Plan

### Phase 0 — one hour, highest leverage (fix B1 + B6 + B7)

| Order | Action | Files | Expected |
|---|---|---|---|
| 1 | Give every page its own `alternates.canonical` + `languages`; canonical filters to the clean path | 8 `page.tsx` files, following `products/[handle]/page.tsx:47-53` | SEO jumps from failing to passing |
| 2 | Add an OG image + `icons` + `Organization`/`WebSite` JSON-LD to the root layout | `[locale]/layout.tsx:40-52` | SEO + share cards |
| 3 | Raise every text token to `sand/60` minimum; keep `/25` only on real `disabled` controls | 8 files, listed in B7 | Accessibility 100 |
| 4 | Add a skip link + an `<h1>` on `/story` | `(store)/layout.tsx`, `(marketing)/layout.tsx`, `about-scene-overlay.tsx` | AX-01, AX-07 |

### Phase 1 — the LCP path (fix B2 + B3 + PE-10)

| Order | Action | Files |
|---|---|---|
| 5 | Add `#hero` to `ScrollReveal`'s `SKIP`; drop the `getComputedStyle` filter for a `data-no-reveal` attribute | `scroll-reveal.tsx:40, 51-67` |
| 6 | Collapse the hero into one responsive image with `sizes` and a single preload; cap the canvas at `min(dpr, 1.5)` | `hero.tsx:339-358, 103-118` |
| 7 | Replace the raw mobile `<img>` in First Chapter with `next/image` + `loading="lazy"` | `first-chapter.tsx:100-106` |
| 8 | Swap deprecated `priority` → `preload` | `product-gallery.tsx:70`, `store-hero.tsx:90` |

### Phase 2 — the frame pipeline (fix B4 + AN-01…AN-05)

| Order | Action | Files |
|---|---|---|
| 9 | Replace `Promise.all(allFrames)` with a bounded loader (≤ 10 in flight) + a ring buffer of ≤ 12 decoded frames, at 1280×720 max | `featured-fragrance.tsx`, `civilizations-section.tsx`, `hero.tsx` |
| 10 | Evict a scene from `sceneFrames` when it leaves the runway; replace the 8 s 60 fps warm-up with a poster frame | `about/about-canvas.tsx:29-32, 84-90, 227-244` |
| 11 | Move the story runway height from `useEffect` to CSS (`min-h-[calc(100svh+14350px)]`) | `about-section.tsx:30-32` |
| 12 | One scheduler for all canvases; remove the always-schedule-then-bail pattern | `cuneiform-wall.tsx:404`, `gate-light.tsx:311` |
| 13 | Move `getBoundingClientRect` out of `paint()` and into a scroll listener / `ScrollTrigger.onUpdate` | `gate-light.tsx:294` |
| 14 | Drop `blur` from the hero `TextReveal` (or animate `opacity` + `translate` only) | `hero.tsx:266`, `text-reveal.tsx:68-77` |
| 15 | Re-query `[data-cuneiform-surface]` on route change | `cuneiform-wall.tsx:528-530` |

### Phase 3 — paint and compositing (PE-18…PE-25)

| Order | Action | Files |
|---|---|---|
| 16 | Remove `backdrop-blur` from the sticky store header (it is 95 % opaque) | `store-header.tsx:166` |
| 17 | Remove `background-attachment: fixed`; paint the gradient on a fixed pseudo-element only where the canvas is absent | `globals.css:123-136` |
| 18 | Remove `text-rendering: optimizeLegibility` | `globals.css:135` |
| 19 | Replace `filter: drop-shadow` on the packaging renders with a CSS `box-shadow` on a wrapper (or a baked shadow) | `packaging-section.tsx:36` |
| 20 | `h-screen w-screen` → `h-[100svh] w-full` | `about-section.tsx:120` |
| 21 | Gate the three.js import behind an IntersectionObserver, not just `dynamic()` | `newsletter-section.tsx:11-14, 152` |
| 22 | Preload the `beyond` grid only on view; drop `SLICES` from 16 to 8 where visually acceptable | `tilted-grid-hero.tsx:25, 140-142` |

### Phase 4 — resilience and hygiene

| Order | Action | Files |
|---|---|---|
| 23 | Add `AbortSignal.timeout(8000)` to `medusaFetch` | `medusa-fetch.ts:29` |
| 24 | Return a real 503 (or a styled degraded page) when the catalogue is unreachable | `product.repository.ts:51-58` |
| 25 | `Promise.all` the PDP's product + related fetches; make the sitemap revalidate | `products/[handle]/page.tsx:84-90`, `sitemap.ts` |
| 26 | Delete the five dead components, the three dead CSS blocks, `shared/lib/stripe.ts` and the two unused Stripe deps | §3.5 |
| 27 | Wire the bundle analyzer (`ANALYZE`) or delete the script | `next.config.ts`, `package.json:17` |
| 28 | Add security headers | `next.config.ts` |
| 29 | Fix the mobile-menu and lightbox focus management using the cart-drawer pattern | `site-header.tsx`, `product-packaging-gallery.tsx` |
| 30 | Relabel the pager, use `aria-current="page"`, dedupe the "picks" rail, move the hardcoded descriptions into `messages/` | `products/page.tsx` |

### Verification gates (run after each phase)

```bash
# 1. Lighthouse, mobile + desktop, on the four heaviest routes
npx lighthouse http://localhost:3001/ar             --preset=desktop --only-categories=performance,accessibility,best-practices,seo
npx lighthouse http://localhost:3001/ar/story       --preset=mobile
npx lighthouse http://localhost:3001/ar/products    --preset=mobile
npx lighthouse http://localhost:3001/ar/products/rafid --preset=mobile

# 2. Canonical + hreflang must equal the current URL on every route
for p in "" products collections story journal policies/faq cart; do
  curl -s "http://localhost:3001/en/$p" | grep -o '<link rel="canonical"[^>]*>'
done

# 3. Frame memory: DevTools Performance → Memory, scroll the full homepage and /story,
#    confirm the JS heap returns to baseline (today it grows monotonically).

# 4. Contrast: axe DevTools on /ar/products, /ar/cart, /ar/story → "0 violations".

# 5. Bundle: ANALYZE=true npm run build (after #27), confirm three.js is not in the
#    homepage first-load JS.
```

### What is still unverified (needs a live environment)

| Item | Why it matters | How to close it |
|---|---|---|
| Real LCP / INP / CLS per route | every number above is derived from code and asset bytes | Lighthouse CI on a throttled Moto G4 profile |
| The Medusa-backed surfaces (`/products` facets, price sort, PDP packaging gallery, admin media tab) | the backend was down for the whole audit | seed products with `packaging` media, then re-run the Playwright suite |
| Whether `/public` is served with a long `Cache-Control` | 32 MB of frames re-validated per visit would double the cost of every return visit | check the production CDN headers for `/hero_frames/*` (Next serves `/public` with `max-age=0` by default) |
| The exact main-thread cost of the wall atlas | estimate only | Performance panel → "Long tasks" on a cold load, then optimise until the task is < 50 ms |
| `medusa/src/admin/components/studio/media-tab.tsx` | rewritten, never opened | run the admin studio against a seeded backend |

---

## Appendix A — Asset inventory

| Folder | Files | Size | Served on |
|---|---|---|---|
| `public/greese_frames` | 41 | 10.76 MB | `/story` |
| `public/china_frames` | 41 | 9.97 MB | `/story` |
| `public/babel_frames` | 41 | 9.70 MB | `/story` |
| `public/hero_frames` | 30 | 8.30 MB | `/` (500 ms after mount) |
| `public/egypt_frames` | 41 | 6.14 MB | `/story` |
| `public/featured_frames` | 101 | 5.81 MB | `/` (on scroll) |
| `public/0_frame` | 41 | 2.42 MB | `/story` |
| `public/images/civil` | 130 | 7.06 MB | `/` (on scroll) |
| `public/images/packaging_images` | 22 | 3.56 MB | `/`, `/products` |
| `public/images/hero-2` | 9 | 2.28 MB | `/` (store invitation) |
| `public/images/beyond` | 8 | 1.50 MB | `/` (tilted grid) |
| `public/images/hero` | 3 | 1.42 MB | `/` |
| `public/images/journal` | 4 | 1.17 MB | `/journal` |
| `public/images/first_chapter` | 2 | 0.76 MB | `/` |
| `public/draco` | 3 | 0.73 MB | newsletter bottleneck (3D) |
| `public/fonts` | 3 | 0.59 MB | all routes |
| `public/images/footer` | 1 | 0.48 MB | all routes |
| **Total** | **525** | **73.22 MB** | |

## Appendix B — Frame geometry

| Set | Dimensions | Decoded per frame (RGBA) |
|---|---|---|
| `hero_frames` | 1920×1080 | 7.91 MiB |
| `featured_frames` | 1920×1080 | 7.91 MiB |
| `0_frame`, `babel_frames`, `egypt_frames`, `greese_frames`, `china_frames` | 1920×1080 | 7.91 MiB |
| `images/civil/frames` | 1280×720 | 3.52 MiB |
| `images/civil/frames/khaleg` | 1920×1080 | 7.91 MiB |
| `images/hero/hero_img.webp` | 2048×1152 | 9.00 MiB |
| `images/hero/hero_img_mobile.webp` | 768×1376 | 4.03 MiB |
| `images/packaging_images/1.webp` | 1866×987 | 7.02 MiB |
| `images/hero-2/1.webp` | 1536×2720 | 15.94 MiB |
