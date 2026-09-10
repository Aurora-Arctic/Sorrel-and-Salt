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
      `src/test/msw/server.ts` (`setupServer()`, no handlers yet; the
      `/api/graphql` stub and its per-test override helper land in M1.10).
    - Covered by `src/test/vitest-setup.test.tsx`, which asserts each hook's
      effect directly rather than testing `vitest.setup.ts` itself.
- **`db`** — `environment: 'node'`. `include`s `src/db/**/*.test.ts` and
  `src/services/**/*.test.ts` — empty today (no `repository.ts` or
  `src/services/` yet), so `passWithNoTests: true` keeps that from failing
  `npm run test:coverage`. No `DATABASE_URL` is set here: `connection.ts`
  throws if it's unset, and nothing in this project's config ever points at
  Neon (`Docker/docker-compose.yaml`'s `postgres` service publishes
  **5432** for exactly this — "the host-side Vitest `db` project"). M1.9
  wires the actual per-worker `sorrel_test_${VITEST_WORKER_ID}` database
  (cloned from the baked `sorrel_template`) via `globalSetup`; until then, a
  `db` test run locally needs `DATABASE_URL` set by hand against the compose
  `postgres` service.

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
