# 3WEEQ — Production Readiness Audit

> **Audit snapshot:** 2026-10-25, 04:35 (local time)
> **Auditor mode:** read-only architecture / QA review. No source file was modified; this document is the only file created.
> **Important caveat:** the working tree was being actively modified by another process during this audit. Source files changed continuously between 03:00 and 04:23 (marketing, store, cart, motion and i18n files). All findings below were re-checked against the tree at the snapshot time. Line numbers can shift if that refactor continues. **Do not deploy the current working tree before it is frozen, committed and re-verified.**

---

## 0. Executive Summary

The marketing experience is visually mature and the engineering foundations are better than a typical pre-launch build: Next.js 16 App Router, next-intl with `ar`/`en`, a real Medusa v2 backend (catalog, cart, checkout and payment providers already exist server-side), GSAP/ScrollTrigger with Lenis correctly wired, reduced-motion handling across most sections, and mostly correct effect cleanup. `npm run typecheck`, `npm test` and `npm run build` pass, and the production build generates the journal and policy pages statically.

However, **the storefront is not production-ready as an e-commerce site**. The two decisive blockers are:

1. **The commerce journey ends at the cart.** The frontend checkout page is an explicit "coming soon" placeholder and both cart CTAs are disabled, even though the Medusa backend already exposes `/store/threeweeq/checkout`, `/store/checkout/complete`, shipping options and Stripe/Tap providers. There is also no payment callback route, order confirmation page or order tracking.
2. **The 404 path is broken.** `src/app/[locale]/(store)/not-found.tsx` awaits `params`, but Next.js never passes props to `not-found.js`. A missing product URL was reproduced returning **HTTP 200 with no 404 UI**, and the server logged:
   `TypeError: Cannot destructure property 'locale' of '(intermediate value)' as it is undefined.`
   That is a soft-404 for crawlers and an empty-looking page for customers.

Beyond those, there are launch-relevant gaps in English-locale data fetching, cache strategy, newsletter persistence, SEO, error boundaries, media weight and CI formatting. The marketing site can ship as a brand site; the full store cannot.

### Readiness matrix

| Area | Status | Notes |
|---|---|---|
| Marketing UI / motion | **Good** | Polished, reduced-motion aware in most sections, correct Lenis/ScrollTrigger wiring |
| Accessibility basics | **Fair** | Focus traps in cart/search, skip-free but usable; mobile menu lacks Escape/focus trap; some arrows do not mirror for LTR |
| RTL / LTR | **Fair** | Root `dir` is correct; remaining locale-loss bugs in links/API calls and Arabic-formatted prices in English cart |
| Catalog & cart | **Partial** | Real Medusa integration works; data locale and cache semantics are wrong |
| Checkout & payments | **Missing (frontend)** | Backend exists; no UI, callback or order confirmation |
| Newsletter | **Unsafe** | Writes to local filesystem on a serverless host and reports success on failure |
| SEO | **Weak** | No sitemap/robots/hreflang/canonical; soft 404s; minimal metadata |
| Error / loading states | **Incomplete** | Store only; marketing and root boundaries missing; 404 crash |
| Performance | **At risk** | ~67.9 MB of public media; hundreds of decoded 1080p frames; double image downloads |
| Deployment hygiene | **Blocked** | Large uncommitted refactor; `format:check` fails; production env/payment/CORS checklist absent |
| Tests | **Minimal** | 2 unit tests; cart E2E skipped by default; no CI E2E |

**Verdict: not ready for production.** Treat the items in section 2 as launch blockers; section 3 items as launch-week must-fixes; section 4 items as scope definitions.

---

## 1. What Was Verified

Commands run against the snapshot:

| Command | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass: 0 errors, 4 warnings (`hero` hook deps, three raw `<img>` warnings) |
| `npm run format:check` | **Fail**: 9 files, listed below |
| `npm test` | Pass: 2 tests in `src/shared/lib/format.test.ts` |
| `npm run build` | Pass (Next.js 16.3.8, Turbopack); 34 pages generated |
| Runtime 404 probe | `/ar/products/no-such-product` → HTTP **200**, server `TypeError` in `not-found.tsx`, no visible 404 UI |
| Runtime unknown-route probe | `/ar/unknown-route` → HTTP 404 (Next default page, not branded) |
| Runtime missing-journal probe | `/ar/journal/no-such-post` → HTTP 404 (Next default page, not branded) |

Production build route output (relevant part):

```
├ ƒ /[locale]                 ← home is dynamic, not static
├ ƒ /[locale]/cart
├ ƒ /[locale]/checkout
├ ƒ /[locale]/collections
├ ● /ar/journal … ● /en/journal
├ ƒ /[locale]/products
├ ƒ /[locale]/products/[handle]
├ ● /ar/story … ● /en/story
```

The marketing home page having `generateStaticParams()` yet rendering as `ƒ` means it is server-rendered on every request. The story page under the same layout is static, so this is not an inherent locale-layout limitation.

---

## 2. Critical Bugs (Must Fix Before Launch)

### C1. Store 404 crashes and returns HTTP 200 (soft 404)

**Files:** `src/app/[locale]/(store)/not-found.tsx:4-9`, `src/app/[locale]/(store)/products/[handle]/page.tsx:23-25,63-65`

`not-found.tsx` is written as:

```tsx
export default async function StoreNotFound({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  ...
}
```

