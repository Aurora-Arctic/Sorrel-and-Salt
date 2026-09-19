# Testing — summary

Vitest 5, configured as two projects in `vitest.config.mts` (`.mts`, not
`.ts` — the root `package.json` deliberately carries no `"type"` field per
`MODULE_TYPELESS_PACKAGE_JSON`, so an explicit `.mts` extension is what tells
Vite's native config loader this file is ESM instead of warning about it).

## Where tests live

Every Vitest file is under `tests/`, mirroring `src/` (MB.41). Nothing under
`src/` is a test.

```
tests/
  app/ components/ lib/ db/   # mirror the src/ path of the code under test
  guards/                     # the mechanical guards
  support/                    # the harness: as-user, db-setup, msw, paths
```

Three consequences worth knowing before writing a test:

- **A test imports the code under test by the `@/` alias**, not by a relative
  path — `import { users } from '@/db/schema/users'`. `vitest.config.mts` sets
  `resolve: { tsconfigPaths: true }` so Vite reads the `@/*` → `./src/*`
  mapping tsconfig already declared; each project spells out `extends: true`
  to inherit it. Imports _within_ `tests/` stay relative.
- **A test that reads a file from disk goes through `tests/support/paths.ts`**
  — `REPO_ROOT`, `fromRoot('…')`, `MIGRATIONS_DIR` — rather than counting
  `../` from its own location. The chain is counted once, there.
- **The project split is a path glob**, so where a file sits decides how it
  runs. A test that touches Postgres and is not under `tests/db/` lands in
  `unit`, under jsdom, against the plain `sorrel` database.

`tests/guards/test-location.test.ts` holds the rule. It is a test rather than
a lint rule because Oxlint has no custom-rule API and cannot express a
statement about the tree; it scans the git index, so a test written in `src/`
fails in the diff that adds it as soon as it is staged. It deliberately does
not scan untracked files the way `slug-rule.test.ts` does: that guard reads
file contents, where a duplicate is harmless, while this one enumerates
locations, where a stray copy is the finding. CI's container keeps every file
deleted since its image was built — `checkout-to-app` lays the checkout over
a baked `/app` with `cp -a`, which never deletes — and an untracked scan
reports all of them. The failure it prevents is
silent: `include` is scoped to `tests/`, so a misplaced test is not a red
test, it is a file nothing runs.

- **`unit`** — `environment: 'jsdom'`, `globals: true` (enables
  `@testing-library/react`'s automatic post-test `cleanup()`, which hooks
  itself onto the global `afterEach` at import time). `include`s
  `tests/**/*.test.{ts,tsx}`, excluding `tests/db/**` and
  `tests/services/**`. That glob does reach a test inside a directory
  literally named `[...all]` (`tests/app/api/auth/[...all]/route.test.ts`) —
  `[...]` is glob metacharacter syntax, so it was worth confirming rather
  than assuming.
  - **A `unit` test that opens a connection gets the plain `sorrel` database,
    not a clone.** The per-worker `sorrel_test_<n>` rewrite is `db`-only — it
    lives in that project's `setupFiles` (below) and nothing rewrites
    `DATABASE_URL` for `unit`. So a `unit` test that reaches Postgres needs
    schema that is actually in `sorrel`, and M1.27's template bake will not
    help it: the template is never in its path. This is a real trap — it is
    what made a `POST /api/auth/sign-in/social` test pass locally (a
    hand-run `drizzle-kit migrate` had left `sorrel` migrated) and fail in
    CI, where `sorrel` was empty. Keep database-touching tests in the `db`
    project.
    `setupFiles: ['@testing-library/jest-dom/vitest']` registers the jest-dom
    matchers (`toBeInTheDocument`, `toHaveClass`, …); `src/vitest-env.d.ts`
    (`/// <reference types="@testing-library/jest-dom/vitest" />`) gives `tsc`
    the same augmentation, since a `setupFiles` entry only affects the Vitest
    runtime, not the separate `typecheck` pass.
  - **Vitest's jsdom environment resolves `import.meta.url` against the
    mocked browser `location`, not a real `file://` URL** — matching real
    browser semantics (a bundled ES module's `import.meta.url` is an `http(s)`
    URL there too), not a bug. So a `unit` test cannot reach its own path that
    way. `tests/support/paths.ts` is built on `import.meta.dirname`, which is
    a real path in both projects, which is why one helper serves both; the
    one place still reading a file by convention is `ThemeToggle`'s test,
    which uses `path.join(process.cwd(), …)` to reach the component's
    `index.scss` now that the two no longer sit in the same directory.
  - **`setupFiles` also runs `./vitest.setup.ts`** (M1.8, ported from
    `resume-2026`), which adds three global hooks on top of the RTL
    `cleanup()` that `globals: true` already registers on its own:
    - a second, explicit `afterEach(cleanup())` — redundant with the
      `globals: true` side effect above, but that's what the source repo
      does and it's harmless to call twice;
    - a `localStorage` polyfill (`Object.defineProperty(window,
'localStorage', …)` with a minimal in-memory `Storage` class),
      because Node's own native `localStorage` global shadows jsdom's once
      Vitest merges jsdom's `window` into the global scope;
    - MSW lifecycle — `beforeAll(() => server.listen({ onUnhandledRequest:
'error' }))`, `afterEach(() => server.resetHandlers())`,
      `afterAll(() => server.close())` — against the `server` exported from
      `tests/support/msw/server.ts` (`setupServer()`, no base handlers — every
      operation is registered per test, see below).
    - Covered by `tests/support/vitest-setup.test.tsx`, which asserts each hook's
      effect directly rather than testing `vitest.setup.ts` itself.
  - **`tests/support/msw/graphql.ts`** (M1.10) scopes MSW's `graphql` helper to
    `/api/graphql` with `graphql.link('/api/graphql')`, and exports
    `mockGraphQLQuery(operationName, resolveData)` /
    `mockGraphQLMutation(operationName, resolveData)` for a component test to
    register a one-off response for a single named operation
    (`server.use(graphqlLink.query(...))` / `.mutation(...)` under the hood).
    No client library is wired up yet (`graphql-request` lands with the
    client in a later milestone), so a test posts a plain `fetch('/api/graphql',
{ method: 'POST', body: JSON.stringify({ query }) })` — msw's graphql
    matcher parses the operation name out of the `query` document itself, no
    explicit `operationName` field required. A request against
    `http://localhost/...` rather than the relative `/api/graphql` will not
    match, since jsdom's default location is `http://localhost:3000`.
    Because no base handler answers an un-overridden operation, it falls
    through to `onUnhandledRequest: 'error'` and fails loudly instead of
    hitting the network; `afterEach(() => server.resetHandlers())` means an
    override from one test never leaks into the next.
    Covered by `tests/support/msw/graphql.test.ts`.
- **`db`** — `environment: 'node'`. `include`s `tests/db/**/*.test.ts` and
  `tests/services/**/*.test.ts`. The `tests/db/**` half is real as of Wave 1
  (`audit`, `bootstrap`, `users-schema`, `test-database-isolation`), though
  the schema tests are Drizzle `getTableConfig()` introspection rather than
  queries — `sorrel_template` carries no tables until M1.27. `src/services/`
  doesn't exist yet, so `passWithNoTests: true` stays. Nothing in this
  project's config ever points at
  Neon (`Docker/docker-compose.yaml`'s `postgres` service publishes **5432**
  for exactly this — "the host-side Vitest `db` project").
  - **`globalSetup: ['./tests/support/db-global-setup.ts']`** (M1.9) runs once,
    before any worker starts, and clones `sorrel_test_1` through
    `sorrel_test_<maxWorkers>` from `sorrel_template` with
    `CREATE DATABASE ... TEMPLATE`, dropping each one first (`DROP DATABASE
IF EXISTS`) so a crashed previous run self-heals instead of erroring on a
    stale database. `maxWorkers` comes off the `TestProject` Vitest hands the
    setup function — no per-worker variable is set inside the single setup
    process, so it pre-clones one database per possible worker instead. It
    `provide`s that list as `workerDatabases`, which
    `test-database-isolation.test.ts` asserts its own database is a member of
    (MB.14) — the point being that a worker's name is checked against what was
    actually created, not against a bound the test recomputed. The
    returned teardown drops all of them. Requires `sorrel` to own
    `sorrel_template` and hold `CREATEDB` — both granted in
    `Docker/postgres-init/enable-extensions.sql` (M1.9) — since `postgres`'s
    own password is generated and discarded at image build time (M0.18) and
    so can never authenticate a real connection.
  - **`setupFiles: ['./tests/support/db-setup.ts']`** points each worker's
    `DATABASE_URL` at its own `sorrel_test_${VITEST_POOL_ID}` clone before
    any test file imports `connection.ts` — it can read the variable at all
    because `setupFiles` (unlike `globalSetup`) run inside the worker
    process.
    - **The slot is `VITEST_POOL_ID`, not `VITEST_WORKER_ID`** (MB.14).
      Vitest sets both, and only the first is bounded by `maxWorkers`
      ("Value is between 1-`maxWorkers`", per its own typedef);
      `VITEST_WORKER_ID` is a counter incremented once per test file across
      the whole run, both projects, so it passes `maxWorkers` as soon as
      there are more test files than workers. Keying the name off it worked
      until the repo had eleven test files and CI had three workers, at which
      point the isolation spec asked for a `sorrel_test_4` nobody had cloned.
      Both halves now share `tests/support/worker-database.ts`, which is also
      where a missing `DATABASE_URL`/`VITEST_POOL_ID` is turned into a named
      harness error rather than a `sorrel_test_undefined` connection failure.
  - Rejected alternative — wrapping each test in a rolled-back transaction —
    and the reason, is recorded in
    [`design-decisions/m1.9-test-db-isolation.md`](design-decisions/m1.9-test-db-isolation.md).

**Coverage** (`test.coverage`, provider `v8`): thresholds are 80% on lines,
branches, functions, and statements, `include: ['src/**/*.{ts,tsx}']`,
excluding `src/**/*.test.{ts,tsx}`, `src/test/**`, `*.stories.tsx`,
`src/db/migrations/**`, and `src/db/seed/**`. The first two read as dead
since MB.41 — no test or harness file lives under `src/` — and they are
kept deliberately: `include` enumerates the disk rather than the repo, and
CI's container still holds every file the repo has deleted (MB.42). Dropping
them took CI from 92% to 78.54% with every test passing. Coverage has been above the threshold
since Wave 3's schema tests landed (~92% of lines at M1.21), so
`npm run test:coverage` exits non-zero only on a test failure or on a change
that pulls a metric back under 80% — which is the threshold doing its job,
not a defect.

`npm run test` (`vitest run`, no coverage) and `npm run test:coverage`
(`vitest run --coverage`) both run every project. Neither is wired into
`pre-commit` — CLAUDE.md's pre-commit list is unchanged by this task.

**Wired into CI (M1.14).** `pr-gate.yml`'s `vitest` job
calls the real `.github/workflows/vitest.yml`, path-filtered off `src/**`,
`tests/**`, `vitest.config.mts`, `vitest.setup.ts`, and
`package{,-lock}.json`. `tests/**` is load-bearing: without it a test-only
PR — the one kind whose whole content is what this job runs — would skip the
job and report green. It runs
in `build-image.yml`'s shared `testing` container plus its own `services:
postgres:` (a `build-db-image` job feeding
`postgres://sorrel:sorrel@postgres:5432/sorrel`, reachable by service name —
see `claude-docs/ci.md`), and uploads `coverage/` as an artifact on every
run. `vitest.config.mts`'s coverage `reporter` also gained `json-summary`
alongside its existing `text`/`lcov`/`html`, so the PR comment can show a
coverage table (`.github/scripts/summarize-vitest.mjs`).

