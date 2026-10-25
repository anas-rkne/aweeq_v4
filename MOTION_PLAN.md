# 3WEEQ — MOTION_PLAN.md

**Document type:** Motion system specification and micro-interaction blueprint  
**Project:** 3WEEQ storefront — Next.js 16 App Router, React 19, Tailwind v4, GSAP 3.15 + ScrollTrigger, Lenis 1.3  
**Status:** Plan only. No implementation code.  
**Relationship to other documents:**

| Document | Relationship |
|---|---|
| `ARCHITECTURE_PLAN.md` | Structural source of truth (layers, data, boundaries). This plan must not violate it. |
| `MOTION_AND_UI_PLAN.md` | Earlier research draft. This document supersedes it where they conflict (see §0.3). |
| `PRODUCT.md` | Brand and copy source of truth. |

---

## 0. Reality Check Before the Plan

### 0.1 Current motion foundation (verified in code)

| Surface | Current implementation | Constraint for this plan |
|---|---|---|
| Smooth scroll | `src/app/components/smooth-scroll.tsx` — Lenis `autoRaf:false`, GSAP ticker drives `raf`, `ScrollTrigger.update` on scroll, Lenis `resize()` re-syncs after every ScrollTrigger refresh | Keep. Never replace. Any new pinned layout must rely on that refresh hook. |
| Hero | `src/app/components/hero.tsx` — `gsap.quickTo` pointer parallax (±20px image / ±10px text), CSS entrance, canvas frame autoplay | Enhance only. Keep the parallax engine. |
| About | `src/app/components/about-section.tsx` — pinned cross-fade sequence driven by ScrollTrigger with a manual runway | Enhance only. Do not rewrite the pin. |
| Portal / First Chapter / Featured / Civilizations | Existing pinned ScrollTrigger sequences with scrubbed canvases | Text and micro-motion must attach to the existing timelines, not create competing triggers. |
| Header | Transparent at all times (client decision). No background, no blur. | Do not add a frosted-glass surface. Motion on links only. |
| Reveal primitive | `src/app/components/reveal.tsx` — IntersectionObserver toggling `data-reveal` | Keep as the low-cost fallback; richer reveals get dedicated hooks. |
| Reduced motion | 11 files check `prefers-reduced-motion` individually | Consolidate into one shared hook; behaviour must stay identical. |
| GSAP React usage | No `useGSAP` yet; plugins registered in components | Register once in a shared motion module; add `useGSAP` scoping gradually. |
| Structure | `src/` migration done; `[locale]` i18n routing in progress (separate session) | Do not hardcode `dir="rtl"`; read from the locale layout. All motion must be direction-aware. |

### 0.2 What "static" actually means here

The page does not feel static because it lacks animations. It feels static because motion is **front-loaded**: three or four large cinematic set pieces, and then silence. Luxury is not more motion; it is **consistent, quiet response** at every scale — a hover that feels machined, a title that settles instead of appearing, a seam you never notice.

### 0.3 Corrections to `MOTION_AND_UI_PLAN.md`

| Old statement | Current truth | Decision here |
|---|---|---|
| Header gets `#020A14` @80% + blur after 24px | Header is transparent by client decision; colours are tokens | Header surface stays transparent. Only links/underline animate. |
| RAFID = 152 JPEG, 13.9 MB | `public/featured_frames` = 101 WebP, 5.8 MB | All frame budgets use 101 WebP. |
| Paths `app/components/*` | Everything lives under `src/` | New motion layer goes under `src/shared/motion` and `src/shared/ui`. |
| "No page loader" | A bilingual wordmark prologue is requested | Prologue is specified in Part E as a bounded exception. |
| `#020A14`, `#B58E4B`, `3WWEQ` | Already removed/tokenized/fixed | Not repeated here. |

### 0.4 Palette and typography tokens assumed

- Base surface: `royal-navy #0a1628`; depth shades `navy-975…800`.
- Slate surface/glow: `brand-slate #2f4e78` (never a full-bleed background).
- Accent: `brand-gold #cd9e61`; body text `brand-sand #f6e6d6`.
- Arabic: `font-primary` (Lyon Arabic Display), `letter-spacing: 0` is a hard guardrail.
- Latin: `font-secondary` (Ador Hairline), tracking is part of the design.

---

## Part A — The Global Motion System

### A.1 Thesis

> Motion is the sound of the material, not an effect applied to it.

Three rules govern every decision:

1. **Response, not spectacle.** Every interactive element answers within 300ms. Nothing loops unless it is scenery (drift, grain).
2. **Weight over speed.** Entrances decelerate (ease-out). Exits accelerate (ease-in) or simply disappear. Nothing bounces.
3. **One gesture per moment.** A hover does not also glow, rotate and narrate. Pick one primary response and at most one supporting cue.

### A.2 Easing curves (the physics)

| Token | CSS value | GSAP equivalent | Use | Why it reads expensive |
|---|---|---|---|---|
| `ease-out-expo` | `cubic-bezier(0.22, 1, 0.36, 1)` | `"expo.out"` | Entrances, reveals, magnetic return, text masks | Starts fast, lands with a long soft tail. The eye reads the tail as weight and precision. |
| `ease-out-quint` | `cubic-bezier(0.22, 1, 0.36, 1)` at 0.8× duration | `"power3.out"` / `"power4.out"` | Headline masks, card settles | Slightly firmer than expo; keeps large type from feeling floaty. |
| `ease-in-out-quart` | `cubic-bezier(0.76, 0, 0.24, 1)` | `"power4.inOut"` | Curtains, clip-path wipes, portal | Symmetrical acceleration reads as mechanical, deliberate, cinematic. |
| `ease-in-out-sine` | `cubic-bezier(0.37, 0, 0.63, 1)` | `"sine.inOut"` | Continuous scenery (drift, float, shimmer) | No sharp start or stop; the loop never announces itself. |
| `linear` | `linear` | `"none"` | Scroll-scrubbed frames, progress rails | Scroll already provides the perceived easing. |
| `ease-out-back` (forbidden) | — | `"back.out"` | Never | Overshoot reads as playful, not luxurious. |

**Hard rule:** no spring physics, no bounce, no elastic, no `back.out` on brand surfaces. Hover exits are always longer than entries (entry 280–300ms, exit 450–500ms) so the interface feels calm when the cursor leaves.

### A.3 Duration ladder