Next.js documents that `not-found.js` **does not accept any props**. `params` is `undefined`, so the page throws before it can render. Because the product route is dynamic and streamed, the response is **200**, not 404. Reproduced stack:

```
TypeError: Cannot destructure property 'locale' of '(intermediate value)' as it is undefined.
    at e (.next/server/chunks/ssr/...)
```

**Impact:** every missing/removed product is a soft-404 (bad indexing), the customer sees only the header and an empty content area, and the error surfaces as the store error boundary at best.

**Fix direction:** make the page a plain server component that calls `getTranslations()` without params, or a client component using `useTranslations`; add a root `app/[locale]/not-found.tsx` for marketing routes and an `app/not-found.tsx` / `global-not-found.tsx` for unmatched URLs. Verify `curl -I` returns 404 for a missing handle.

---

### C2. Checkout does not exist in the frontend

**Files:** `src/app/[locale]/(store)/checkout/page.tsx:45-66`; `src/app/components/store/cart-drawer.tsx:407-416`; `src/app/components/store/cart-page-client.tsx:327-335`

The checkout page renders "Secure checkout powered by Stripe — coming soon", and both cart CTAs are `disabled` with `t("checkoutSoon")`. This is a hard stop for revenue.

The backend is already built:

- `medusa/src/api/store/threeweeq/checkout/route.ts` — updates email/addresses, selects shipping, creates a payment collection/session, returns `client_secret`.
- `medusa/src/api/store/checkout/complete/route.ts` — authorizes/captures/creates the order with idempotency and limits.
- `medusa/src/api/store/threeweeq/shipping-options/route.ts` — priced shipping options.
- Stripe and Tap modules + webhooks are configured in `medusa-config.ts`.
- `TAP_REDIRECT_URL` expects a frontend callback at `/checkout/callback`, which **does not exist** in the app.

**Impact:** no customer can buy anything; the store is a catalog demo.

**Fix direction:** implement a checkout state machine (email → shipping address → shipping option → payment session → confirmation), a `/checkout/callback` route, an order confirmation page, and enable both CTAs. Gate the UI on cart emptiness/out-of-stock warnings already returned by `serializeCart`.

---

### C3. Newsletter reports success when nothing was saved

**Files:** `src/app/api/newsletter/route.ts:62-87`; `src/app/components/newsletter-section.tsx:30-53`; `docs/ENVIRONMENT.md:18-28`

Without `MEDUSA_BACKEND_URL`, `MEDUSA_PUBLISHABLE_KEY` and `MEDUSA_WAITLIST_CIVILIZATION_ID`, the route writes to `./.data/newsletter-subscribers.json`. On Vercel (and most serverless hosts) the project filesystem is read-only, and any write to `/tmp` is ephemeral. The `catch` branch then returns:

```ts
return NextResponse.json({ ok: true, queued: true })
```

So the UI shows "Thank you" even when the address was lost. The local `.env.local` does not define `MEDUSA_WAITLIST_CIVILIZATION_ID`, so the reliable path is inactive today. The waitlist call also hardcodes `locale: "ar"` (`route.ts:45`).

**Impact:** silent lead loss; false compliance with GDPR-style consent expectations.

**Fix direction:** make persistence mandatory (ESP/DB or Medusa waitlist), return `503` when it fails, remove the "always success" catch, pass the current locale, add rate limiting/honeypot and a consent line.

---

### C4. English store pages fetch Arabic catalog data

**Files:** `src/app/[locale]/(store)/products/page.tsx:54-66`; `collections/page.tsx:30`; `products/[handle]/page.tsx:21,61,67`; `src/shared/lib/api.ts:55-73`; `src/shared/lib/cart.ts:40`

UI strings were localized during the in-flight refactor, but the data calls were not updated:

```tsx
getProducts({ ... })       // no locale
getCivilizations()         // default locale = "ar"
getCollections()           // default locale = "ar"
getProduct(handle)         // no locale
getRelatedProducts(product) // no locale
```

`getCollections` / `getCivilizations` default to `"ar"`, and `cartQuery` always sends `DEFAULT_LOCALE` (`environ` default `"ar"`). Result: on `/en/products`, `/en/collections` and `/en/products/[handle]`, product titles, descriptions, collection titles and cart line titles come back in Arabic.

**Impact:** the English storefront is not actually English.

**Fix direction:** pass `locale` from `params` through every repository call, add it to `getRelatedProducts`, and make `cartQuery` accept the active locale. Add an English E2E assertion on a seeded product title.

---

### C5. Locale prefix is lost by internal links and redirects

**Files:** `products/page.tsx:1,86,94`; `products/[handle]/page.tsx:2`; `collections/page.tsx:2,40,79-82`; `journal/page.tsx:2`; `journal/[slug]/page.tsx:2`; `store/cart-drawer.tsx:4`; `store/cart-page-client.tsx:4`; `components/civilizations-section.tsx:5`

All of these import `Link` from `next/link` and use unprefixed hrefs (`/products`, `/journal`, `/products?collection=…`). With `localePrefix: "always"`, the URL is the source of truth. Depending on next-intl cookie negotiation, an English visitor can be redirected back to `/ar/...`; the server-side `redirect(buildHref(...))` at `products/page.tsx:94` definitely targets an unprefixed path.

**Impact:** language switching is not durable; deep links can silently change language.

**Fix direction:** import `Link`, `redirect`, `useRouter` from `@/i18n/navigation` everywhere, and build hrefs as locale-less paths so next-intl adds the prefix. Keep `next/link` only for external URLs.

