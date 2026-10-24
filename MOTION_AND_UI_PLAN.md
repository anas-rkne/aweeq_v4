# 3WEEQ — Motion & UI Plan (Research-Backed Rewrite)

**Project:** `C:\Users\LENOVO\Desktop\aweeq_v4` (Next.js 16.3.8, React 19.2.8, Tailwind v4, GSAP 3.15.0 + @gsap/react, Lenis 1.3.26, Three 0.186.1)  
**Scope:** Homepage in `app/page.tsx`, header (`app/components/site-header.tsx`), shared motion (`app/components/smooth-scroll.tsx`, `app/components/reveal.tsx`, etc.), RTL Arabic (`app/layout.tsx` `lang="ar" dir="rtl"`).  
**Deliverable:** Direction/specification only — no implementation code included.  
**Brand:** Heritage Luxury (quiet, cinematic). Motion = whisper, not performance.  
**Fonts:** "Lyon Arabic Display" (Arabic) + "Ador Hairline" (Latin), self-hosted WOFF2 in `/public/fonts` (see `app/fonts.ts`, `app/globals.css`).  
**Breakpoints:** Single breakpoint system at 1024px (`@theme inline` in `app/globals.css`).

> **Citations policy:** Every recommendation below cites verifiable sources. Where evidence is mixed or aesthetic, confidence is labeled (`HIGH/MED/LOW`) and treated as judgment.

---

## Part A — Code Facts (Audit)

### A1. Existing Motion Stack (Verified)

