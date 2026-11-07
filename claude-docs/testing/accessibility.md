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

**The sweep (M11.8).** `tests/e2e/axe-scans.ts` is the scan list: every route
the app serves, each with the people it is scanned as (signed out, an account
with no seat, each coven role, a curator, a keeper, and the accounts the gates
hold back), and every modal, each with the file that draws it and who opens it.
A route DESIGN.md §9 names with no page yet is listed as `unbuilt` and skipped.
`axe.spec.ts`'s "the accessibility sweep" runs one test per person for the
pages and one for the modals. Each seeds its own coven, signs in, visits or
opens every entry in turn, and scans it in the dark theme and then the light.
Findings are collected rather than thrown, so one run reports them all; the
test fails at the end with one line per finding, and writes the full result,
with each finding's selector, to `.reports/axe-sweep/<person>-<pages|modals>.json`.
A scan the sweep could not reach is reported the same way, with the page's
accessibility tree. `tests/e2e/axe-sweep.ts` holds the visits and the openers,
typed by the scan list, so an entry added without one fails the type check;
`tests/guards/axe-scans.test.ts` fails when a page, a §9 route or a file that
draws a modal has no entry, or an entry has no page or file left.

**Wired into CI (M1.14).** `pr-gate.yml`'s `playwright`
job calls the real `.github/workflows/playwright.yml`, path-filtered off
`src/**`, `tests/e2e/**`, `tests/support/**` (which `tests/e2e/database.ts`
imports), `playwright.config.ts`, `next.config.ts`, and `package{,-lock}.json`
— matching the M1.11/M1.12 precedent of configuring
the local run first and wiring CI later.