---

### C6. Marketing has no error or not-found boundaries; root 404 is unbranded

**Evidence:** `Test-Path` for `src/app/[locale]/error.tsx`, `src/app/[locale]/not-found.tsx`, `src/app/[locale]/(marketing)/error.tsx`, `(marketing)/not-found.tsx`, `src/app/not-found.tsx`, `src/app/global-error.tsx` all return `False`.

Only `(store)/error.tsx` and `(store)/not-found.tsx` exist. `notFound()` from journal/policy routes therefore falls back to Next's default 404, and a client exception in any GSAP section has no marketing-level error boundary. The runtime probes confirmed the default pages.

**Impact:** broken links and client errors break the premium brand experience; no recovery UI.

**Fix direction:** add `[locale]/not-found.tsx`, `(marketing)/error.tsx`, a root `app/not-found.tsx` and `global-error.tsx`. Remember: these components do not receive `params` (see C1).

---

### C7. All catalog caching is disabled by a hard-coded `cache: "no-store"`

**Files:** `src/shared/lib/medusa-fetch.ts:26-31`; `src/entities/product/api/product.repository.ts:45-47,71-73`; `collections/...:11-14`; `civilizations/...:11-14`; `src/app/[locale]/(store)/layout.tsx:5`

Repositories ask for `next: { tags, revalidate: 300/600/3600 }`, but `medusaFetch` spreads the options and then overrides them:

```ts
const res = await fetch(url, {
  ...options,
  headers,
  credentials: "include",
  cache: "no-store",   // ← kills revalidate and tags
})
```

In addition, `export const dynamic = "force-dynamic"` on the store layout prevents Next from caching any store route. Every product-list view, collection view and product page hits Medusa on every request.

**Impact:** slower TTFB, higher backend load and cost, no ability to revalidate on catalog changes. The tuning in the repositories is currently dead code.

**Fix direction:** remove the global `no-store`; make cache policy per call (catalog: tagged ISR; cart/checkout: no-store). Remove `force-dynamic` from the layout and opt out only for cart/checkout. Add a Medusa webhook that calls `revalidateTag("products")` / `revalidateTag(\`product:${handle}\`)`.

---

### C8. The marketing home is rendered dynamically on every request

**Evidence:** build output shows `ƒ /[locale]` while `/ar/story` and `/en/story` under the same locale layout are `● (SSG)`. `src/app/components/beyond-section.tsx:138-139` is the only server component on the home tree that resolves translations without an explicit locale:

```tsx
export async function BeyondSection() {
  const t = await getTranslations("Beyond")
```

The locale layout does call `setRequestLocale`, so this is the first place to inspect (a request-bound API there can opt the whole route out of static rendering).

**Impact:** no static HTML/CDN path for the most important page; higher TTFB and LCP, and the dynamic shell weakens caching.

**Fix direction:** pass `locale` into `BeyondSection` and call `getTranslations({ locale, namespace: "Beyond" })`, or ensure `setRequestLocale(locale)` is called in the home page; rebuild and confirm `/[locale]` becomes `●`.

---

### C9. About canvas can loop forever, and partial scenes are never retried

**File:** `src/app/components/about/about-canvas.tsx:205-219`

```tsx
const tick = () => {
  draw(lastProgressRef.current)
  const firstScene = sceneFrames.get(CIVILIZATION_SCENES[0].folder)
  if (!firstScene?.[0]) raf = requestAnimationFrame(tick)  // runs forever if frame 0 fails
}
```

`loadFrame` resolves `null` on error (`:51`), so `firstScene[0]` can remain `undefined` forever. This becomes a permanent `requestAnimationFrame` redraw loop (CPU/battery), not a one-off retry.

Separately, `ensureScene` marks a folder complete after `Promise.all` even when every frame resolved `null` (`:65-74`), and `completeScenes` prevents a retry. One transient network failure can leave a scene permanently missing for the session.

**Impact:** mobile battery/CPU drain on the story page; missing scenes after flaky network.

**Fix direction:** bound the retry loop with a counter/timeout, stop the loop on error, only mark a scene complete when every frame loaded, and expose a retry when a scene is incomplete.

---

### C10. Decoded frame memory can reach hundreds of MB (and ~1.6 GB worst case)

**Files:** `src/app/components/about/about-canvas.tsx:29-31`; `hero.tsx`; `featured-fragrance.tsx`; `civilizations-section.tsx`

Measured assets:

| Set | Frames | Source size | Dimensions | Decoded RGBA each | If all retained |
|---|---:|---:|---:|---:|---:|
| `hero_frames` | 30 | 8.3 MB | 1920×1080 | ~7.9 MB | ~237 MB |
| `featured_frames` | 101 | 5.8 MB | 1920×1080 | ~7.9 MB | ~798 MB |
| `images/civil/frames` | 101 | 5.7 MB | 1280×720 | ~3.5 MB | ~354 MB |
| `0_frame` + four scene folders | 205 | 39.0 MB | 1920×1080 | ~7.9 MB | ~1.6 GB |

The canvas code keeps `HTMLImageElement` references in React state / module-level maps. Browsers may evict decoded data under pressure, but retaining 101–205 large image objects is a real OOM/crash risk on iOS Safari. `about-canvas`'s module-level `sceneFrames` Map is never cleared, so the memory persists across client-side navigation for the life of the tab.

**Impact:** jank, decoding stalls, tab crashes on mid-range phones.

