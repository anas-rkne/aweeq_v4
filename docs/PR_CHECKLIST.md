# Pull Request Checklist

Before opening or merging any Pull Request in the 3WEEQ repository, verify the following items:

- [ ] **Type Safety:** Ran `npm run typecheck` successfully.
- [ ] **Code Style:** Ran `npm run lint` and `npm run format:check` with zero errors.
- [ ] **Unit Tests:** Ran `npm test` and all tests pass.
- [ ] **E2E Smoke Tests:** Ran `npm run test:e2e` for marketing and catalog flows.
- [ ] **No Unjustified Client Bundles:** Checked that no new `"use client"` directive was added without a clear interactive requirement.
- [ ] **Design Tokens:** Verified no hardcoded hex or raw Tailwind arbitrary values were introduced where semantic tokens exist.
- [ ] **Documentation:** Updated relevant documentation or notes if architectural contracts changed.
