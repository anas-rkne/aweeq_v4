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

---

# Night run — 2026-10-27

Scope: close every remaining code gap that does **not** require an external
input (keys, DNS, legal sign-off). Nothing was committed, pushed, or deployed;
the tree is dirty on purpose so the owner reviews one diff.

## Delivered (uncommitted)

| Stage | What shipped |
|---|---|
| N1 Studio | Variants CRUD + AED price editing through `updateProductsWorkflow`/`updateProductOptionsWorkflow`, media upload via `POST /admin/uploads` + library picker + hero sync, civilizations/collections/product-types `PUT`/`DELETE` with "in use" guards, `actor_id` in `ops.audit_log` (`lib/threeweeq/admin-route.ts`), products list search/status/count |
| N2 Newsletter | `engagement.newsletter_subscriber` migration + `POST /store/threeweeq/newsletter` (upsert on `lower(email)`, resubscribe flips status), storefront route prefers it, then waitlist, then local file (dev only) |
| N3 Checkout | `POST /store/threeweeq/checkout/prepare` persists email/address, rejects non-AE, returns priced options; UI calls it before the shipping step, keeps a retry button, sends `x-idempotency-key` on complete (flow + callback) |
| N4 Email | `outbox-dispatch` job every minute, `claimOutboxEvents` with `FOR UPDATE SKIP LOCKED`, backoff 1–8 min / 5 attempts, Resend HTTP sender + AR/EN order template; no key → event released as `pending` without burning an attempt |
| N5 Revalidation | `product-changed` subscriber (product / variant / collection events) coalesced over 3s, calls `revalidateStorefront` as a safety net for edits made outside the Studio |
| N6 Legal copy | Policies corrected: UAE-only shipping, 2–4 business days, VAT 5% included, TRN on request, 14-day sealed returns + how to request one |
| N7 Ops | `deploy/backup.sh` (pg_dump + media, 14-day retention, safe prune), `deploy/healthcheck.sh` (web/API/PM2/disk/stuck outbox, non-zero exit), `deploy/check-env.mjs` (required keys, placeholders, cross-file drift), nginx security headers + gzip + `/static/`, cron/ufw/logrotate documented in `DEPLOY_KVM.md` §4.1 |
| N8 Tests | `messages.test.ts` (AR/EN key parity, no empty keys except `Featured.price`, Arabic script in UI namespaces), `format.aed.test.ts` (whole/fractional/zero/NaN, never ÷100, ranges) |
| N9 Docs | Real `README.md`, `DEPLOY_KVM.md` env + ops sections, this ledger, `GAP_CLOSURE_PLAN.md` log |

## Verification (this run)

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npx eslint .` | PASS, 0 errors / 5 pre-existing warnings |
| `npm test` | PASS, 15 tests |
| `cd medusa && npx tsc --noEmit` | Errors only from pre-existing damaged Medusa `.d.ts` (`cart.ts`, `catalog.ts`, `checkout/complete`, `normalize.ts`, knex `count<T>()`) and untouched payment providers |
| `npx medusa build` | Frontend compiles; backend emits. Remaining type errors are in `payment-stripe`/`payment-tap`/`authorize-cart-payment` (files untouched by this run, Tap is a later phase) |

## Still blocked (needs the owner)

1. **B1 Stripe:** `pk_test_*` / `sk_test_*` + `STRIPE_WEBHOOK_SECRET` to run one real test purchase.
2. **B2 Email:** `RESEND_API_KEY` + verified sending domain; outbox events are already queued and will drain once set.
3. **B3 Legal:** sign off shipping/returns/VAT wording and supply the registered TRN.
4. Server-side manual steps: `pm2 startup`, backup cron, `ufw enable`, and running `deploy/healthcheck.sh` once after the next deploy.
5. `E2E` coverage for the Studio (skipped without a running backend).

## Next move

Deploy the branch, run `npm run check:env` + `deploy/healthcheck.sh` on the
server, then a single test purchase with Stripe test keys and a real email with
Resend enabled.