**Fix direction:** ship mobile frame variants (e.g. 720–960 px wide), cap decoded frames (LRU or windowed preload around the playhead), release scenes on unmount, and prefer `createImageBitmap` + `close()` for offscreen bitmaps. Measure with Chrome Memory and an iPhone.

---

### C11. CI will fail on formatting; a large refactor is uncommitted

**Formatting (verified):** `npm run format:check` fails on 9 files:

```
src/app/[locale]/(marketing)/policies/[slug]/page.tsx
src/app/[locale]/(store)/products/[handle]/page.tsx
src/app/[locale]/layout.tsx
src/app/components/about-section.tsx
src/app/components/newsletter-section.tsx
src/app/components/site-header.tsx
src/app/components/store/cart-page-client.tsx
src/app/components/store/product-purchase-panel.tsx
src/shared/motion/use-spotlight.ts
```

The CI workflow (`.github/workflows/ci.yml`) runs `format:check`, so a push will be red even though typecheck/lint/tests pass.

**Git state:** the entire locale migration is untracked/deleted relative to HEAD: `src/app/[locale]/`, `messages/`, `src/i18n/`, `src/proxy.ts`, new motion/UI files are `??`; the old `(marketing)`/`(store)` route files are `D`. A deploy from the current git HEAD would not contain the new site; a deploy from the working tree is unreviewed. `MOTION_PLAN.md` and the new assets are also untracked.

**Fix direction:** freeze the refactor, run `npm run format`, review and commit the whole migration (including `messages/`), then re-run the pipeline from a clean clone. Never deploy a dirty tree.

---

### C12. Cart totals are formatted as Arabic in the English store

**Files:** `src/app/components/store/cart-drawer.tsx:333-338,395`; `src/app/components/store/cart-page-client.tsx:237-247,304,322`

The cart drawer reads `useLocale()` but only uses it for slide direction; both cart components call `formatPrice(value, currencyCode)` with the default `"ar"` locale. In English, prices render with Arabic currency formatting (`ر.س`) even though the surrounding UI is English. `ProductPurchasePanel` does pass the locale, so product pages are inconsistent with the cart.

**Fix direction:** pass `locale === "ar" ? "ar" : "en"` to every `formatPrice` call (or wrap it in a locale-aware `usePrice` hook).

---

## 3. Performance Warnings

### P1. 67.9 MB / 476 files in `public/`

Measured totals:

| Path | Size | Files |
|---|---:|---:|
| `public/` total | **67.9 MB** | 476 |
| `public/babel_frames` | 9.7 MB | 41 |
| `public/china_frames` | 10.0 MB | 41 |
| `public/greese_frames` | 10.8 MB | 41 |
| `public/egypt_frames` | 6.1 MB | 41 |
| `public/0_frame` | 2.4 MB | 41 |
| `public/hero_frames` | 8.3 MB | 30 |
| `public/featured_frames` | 5.8 MB | 101 |
| `public/images/civil/frames` | 5.7 MB | 101 |
| `public/images` (photos/logos) | 14.7 MB | 138 |

Frames bypass `next/image`, so they are served as-is from the host with no AVIF derivative, no responsive width, and no per-device variant. The desktop 1920×1080 frames are served to phones.

**Recommendation:** generate `sm`/`md`/`lg` frame sets (e.g. 640/1280/1920), use AVIF/WebP, select based on viewport/DPR, and add a hard preload budget per route. Keep the source masters out of `public/` if they are not requested by the app.

### P2. The hero downloads both desktop and mobile images (and so does the first chapter)

**Files:** `src/app/components/hero.tsx:345-365`; `src/app/components/first-chapter.tsx:110-127`; `src/app/components/packaging-section.tsx:68-83`

In the hero, the desktop `next/image` (`priority`, 579 KB source) and the mobile raw `<img loading="eager" fetchPriority="high">` (252 KB) are both in the DOM; CSS only hides one. Both are fetched. The same pattern exists in `FirstChapter` (`priority` desktop 355 KB + mobile 228 KB) and packaging (desktop `next/image` + mobile `<img loading="lazy">`).

Worse, `FirstChapter` starts with `clipPath: circle(0% at 50% 50%)` and is visually hidden behind the About/Portal, yet its priority image is preloaded in the head. That is bandwidth spent on an invisible layer competing with the real LCP image.

**Recommendation:** use one `<picture>` with art-directed `source media` (or `getImageProps`) so only the matching file loads. Use `preload`/`priority` only on the actual first-viewport LCP image.

### P3. The About section eagerly loads four full-size images

**File:** `src/app/components/about-section.tsx:226-233`

Only the first slide is visible, but the other four images use `loading="eager"` (plus `priority` on the first). Sources are 321–496 KB JPGs (about 1.65 MB extra) and the background `ABOUT_HERO_BG.jpg` is 655 KB, with `top_right_about.png` at 410 KB.

**Recommendation:** lazy-load slides 2–5 and preload each slide one step before its transition (e.g. via the GSAP timeline progress); convert the remaining JPGs to AVIF/WebP.

### P4. 101 frame requests are fired at once

**Files:** `featured-fragrance.tsx:57-104`; `civilizations-section.tsx:178-196`

Both sequences create all image loads in a single `Promise.all`. On a phone, that is 101 concurrent requests (≈5.8 MB / ≈5.7 MB) while scrolling. There is no `requestIdleCallback`, connection-aware limit, or chunked queue.

