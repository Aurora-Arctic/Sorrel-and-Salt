# Testing — summary

Vitest 5, configured as two projects in `vitest.config.mts` (`.mts`, not
`.ts` — the root `package.json` deliberately carries no `"type"` field per
`MODULE_TYPELESS_PACKAGE_JSON`, so an explicit `.mts` extension is what tells
Vite's native config loader this file is ESM instead of warning about it).

- **`unit`** — `environment: 'jsdom'`, `globals: true` (enables
  `@testing-library/react`'s automatic post-test `cleanup()`, which hooks
  itself onto the global `afterEach` at import time). `include`s
  `src/**/*.test.{ts,tsx}`, excluding `src/db/**` and `src/services/**`.
  `setupFiles: ['@testing-library/jest-dom/vitest']` registers the jest-dom
  matchers (`toBeInTheDocument`, `toHaveClass`, …); `src/vitest-env.d.ts`
  (`/// <reference types="@testing-library/jest-dom/vitest" />`) gives `tsc`
  the same augmentation, since a `setupFiles` entry only affects the Vitest
  runtime, not the separate `typecheck` pass.
  - **Vitest's jsdom environment resolves `import.meta.url` against the
    mocked browser `location`, not a real `file://` URL** — matching real
    browser semantics (a bundled ES module's `import.meta.url` is an `http(s)`
    URL there too), not a bug. A test that needs its own file's path (e.g. to
    read a sibling `.scss` file, as `ThemeToggle`'s does) needs
    `path.join(process.cwd(), …)` instead of
    `fileURLToPath(new URL('./x', import.meta.url))`.
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
      `src/test/msw/server.ts` (`setupServer()`, no base handlers — every
      operation is registered per test, see below).
    - Covered by `src/test/vitest-setup.test.tsx`, which asserts each hook's
      effect directly rather than testing `vitest.setup.ts` itself.
  - **`src/test/msw/graphql.ts`** (M1.10) scopes MSW's `graphql` helper to
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
    Covered by `src/test/msw/graphql.test.ts`.
- **`db`** — `environment: 'node'`. `include`s `src/db/**/*.test.ts` and
  `src/services/**/*.test.ts` — nearly empty today (no `repository.ts` or
  `src/services/` yet), so `passWithNoTests: true` keeps that from failing
  `npm run test:coverage`. Nothing in this project's config ever points at
  Neon (`Docker/docker-compose.yaml`'s `postgres` service publishes **5432**
  for exactly this — "the host-side Vitest `db` project").
  - **`globalSetup: ['./src/test/db-global-setup.ts']`** (M1.9) runs once,
    before any worker starts, and clones `sorrel_test_1` through
    `sorrel_test_<maxWorkers>` from `sorrel_template` with
    `CREATE DATABASE ... TEMPLATE`, dropping each one first (`DROP DATABASE
IF EXISTS`) so a crashed previous run self-heals instead of erroring on a
    stale database. `maxWorkers` comes off the `TestProject` Vitest hands the
    setup function — `VITEST_WORKER_ID` itself is only set inside a worker
    process, so globalSetup (which runs once, outside any worker) can't read
    it directly; it pre-clones one database per possible worker instead. The
    returned teardown drops all of them. Requires `sorrel` to own
    `sorrel_template` and hold `CREATEDB` — both granted in
    `Docker/postgres-init/enable-extensions.sql` (M1.9) — since `postgres`'s
    own password is generated and discarded at image build time (M0.18) and
    so can never authenticate a real connection.
  - **`setupFiles: ['./src/test/db-setup.ts']`** points each worker's
    `DATABASE_URL` at its own `sorrel_test_${VITEST_WORKER_ID}` clone before
    any test file imports `connection.ts` — this one does read
    `VITEST_WORKER_ID`, since `setupFiles` (unlike `globalSetup`) run inside
    the worker process.
  - Rejected alternative — wrapping each test in a rolled-back transaction —
    and the reason, is recorded in
    [`design-decisions/m1.9-test-db-isolation.md`](design-decisions/m1.9-test-db-isolation.md).

**Coverage** (`test.coverage`, provider `v8`): thresholds are 80% on lines,
branches, functions, and statements, `include: ['src/**/*.{ts,tsx}']`,
excluding test files, `*.stories.tsx`, and `src/db/migrations/**`. Today's
coverage sits below that (most of `src/` — `app/`, `db/`, `db/seed/` — has no
tests yet), so `npm run test:coverage` currently exits non-zero on the
threshold, not on a test failure — that's the threshold doing its job, not a
defect; coverage rises as later milestones add tests.

`npm run test` (`vitest run`, no coverage) and `npm run test:coverage`
(`vitest run --coverage`) both run every project. Neither is wired into
`pre-commit` — CLAUDE.md's pre-commit list is unchanged by this task.

**Not yet wired: CI.** `pr-gate.yml`/`merge-queue.yml`'s `vitest` jobs are
still the M0-era stub (`echo "vitest is stubbed until M1 ports the real
workflow_call check"`); M1.14 ("Port vitest and playwright CI workflows with
path filters") replaces them with a real `uses: ./.github/workflows/vitest.yml`
and adds the coverage-artifact upload. `vitest.yml` does not exist yet.

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
  calls the same `recreateE2eDatabase()`, not `src/db/seed`: `seed()` throws
  for every scenario until M1.21-23, and `sorrel_template` itself carries no
  schema or seed data until M1.27 bakes them into the Postgres image
  (`Docker/docker-compose.yaml`'s comment). Recreating from the template is
  therefore what "reseed" resolves to today; once M1.27 lands, the same call
  picks up real seeded content with no change needed here. Full reasoning in
  [`design-decisions/m1.11-e2e-reseed-without-seed.md`](design-decisions/m1.11-e2e-reseed-without-seed.md).
- **`next.config.ts`'s `distDir`** reads `NEXT_DIST_DIR`, defaulting to
  `.next`. `webServer.env` sets it to `.next-e2e` so a concurrent `next dev`
  on 8000 (CLAUDE.md's Commands table promises both can run at once) never
  shares — and can't corrupt — the production build e2e is serving from.
- **No Neon connection anywhere** — `e2eDatabaseUrl()`/`adminUrl()` only ever
  rewrite the pathname of the ambient `DATABASE_URL`, which points at the
  local `postgres` Docker service exactly as Vitest's does.

`npm run e2e` (`playwright test`) runs the suite. Browser binaries
(`npx playwright install chromium`) are a one-time local step; CI's image
install is M1.14's concern, same as the workflow wiring below.

**Not yet wired: CI, a11y, coverage.** `pr-gate.yml`/`merge-queue.yml`'s
`playwright` jobs are the same kind of M0-era stub as `vitest`'s, replaced by
M1.14. `@axe-core/playwright` (M1.12) and `monocart-coverage-reports` (M1.13)
are separate, later tasks — this config has neither yet.