## Acting as a fixture user, and asserting a refusal (M1.26)

**`tests/support/as-user.ts`** is the one line an authorization test opens with:

```ts
await expect(spells.create(asUser(C), { workspaceId: W.id, title: 'x' })).rejects.toThrow(
  Forbidden,
);
```

- **`asUser(user)` returns the `Session` a service would have received had
  that user signed in** — `{ userId, role }`, the shape `src/lib/session.ts`
  defines and `claude-docs/auth.md` explains. It extends `AuditSession`, so
  `withAudit(asUser(A), …)` typechecks with no cast. A fresh object comes back
  per call, so a service that mutates what it is handed cannot carry that
  mutation into the next assertion.
- **The cast is re-exported, not redeclared.** `A`, `B`, `C`, `D` and `E` are
  bindings taken straight from `src/db/seed/standard.ts`'s `FIXTURE_USERS` —
  the same constant the seed inserts. A second copy of the ids in the test
  harness would drift from the database without a single test failing: every
  assertion would stay true of a user nobody had seeded. The parameter is the
  user row rather than a letter for the same reason — there is no mapping in
  the middle to fall out of step, and a user a test creates mid-run acts
  through the same helper.
- **It never touches the database.** Whether A exists is
  `tests/db/seed/standard.test.ts`'s claim, made against real rows; re-proving
  it here would cost a second migrate-and-seed harness to assert something
  already asserted.