**Recommendation:** chunk preloading (e.g. 8–12 parallel), prioritise frames around the current playhead, and cancel outstanding work on unmount.

### P5. Missing-frame fallbacks point at files that do not exist

**Files:** `featured-fragrance.tsx:78-85`; `civilizations-section.tsx:75-82`

Featured falls back to `/featured_frames/frame-XXX.jpg` (3-digit JPG). The directory contains WebP files with timestamped names, so every missing frame triggers a guaranteed 404. Civilizations falls back to `/civil/frames/frame-XXX.webp`, a directory that does not exist in `public/`. These produce 404 noise and extend load time precisely when the network is already failing.

**Recommendation:** remove the dead fallbacks or generate matching fallback files; log/report missing frames instead of silently retrying dead URLs.

### P6. Next.js 16 image API drift

**File:** `next.config.ts:28`; `src/app/[locale]/(marketing)/journal/page.tsx:68`; `journal/[slug]/page.tsx:85`; `hero.tsx:343`; `first-chapter.tsx:116`; `product-gallery.tsx:60`; `about-section.tsx:231`; `site-header.tsx:355`; `store-header.tsx:34`

- The allowlist is `qualities: [60, 70, 75, 80, 90]`, but the journal uses `quality={85}` and the article hero uses `quality={88}`. Next.js 16 coerces unlisted qualities to a neighbour and logs a development warning. Use exactly the allowlisted values.
- `priority` is deprecated in Next.js 16 in favour of `preload` (see `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md:291-293`). The project uses `priority` in seven places. Migrate before it is removed.
- `about-section.tsx:231-232` sets both `priority` and `loading`, which is redundant/conflicting.

### P7. `three` is an unused dependency; `prisma` schema is dead weight

`package.json:37` declares `three` and `@types/three`, but no `src` file imports Three.js. It is not in the client bundle today because it is unused, but it is an unnecessary install/audit surface and a trap for future imports. `prisma/schema.prisma` is not referenced by the storefront (the backend owns the database); it can mislead contributors into running Prisma against Medusa.

Remove `three`/`@types/three` and either delete `prisma/` or document it as a design artifact.

### P8. Positive: motion performance fundamentals are sound

- GSAP animations inspected use `transform`/`opacity`/`scale`; no width/height/top/left tweens were found.
- Lenis is correctly wired: `lenis.on("scroll", ScrollTrigger.update)`, `gsap.ticker.add((t) => lenis.raf(t * 1000))`, `lagSmoothing(0)`, and `ScrollTrigger.addEventListener("refresh", () => lenis.resize())` (`src/app/components/smooth-scroll.tsx:43-59`).
- ScrollTriggers are killed in cleanup in the sections inspected (`about-section`, `featured-fragrance`, `civilizations-section`, `packaging-section`, `portal-transition`, `first-chapter` via `ctx.revert()`).
- Most event listeners have matching removals (`hero`, `cart-drawer`, `search-modal`, `portal-transition`, `smooth-scroll`).
- Canvas `object-fit: cover` math is correct in all three canvases (`Math.max(width / img.width, height / img.height)`), and DPR is capped at 2.
- `prefers-reduced-motion` is respected in Hero, About (home and story), Civilizations, Packaging, FirstChapter, ScrollOver, PortalTransition and SmoothScroll.

One exception: **FeaturedFragrance has no reduced-motion branch**. It still pins for 3600 px and scrubs 101 frames for users who asked for stillness. Add the same early-return pattern used by the other sections.

---

## 4. Missing Features (The Gap to E-commerce)

### 4.1 Backend integration

| Capability | Backend | Frontend |
|---|---|---|
| Product catalog | Implemented (`/store/threeweeq/products`) | Implemented |
| Product detail | Implemented | Implemented |
| Collections | Implemented | Implemented |
| Cart create/read/update/delete | Implemented | Implemented |
| Cart merge (customer) | Implemented (`/cart/merge`) | Not used |
| Shipping options | Implemented | **Not used** |
| Checkout init (email/address/shipping/payment session) | Implemented | **Not implemented** |
| Payment completion + order creation | Implemented (`/store/checkout/complete`) | **Not implemented** |
| Payment callback page | Tap expects `/checkout/callback` | **Missing** |
| Order confirmation / order status | Order data exists | **Missing** |
| Customer accounts / order history | Medusa supports it | **Missing** (guest-only) |
| Newsletter → waitlist | Implemented (`/store/waitlist`) | Falls back to local file; misconfigured |
| Revalidation webhook | Not implemented | Not implemented |

The backend is ahead of the frontend. The highest-leverage work is UI and orchestration, not new Medusa endpoints.

### 4.2 SEO

- No `src/app/sitemap.ts` and no `src/app/robots.ts` (verified).
- No `alternates.languages` / `hreflang` for `ar`↔`en`; no canonical URLs anywhere (verified).
- Root metadata (`src/app/[locale]/layout.tsx:22-28`) has only title/description; no Open Graph/Twitter defaults.
- Product JSON-LD exists (`products/[handle]/page.tsx:104-125`), but there is no `Organization`, `WebSite`, `BreadcrumbList` or `Article` JSON-LD for journal posts.
- Product `generateMetadata` ignores `locale` when fetching (`:20-21`), so English metadata can describe Arabic product data.
- Missing product returns **200** (soft 404, C1); missing marketing routes return the default unbranded 404.
- Journal/policy metadata is localized but has no canonical/alternates; openGraph images use relative paths.

### 4.3 Error handling & loading