| Token | Value | Scope | Notes |
|---|---|---|---|
| `--dur-touch` | `160ms` | Press, toggle, icon response | Must feel instant. |
| `--dur-ui` | `280ms` | Hover, underline, focus, small fades | Upper bound for interface feedback. |
| `--dur-reveal` | `800ms` | Section titles, paragraphs, card entrances | The luxury band. |
| `--dur-cinema` | `1200ms` | Hero handoff, large image moves, portal | Only for full-viewport changes. |
| `--dur-page` | `700ms` | Prologue curtain, route transitions | Feels decisive without blocking. |
| `--dur-loop-slow` | `24–30s` | Background drift | Scenery only. |
| `--stagger-line` | `100ms` | Hero lines | Two or three lines maximum. |
| `--stagger-section` | `50ms` | Split title words | Subtle rhythm. |
| `--stagger-item` | `70ms` | Cards, icons, footer columns | Avoids a parade. |

### A.4 Distance ladder

| Token | Value | Use |
|---|---|---|
| `--rise-sm` | `8px` | Small labels, icons |
| `--rise-md` | `14px` | Section titles, paragraphs |
| `--rise-lg` | `24px` | Hero lines, large blocks |
| `--mask` | `110%` | Mask reveals (transform, not height) |
| `--tilt-max` | `3deg` | Card tilt |
| `--magnet-max` | `6px` | Magnetic pull |

### A.5 Lenis + ScrollTrigger contract

Existing wiring stays:

```ts
// conceptual — already implemented
lenis.on("scroll", ScrollTrigger.update)
gsap.ticker.add((time) => lenis.raf(time * 1000))
gsap.ticker.lagSmoothing(0)
ScrollTrigger.addEventListener("refresh", () => lenis.resize())
```

Additions this plan requires:

1. **`lenis.stop()` / `lenis.start()`** around the Prologue, the search modal, the cart drawer and any future full-screen dialog. Never leave the page scrollable behind a curtain.
2. **No new scroll listeners.** Header/nav/micro-interactions that need scroll position use `ScrollTrigger` or the existing Lenis `scroll` event, never `window.addEventListener("scroll")`.
3. **Pinned sections must call `ScrollTrigger.refresh()` after their assets load**, which now also re-measures Lenis (already wired). This prevents the "scroll stops" class of bug.
4. **`ScrollTrigger.config({ ignoreMobileResize: true })`** globally to avoid re-pinning when mobile browser chrome collapses.
5. **`useGSAP` scoping** for every new effect so cleanup is guaranteed (`gsap.context` under the hood).

### A.6 Where motion must never be used

- No animation on `width`, `height`, `top`, `left`, `margin`, `padding`, `background-position`, `box-shadow`, or `filter` on large surfaces.
- No parallax on Arabic text, header, form fields, or touch devices.
- No animation that delays content availability (the page must be readable before any timeline starts).
- No motion that repeats on every internal navigation.
- One gold accent per viewport. Motion must not create a second.

---

## Part B — Micro-Interactions

Micro-interactions are where "expensive" is decided. Every value below is intentional; do not round to defaults.

### B.1 Primary button (gold CTA)

**Rest:** unchanged. No idle animation, no pulse.

**Pointer enter (fine pointer only):**
1. **Magnetic pull** — the button translates toward the cursor, capped at 6px. The label translates at 50% of the button offset (parallax inside the button). `power3.out`, 300ms.
2. **Sheen sweep** — the existing `.cta-sheen` band crosses once, 700ms, `expo.out`, `skewX(-12deg)`. Runs once per hover, never loops.
3. **Tone** — background moves from `brand-gold` to `brand-gold/85` over 280ms. No glow, no shadow bloom.

**Pointer leave:** magnetic return 500ms `expo.out` (slower than entry), sheen resets instantly to its off-screen rest position (no reverse sweep — reversing cheapens it).

**Press:** `scale: 0.98` for 120ms `power2.out`; release back to 1 over 220ms `expo.out`. The magnetic offset is suspended during press so the button does not slide under the finger.

**Keyboard focus:** identical to hover minus magnetism. `:focus-visible` outline stays visible. Never hide focus for aesthetics.

**Reduced motion:** colour transition only, 160ms. No magnetism, no sheen, no scale.

**Touch:** no magnetism, no sheen on tap; press scale only.

### B.2 Secondary / ghost button

**Rest:** text at `sand/80`, transparent surface.

**Hover:** text → `gold` (280ms), and the arrow glyph translates 3px along the inline axis (`translateX` mapped to direction) over 280ms `power2.out`. No background fill.

**Press:** opacity 0.85 for 120ms.

**Focus:** 1px inline-start rule appears with `scaleY` 0→1, 200ms.

### B.3 Navigation links (header + footer)

**Hover:** underline draws **from the centre outward** — a 1px `gold` line whose `scaleX` goes 0 → 1 with `transform-origin: center`, 280ms `expo.out`. This reads more refined than a left-origin wipe and is direction-neutral (works identically in RTL and LTR).

**Active:** persistent underline at full scale, `gold` text. No glow.

**Leave:** `scaleX` 1 → 0 over 240ms `power2.inOut` (faster than entry, so the nav feels crisp).

**Arabic constraint:** never animate `letter-spacing`; the underline alone carries the response.

### B.4 Cards (Journal, Packaging, product cards)

**Hover (fine pointer only):**
- **Tilt:** max 3°, `perspective: 900px`, derived from cursor position, smoothed with `quickTo` (not per-event easing). Return to 0 over 600ms `expo.out`.
- **Scale:** 1.02 on the media only, 700ms `expo.out`.
- **Shadow:** a single soft ambient shadow fades in over 400ms via opacity on a pseudo-element or a pre-rendered shadow layer (never animate `box-shadow` directly).
- **Border:** 1px hairline goes from `sand/10` to `gold/50` over 400ms. No glow.

**Content:** title and description translate 4px and fade in with a 40ms stagger **after** the media has begun moving (delay 60px equivalent ≈ 60ms). This keeps the card from feeling like a plate sliding.

**Press:** scale 0.995, 120ms.

**Touch / reduced motion:** no tilt; only the border and a 1.01 scale.

### B.5 Custom cursor

**Scope:** desktop with `(pointer: fine)` only. Never on touch, never on inputs, never while a dialog is open, never when reduced motion is requested.

**Anatomy:** 8px `gold` dot (no lag) + 34px ring (120ms lag, `power2.out`). `mix-blend-mode: difference` **only over imagery**; over navy surfaces fall back to solid gold at 70% opacity.

