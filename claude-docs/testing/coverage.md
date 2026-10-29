## Coverage — monocart-coverage-reports (M1.13)

**`tests/e2e/coverage.config.ts`** exports the shared `CoverageReportOptions`:
`outputDir: './.reports/coverage-e2e'` (separate from Vitest's `.reports/coverage/`,
so the two suites' contributions stay visible independently — both under the
`.reports/` that `.gitignore` carves out), reports `['v8', 'console-details', 'json-summary']` (the
last added in M1.14, so `.github/scripts/summarize-playwright.mjs` has an
istanbul-style `coverage-summary.json` to build the PR comment's coverage
table from — same shape Vitest's own `json-summary` reporter emits).

**What the 80% threshold is for.** The 80% threshold exists partly to prevent
test bloat and to keep tests on functional requirements; a copy, class or
memorial test adds no coverage of behaviour and is not written
([`layer-ownership.md`](layer-ownership.md), "What a test may assert"). It
stays at 80% while the suite's own figure falls toward 90% (MB.224).

**JS coverage only — CSS is deliberately never collected** (M1.14). Playwright's
`page.coverage.startCSSCoverage()` reports raw bundled-stylesheet byte ranges
with no sourcemap path back to Sass — unlike JS (see below), Next's CSS
pipeline doesn't reliably produce a servable, browser-accessible `.css.map`
for the final bundled output, only internal sourcemaps `sass-loader`/
`resolve-url-loader` use mid-build to resolve `url()` paths. Even if it did,
CSS coverage has no statements/branches/functions concept, so it can't feed
the same 80% threshold model the rest of this project's coverage uses. Decided
not worth chasing for v1 — `tests/e2e/fixtures.ts`'s auto fixture starts/stops only
`page.coverage.startJSCoverage`/`stopJSCoverage`.

**Source maps.** `next.config.ts` sets `productionBrowserSourceMaps: true` so
the e2e build's `.next-e2e/` output ships `.js.map` files — without them MCR
can only attribute V8 coverage to minified chunk names (`0cegfsgm6lvdz.js`),
not real `src/**` files. `next dev` never reads this flag, so it costs
nothing outside the e2e build. `sourceFilter` on `coverageOptions` then scopes
the resolved source paths to this repo's own code — mirroring
`vitest.config.mts`'s `include: ['src/**/*.{ts,tsx}']` — but as an
**order-sensitive object**, not a bare `'**/src/**'` string:

```ts
sourceFilter: {
  '**/node_modules/**': false,
  '**/src/**': true,
},
```

Patterns are checked in order and the first match wins; plenty of npm
packages ship their own `src/` directory in their own sourcemaps, so a bare
`'**/src/**'` matches those too and pulls dependency internals into the
report unless `node_modules` is excluded first.

- **`tests/e2e/fixtures.ts`** re-exports `test`/`expect`; every spec imports from
  here instead of `@playwright/test` directly. It adds an auto fixture
  (`scope: 'test'`, `auto: true`) that starts `page.coverage.startJSCoverage`
  on every page the test's `context` opens (Chromium only — the coverage API
  doesn't exist on Firefox/WebKit, checked via `test.info().project.name`),
  stops it at the end of the test, and calls `MCR(coverageOptions).add(...)`
  with the result. A test that never navigates (`tests/e2e/axe.spec.ts`'s
  `page.setContent` case) collects an empty array, which is skipped rather
  than handed to `add()` — an empty array logs a spurious `MCR` warning
  otherwise.
- **`tests/e2e/global-setup.ts`** additionally calls `MCR(coverageOptions).cleanCache()`
  after `cloneE2eDatabases()`, so a crashed previous run's cached coverage
  data never leaks into this run's report.
- **`tests/e2e/global-teardown.ts`** (new; wired via `playwright.config.ts`'s
  `globalTeardown`) calls `MCR(coverageOptions).generate()` once after every
  spec's fixture has added its entries, producing `.reports/coverage-e2e/index.html`
  (the native V8 report) plus a `console-details` table printed at the end
  of the run.

**Only when asked (M11.18).** None of the above runs unless `E2E_COVERAGE=1`
is set: `tests/e2e/coverage.config.ts` exports `coverageRequested`, and the
fixture, `cleanCache()` and `generate()` each check it. CI sets the variable
in `playwright.yml`, so its artifact and summary are as before; a local run
collects nothing and writes no `.reports/coverage-e2e/` unless it is run as
`E2E_COVERAGE=1 npm run e2e`. What the collection cost every test, and the
pairs that measured the saving: `e2e.md`, "Where a run's time goes", "After coverage went behind a switch".

**Wired into CI (M1.14).** `playwright.yml`'s "Upload coverage artifact" step
uploads `.reports/coverage-e2e/` on every run (pass or fail), parallel to
`vitest.yml`'s `.reports/coverage/` upload. The run's reporters (`list`, `json`,
`html`) come from `playwright.config.ts` under `CI`, not from the command line —
a CLI `--reporter` replaces the config's list and with it the html report's
`outputFolder`.

The story suite (`suite: stories`, M14.28) reports its coverage the same way: it
uploads its own report as `playwright-coverage-stories`, and
`summarize-stories.mjs` adds the figure to the Stories comment's summary line
through `buildCoverageSection`. Neither suite's comment carries the per-file
table: it is the merged comment's alone. Each suite's report also holds
monocart's `raw` data (`coverage-e2e/raw/`, the unprocessed V8 data the `raw`
report keeps), so it travels inside the same artifact. That is what lets the
two suites be merged without running either again.

**The merged report (M14.28).** `pr-gate.yml`'s `playwright-coverage` job runs
after both suites, pass or fail. It downloads whichever of the two coverage
artifacts exist, runs `.github/scripts/merge-playwright-coverage.mjs` (monocart's
`generate()` with `inputDir` set to each `raw/` folder, under the same `src/`
filter as `coverage.config.ts`), uploads the result as `playwright-coverage-merged`
and posts it as a "Playwright Coverage" comment. The summary line names the suites
merged ("Gate and story suites", "Story suite only", "Gate suite only"), so a
figure is never read as covering a suite that did not run. The comment reads as
a failure when either suite failed, so a green merge never stands under a red
suite. A line counts as covered
when either suite ran it. It is never combined with Vitest's coverage, which
is istanbul data on a different measure, and the job is never a required check.
