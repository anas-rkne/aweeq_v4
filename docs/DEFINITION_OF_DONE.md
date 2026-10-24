# Definition of Done (DoD)

A task, feature, or refactoring phase in the 3WEEQ codebase is complete only when all the following criteria are satisfied:

1. **Quality Checks Pass:**
   - `npm run typecheck` succeeds with zero errors.
   - `npm run lint` succeeds with zero warnings/errors.
   - `npm test` passes all unit tests.

2. **Testing & Coverage:**
   - New logic or components have corresponding unit tests (`*.test.tsx`).
   - Relevant Playwright E2E flows (`npm run test:e2e`) pass successfully.

3. **Visual & Behavioral Consistency:**
   - No unintended visual regressions (verified via UI review or Playwright snapshots).
   - Loading, empty, error, and `prefers-reduced-motion` states are fully supported.

4. **Architecture & Standards Compliance:**
   - Server components are default; `"use client"` is used exclusively at interactive leaves.
   - No arbitrary raw hex colors or magic spacing values; semantic tokens are used.
   - Absolute `@/` aliases and public API barrels are respected.
   - Files adhere to size and responsibility limits.