**States:**

| State | Dot | Ring | Trigger |
|---|---|---|---|
| Default | 8px gold | 34px, 1px gold border, 40% | Anywhere |
| Interactive | 8px | 44px ring, 70% | Links, buttons |
| Media | hidden | 56px ring + label "View" / "عرض" | Cards, canvases |
| Pressed | 6px | 28px | Pointer down |
| Text | hidden | 2×18px caret bar | Inputs, textareas |

**Rules:** native cursor hidden only while the custom cursor is active and the pointer is outside form fields; the cursor must never cover a focused control; Escape and route changes reset it to default.

### B.6 Forms (newsletter, future checkout)

- **Focus:** the field border reaches `gold` in 250ms; a 1px underline draws from the inline-start edge over 400ms `expo.out`. Background deepens by one navy step. No scale, no glow.
- **Submit:** button compresses to 0.98 (120ms), the arrow advances 4px in reading direction, then returns. Pending state replaces the arrow with a 900ms-per-turn 16px gold ring; under reduced motion the arrow becomes a static ellipsis and the label changes.
- **Success:** field border holds gold, a 600ms gold line draws beneath the form, message fades up 8px over 500ms. No confetti, no checkmark bounce.
- **Error:** gold border (brand colour, not red) and the message appears in 200ms; focus returns to the field. Never shake.

### B.7 Small controls

- **Quantity steppers:** symbol scales 0.9 on press for 120ms; the number cross-fades 120ms. No layout shift.
- **Cart badge:** when the count changes, the badge scales 1 → 1.12 → 1 over 400ms `expo.out`; the number cross-fades. No bounce.
- **Icon buttons:** icon translates 1px on hover (only if it has a directional meaning, e.g. arrows); otherwise opacity only.
- **Dialog/drawer open:** backdrop 300ms `power2.out`; panel 380ms `expo.out`; stagger of inner rows 40ms. Close is 220ms and leaves no trailing animation.

---

## Part C — Text Reveals

### C.1 Non-negotiable Arabic rules

1. **Never split Arabic into characters or glyphs.** Joins break and the type reads as broken.
2. **Never animate `letter-spacing`** on Arabic.
3. Preferred reveal: **container mask + line translation**. The line moves inside an `overflow: clip` box, so glyphs are never individually transformed.
4. Word splitting is acceptable only when the words are authored (short titles). Paragraphs are never split; they fade as a block.
5. Mixed Arabic/Latin runs must be wrapped (`<bdi>` or `dir`) before any reveal so the browser keeps the run intact.
6. Line breaks used for masks must be authored or measured, not left to reflow mid-animation. Re-measure on `document.fonts.ready` and on resize (debounced), then rebuild.

### C.2 Hero headline

- **Structure:** each authored line sits in a `span` with `display:block; overflow:clip`; inside it the text line is a `span` starting at `translateY(110%)`.
- **Timing:** `110% → 0`, 900ms, `expo.out`, stagger 100ms, delay 80ms after the prologue curtain starts lifting.
- **Supporting elements:** eyebrow 0.6s/`y:8`; paragraph 0.8s/`y:10`; CTAs `y:12` with 60ms stagger after the headline completes.
- **Why:** the mask hides the ascenders/descenders until the line is nearly seated; the eye registers "settling" rather than "sliding".

### C.3 Section titles

- **Split:** words by default, lines where breaks are authored. Latin display may use words; characters are reserved for short labels only.
- **Animation:** `opacity: 0 → 1`, `y: 14px → 0`, 800ms, `power3.out`, stagger 50ms.
- **Trigger:** `start: "top 82%"`, `once: true`. No replay on scroll-back.
- **Eyebrow/label:** 600ms, `y: 8px`, opacity, no stagger, starts 60ms before the title.
- **Why:** 14px is below the threshold where motion distracts from reading, but enough to imply weight.

### C.4 Paragraphs

- Single block: `opacity: 0 → 1`, `y: 10px → 0`, 800ms `power2.out`, no stagger.
- Multi-paragraph editorial blocks: 60ms stagger, maximum 3 paragraphs. Beyond that, the page feels busy.
- Never mask paragraphs.

### C.5 Numbers, prices, counters

- Prices do not animate. They are information.
- Counters (if introduced later) count only on first view, 1.2s, `power2.out`, and never on scroll-back.

### C.6 Reveal API (conceptual)

```ts
type RevealPreset = "hero-line" | "title" | "eyebrow" | "paragraph" | "item"

useTextReveal(ref, {
  preset: "title",
  split: "words" | "lines",       // chooser respects locale
  stagger: 0.05,
  once: true,
  start: "top 82%",
})
```

Rules inside the hook:
- read `locale` and `dir` from context;
- force `split: "lines"` when `locale === "ar"` and the text length exceeds a threshold;
- return the `gsap.context` cleanup;
- no-op (content visible) under reduced motion or before fonts are ready (visibility is never withheld by CSS alone — the hidden state is applied by JS only when animation will actually run).

---

## Part D — Scroll-Triggered Enhancements

> Enhance the existing triggers. Never create a second trigger for the same viewport region.

### D.1 Hero handoff

Attach to the existing hero timeline:
- Image layer: scale 1 → 1.06, `y: 0 → -32px`, linear, tied to the section's exit progress.
- Text layer: `y: 0 → 24px` (opposite direction), opacity → 0 in the last 15%.
- Scroll cue: fades after 120px of scroll, 300ms `power2.out`.
- No new pin. No new listener.

### D.2 About sequence

- Keep the pin and the canvas scrub untouched.
- Image: add a 1s cross-fade timing and an 8px directional drift (4% scale) if the sequence is image-based; if it is the canvas version, animate only the **overlay text**.
- Text: two-stage mask — label + title first (0–500ms of the step), body at +120ms. No per-word stagger in Arabic.
- Add a 1px vertical gold rail with ticks on desktop, opacity 0.35, driven by the same progress value (no new trigger).
- Reduced motion: no pin, no rail, text stacked and visible.

### D.3 Portal

- Anticipation: for the first 12% of the timeline the ring stays at 0 while the veil deepens by 0.06.
- Ignition: ring opacity 0 → 0.9 over 180ms, with a second lagging ring at 30% opacity, -80ms.
- Content scale 1 → 1.06 (not 1.08; 1.08 reads as a zoom effect).
- Mobile: smaller blur radius, shorter timeline, no second ring.
- Reduced motion: no door, no ring; straight cut.