- Store has `error.tsx`, `not-found.tsx`, and loading skeletons for products/collections.
- Marketing has no error/not-found boundary; root has no `not-found`/`global-error`.
- `products/[handle]` has **no `loading.tsx`**; a slow Medusa response leaves the detail page blank.
- `journal/[slug]` and `policies/[slug]` are static, so a loading state is less critical, but a themed 404 is still missing.
- Cart drawer/cart page show loading and error states well; product add-to-cart surfaces errors inline.
- No global toast/notification system for background failures (cart errors are local only).

### 4.4 Forms

- Newsletter: client email regex, submitting/success/error/network states, `aria-live`, disabled state. Good UI.
- Newsletter persistence is unreliable (C3), has no double opt-in, no consent checkbox, no rate limit/honeypot, and hardcodes Arabic locale.
- No checkout address/phone validation (because checkout is missing).
- Search form has no min/max length or query sanitisation (Medusa receives `q` as-is); acceptable but worth bounding.

### 4.5 Legal / content

- Privacy, Terms, Shipping, Returns and FAQ pages **do exist** under `/[locale]/policies/[slug]` and are now bilingual content in code. This is better than the brief assumed.
- They are hardcoded in a page module rather than CMS-managed; legal copy changes require a deploy.
- Footer social links point to `https://www.instagram.com/` and `https://www.youtube.com/` home pages, not brand accounts.
- `README.md` is a single line; there is no setup/runbook for storefront + Medusa + env + seed.

### 4.6 Locale / navigation

- `StoreHeader` has no language switcher. Once a visitor enters `/en/products`, there is no in-store way to return to Arabic; the marketing header is hidden on store routes.
- `notFound()` in marketing routes has no localized 404.
- Many arrows are hardcoded left-pointing (`←`) in English contexts; in LTR they should point right or be mirrored.
- `RollingText` clips its container with `overflow-hidden` and `leading-[1.4]`; verify Arabic descenders are not cut at rest (especially footer/nav), since Arabic glyphs extend below the baseline.
- `Hero` keeps `md:ml-auto` (physical) and the right-side scrim uses `right-0`; this keeps the Arabic composition on the right in English too. Decide whether that is intentional; if not, use logical inset utilities.

### 4.7 Testing / observability

- Only two unit tests (`formatPrice`, `stockLabel`).
- E2E cart and visual tests are skipped unless `E2E_CART` / `E2E_VISUAL` is set; CI runs neither.
- No tests for locale switching, checkout, 404s, cart provider races, or canvas fallbacks.
- No error monitoring/Web Vitals reporting.
- No `loading`/empty-state coverage for the English store.

---

## 5. Architectural Recommendations

### 5.1 Keep the current layering, add the missing verticals

The existing `entities/*/api/*.repository.ts` + `shared/lib/*` split is a good start. Extend it instead of introducing a second pattern.

```
src/
  app/
    [locale]/
      (marketing)/...
      (store)/
        checkout/
        checkout/callback/
        order/[id]/
      not-found.tsx
      error.tsx
    api/
      newsletter/route.ts
      revalidate/route.ts          # Medusa webhook -> revalidateTag
    sitemap.ts
    robots.ts
  entities/
    product/api/product.repository.ts
    collection/api/collection.repository.ts
    civilization/api/civilization.repository.ts
    cart/api/cart.repository.ts    # move fetchCart/add/update/remove here
    order/api/order.repository.ts
  features/
    checkout/
      api/checkout.repository.ts
      components/CheckoutForm.tsx
      components/ShippingStep.tsx
      components/PaymentStep.tsx
      model/checkout-machine.ts
    newsletter/api/subscribe.ts
  shared/
    lib/
      medusa/
        server.ts                  # server-only fetch + cache policy
        client.ts                  # browser-safe calls (cart/checkout)
        errors.ts                  # MedusaApiError + user-facing mapping
        types.ts
      env.ts                       # zod-validated env schema
    motion/...
    ui/...
```

Why:

- `server.ts` and `client.ts` prevent the current situation where one `medusaFetch` mixes server caching options and browser credentials.
- Checkout is a vertical, not a page: it has its own state machine, validation, retries and error surface.
- `env.ts` turns missing env vars into a build-time/startup error instead of silent `localhost` calls.

### 5.2 Data layer contract

1. Every repository receives `{ locale, currencyCode }` explicitly; never default to `"ar"` inside the fetch layer.
2. One cache policy per endpoint:
   - catalog: `next: { tags: ["products", `product:${handle}`], revalidate: 300 }`
   - collections/civilizations: `revalidate: 3600`
   - cart/checkout/order: `cache: "no-store"` **only** there.
3. Remove `force-dynamic` from the store layout; add `export const dynamic = "force-dynamic"` only on cart/checkout.
4. Add a Medusa subscriber/webhook that POSTs `/api/revalidate` with a shared secret; call `revalidateTag`/`revalidatePath`.
5. Map Medusa errors once (`errors.ts`), not per component; the cart already has a good pattern in `cart.ts:98-138`.

### 5.3 Checkout flow (backend already ready)

Proposed sequence:

1. `GET /store/threeweeq/cart` → require non-empty cart and no blocking warnings.
2. Collect email + shipping address → `POST /store/threeweeq/checkout` (returns payment collection/session and `client_secret`).
3. `GET /store/threeweeq/shipping-options?cart_id=...` → user selects; re-post checkout with `shipping_option_id` if needed by provider.
4. Payment:
   - Stripe: mount Payment Element with `client_secret`.
   - Tap: redirect to provider using the returned session/redirect URL.
