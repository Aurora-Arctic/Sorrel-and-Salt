## Accessibility — axe-core (M1.12)

**`tests/e2e/axe.ts`** exports `assertNoAccessibilityViolations(page)`, the one
scan helper every spec imports — matching the `resume-2026` pattern of
asserting accessibility in Playwright, not via `vitest-axe`. It runs
`@axe-core/playwright`'s `AxeBuilder` against the current page and fails the
test with a per-rule summary (rule id, help text, node count) if any
violations are returned; a page with zero violations resolves silently.

- **`tests/e2e/smoke.spec.ts`** calls it after `page.goto('/')`, so the entry page
  is scanned as part of the existing smoke spec.
- **`tests/e2e/axe.spec.ts`** seeds a violation directly (`page.setContent` with an
  `<img>` missing `alt`) and asserts the helper's promise rejects — proof the
  scan actually fails a run instead of passing vacuously.

**Wired into CI (M1.14).** `pr-gate.yml`'s `playwright`
job calls the real `.github/workflows/playwright.yml`, path-filtered off
`src/**`, `tests/e2e/**`, `tests/support/**` (which `tests/e2e/database.ts`
imports), `playwright.config.ts`, `next.config.ts`, and `package{,-lock}.json`
— matching the M1.11/M1.12 precedent of configuring
the local run first and wiring CI later.