### D.4 First Chapter

- Keep the zoom origin and the black sheet.
- Text counter-motion: `y: 0 → -60px`, opacity → 0 at 0.85 of the exit, so the words leave before the sheet.
- A 1px gold hairline draws 0 → 100% across the first 30%.
- Mobile: scale 2.2, travel -36px, spacer 210vh.
- Reduced motion: no fixed layer, no spacer.

### D.5 Featured (RAFID)

**Text must ride the existing scrub timeline, not a new ScrollTrigger.**

- Text group: fade in `0.86 → 0.92`, hold, fade out `0.94 → 1.0`. Per-element stagger 40ms (title → subtitle → body).
- Never animate the frame index and text in separate timelines; one progress value drives both.
- Optional (data dependent): a 1px gold progress hairline at the foot, `scaleX` tied to progress.
- Scent notes (top/heart/base): only when product data exists; reveal at 0.86–1.0 as three rows with 50ms stagger.
- Frames: keep the existing 101 WebP set; preload by proximity, not at mount. DPR cap 1.75 desktop / 1.5 mobile. Reduced motion: poster frame + static text, no pin.

### D.6 Packaging

- **Layered parallax:** each layer gets a different `y` multiplier (0.90 / 1.00 / 1.08), capped at 40px total travel, `scrub: true`, transform only. Desktop pointer parallax limited to ±10px on the background image only.
- **Text:** label + heading mask-rise; paragraphs 60ms stagger; Latin paragraph +120ms so the two languages do not collide visually.
- **No crop** on mobile; preserve the existing composition.
- Reduced motion: static, no foil.

### D.7 Civilizations

- **Never call `setState` per frame.** Keep the threshold-based active state that exists; text opacity is driven by the same progress value.
- **CTA hover:** sheen + 3px arrow travel (same as secondary button).
- **Index rail:** three ticks on desktop while pinned, filled by progress; hidden on mobile and under reduced motion.
- **Card/image hover** (if a card layout is introduced): scale 1.06 inside `overflow: clip`, 700ms `expo.out`; the card itself does not lift more than 2px.
- **Waitlist dialog (future):** 240ms backdrop, 320ms panel, focus trap, Escape, return focus, no blur.

### D.8 Beyond

- Entrance: heading mask-rise 800ms, paragraph +60ms, icons 60ms stagger with 8px rise.
- Scenery: background drift 30s `sine.inOut` (scale 1.02 → 1.06), static on mobile.
- Icons: 2px lift + gold on hover only (rest state stays sand).
- Reduced motion: static image, icons visible.

### D.9 Journal

- Keep the existing entrance; add a 400ms title mask-rise inside the card triggered by hover (not by scroll).
- Replace the heavy halo with a 1px gold border plus a 1px inner hairline at 30% — opacity-animated layer, not `box-shadow`.
- Arrow travels 3px; no rotation.
- Mobile: 80ms stack stagger, hover disabled.

### D.10 Newsletter and Footer

- Newsletter: background drift 24s desktop, static mobile; heading + paragraph + form rise with 60ms stagger; a gold line draws centre-out once (600ms) when the form enters.
- Footer: ornament shimmer once (1400ms, white at 10%, `mix-blend-mode: screen`); logo and columns fade 600ms with 50ms stagger and no travel; links use the nav underline; icons lift 2px.
- Reduced motion: no shimmer, no drift.

### D.11 Section transitions (the "one film" rule)

**Primary technique: colour seams (already present).** The gradients between sections already carry the cinematic handoff and cost nothing at runtime. Keep them and make them consistent: 32px mobile / 64px desktop, always `royal-navy` at 100% → transparent, never black.

**Secondary technique (use once): clip-path wipe.** Reserve a single clip-path wipe for the Portal moment. Do not add a fixed overlay that fades between every section: an overlay that darkens on every seam either flickers or becomes a visible band, and it forces the browser to composite a full-screen layer for the whole session.

**Rule:** if two adjacent sections already share the same base colour, a seam is unnecessary. Add a seam only where the imagery would otherwise hard-cut.

---

## Part E — Prologue (Bilingual Wordmark Entrance)

> Bounded exception to "no loader". It is a brand moment, not a gating screen.

### E.1 Content

- Wordmark: the text **3WEEQ** set in the Latin display face (not an image), large, anchored at the bottom inline-start edge.
- Tagline: **Legacy in Every Scent**, small, tracked, in the secondary face.
- Both are selectable text (`aria-hidden` on the decorative duplicate only). The wordmark is not a logo image.

### E.2 Timeline (total 1.8–2.2s)

| t | Action | Values |
|---|---|---|
| 0.00 | Wordmark letters rise into place | `yPercent: 120 → 0`, 800ms, `expo.out`, stagger 30ms (Latin only) |
| 0.25 | Tagline mask-reveals | `y: 100% → 0`, 600ms, `expo.out` |
| 0.70 | Hold | — |
| 1.20 | Page curtain lifts | page `translateY(100vh → 0)`, 1100ms, `power4.inOut` |
| 1.20 | Wordmark drifts up | `yPercent: 0 → -70`, 1100ms, same ease |
| 1.55 | Prologue layer fades | `autoAlpha → 0`, 300ms |
| 1.35 | Hero lines begin | see C.2, overlapping the last 25% of the lift |
| 2.10 | End, `display:none` | — |

**Why these numbers:** the lift is longer than any UI transition because it moves the entire viewport; `power4.inOut` gives it a heavy start and a soft landing. The wordmark exits slightly ahead of the page so the two layers never look glued together.

### E.3 Direction and locale

- Layout uses `inset-inline-start` and grid `justify-items: start`; the wordmark sits bottom-right in Arabic and bottom-left in English with no conditional CSS.
- Tagline uses the locale's font (`font-primary` for Arabic, `font-secondary` for Latin). If an Arabic tagline is later authored, it is revealed by **line mask**, never per character.
- The hero handoff reads `dir` and `locale` from the locale layout; the prologue never sets `dir` itself.
- Switching language must not replay the prologue.

### E.4 Guards

1. `sessionStorage` flag: run once per session.
2. `prefers-reduced-motion: reduce`: skip entirely; page starts at `translateY(0)`.
3. No JS: page is visible; the prologue is never rendered as a blocking overlay without JS.
4. `lenis.stop()` before the timeline; `lenis.start()` on completion and on any abort.
5. Remove the layer from the DOM (`display:none`) after completion so it cannot intercept pointer or focus events.
6. If fonts are not ready, wait for `document.fonts.ready` (max 600ms) then start; never animate fallback metrics.

