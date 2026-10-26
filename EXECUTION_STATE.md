# EXECUTION STATE — 3WEEQ Launch

> Living checkpoint for the launch work. Updated 2026-10-25 09:45 (local).
> Branch: `launch/phase-0-baseline` (not pushed, not merged, not deployed).
> Read this first, then `LAUNCH_PLAN.md` and `PROJECT_AUDIT.md`.

## Honest status

A single session cannot complete a 5–7 week launch plan unattended. What was
guaranteed here is that every change is **atomic, verified, committed and
logged**, and that work stopped at real blockers instead of guessing.

**Done and verified tonight:** baseline, critical 404 crash, locale data/links/
prices, AED pricing convention, caching, static home, sitemap/robots,
revalidation endpoint, frame retry guard, reduced-motion film, Next.js security
upgrade, newsletter fail-closed behavior.

**Not done (hard blockers):** checkout/payment UI (needs provider decision and
keys), content studio (4–7 days of work, needs media-storage decision),
deployment (hosting/DNS/DB/live keys), final legal/shipping/VAT approval,
complete QA matrix.

## Commits

| Commit | Scope |
|---|---|
| `509ad03` | Phase 0: freeze, formatting, launch plan, execution ledger |
| `809678d` | Phase 1: 404/error boundaries, locale-aware data/cart/links/prices |
| `bd71c3f` | Phase 1.5: AED major units, Stripe/Tap alignment, seed/policies |
| `c526240` | Phase 3/4: ISR caching, static home, sitemap/robots, revalidation, frame guards, reduced motion, Next 16.4.3 |
| `9cbe6d1` | Phase 4/5: lazy slides, `preload` migration, newsletter fail-closed + rate limit |

## Verification (last run)

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS, 0 errors / 4 warnings |
| `npm run format:check` | PASS |
| `npm test` | PASS, 3 tests |
| `npm run build` | PASS, Next.js 16.4.3, `/ar` + `/en` static |
| `npm audit --omit=dev` | 0 vulnerabilities |
| 404 runtime | No `TypeError`; streamed not-found UI; HTTP 200 + `noindex` (Next streaming behavior) |
| `/ar/journal/nope`, `/ar/nope` | HTTP 404 |
| `/robots.txt` | 200 |
| `/sitemap.xml` | 200 with `hreflang` alternates |

## Important assumptions made (confirm on wake)

1. **AED prices:** RAFID = `850 / 1200 / 350 AED` (same displayed values as before).
2. **Region:** UAE, country `ae`. Change if shipping is GCC-wide.
3. **VAT:** policies still say “VAT included where applicable”; not legally verified.
4. **Existing database:** the price convention changed from minor to major units.
   A database seeded before this change still has `85000` prices and a SAR
   region. It **must be recreated/reseeded** (or migrated) before local checkout
   testing. Do not run a destructive reset on production.
5. `.env.local` was switched to `aed` / `UAE` locally and is git-ignored.
6. 404 responses are 200 when streamed by Next; `noindex` is emitted. A true 404
   status would require a non-streamed route strategy.

## Blocked work

### Phase 2 — Checkout (IN PROGRESS — commit `83c1e5e`)
Stripe-first checkout implemented: details → shipping → payment (Payment
Element) → callback → guest order confirmation. Cart CTAs enabled.
Needed from owner: Stripe test keys (`sk_test_*` for Medusa, `pk_test_*` for
the storefront) to run a real test; then live keys at launch.

### Phase 2.5 — Content Studio (IN PROGRESS — commits `b191d64`, `b80591a`)
Admin API + admin UI built: products CRUD with bilingual fields, publish
checklist, media roles, serial generation, civilizations/collections/types
editors. Remaining: verify admin-route auth after build, variant/pricing
editing via core admin, E2E test, and media upload wiring (file provider).

### Phase 7 — Launch (BLOCKED)
Needs hosting, DNS, production DB, object storage, live payment keys, legal
approval, and a staging rehearsal.

## What to do when you wake

1. Read the diff/commits on `launch/phase-0-baseline`; do not merge until reviewed.
2. Provide provider/keys, confirm prices/shipping/VAT, and choose media storage.
3. Recreate/reseed the dev database (backup first) because prices moved from
   `85000` to `850.00` major units.
4. Then we continue with Phase 2 (checkout) and Phase 2.5 (content studio).

## Resume prompt

> Continue from `EXECUTION_STATE.md`. Read the latest commits. Start Phase 2
> checkout with the provider keys I provide, then Phase 2.5 content studio.
