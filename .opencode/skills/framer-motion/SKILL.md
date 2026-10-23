---
name: framer-motion
description: >-
  Framer Skill: Motion. Use the Motion skill to add restrained entrance and scroll effects in Framer.
  Keep animation timing consistent and account for reduced-motion preferences. Use whenever a task
  involves motion, animation, reveals, transitions, hover/press feedback, scroll-triggered entrances
  or reduced-motion behaviour — in any stack, not only Framer.
source: https://www.framer.com/skills/motion
---

# Motion skill

Apply consistent appear and scroll effects across a page without overpowering the design. Group related
content, keep timing calm, and respect reduced motion.

## Instructions

1. Inspect the full requested scope, existing effects, and all breakpoints. For page-wide work, address
   every eligible content section—not only the initial viewport. Preserve effects that meet these rules;
   replace conflicting effects rather than layering entrances.
2. Choose non-overlapping entrance groups: related heading, copy, and actions together; separate media
   and card collections independently. If one container includes all of them, animate either that container
   or its content groups, never both. Keep navigation, sticky controls, backgrounds, dividers, continuous
   long-form article text, and footer utility/legal links out of entrance groups. Footer promotional content
   is eligible.
3. Use tween `cubic-bezier(0.22, 1, 0.36, 1)` and opacity 0 to 1. Hero entrances last 0.8 seconds with no
   delay. Scroll reveals last 1 second with a 0.1-second delay measured from entering view, not page load.
   Rule 5 adds stagger offsets to these base delays. Copy, mixed-content groups, and card collections start
   12px below rest; standalone media scales 0.98 to 1 without translation. Do not add blur, rotation,
   horizontal travel, bounce, or exit effects.
4. Start hero entrances on mount. Trigger other groups independently when 15% of the group is visible
   (threshold 0.15), with replay disabled. For groups taller than the viewport, use threshold 0 so the
   reveal remains reachable. Never schedule lower sections from page-load delays or reveal the entire page
   as one group.
5. Reveal each group together. Only for 2–4 sibling visuals or cards communicating steps or progression,
   animate the siblings instead of their parent, with 0.1 seconds between starts in reading order. Use the
   same entrance treatment for all siblings. Never stagger long lists, individual words, or related copy
   and actions.
6. Interaction feedback is separate from entrances: the restriction on nested entrances does not prohibit
   feedback on a button inside a revealing group. Preserve working hover and press feedback. On buttons and
   clickable cards without feedback, use scale 1.01 on hover, 0.99 on press, and a 0.25-second tween with
   the easing from rule 3 and no delay. If scale already drives the element's entrance or another effect,
   use opacity 0.9 on hover and 0.8 on press instead. Leave inline links and noninteractive elements
   unscaled.
7. Check each group's parent and visible siblings across breakpoints. Include each visible alternative only
   where it is shown; do not animate hidden copies. On phone, use 8px instead of 12px travel and remove only
   stagger offsets, retaining the 0.1-second scroll-reveal delay and the same groups, duration, and easing.
   Keep media scale unchanged. Preserve layout and prevent scaled feedback from clipping.
8. Reduced-motion preferences override all motion rules: keep content available without nonessential
   movement or sequencing, using supported native behavior. Do not introduce custom code. If available tools
   cannot configure or verify this, report the limitation rather than claiming compliance.
9. Verify the entire requested scope and every breakpoint for coverage, clipping, overlap, and readability.
   Preview load, scroll, and interrupted interactions when playback is available; screenshots verify layout,
   not timing. Report unverified behavior. Completion means all eligible groups were addressed, not that
   every element moves.

---

## Applying this skill in this project (Next.js, not Framer)

The rules above are stack-agnostic and are binding here. The original skill says "native Framer effects";
this project ships Next.js 16 + React 19 with `gsap`, `@gsap/react` and `lenis` installed (no `motion`
package yet). Map the rules as follows:

- Tween `cubic-bezier(0.22, 1, 0.36, 1)` → the existing `--ease-out-expo` token in `app/globals.css`.
  Use the same token for CSS transitions and for GSAP tweens so timing never drifts.
- Hero entrance = one group (heading + supporting copy + actions together), opacity 0→1 with a 12px rise,
  0.8s, no delay, started on mount.
- Standalone media (the hero photograph) = separate group, scale 0.98→1, no translation.
- Scroll reveals below the fold = `IntersectionObserver`, `threshold: 0.15`, one-shot (no replay),
  1s duration with a 0.1s delay measured from entering view, 12px rise on desktop and 8px on phone.
- Interaction feedback = scale 1.01 on hover, 0.99 on press, 0.25s tween, on buttons only. Inline text links
  are not scaled.
- `prefers-reduced-motion: reduce` is already handled globally in `app/globals.css`; it must also remove
  the observer-driven reveals rather than merely shortening them.