---

## Part F — Performance and Accessibility

### F.1 The 60fps contract

- Animate only `transform`, `opacity`, `clip-path`, `scale`. Everything else is a bug.
- `will-change` is applied by the animation layer at start and removed on completion. No permanent `will-change`.
- No `filter` animation on large surfaces. Static blur is allowed only where it already exists.
- No `setState` inside a scroll or pointer frame. Write to the DOM (or `quickTo`).
- Pointer handlers use `quickTo` or are rAF-throttled; no work on the event itself.
- One `gsap.ticker` owns the frame loop (already true).
- Frame budgets: 60fps reference laptop; ≥45fps mid-range Android. If a frame exceeds 12ms for three consecutive frames, drop the effect, not the frame rate.

### F.2 Canvas rules (existing sequences)

- DPR cap 1.75 desktop / 1.5 mobile.
- `alpha: false` where the canvas is fully painted.
- Pre-decode frames; never decode during a scroll frame.
- Load frames by proximity (IntersectionObserver with rootMargin ~150%) and in batches; first 3–5 frames + poster first.
- Respect `navigator.connection.saveData` and `effectiveType` 2G/3G: poster + reduced frame count.
- Release canvases (`createImageBitmap.close()`, drop image references) when more than three viewports away.
- Never hold all decoded frames of both sequences at once.

### F.3 Reduced motion matrix

| Feature | Normal | `prefers-reduced-motion: reduce` |
|---|---|---|
| Lenis wheel smoothing | on | off (native) |
| Prologue | full timeline | skipped |
| Hero parallax/drift | on | static |
| Text masks | on | visible immediately |
| Pins / scrubbed sequences | on | stacked, no pin, no spacers |
| Magnetic / tilt / cursor | on (fine pointer) | off |
| Sheen / shimmer | on | off |
| Hover transitions | 280ms | 120ms colour only |
| Form pending spinner | rotating ring | static ellipsis |
| Section seams | gradients | gradients (static, no cost) |

**Content is never removed.** Reduced motion changes how things arrive, not what exists.

### F.4 Accessibility

- Every interactive element has a visible `:focus-visible` state; motion never replaces it.
- Custom cursor never covers the focused control and is disabled inside inputs.
- Dialogs trap focus, restore it, close on Escape and lock scroll.
- Touch targets ≥44×44px.
- No motion that flashes more than three times per second.
- `aria-live` regions are not animated.

### F.5 Measurement

- Record a baseline (Lighthouse mobile/desktop, bundle size, LCP element, INP) before M0.
- After each phase: compare bundle, LCP, INP, and a 10-second screen recording at 390px and 1440px.
- Keep a `docs/MOTION_QA.md` checklist with pass/fail per section.

---

## Part G — Architecture

### G.1 Folder structure

```text
src/shared/motion/
  tokens.ts                 // easings, durations, distances, stagger (single source)
  gsap.ts                   // registerPlugin once; export gsap + ScrollTrigger
  use-reduced-motion.ts     // matchMedia + subscription, SSR-safe
  use-fine-pointer.ts       // (pointer: fine) and not touch
  use-raf-throttle.ts       // pointer/scroll maths off the event path
  use-magnetic.ts           // magnetic pull, returns ref + handlers
  use-tilt.ts               // 3D tilt, capped, disabled on touch
  use-text-reveal.ts        // mask/split reveal, locale-aware
  use-cursor.ts             // cursor state machine
  use-section-progress.ts   // scoped ScrollTrigger progress (no new pins)
  frame-sequence.ts         // proximity loader + DPR/saveData policy

src/shared/ui/
  magnetic-button.tsx       // Button + magnetic + sheen + press
  mask-reveal.tsx           // declarative wrapper around useTextReveal
  tilt-card.tsx             // media + content slots
  custom-cursor.tsx         // mounted once in the layout (marketing only)
  section-divider.tsx       // the single gradient seam implementation

src/widgets/prologue/
  prologue.tsx              // wordmark + tagline + curtain (client)
  prologue-timeline.ts      // timeline builder, testable in isolation
```

**Dependency direction:** `shared/ui` and widgets may import `shared/motion`; sections import from `shared/ui`; nothing imports a section. Motion hooks never import feature data.

### G.2 Hook contracts (conceptual)

```ts
useMagnetic(ref, { max: 6, strength: 0.28, enter: 0.3, leave: 0.5 })
useTilt(ref, { max: 3, scale: 1.02, perspective: 900 })
useTextReveal(ref, { preset, split, stagger, once, start })
useSectionProgress(ref, (progress) => void, { start, end, scrub })
useCursor() // { state, setState } via context; rendered once
```

All hooks:
- return a cleanup that kills the context/timeline;
- no-op under reduced motion;
- never read layout inside a frame loop.

### G.3 Integration map (current files)

| File | Change |
|---|---|
| `src/app/components/hero.tsx` | keep parallax; add text mask preset; cue fade |
| `src/app/components/about-section.tsx` | add overlay text presets + rail; keep pin |
| `src/app/components/portal-transition.tsx` | anticipation values; ring limits |
| `src/app/components/first-chapter.tsx` | counter-motion values |
| `src/app/components/featured-fragrance.tsx` | bind text to existing progress; proximity loading |
| `src/app/components/packaging-section.tsx` | layered parallax + text reveal |
| `src/app/components/civilizations-section.tsx` | CTA sheen, rail, no per-frame state |
| `src/app/components/beyond-section.tsx` | entrance + icon stagger |
| `src/app/components/journal-section.tsx` | title mask on hover, border instead of halo |
| `src/app/components/newsletter-section.tsx` | form micro-interactions + form line |
| `src/app/components/footer.tsx` | link underline + shimmer once |
| `src/app/components/site-header.tsx` | centre-out underline (no surface change) |
| `src/app/[locale]/layout.tsx` | mount `CustomCursor` + `Prologue` once (marketing only) |
| `src/app/components/smooth-scroll.tsx` | expose `stop/start` for prologue/dialogs |

---

## Part H — Roadmap and Acceptance

### H.1 Phases