5. On provider return, `/checkout/callback` verifies state and calls `POST /store/checkout/complete` with `idempotency_key`.
6. Redirect to `/[locale]/order/[id]` (or a confirmation screen) and clear the cart id.

Add server-side validation (zod) for address, email, phone and shipping option; display Medusa limit/serialized-stock errors in the UI (the strings already exist in `cart.ts`).

### 5.4 i18n contract

- Import `Link`/`useRouter`/`redirect` from `@/i18n/navigation` everywhere.
- Pass `locale` to every data call and every price formatter.
- Put every remaining literal in `messages/{ar,en}.json` (store metadata, checkout labels, 404 copy).
- Replace physical directional utilities with logical ones (`ms/me`, `ps/pe`, `start/end`, `border-s/e`) and mirror arrows with `rtl:rotate-180` or locale-aware SVG.
- Add tests that render `/en/products` and assert an English seeded title and an English price format.

### 5.5 Media and frame pipeline

- Generate `frames/{sm,md,lg}` with AVIF/WebP; ship 640–960 px to phones.
- Preload a sliding window around the playhead, not the full sequence.
- Decode with `createImageBitmap` and explicitly `close()` bitmaps when a scene is released.
- Release scenes on unmount and when crossing scene boundaries.
- Keep a poster image as the LCP element and only start canvas work after `requestIdleCallback` (with a network-aware guard).
- Centralise all asset paths in `media.ts` (currently stale; see 5.6) and add a build-time check that every referenced path exists.
- Use `quality` values from the allowlist, and migrate `priority` → `preload` for Next 16.

### 5.6 Remove misleading dead code

- `src/shared/lib/media.ts` defines four hero frames (`babylon.webp`, `egypt.webp`, `china.webp`, `greece.webp`) that **do not exist** in `public/images/hero/`. Nothing imports the module today. Either point it at real files or delete it.
- `scripts/optimize-images.mjs` expects `hero_img.png`, `egypt.jpg`, `china.jpg`, `grees.jpg`; those masters have already been moved to `.asset-backup/`, so the script now only prints skips.
- `scripts/extract-featured-frames.mjs` writes 3-digit JPGs to `public/featured_frames`, but the runtime reads 4-digit timestamped WebP files. The fallback in `featured-fragrance.tsx` is the old convention. Align script, filenames and fallback (or delete the fallback).
- `prisma/schema.prisma` is unused by the app; document or remove.
- `three`/`@types/three` are unused.

---

## 6. Action Plan (Prioritised)

### P0 — Launch blockers (do not deploy without these)

1. **Freeze and commit the refactor.**
   - Stop the concurrent editor, run `npm run format`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
   - Commit `src/app/[locale]/`, `messages/`, `src/i18n/`, `src/proxy.ts`, new motion/UI files and deletions together; verify a clean clone builds.
   - Acceptance: `git status` clean; CI green.

2. **Fix the 404 path (C1/C6).**
   - Rewrite `(store)/not-found.tsx` without `params`; add `[locale]/not-found.tsx`, `(marketing)/error.tsx`, root `not-found.tsx`/`global-error.tsx`.
   - Acceptance: `/ar/products/nope`, `/en/products/nope`, `/ar/journal/nope`, `/ar/nope` return branded pages and HTTP 404 (no `TypeError` in logs).

3. **Ship checkout (C2).**
   - Implement the steps in 5.3, add `/checkout/callback` and `/order/[id]`, enable the cart CTAs.
   - Acceptance: Stripe test card and Tap sandbox complete an order; stock/limit errors are shown; cart clears; idempotent retry does not duplicate orders.

4. **Make newsletter persistence real (C3).**
   - Require waitlist/ESP configuration; return non-2xx on failure; pass locale; add rate limit/honeypot/consent.
   - Acceptance: signup appears in Medusa/ESP; failed persistence shows an error, never "Thank you".

5. **Fix locale data + links + prices (C4/C5/C12).**
   - Pass `locale` to all repositories and cart queries; use `@/i18n/navigation` links; pass locale to every `formatPrice`; add a store language switcher.
   - Acceptance: `/en/products` shows English titles, prices and navigation stays on `/en`.

6. **Fix caching (C7/C8).**
   - Remove global `no-store` and store-layout `force-dynamic`; restore tags/revalidate; make home static; add revalidation webhook.
   - Acceptance: build shows `● /[locale]`; product requests are cached and invalidated by the webhook; cart/checkout stay no-store.

7. **Production configuration.**
   - Add a documented production env set (site URL, Medusa URL/key, Stripe/Tap keys, webhook secrets, waitlist ID), update Medusa CORS for the storefront origin, and verify image remote patterns for the media/CDN host.
   - Acceptance: a staging deploy with production-like env completes catalog → cart → checkout.

8. **Fix CI.**
   - Run Prettier on the 9 files; keep lint at 0 errors; add `format:check` to the local pre-push routine.
   - Acceptance: CI verify job green on a clean clone.

### P1 — Performance and correctness (launch week)

9. **Frame budget and memory (C10/P1–P4).**
   - Add mobile frame variants; windowed preloading; release scenes; stop the infinite rAF and retry partial scenes (C9); fix dead fallback paths.
   - Acceptance: mid-range phone stays interactive; no long task > 50 ms during scroll; memory returns near baseline after leaving `/story`.