- **`tests/support/as-user.test.ts` loops over `FIXTURE_USERS` rather than naming
  five cases**, so a sixth fixture user is covered the day it is added. It
  also carries a `@ts-expect-error` compile assertion that an id alone cannot
  make a session — the role has to come off the row.

**Assert the type, never the message.** `Forbidden` and `NotFound`
(`src/lib/errors.ts`) exist so a refusal test survives a reworded message, and
so the two refusals stay distinguishable — see `claude-docs/auth.md` for why a
route needs to know which one happened.

`tests/lib/errors.test.ts` proves the assertion style can actually fail, which is
the only thing that makes it worth writing. Three of its cases assert that an
_inner_ expectation rejects:

```ts
const silentNoOp = async (): Promise<string[]> => [];

await expect(expect(silentNoOp()).rejects.toThrow(Forbidden)).rejects.toThrow();
```

That is the bug the pair exists to catch — a service that checks nothing and
answers an unauthorized read with an empty list or an unauthorized write with a
success. Both look like success to a caller, and only an assertion that
demands a rejection tells them apart. A `NotFound` is held to the same
standard: it does not satisfy a test written for a `Forbidden`.

## E2E — Playwright (M1.11)

`playwright.config.ts` (repo root) runs specs under `e2e/` against a
**production build**, not `next dev` — `webServer.command` is `npm run build
&& npm run start`, on **8001** (`PORT` env override; `start` defaults to
8000). Distinct from Vitest's `db` project, which clones one database per
worker — Playwright needs only one, `sorrel_e2e`, since `webServer` is a
single shared server.