| Phase | Scope | Est. | Exit criteria |
|---|---|---|---|
| **M0 — Foundations** | `tokens.ts`, `gsap.ts`, reduced-motion hook, `SectionDivider`, fix About breakpoint (768 → 1024), consolidate reveal logic | 1–2 days | No visual change; typecheck/lint/build green; one source for easings |
| **M1 — Micro** | Magnetic primary, nav underline, press states, form feedback, card tilt | 2–3 days | Every interactive element responds ≤300ms; keyboard unaffected |
| **M2 — Text** | Hero line masks, section titles, paragraphs, eyebrow | 2 days | Arabic intact at 390/768/1024/1440; no reflow mid-reveal |
| **M3 — Scroll** | RAFID text sync, packaging parallax, civilizations rail/CTA, first-chapter counter-motion, portal anticipation | 3–4 days | Existing pins unchanged; no new scroll listeners |
| **M4 — Prologue** | Wordmark entrance + curtain + session/reduced guards | 1–2 days | Runs once; skipped for reduced motion; Lenis stop/start verified |
| **M5 — QA** | Reduced motion matrix, keyboard/screen-reader, 4G and low-end Android, visual QA | 2 days | All acceptance criteria pass; budgets respected |

Total: 11–15 working days, after the i18n migration stabilises.

### H.2 Acceptance criteria

1. **Silence test:** with sound off and pointer still, the page is calm; no idle loops except the approved drift/grain.
2. **Response test:** every hover/press/focus answers within 300ms.
3. **Arabic test:** no split characters, no tracking, no broken joins at any width.
4. **Reduced-motion test:** content identical, no pins/spacers, no cursor, no prologue.
5. **Scroll test:** pinned sequences still reach the page bottom; no stale Lenis limit.
6. **Performance test:** 60fps laptop / ≥45fps phone on the heaviest section; INP < 200ms.
7. **Focus test:** keyboard reaches everything; the custom cursor never obscures focus.
8. **Budget test:** the marketing route gains < 15KB gzip from this motion layer (excluding existing frames).

### H.3 QA checklist (per section)

- [ ] Desktop 1440: entrance, hover, press, focus, leave.
- [ ] Tablet 1024: same, plus resize behaviour.
- [ ] Mobile 390: touch, no cursor, no tilt, native scroll, `min-h-svh`.
- [ ] Reduced motion: no motion, content visible.
- [ ] Arabic and English: direction, fonts, mixed runs, tagline.
- [ ] No console errors; no `ScrollTrigger` warnings.
- [ ] Tab order and Escape behaviour in dialogs.

---

## Part I — Non-Goals

- No page-wide loader that blocks content (the Prologue is a bounded exception with session/reduced-motion guards).
- No scroll progress bar.
- No parallax on Arabic text, header, or forms.
- No spring/bounce/elastic curves.
- No rotating, pulsing, or continuously animating logo.
- No neon, particles, meteors, spotlight beams, typewriter/scramble, marquees, glass cards.
- No animation of layout properties.
- No second scroll library, no new animation dependency.
- No motion that replays on every internal navigation.
- No per-character Arabic splits, ever.

---

## Appendix A — Token quick reference

```text
EASES
  expo.out        entrances, magnetic return, masks
  power3.out      headlines, card settles
  power4.inOut    curtains, portal, large viewport moves
  sine.inOut      scenery loops
  none            scrubbed progress

DURATIONS
  touch 160ms | ui 280ms | reveal 800ms | cinema 1200ms
  page 700ms  | loop 24–30s

STAGGER
  hero line 100ms | section word 50ms | items 70ms

DISTANCE
  rise 8 / 14 / 24px | mask 110% | tilt 3deg | magnet 6px
```

## Appendix B — "Should this animate?" decision tree

1. Does the element report state (hover, focus, press, loading)? → animate ≤300ms, colour/opacity only.
2. Does it enter the viewport for the first time? → animate once, ≤800ms, decelerate.
3. Does it move with scroll? → bind to an existing ScrollTrigger progress; never create a second trigger.
4. Is it scenery? → only if it can be `sine.inOut`, 24s+, and never draws attention.
5. Is the answer to all four "no"? → do not animate.

## Appendix C — Conflict notes for the implementing developer

- The header stays transparent. Do not add a scrolled surface.
- The About section currently uses a 768px matchMedia pin; the brand breakpoint is 1024px. Fix this in M0, but re-test the sequence at 1023/1024 first.
- The Featured and Civilizations sets are 101 WebP each (~5.8MB). Any frame-loading change must be measured against that, not the old 152-JPEG figure.
- i18n (`[locale]`, proxy, next-intl) is being built in parallel. All new components must accept `locale`/`dir` from context and must not hardcode `rtl`.
- The Prologue wordmark is text, not an image. The tagline is "Legacy in Every Scent" in both locales unless the product owner authors an Arabic variant.

---

# Part J — Scroll Choreography & SVG Draw (Research Log + Specification)

> Added after a direct audit of 21st.dev (categories: `scroll-animation`, `scroll`, `parallax`, `svg`, plus component metadata pages). Metadata pages expose dependencies and licence; they do not expose full source without an API key, so every verdict below is based on the published dependency list, licence, tags and the stated behaviour — not on copied code.

## J.1 What 21st.dev actually offers in this space

| Category | Count (as listed) |
|---|---|
| Scroll Animation | 157 components |
| Scroll | 77 |
| Parallax | 50 |
| SVG | 160 |

### Inspected components and verdicts

| Component | Author / Library | Dependencies | Licence | Verdict | Reason |
|---|---|---|---|---|---|
| Animated Signature | dqnamo | none | MIT | **Adopt technique** | Dependency-free `stroke-dashoffset` self-draw, respects reduced motion. This is the only SVG-draw reference worth emulating. |
| Svg follow scroll | reuno-ui | framer-motion | unknown | **Reject code, adopt concept** | The idea (draw tied to scroll progress) is right; the engine and licence are not. |
| Stroke Draw Type | Isaiah / @bjork-ui | framer-motion | MIT | **Reject** | Engine conflict; hover "drain" is a playful effect, not luxury. |
| Draw Random Underline | osmosupply / Osmo | gsap | unknown | **Reject** | Right engine, unknown licence, and a "random hand-drawn" line is off-brand. |
| Sticky Scroll Reveal | Manu Arora / Aceternity | framer-motion | MIT | **Reject code, adopt structure** | Sticky container + progress-driven text is the correct pattern; we already have the pin. |
| Scroll Choreography | componentry | framer-motion | no-licence | **Reject** | Four-quadrant gallery choreography is a different narrative and unusable commercially. |
| Text Reveal (Mask) | soralabs | motion | no-licence | **Reject code, adopt concept** | Line/word masks are correct; character masks are unsafe for Arabic. |
| Parallax Floating / Zoom Parallax / Hero Parallax | multiple | framer-motion | mixed | **Reject** | Engine conflict, and the site already has the maximum sensible parallax (hero, About, packaging). |
| Scroll Progress (global bar) | ibelick / Cnippet | motion | MIT | **Reject** | A global progress bar contradicts the "quiet" rule; per-section hairlines are enough. |
| Marquee Along SVG Path | Daniel Petho | motion | — | **Reject** | Marquees are explicitly out of brand. |
| Container Scroll Animation / Stacking Cards | Manu Arora / others | framer-motion | MIT | **Reject** | Card-stack trend; conflicts with the continuous-film section flow. |