10. **Image loading policy (P2/P3/P6).**
    - One art-directed image per breakpoint; lazy slides 2–5; no `priority` on hidden first-chapter layers; migrate `priority` → `preload`; use allowlisted qualities.

11. **Accessibility pass.**
    - Add Escape/focus trap to `MobileNav`; ensure `aria-hidden`/`inert` on background; verify Arabic glyph clipping in `RollingText`; mirror arrows for LTR.
    - Acceptance: keyboard-only navigation through header, menu, search, cart and checkout; axe/Lighthouse a11y ≥ 95.

12. **SEO completion (4.2).**
    - `sitemap.ts` with `hreflang`, `robots.ts`, canonical/OG defaults, Article/Organization/Website JSON-LD, localized product metadata using the correct locale.

13. **Tests.**
    - Unit: cart reducer/provider, locale-aware price, env schema.
    - Integration: mock Medusa with MSW for catalog/cart/checkout.
    - E2E: language switch, 404s, add-to-cart, checkout happy path, newsletter failure.
    - Acceptance: CI runs a smoke subset without a live backend.

### P2 — Polish and operations

14. **Cleanup:** remove `three`, `prisma` (or document), stale `media.ts`, stale scripts; rewrite README with setup/seed/deploy/runbook.
15. **Content/legal:** move policies to CMS or at least document ownership; replace placeholder social URLs; add newsletter consent copy.
16. **Observability:** error tracking, Web Vitals, Medusa/checkout alerting, revalidation webhook monitoring.
17. **Progressive enhancement:** audit the no-JS experience (the noscript reveal rule is good; verify the rest), add `loading.tsx` for product detail and localized skeleton states.

---

## 7. File-by-File Index of Findings

| Ref | File:line | Finding |
|---|---|---|
| C1 | `src/app/[locale]/(store)/not-found.tsx:4-9` | `not-found` awaits props it never receives; 200 + blank page |
| C2 | `(store)/checkout/page.tsx:45-66` | Checkout is a placeholder |
| C2 | `store/cart-drawer.tsx:407-416`; `store/cart-page-client.tsx:327-335` | Disabled checkout CTAs |
| C3 | `src/app/api/newsletter/route.ts:62-87` | Local FS write; success returned on failure |
| C3 | `src/app/api/newsletter/route.ts:45` | Hardcoded `locale: "ar"` |
| C4 | `(store)/products/page.tsx:54-66`; `collections/page.tsx:30`; `products/[handle]/page.tsx:21,61,67` | Locale not passed to catalog calls |
| C4 | `src/shared/lib/api.ts:55-73`; `src/shared/lib/cart.ts:40` | Defaults force `ar` |
| C5 | Multiple store/marketing pages | `next/link` with unprefixed hrefs; locale can be lost |
| C6 | `src/app/[locale]/**` | No marketing/root error or not-found boundaries |
| C7 | `src/shared/lib/medusa-fetch.ts:26-31` | `cache: "no-store"` overrides tags/revalidate |
| C7 | `(store)/layout.tsx:5` | `force-dynamic` disables caching for all store routes |
| C8 | `src/app/components/beyond-section.tsx:138-139` | Server translation without locale; home builds as dynamic |
| C9 | `src/app/components/about/about-canvas.tsx:205-219,65-74` | Infinite rAF; partial scene never retried |
| C10 | `about-canvas.tsx:29-31`; `hero.tsx`; `featured-fragrance.tsx`; `civilizations-section.tsx` | Unbounded decoded frame retention |
| C11 | `.github/workflows/ci.yml`; 9 source files | `format:check` fails; dirty refactor |
| C12 | `store/cart-drawer.tsx:333-338,395`; `store/cart-page-client.tsx:237-247` | Prices default to Arabic locale |
| P2 | `hero.tsx:345-365`; `first-chapter.tsx:110-127`; `packaging-section.tsx:68-83` | Desktop + mobile images both fetched |
| P3 | `about-section.tsx:226-233` | Four off-screen slides eager-loaded |
| P4 | `featured-fragrance.tsx:57-104`; `civilizations-section.tsx:178-196` | 101 concurrent frame requests |
| P5 | `featured-fragrance.tsx:78-85`; `civilizations-section.tsx:75-82` | Dead fallback URLs |
| P6 | `next.config.ts:28`; journal pages; seven `priority` usages | Quality coercion; deprecated `priority` |
| P7 | `package.json:37`; `prisma/schema.prisma` | Unused dependencies/artifacts |
| P8 | `src/app/components/featured-fragrance.tsx` | Missing reduced-motion branch |
| 5.6 | `src/shared/lib/media.ts:34-75` | References four non-existent hero images |
| 4.6 | `store/store-header.tsx` | No language switcher on store pages |

---

## 8. Notes on the In-Progress Refactor

Several issues that were present at the start of the audit were **already fixed while the audit was running** and are intentionally not listed as bugs:

- Cart drawer now handles RTL/LTR slide direction and portals to `document.body`.
- Hardcoded Arabic UI strings in the store, cart, product, journal, policies and error/404 pages were replaced with next-intl messages.
- `format.ts` and `catalog.ts` became locale-aware; product data labels are localized.
- Journal post content is now bilingual.
- Store `error.tsx` uses translations.

Treat this as evidence that the tree is moving. Re-run the exact verification commands in section 1 after the refactor is frozen; the readiness verdict should be recalculated from that clean snapshot, not from this one.

---

*End of report.*