- **`e2e/database.ts`** — `e2eDatabaseUrl()` swaps `DATABASE_URL`'s pathname
  to `/sorrel_e2e` (handed to `webServer.env.DATABASE_URL` so the built app
  reads from it instead of the dev database); `recreateE2eDatabase()`
  connects as the `sorrel` admin role and does the same `DROP DATABASE IF
EXISTS` / `CREATE DATABASE ... TEMPLATE sorrel_template` M1.9 already does
  per Vitest worker.
- **`globalSetup: './e2e/global-setup.ts'`** calls `recreateE2eDatabase()`
  once, before `webServer` starts — `sorrel_e2e` has to exist before the
  built app can connect to it.
- **Reseeding between spec files** is each spec file's own `test.beforeAll`,
  not a Playwright hook that runs implicitly — see `e2e/smoke.spec.ts`. It
  calls the same `recreateE2eDatabase()`, not `src/db/seed`: `sorrel_template`
  itself carries no schema or seed data until M1.27 bakes them into the Postgres image
  (`Docker/docker-compose.yaml`'s comment). Recreating from the template is
  therefore what "reseed" resolves to today; once M1.27 lands, the same call
  picks up real seeded content with no change needed here. Full reasoning in
  [`design-decisions/m1.11-e2e-reseed-without-seed.md`](design-decisions/m1.11-e2e-reseed-without-seed.md).
  **Every db-touching spec file must open with
  `test.describe.configure({ mode: 'serial' })`** (M1.14) — `playwright.config.ts`
  sets `fullyParallel: true`, which lets Playwright split one file's tests
  across multiple workers, and `beforeAll` then runs once _per worker_
  handling that file rather than once for the file. Two workers both
  reaching `smoke.spec.ts` both ran `DROP`/`CREATE DATABASE sorrel_e2e`
  concurrently and threw `duplicate key value violates unique constraint
"pg_database_datname_index"` before this was added. `serial` pins the
  whole file to one worker, so the reset genuinely happens once.
- **`next.config.ts`'s `distDir`** reads `NEXT_DIST_DIR`, defaulting to
  `.next`. `webServer.env` sets it to `.next-e2e` so a concurrent `next dev`
  on 8000 (CLAUDE.md's Commands table promises both can run at once) never
  shares — and can't corrupt — the production build e2e is serving from.
- **No Neon connection anywhere** — `e2eDatabaseUrl()`/`adminUrl()` only ever
  rewrite the pathname of the ambient `DATABASE_URL`, which points at the
  local `postgres` Docker service exactly as Vitest's does.

`npm run e2e` (`playwright test`) runs the suite. Browser binaries
(`npx playwright install chromium`) are a one-time local step. CI (M1.14)
does not reuse `build-image.yml`'s shared `testing` image for this — that
image is Alpine/musl-based and explicitly excludes Playwright's browser/
system deps (see `Docker/Dockerfile.node`'s header comment; Playwright's
Chromium build has no official musl support at all). Instead
`.github/workflows/playwright.yml` runs in a dedicated image
(`Docker/Dockerfile.e2e`, built `FROM mcr.microsoft.com/playwright:v1.63.0-noble`
and published by `build-e2e-image.yml`) with browsers already baked in — see
`claude-docs/ci.md`. `Docker/docker-compose.yaml`'s opt-in `e2e` service
(`make docker-e2e`) builds that same image for local use, so a devcontainer
session can run the full suite without installing browsers into its own
Alpine-based image.

## Accessibility — axe-core (M1.12)

**`e2e/axe.ts`** exports `assertNoAccessibilityViolations(page)`, the one
scan helper every spec imports — matching the `resume-2026` pattern of
asserting accessibility in Playwright, not via `vitest-axe`. It runs
`@axe-core/playwright`'s `AxeBuilder` against the current page and fails the
test with a per-rule summary (rule id, help text, node count) if any
violations are returned; a page with zero violations resolves silently.

- **`e2e/smoke.spec.ts`** calls it after `page.goto('/')`, so the home page
  is scanned as part of the existing smoke spec.
- **`e2e/axe.spec.ts`** seeds a violation directly (`page.setContent` with an
  `<img>` missing `alt`) and asserts the helper's promise rejects — proof the
  scan actually fails a run instead of passing vacuously.

**Wired into CI (M1.14).** `pr-gate.yml`'s `playwright`
job calls the real `.github/workflows/playwright.yml`, path-filtered off
`src/**`, `e2e/**`, `playwright.config.ts`, `next.config.ts`, and
`package{,-lock}.json` — matching the M1.11/M1.12 precedent of configuring
the local run first and wiring CI later.

## Coverage — monocart-coverage-reports (M1.13)

**`e2e/coverage.config.ts`** exports the shared `CoverageReportOptions`:
`outputDir: './coverage-e2e'` (separate from Vitest's `coverage/`, so the two
suites' contributions stay visible independently — both already carved out
in `.gitignore`), reports `['v8', 'console-details', 'json-summary']` (the
last added in M1.14, so `.github/scripts/summarize-playwright.mjs` has an
istanbul-style `coverage-summary.json` to build the PR comment's coverage
table from — same shape Vitest's own `json-summary` reporter emits).

**JS coverage only — CSS is deliberately never collected** (M1.14). Playwright's
`page.coverage.startCSSCoverage()` reports raw bundled-stylesheet byte ranges
with no sourcemap path back to Sass — unlike JS (see below), Next's CSS
pipeline doesn't reliably produce a servable, browser-accessible `.css.map`
for the final bundled output, only internal sourcemaps `sass-loader`/
`resolve-url-loader` use mid-build to resolve `url()` paths. Even if it did,
CSS coverage has no statements/branches/functions concept, so it can't feed
the same 80% threshold model the rest of this project's coverage uses. Decided
not worth chasing for v1 — `e2e/fixtures.ts`'s auto fixture starts/stops only
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

- **`e2e/fixtures.ts`** re-exports `test`/`expect`; every spec imports from
  here instead of `@playwright/test` directly. It adds an auto fixture
  (`scope: 'test'`, `auto: true`) that starts `page.coverage.startJSCoverage`
  on every page the test's `context` opens (Chromium only — the coverage API
  doesn't exist on Firefox/WebKit, checked via `test.info().project.name`),
  stops it at the end of the test, and calls `MCR(coverageOptions).add(...)`
  with the result. A test that never navigates (`e2e/axe.spec.ts`'s
  `page.setContent` case) collects an empty array, which is skipped rather
  than handed to `add()` — an empty array logs a spurious `MCR` warning
  otherwise.
- **`e2e/global-setup.ts`** additionally calls `MCR(coverageOptions).cleanCache()`
  after `recreateE2eDatabase()`, so a crashed previous run's cached coverage
  data never leaks into this run's report.
- **`e2e/global-teardown.ts`** (new; wired via `playwright.config.ts`'s
  `globalTeardown`) calls `MCR(coverageOptions).generate()` once after every
  spec's fixture has added its entries, producing `coverage-e2e/index.html`
  (the native V8 report) plus a `console-details` table printed at the end
  of the run.

**Wired into CI (M1.14).** `playwright.yml`'s "Upload coverage artifact" step
uploads `coverage-e2e/` on every run (pass or fail), parallel to
`vitest.yml`'s `coverage/` upload.

## Debugging tests (MB.22)

`npm run test:debug` runs Vitest single-worker under `--inspect-brk`, halted
on 9230 until a debugger attaches — single-worker specifically, so the
breakpoint lands inside a known `sorrel_test_${VITEST_POOL_ID}` clone rather
than an arbitrary one. `npm run test:ui` opens `@vitest/ui`. For Playwright,
`npm run e2e:ui` and `npm run e2e:trace` cover interactive and
recorded-run debugging respectively, and a local (non-CI) run now captures a
trace/screenshot/video on failure by default — see `playwright.config.ts`'s
comments. Running `npm run e2e` from inside the devcontainer at all needs a
remote browser (MB.22), and `PLAYWRIGHT_WS_ENDPOINT` — the variable that
selects it — is scoped to the `devcontainer` compose service alone, so
`make docker-e2e` and CI keep launching Chromium locally. That mechanism,
its trade-offs, and the full setup including VS Code attach configs:
`claude-docs/debugging.md`.