**Conclusion:** no component can be dropped into this project as-is. Three techniques are adopted conceptually and reimplemented in GSAP:
1. line/word mask reveals,
2. sticky progress scenes,
3. dependency-free `stroke-dashoffset` SVG draw.

## J.2 The six scroll primitives (the only allowed patterns)

| Primitive | Behaviour | Trigger shape | Use |
|---|---|---|---|
| `EnterReveal` | Plays once when an element enters | `start: "top 82%"`, `once: true` | Titles, paragraphs, cards, icons |
| `ScrubLink` | Value = scroll progress (no easing) | `scrub: true`, start/end on the section | Parallax, frame index, rail fill |
| `StickyScene` | Section pins while progress runs | `pin: true` + existing runway | About, portal, featured, civilizations |
| `DrawPath` | SVG stroke reveals itself | once (enter) or scrub | Hairlines, rings, routers, ticks |
| `ParallaxLayer` | Element translates at a fraction of scroll | `scrub: true`, capped travel | Packaging layers, background images |
| `VelocityAccent` | Optional, capped response to scroll speed | Lenis velocity, clamped | Never on Arabic text, header or forms |

Rules:
- One primitive per element. Do not stack `EnterReveal` on an element that is also `ScrubLink`-driven.
- A section may own at most one new ScrollTrigger beyond the pins it already has. Repeated items use `ScrollTrigger.batch`, not one trigger per card.
- Never create a second trigger for a region that already has a pin.

## J.3 SVG draw: dependency-free implementation contract

**Do not use `DrawSVGPlugin`.** It is a Club GreenSock (paid) plugin. The dependency-free technique is what the MIT "Animated Signature" uses:

```ts
// conceptual
const length = path.getTotalLength()
path.style.strokeDasharray = `${length}`
path.style.strokeDashoffset = `${length}`

gsap.to(path, {
  strokeDashoffset: 0,
  duration: 0.9,
  ease: "power2.inOut",
})
```

Contract:

1. `vector-effect="non-scaling-stroke"` on every animated path so the stroke stays 1px at all viewports.
2. Path direction defines the draw direction. Author RTL paths from the inline-start edge; never mirror a whole `<g>` (that mirrors icons too).
3. Recompute `getTotalLength()` only when the path geometry changes. Fixed `viewBox` = compute once.
4. Batch paths in one timeline with a 60–90ms stagger; never animate more than **20 paths in one viewport**.
5. Reduced motion: set `strokeDashoffset: 0` immediately; no timeline.
6. Animate only `stroke-dashoffset` and `opacity`. Never `stroke-width`, `filter`, `mask` or `stroke-linecap`.
7. For scrub-linked draws use `ease: "none"` (scroll provides the easing). For one-shot draws use `power2.inOut` — a pen accelerates and decelerates, it does not ease-out like UI.
8. Strokes use `brand-gold` at 60–100% opacity; structural rules may use `sand` at 20–30%.

## J.4 SVG draw inventory (where it is allowed on 3WEEQ)

| # | Element | Type | Trigger | Values | Notes |
|---|---|---|---|---|---|
| 1 | Prologue underline rule | once | on prologue start | 900ms, `power2.inOut` | Only if an SVG wordmark exists. Text wordmark uses a 1px rule, not a drawn glyph. |
| 2 | Portal ring | scrub | existing portal progress | `dashoffset 1 → 0` over ring ignition | Two rings: main 0.9, lagging 30% |
| 3 | Section hairline above eyebrow (About, Packaging, Civilizations, Journal) | once | `top 82%` | 700ms + 80ms stagger | 1px gold, width 64px |
| 4 | About vertical rail + 3 ticks | draw once + fill scrub | pin start | draw 600ms; fill tied to progress | Desktop only |
| 5 | Civilizations index rail (3 ticks) | draw once + fill scrub | pin start | draw 500ms; fill tied to progress | Hidden mobile |
| 6 | Scent pyramid connectors (product page) | once | `top 80%` | 600ms, stagger 80ms | Only when product data exists |
| 7 | Journal card arrow | once on hover | hover | 300ms, `power2.out` | Optional; arrow path only |
| 8 | Newsletter gold rule | once | `top 75%` | 600ms centre-out | Use CSS `scaleX`, not SVG (crisper, direction-neutral) |
| 9 | Footer ornament hairline | once | `top 85%` | 1200ms | Single rule, never looping |

**Not allowed as SVG draw:** the logo mark (PNG asset; would need a vector master), Arabic calligraphy (never animate stroke on Arabic glyphs — it destroys joins), nav underlines (CSS `scaleX` is crisper and RTL-neutral), prices, form labels.

## J.5 Per-section scroll choreography (exhaustive)

> "Every detail with scroll" is implemented as: **one scrub value per scene drives everything in that scene**. Never give each detail its own trigger.

### Hero
- Enter: existing CSS entrance; text mask preset (C.2) after the prologue.
- Pointer parallax: existing `quickTo` (±20/±10), disabled on touch and reduced motion.
- Scroll exit (own trigger, no pin): image `scale 1 → 1.06`, `y 0 → -32px`; text `y 0 → +24px`, opacity → 0 in the last 15%; cue fades after 120px, 300ms.
- Draw: none.

### About
- Existing pin and canvas scrub remain untouched.
- Text: label + title at 0–500ms of each step, body +120ms; line masks only.
- Rail: draws 600ms at pin start (once), then fills with progress (`ScrubLink`).
- Veil: last slide, opacity → 0.4 across the final 10%.
- Reduced motion: stacked, no pin, rail hidden.