| Surface | Observed (code) | Notes |
|---|---|---|
| Smooth scroll | `app/components/smooth-scroll.tsx` — Lenis `duration:1.1`, `autoRaf:false`, `syncTouch:false`, GSAP ticker `ticker.add(raf)`, `ScrollTrigger.update()`. | Correct single engine. [Lenis docs](https://lenis.darkroom.engineering/), [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/). |
| Easing | `app/globals.css:65` `--ease-out-expo: cubic-bezier(0.22,1,0.36,1)`. Used widely for reveals/hero. | Matches "ease-out" for entrances. [NN/g: Animation Duration](https://www.nngroup.com/articles/animation-duration/). |
| Reveal primitive | `app/components/reveal.tsx` — `data-reveal="out"→"in"` at `threshold: tall?0:0.15` via `IntersectionObserver`. Hidden state only under `prefers-reduced-motion: no-preference` in CSS. | Good pattern. [web.dev prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion). |
| Hero | `app/components/hero.tsx` — pointer parallax via `gsap.quickTo` (±20px image/±10px text), drift `26s infinite`, staggered rise, scroll cue. | [web.dev animations guide](https://web.dev/articles/animations-guide). |
| Pinned sequences | `app/components/scroll-over.tsx`, `about-section.tsx` (pin ~4800px desktop/3400px), `portal-transition.tsx` (clip-path door), `first-chapter.tsx` (250vh spacer, `scale:2.6`), `featured-fragrance.tsx` (152 frames, scrub 0.6, 3600px), `civilizations-section.tsx` (101 frames, scrub 1, 4000px). | Matches cinematic structure. |
| Reduced motion coverage | Scattered checks: `matchMedia('(prefers-reduced-motion: reduce)')` in hero/about/first-chapter/portal/civilizations/packaging/journal/smooth-scroll/scroll-over. | Partial; needs hardening. [WCAG 2.3.3](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html), [web.dev prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion). |

### A2. Measured Payloads (Verified)
| Asset | Size/Count | Notes |
|---|---|---|
| `public/featured_frames/` | 152 JPEGs, 13.9 MB (avg ~93 KB) | Preloaded on mount in `featured-fragrance.tsx:23-56`. [Performance]([web.dev animations-guide](https://web.dev/articles/animations-guide), [LCP](https://web.dev/learn-core-web-vitals/lcp/)). |
| `public/images/civil/frames/` | 101 WebP, 5.7 MB (avg ~57 KB) | Preloaded in `civilizations-section.tsx:148-168`. |
| Hero | desktop ~566 KB, mobile ~246 KB (WebP) | LCP candidate. |
| Total `public/` | ~28.6 MB across 291 files | Frame sets dominate. |

### A3. Issues (Verified)
| Issue | Evidence | Impact | Fix Priority |
|---|---|---|---|
| Breakpoint mismatch | `about-section.tsx:126-192` uses `matchMedia("(min-width: 768px)")` for pin; system uses 1024px. | Layout/pin behavior differs between sections. | P0 |
| Preload on mount | `featured-fragrance.tsx:56`, `civilizations-section.tsx:168` preload all frames immediately. | Wastes bandwidth on first paint; hurts LCP on slow networks. | P0 |
| Unthrottled scroll listener | `site-header.tsx:210-212` `addEventListener("scroll", onScroll, {passive:true})` with no rAF/ScrollTrigger. | Extra work; can jank on low-end. | P1 |
| `will-change` overuse | Many elements: hero image/text layers, first-chapter wrappers, portal ring, canvases, packaging layers (`app/components/*:will-change*`). | Increases memory/compositing layers. [MDN will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change). | P1 |
| Copy drift | `3WWEQ` vs `3WEEQ` across `footer.tsx`, `site-header.tsx`, `beyond-section.tsx`, store pages. | Trust/consistency. | P2 |
| DPR cap | `featured-fragrance.tsx:116` `Math.min(dpr,2)`, `civilizations-section.tsx:217` same. Plan proposes 1.75/1.5. | Can be tuned. | P2 |

---

## Part B — Global Systems (Research-Aligned)

### B1. Timing & Easing Tokens
Based on [NN/g Animation Duration](https://www.nngroup.com/articles/animation-duration/) (100ms feedback, 200-300ms modals, up to ~500ms drag; entrances longer than exits; ease-out entrances, ease-in exits) and [Material Motion](https://m3.material.io/styles/motion/overview) guidance (emphasized/standard/legacy curves). Current site uses `--ease-out-expo` which is appropriate.

| Token | Value | Use | Rationale |
|---|---|---|---|
| `--ease-out-expo` | `cubic-bezier(0.22,1,0.36,1)` | Entrances, reveals, cursor, magnetic return | Matches existing; crisp exit, natural decel. [NN/g](https://www.nngroup.com/articles/animation-duration/). |
| `--ease-in-out-quart` | `cubic-bezier(0.76,0,0.24,1)` | Cross-fades, portal, large state changes | Smooth, not bouncy. |
| `--ease-linear` | `linear` | Scrubbed films/progress | Correct for scroll-driven; perceived easing from scroll. |
| `--dur-touch` | 180ms | Press/badge/icon | Snappy feedback. [NN/g](https://www.nngroup.com/articles/animation-duration/). |
| `--dur-ui` | 300ms | Hover/focus/nav/underline | Standard UI. |
| `--dur-reveal` | 800ms | Hero/headline masks/section arrivals | Luxurious without drag. |
| `--dur-cinema` | 1000–1200ms | Cross-fades/unveils | Cinematic. |
| `--stagger-line` | 70ms | Headline lines | Subtle rhythm. |
| `--stagger-item` | 60–90ms | Cards/icons/columns | Avoids parade effect. |

Rules: entrances ease-out, exits ease-in-out or shorter; never animate opacity+transform with wildly different durations unless mask reveals; hover ≤300ms.

### B2. Scroll Orchestration
| Item | Recommendation | Source |
|---|---|---|
| Lenis | Keep `duration:1.1`, `autoRaf:false`, `syncTouch:false`. No `smoothTouch`. | [Lenis](https://lenis.darkroom.engineering/), mobile momentum preservation. |
| Scrub | 1.0 for narrative (About/portal/civilizations), 0.6 for film (RAFID). | Current; good balance. |
| Pins | Keep `pinSpacing:false` where manual spacers exist; avoid mixing. | Prevent double gaps (current pattern correct). |
| Refresh | Keep `document.fonts.ready` + `window.load`; add decode check for first film frame. | Avoid layout shifts. |
| Mobile resize | Use `ScrollTrigger.config({ignoreMobileResize:true})`. | Prevent mid-scroll repins. |
| Velocity decor | Cap skew ≤0.6° on image bands, lag ≤8px; never on Arabic text/header/touch. | Subtle only. |
| Scrollspy | Replace hardcoded header active state with ScrollTrigger-based; no layout shift. | Better UX. |

### B3. Reduced Motion (First-Class)
Follow [WCAG 2.3.3](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html) and [web.dev prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion). Also consider [prefers-reduced-transparency](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency).

| Feature | Normal | Reduced Motion | Notes |
|---|---|---|---|
| Lenis/wheel smooth | On | Off (native scroll) | Already done in `smooth-scroll.tsx`. |
| Hero parallax/drift | ±20/±10, 26s | Off; static frame | Already partial. |
| Reveals | 800ms rise | Visible immediately | `reveal.tsx` already scopes to `no-preference`. |
| Pins/cross-fades | Pinned films | Stacked, no pin/spacers | Scroll-over/about/first-chapter/portal/civilizations need consistent handling. |
| Films | Scrubbed canvases | Poster frame + text | RAFID/Civilizations. |
| Cursor/magnetism/tilt | On (fine pointer) | Off | Must not hide native cursor on touch/inputs. |
| Grain | 2.2%/1.6% static | Lower opacity or static | Keep cheap. |
| Animations | As designed | Respect; never remove content | Critical. |

### B4. Pointer Layer
| Item | Recommendation | Source |
|---|---|---|
| Custom cursor | Desktop + fine pointer only. 10px dot + 32px ring, lag ~120ms. States: default/interactive/image/text/pressed. Use `mix-blend-mode:difference` only over imagery; fallback to solid gold. Hide on touch/inputs/reduced motion/dialogs. | [Apple HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion), [web.dev animations](https://web.dev/articles/animations-guide). |
| Magnetism | Gold primary CTAs only: max 6px travel, follow 25-30% of offset, label at ~half. Enter 300ms expo-out, leave 500ms expo-out (≤2% overshoot). No keyboard move; keep focus outline. Disable on touch. | Restraint > effect. |

### B5. Header/Navigation
| Item | Recommendation | Source |
|---|---|---|
| Header surface | Transparent at top; after 24px `#020A14` @80% + `backdrop-blur-md` + 1px hairline `rgba(181,142,75,0.18)`. Padding -4px over 300ms. Don't hide on scroll down. | Current good; add discipline. |
| Nav underline | Right-origin scaleX, 300ms expo-out, 1px gold, offset 8px. RTL correct. Active = gold only, no glow on desktop. | RTL-aware. |
| Scrollspy | Move from hardcoded to ScrollTrigger-based active state. | Better accuracy. |
| Mobile menu | Keep image fade/stagger; add subtle image settle 1.04→1 over 900ms; lock body scroll (already done). | Preserve feel. |

### B6. Forms/Feedback
| Item | Recommendation | Source |
|---|---|---|
| Focus | Border sand/30→gold 250ms, bg deepen, 1px gold underline draws right→left over 400ms expo-out. No glow/scale. | Accessible, subtle. |
| Submit | Button compress 0.98 120ms, arrow +4px (RTL forward), return. Pending: 16px gold spinner 900ms/turn; reduced motion → static "…" + label change. | [NN/g feedback](https://www.nngroup.com/articles/animation-duration/). |
| Success/Error | Fade 60% 300ms, gold line draw 600ms, message fade-up 8px 500ms (success). Error: gold border (brand color), message 200ms, focus field. No shake. Validate on submit, clear on input. | No punitive motion. |

### B7. Grain/Glass/Depth
| Item | Recommendation | Source |
|---|---|---|
| Grain | Single fixed layer, 2.2% desktop/1.6% mobile, `pointer-events:none`, `mix-blend-mode:soft-light`, static. Use existing SVG data URI. | Subtle texture. |
| Glass | Only header and cart drawer. Newsletter input blur acceptable if last. No glass cards/footer. | Restraint. |
| Shadows | None resting. Only portal ring glow, existing journal halo (reduce/remove if heavy), cursor ring border. | Quiet luxury. |
| Gold discipline | One gold accent per viewport max. | Prevents visual noise. |

---

## Part C — Section-by-Section (Code-Aligned)

| Section | Current (code) | Recommendations | Priority |
|---|---|---|---|
| **Hero** | `hero.tsx` parallax quickTo, 26s drift, stagger rise, scroll cue. | Keep choreography (0/60/120/180ms). Scrim opacity 0.9→rest 900ms. Handoff: image scale 1→1.06, text translate -32px linear. Cue fade after 120px 300ms. Mobile: disable parallax, drift 34s, faster settle 600ms. No video/particles. | P0 |
| **About** | `about-section.tsx` 768px matchMedia for pin, cross-fade ~2s scroll, text fades, veil 0.4 last slide, pin 4800/3400. | Fix to 1024px breakpoint. Image: 1s cross-fade + 4% directional drift (8px push). Text: two-stage mask-rise (label+title 0-500ms, body +120ms). Image panel tilt 1.5° desktop only, 600ms return. Vertical 1px gold rail + ticks. Portal image float 8s paused off-screen. Add 300ms hold before portal. | P0 |
| **Portal** | `portal-transition.tsx` clip-path door, content scale 1→1.08, ring 0→1.5. | Anticipation: ring stays 0 first 12%, veil deepens +0.06, ring ignites 180ms. Ring max opacity 0.9 + lagging second ring 30% opacity -80ms. Content scale 1→1.06. Remove `will-change` after complete. Mobile: smaller blur/timeline. Reduced motion: no door/ring. | P0 |
| **First Chapter** | `first-chapter.tsx` 250vh spacer, `scale:2.6` origin 50%58%, black sheet. | Keep zoom origin. Text counter-motion translate -60px/fade at 0.85 (gone before black sheet). Gold hairline draws 0-100% first 30%. Mobile: scale 2.2, travel -36px, spacer 210vh. Reduced motion: no fixed/spacer. | P0 |
| **RAFID (Featured)** | `featured-fragrance.tsx` 152 JPEG, preload all on mount, canvas blur underlay, scrub 0.6 3600px, DPR up to 2. | **Key-frame-first:** load frames 1,8,16,24,32,48,64,80,96,112,128,144,152 (13 frames ~1.2MB), poster first, stream rest idle when within 1.5 viewports. DPR cap 1.75 desktop/1.5 mobile. Text stagger 40ms, mask-rise exit. Scent notes (Top/Heart/Base) reveal at 0.86-1, bottom sheet on mobile. 1px gold hairline progress. `saveData`/2G → poster + first 24 frames. Reduced motion → poster + text, no scrub. | P0 |
| **Packaging** | `packaging-section.tsx` scale 1.18→1, text rise, mobile aspect [768/1376], no crop. | Scale 1.14→1 (less zoom), scrub 1 over 900ms. Text mask-rise label+h2, paragraphs stagger 60ms (English +120ms). Desktop ±10px pointer parallax on bg only. One diagonal foil pass 12% white 1200ms once at 40% visibility. Preserve mobile no-crop composition. Reduced motion: static, no foil. | P1 |
| **Civilizations** | `civilizations-section.tsx` 101 WebP, preload all, scrub 1 4000px, 3 chapters, radial scrim, reduced motion stack. | Preload when within 2 viewports, batches (first 34, rest). Add frame blending guard (hold frame if delta <0.6) but no cross-fade. Gold horizontal rule above chapter label draws 0-64px on enter/retract. Text mask-rise 12px, 70ms line stagger, CTA last +100ms. Vertical index rail (3 ticks) while pinned. **Waitlist dialog** for CTAs (240ms fade+8px rise, focus trap, Escape, return focus, navy 70% backdrop no blur). Reduced motion: stacked + CTAs visible, rail hidden. | P0 |
| **Beyond** | `beyond-section.tsx` static image overlay, 6 icons hover color only. | Entrance: heading mask-rise 800ms, paragraph +60ms, icons stagger 60ms +8px rise at 20%. Image drift 30s scale 1.02→1.06 + ±8px pointer parallax desktop. Icons lift 2px, gold on hover only (sand at rest). Mobile: no parallax, static image. | P2 |
| **Journal** | `journal-section.tsx` cards reveal, image hover scale 1.035 900ms, gold border+halo. | Keep entrance. Title mask-rise inside card 400ms after image hover starts. Replace halo with 1px gold border + 1px inner hairline 30% (remove heavy shadow). "READ" cursor state on image (ring 56px + label), compress 24px on click. Arrow +1px travel 3px. Mobile: stack stagger 80ms, hover disabled. | P2 |
| **Newsletter/Footer** | `newsletter-section.tsx`, `footer.tsx` form exists, ornament, 2-col mobile. | Newsletter: bg drift 24s desktop/static mobile, mask-rise heading+paragraph+form stagger. Gold line above form draws center-out 600ms first view. Form per B6. Footer: ornament shimmer 1400ms once (white 10% screen blend), logo/cols fade 600ms stagger no travel, links 300ms gold + right-origin underline, icons lift 2px. Remove extra blank space; keep 2-col mobile. | P2 |

---

## Part D — Typography, Imagery, Performance

### D1. Arabic-Safe Text Reveals
Based on [W3C Alreq](https://www.w3.org/TR/alreq/) (Arabic/Persian layout), [MDN letter-spacing](https://developer.mozilla.org/en-US/docs/Web/CSS/letter-spacing), [GSAP SplitText](https://gsap.com/docs/v3/Plugins/SplitText/).

| Rule | Recommendation | Source |
|---|---|---|
| No per-character Arabic | Never split Arabic into characters/glyphs. Letter-spacing breaks joins. `letter-spacing:0` must remain (current). | [Alreq](https://www.w3.org/TR/alreq/), cursive joining. |
| Block/line masks preferred | Use container overflow hidden + translate 10-14px + clip-path for Arabic headlines. Per-word splitting risky (line-breaking/joins). | [Alreq](https://www.w3.org/TR/alreq/). |
| Line masks only if authored breaks | If line breaks explicit (hero two lines), mask per line. Paragraphs never masked/split. | Caution. |
| Latin display | Ador Hairline may use SplitText by line; avoid per-character. English subtitles sparingly. | Tracking is design element. |
| No effects | No typewriter/scramble/per-letter fade. | Not heritage-appropriate. |
| Spacing | Arabic line-height 1.1-1.2, letter-spacing 0. Latin labels 0.22-0.42em. Never apply Latin tracking to Arabic. Static fonts only. | [Alreq](https://www.w3.org/TR/alreq/). |

### D2. Image Loading & LCP
| Item | Recommendation | Source |
|---|---|---|
| Hero | Keep desktop WebP priority/high fetchPriority, sizes 100vw, mobile-specific image. No cross-preload. | [web.dev LCP](https://web.dev/learn-core-web-vitals/lcp/). |
| First Chapter | Priority on desktop; mobile eager not preloaded in head. | Critical path. |
| About | First image priority only; rest eager off critical path. | Current. |
| Frames | Gate by viewport proximity (not mount). Poster frame. lazy semantics at section level. | Save bandwidth. |
| Others | Lazy by default, quality ~90, correct sizes. | Best practice. |
| CLS | Reserve aspect ratios/sized parents; reserve newsletter/form/footer heights; never animate layout props. | [web.dev CLS](https://web.dev/learn-core-web-vitals/cls/). |
| Fonts | Keep two WOFF2 preloads, `font-display:swap`. Avoid third family. Subset if zero-swap required. | [web.dev font best practices](https://web.dev/learn/css/typography/). |

### D3. Frame Budget & Runtime
| Item | Recommendation | Source |
|---|---|---|
| Targets | 60fps on 2021 laptop/recent iPhone; ≥45fps on mid Android. If >12ms main-thread, cut effect not FPS. | [web.dev animations-guide](https://web.dev/articles/animations-guide). |
| Compositor-only | Animate `transform`, `opacity`, `clip-path`, `scale`. Avoid animating `filter:blur`, `box-shadow`, `width/height/top/left/background-position` on large surfaces. Static blur OK (header/glass/portal glow). Animated blur no. | [web.dev animations-guide](https://web.dev/articles/animations-guide). |
| will-change | Apply only during active animation, remove on complete. Remove permanent `will-change` from hero image/first-chapter wrapper/packaging bg/canvases. | [MDN will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change) (use sparingly). |
| Pointer handlers | Throttle to rAF; keep hero `quickTo`. Move header scroll listener to rAF or ScrollTrigger. | Avoid per-event work. |
| React/scroll | No `setState` per frame. Keep `setActive` guard (civilizations). Prefer direct DOM writes for scrubbed values. | Minimize re-renders. |
| Canvas | DPR cap (1.75 desktop/1.5 mobile), `alpha:false` where possible, pre-decode, reuse canvases. Use `createImageBitmap` carefully; close when >3 viewports away. Keep existing blur cache pattern. | Efficient. |
| Memory | Decode on demand; don’t hold all frames decoded if far away. | Critical for 13.9MB+ sets. |

### D4. Mobile-Specific
| Item | Recommendation | Source |
|---|---|---|
| Scroll | Native scroll, no Lenis touch smoothing. | Touch momentum. |
| Effects | No custom cursor/magnetism/pointer parallax/3D tilt. | Touch/imprecise. |
| Pins | Shorter: About 3400px, First Chapter 210vh, RAFID 3000px, Civilizations 3400px. | Less trapping. |
| Films | Step 2 frames on low-end if frame time >20ms for 3 consecutive frames. | Graceful degradation. |
| Grain/glass | Grain 1.6%; glass only header; no foil on packaging if overlaps divider. | Performance. |
| Viewport | Respect `100svh`; keep `min-h-svh`. | Mobile browser chrome. |

---

## Part E — Architecture, Roadmap, Acceptance

### E1. Proposed Structure
Keep flat `app/components` for sections. Add minimal motion layer:

```
app/components/motion/
  Cursor.tsx
  Magnetic.tsx
  MaskReveal.tsx
  Parallax.tsx
  SectionDivider.tsx
  ProgressRail.tsx
  FrameSequence.tsx
  WaitlistDialog.tsx

app/lib/motion/
  tokens.ts        // durations/eases/distances
  useReducedMotion.ts
  useFinePointer.ts
  useRafThrottle.ts
  useInView.ts
  useScrollVelocity.ts
  frames.ts        // key-frame-first loader for RAFID/Civilizations (DPR/saveData/decode)
```

Rules: no new animation library (GSAP+ScrollTrigger+Lenis sufficient). Consolidate 12+ gradient dividers to `SectionDivider` (h-32 md:h-64). Share `FrameSequence` for both films. Share dual-image component for hero/first-chapter/packaging patterns.

### E2. Phased Roadmap
| Phase | Focus | Est. | Notes |
|---|---|---|---|
| **0 — Foundations** | Fix 768→1024 breakpoint (About), add motion tokens, consolidate dividers, move header scroll to rAF/ScrollTrigger, add reduced-motion checklist, fix `3WWEQ`/`3WEEQ`. | 1-2 days | Quick wins. |
| **1 — Global** | Cursor (desktop+fine pointer), magnetic CTAs, header hairline/nav states, form focus/success, global grain, footer links/ornament. | 2-3 days | Polish everywhere. |
| **2 — First Act** | Hero handoff, About drift+rail+tilt, portal anticipation/ring, First Chapter counter-motion. Review on 1440px and 390px. | 3-4 days | Highest visibility. |
| **3 — Films** | Extract `FrameSequence`, key-frame-first + proximity loading, DPR/saveData, RAFID scent notes, Civilizations index rail + waitlist dialog. Measure before/after. | 3-4 days | Biggest payload win. |
| **4 — Lower Half** | Packaging foil+stagger, Beyond entrance/icons, Journal refinement, Newsletter ceremony, Footer shimmer. | 2-3 days | Complete grammar. |
| **5 — QA** | Reduced motion, keyboard, screen reader, RTL, 1440/768/390, Lighthouse, throttled 4G, low-end Android. | 2 days | Hardening. |

### E3. Acceptance Criteria
1. **No-JS/Reduced Motion:** Content visible, no pins/spacers when JS disabled or `prefers-reduced-motion: reduce`. [web.dev prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion), [WCAG 2.3.3](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html).
2. **Performance:** 60fps reference laptop, ≥45fps reference phone on heaviest scroll; >12ms main-thread triggers cuts.
3. **Stability:** No layout shift on font load/image decode/messages/header changes. [web.dev CLS](https://web.dev/learn-core-web-vitals/cls/).
4. **Arabic Safety:** Never letter-spaced/split per character/distorted by filter. [Alreq](https://www.w3.org/TR/alreq/).
5. **Gold Discipline:** One gold accent per viewport max.
6. **Interruptible:** Scroll reverses cleanly, hover returns ≤500ms, dialogs trap/restore focus and scroll. [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/motion).
7. **Keyboard/A11y:** Visible focus on all interactive; custom cursor never covers focused control. [WCAG 2.4.7](https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html), [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
8. **Payload Discipline:** Hero largest first load; films load on approach only.
9. **Quiet Test:** Feels quiet with sound off and pointer still. If motion feels necessary to "finish" design, it's doing design's job (bad).

### E4. What Not To Do
- No page loader (hero arrival is the loader).
- No global scroll progress bar (section hairlines enough).
- No parallax on every section (max 3: hero/About imagery/Packaging).
- No continuous animation of logo/ornament/gold ring.
- No dark/light theme toggle or "reduce effects" switch (OS preference only).
- No rebuild of pins with different library.
- No meteors/particles/beams/spotlight/typewriter/scramble/marquees/glass cards.
- No autoplay galleries; user-controlled only.

---

**Bottom line:** The skeleton is strong. Apply a shared grammar (3 curves, 5 durations, 1 cursor, 1 grain, 1 gold accent), fix the measured issues (breakpoint/preload/will-change/scroll listener), and spend ambition on four moments: hero handoff, About drift, portal ignition, RAFID scent reveal. Everything else is restraint and frame budget.

**Sources:** [web.dev animations](https://web.dev/articles/animations-guide), [web.dev prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion), [NN/g Animation Duration](https://www.nngroup.com/articles/animation-duration/), [NN/g Scroll Animations](https://www.nngroup.com/articles/scroll-animations/), [NN/g Parallax](https://www.nngroup.com/articles/parallax-usability/), [WCAG 2.3.3](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html), [WCAG 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html), [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [W3C Alreq](https://www.w3.org/TR/alreq/), [MDN will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change), [MDN letter-spacing](https://developer.mozilla.org/en-US/docs/Web/CSS/letter-spacing), [Apple HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion), [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [Lenis](https://lenis.darkroom.engineering/), [Material Motion 3](https://m3.material.io/styles/motion/overview).
