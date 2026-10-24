# ABOUT_PLAN.md — Cinematic Multi-Scene Scroll Scrubbing About Section

**Document type:** Architecture & Implementation Plan for Rebuilding the About Section  
**Project:** 3WEEQ Storefront (Next.js App Router + GSAP ScrollTrigger + Canvas)  
**Status:** Proposed. Awaiting review before writing code.

---

## 1. Executive Summary & Architecture Overview

The current About section uses a static cross-fade of four portrait images with a fixed duration. The new requirement transforms this into a **cinematic multi-scene scroll-scrubbing canvas experience** spanning **5 civilizations**:
1. **Gulf (الخليج)** — folder: `0_frame` (21 frames)
2. **Babylon (بابل)** — folder: `babel_frames` (21 frames)
3. **Egypt (مصر)** — folder: `egypt_frames` (21 frames)
4. **Greece (اليونان)** — folder: `greese_frames` (21 frames)
5. **China (الصين)** — folder: `china_frames` (21 frames)

Total frames: 105 frames (21 per civilization). Because the frame counts are small and known (21 each), we can preload all 105 frames efficiently on mount without network throttling or memory bloat.

---

## 2. React Component Architecture

To maintain separation of concerns and keep code modular (per FSD and project standards), the new About experience will be structured into dedicated components:

```text
src/app/components/about/
├─ about-section.tsx              # Main container, owns ScrollTrigger pin & master timeline
├─ about-canvas.tsx               # HTML5 Canvas renderer, handles frame painting & DPR scaling
├─ about-scene-overlay.tsx        # Text content layer (Title, paragraph, CTA) with GSAP opacity/translate
└─ about-preloader.ts             # Frame loading utility (Image caching & promises)
```

---

## 3. The HTML/CSS Structure

- **Tall Scroll Container (`about-room`):** A wrapper element whose height is dynamically calculated (e.g., `5 scenes * 2500px = 12500px`) to provide sufficient scroll runway for scrubbed scrubbing.
- **Pinned Stage (`sticky top-0 h-screen w-screen overflow-hidden`):** Contains the full-screen `<canvas>` at `z-0` and the text overlay container at `z-10`.
- **Canvas Scaling:** Using `object-fit: cover` logic implemented directly via `ctx.drawImage` to ensure responsive scaling across mobile and desktop without distortion.

---

## 4. Image Preloading Strategy

- A utility `preloadFrames(folders: string[])` will run on initial client mount (`useEffect`).
- It iterates through all 5 folders (`0_frame`, `babel_frames`, `egypt_frames`, `greese_frames`, `china_frames`), constructing filenames (`frame-01.webp` or `frame-001.webp` — we will inspect exact naming convention).
- Caches loaded `HTMLImageElement` instances in a `Map<string, HTMLImageElement[]>` so frame lookup during scroll scrubbing is O(1) and runs at 60 FPS without jank.

---

## 5. GSAP ScrollTrigger Structure & Transitions

- **Master ScrollTrigger:**
  - `trigger`: `#story` (the about container)
  - `start`: `top top`
  - `end`: `+=12500` (2500px per scene)
  - `pin`: true
  - `scrub`: 1 (smooth interpolation)
- **Scene Sequencing (Timeline):**
  - **Scene 1 (Gulf):** Progress `0.0 -> 0.2` -> Draw frames `0_frame` [0..20], fade in Gulf text, fade out at end of scene.
  - **Transition 1:** Cinematic fade to black / cross-dissolve.
  - **Scene 2 (Babylon):** Progress `0.2 -> 0.4` -> Draw frames `babel_frames`, fade in Babylon text.
  - **Transition 2:** Cinematic wipe / cross-fade.
  - **Scene 3 (Egypt):** Progress `0.4 -> 0.6` -> Draw frames `egypt_frames`, fade in Egypt text.
  - **Scene 4 (Greece):** Progress `0.6 -> 0.8` -> Draw frames `greese_frames`, fade in Greece text.
  - **Scene 5 (China):** Progress `0.8 -> 1.0` -> Draw frames `china_frames`, fade in China text.

---

## 6. Verification Plan

1. Run `npm run build` to verify zero TypeScript or Next.js compilation errors.
2. Run `npm test` and verify unit tests.
3. Verify frame naming convention in public folders before final code implementation.