### Portal
- Ring: `DrawPath` scrubbed to the existing progress; ring opacity 0 → 0.9 over 180ms of timeline, lagging ring -80ms.
- Veil deepens +0.06 in the first 12% (anticipation).
- Content scale 1 → 1.06 across the scene.
- Reduced motion: no door, no ring, straight cut.

### First Chapter
- Hairline draws 0 → 100% in the first 30%.
- Text counter-motion `y 0 → -60px`, opacity → 0 at 0.85 (before the black sheet).
- Image zoom and sheet unchanged.
- Mobile: scale 2.2, travel -36px, spacer 210vh.

### Featured (RAFID)
- Frames: existing 101 WebP scrub; proximity loading.
- Text: fade in at `0.86–0.92`, hold, out at `0.94–1.0`, 40ms stagger.
- Rule: 1px gold hairline `scaleX 0 → 1` tied to progress (CSS, not SVG).
- Reduced motion: poster + static text.

### Packaging
- Three layers: `y` multipliers 0.90 / 1.00 / 1.08, capped at 40px total, `scrub: true`.
- Pointer parallax: ±10px on the background only (desktop).
- Text: label + heading mask; paragraphs 60ms stagger (Latin +120ms).
- Foil sweep: one pass at 40% visibility, 1200ms, `power2.inOut` (optional, desktop only).
- Reduced motion: static, no foil.

### Civilizations
- Canvas scrub unchanged; keep threshold-based text state, never `setState` per frame.
- Rail: draw 500ms at pin start; fill with progress.
- Text steps: existing ranges; CTA last, +100ms.
- CTA: sheen + 3px arrow travel.
- Reduced motion: stacked, CTAs visible, rail hidden.

### Beyond
- Heading mask 800ms; paragraph +60ms; icons 60ms stagger, 8px rise.
- Background drift: `scale 1.02 → 1.06`, 30s, `sine.inOut` (static on mobile).
- Icons: 2px lift + gold on hover only.

### Journal
- Header `EnterReveal`; cards via `ScrollTrigger.batch` (80ms stagger).
- Card media: 1.02 scale, 700ms; border hairline; single soft shadow layer (opacity).
- Arrow: draw 300ms on hover (SVG path) or 3px travel (CSS).
- Reduced motion: visible immediately.

### Newsletter
- Heading + paragraph + form: 60ms stagger, 800ms.
- Gold rule: CSS `scaleX` centre-out, 600ms, once.
- Background drift 24s desktop, static mobile.
- Form micro-interactions per Part B.6.

### Footer
- Columns fade 600ms, 50ms stagger, no travel.
- Ornament shimmer once, 1400ms (white 10%, `screen`).
- Links: centre-out underline per B.3.
- Reduced motion: no shimmer.

## J.6 Scroll timing reference

| Primitive | start | end | scrub | ease |
|---|---|---|---|---|
| `EnterReveal` (standard) | `top 82%` | `top 55%` | no | `power3.out` |
| `EnterReveal` (long block) | `top 85%` | `top 40%` | no | `power2.out` |
| `ParallaxLayer` | `top bottom` | `bottom top` | true | `none` |
| `DrawPath` (one-shot) | `top 82%` | `top 55%` | no | `power2.inOut` |
| `DrawPath` (scrubbed) | section start | section end | true | `none` |
| `ScrubLink` (text) | section start | section end | true | `none` |
| Pin scenes | existing ranges | existing ranges | true | `none` |

Rules:
- `once: true` for every non-scrub reveal. Nothing replays on scroll-back.
- `ScrollTrigger.batch` for lists (journal cards, icons, footer columns).
- Recalculate on `document.fonts.ready` and on debounced resize; never mid-timeline.
- Every new trigger is created inside `useGSAP`/`gsap.context` and killed with it.

## J.7 Direction (RTL/LTR) rules

- All scroll positions above are vertical and therefore direction-neutral.
- Horizontal draw direction: author the path in reading order. For Arabic, start at the right edge. Never use `scaleX(-1)` on a group containing icons or text.
- CSS rules and underlines use `transform-origin: inline-start` or `center` (nav), never `left`.
- SVG `viewBox` stays LTR-coordinate; only the authored path direction changes per locale when the line is decorative.
- Ticks, rails and rings are direction-neutral; do not mirror them.

## J.8 Performance budget for scroll + draw

- Maximum 20 animated SVG paths in one viewport; maximum 3 parallax layers per section.
- No `filter`, `box-shadow`, `width`, `height`, `top` or `left` animation.
- `will-change` only while a timeline is active; removed on completion.
- One `gsap.ticker` (existing); no extra rAF loops.
- No `setState` in `onUpdate`; write to DOM or `quickTo`.
- Canvas rules from Part F.2 remain in force (DPR caps, proximity loading, decode off the critical path).
- If a frame exceeds 12ms for three consecutive frames, drop the effect — never lower the frame rate.

## J.9 Reduced motion matrix for this part

| Element | Normal | Reduced motion |
|---|---|---|
| EnterReveal | 800ms mask | visible immediately |
| Parallax | ±40px scrub | static |
| SVG draws | animated dashoffset | `dashoffset: 0` |
| Pins | on | stacked, no spacers |
| Rail/ring fills | scrub | fully drawn, static |
| Foil/shimmer | once | off |
| Velocity accents | capped | off |

## J.10 Component adoption checklist (mandatory)

Before any 21st.dev component (or any external motion snippet) is adopted:

1. Read the actual source, not the preview.
2. List its dependencies. If it needs `framer-motion` or `motion`, reject — the project uses GSAP only.
3. Confirm the licence allows commercial use. `unknown` / `no-licence` = reject.
4. Check LTR assumptions (`translateX` signs, `transform-origin: left`, fixed `left/right`).
5. Check Arabic handling (character splitting, `letter-spacing`, glyph transforms).
6. Measure GPU cost (blur, shader, full-screen filters).
7. Confirm reduced-motion behaviour exists.
8. Reimplement in GSAP under `src/shared/motion`; never paste the component.

## J.11 Explicitly rejected for scroll/SVG

- Global scroll progress bar.
- Scroll-jacking / snap sections.
- Horizontal-scroll galleries as primary navigation.
- Card stacking / sticky card decks.
- Marquee along path.
- Shader/particle backgrounds.
- Drawn Arabic calligraphy strokes.
- Random/hand-drawn underlines.
- Per-character text scrub (especially Arabic).
- Velocity skew on Arabic text, header or forms.
