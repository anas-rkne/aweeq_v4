# 3WEEQ — Baseline Performance & Quality Report (Phase 0)

**Date:** October 24, 2026  
**Audited commit:** `cbb50f8`  
**Next.js version:** `16.3.8`  
**React version:** `19.2.8`

---

## 1. Test & Quality Tooling Setup

- **Type Checking:** TypeScript `5.x` with `tsc --noEmit`.
- **Linting:** ESLint 9 with Next.js Core Web Vitals configuration, ignoring `medusa/` and `e2e/`.
- **Unit Testing:** Vitest + React Testing Library + JSDOM.
- **E2E Testing:** Playwright configured for headless Chromium with optional interactive/visual modes.
- **Formatting:** Prettier.

---

## 2. Initial Budgets & Metrics

| Metric | Target Baseline | Notes |
|---|---|---|
| Typecheck | 0 errors | Enforced via `npm run typecheck` |
| Lint | 0 errors/warnings | Enforced via `npm run lint` |
| Initial JS (Marketing) | < 180 KB gzip | Target after Phase 2 shell split |
| Initial JS (Store) | < 220 KB gzip | Target after Phase 3 commerce split |
| LCP (Mobile p75) | < 2.5s | Measured via Lighthouse / Web Vitals |
| CLS | < 0.1 | Prevented with explicit intrinsic sizes |
