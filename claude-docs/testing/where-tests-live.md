## Where tests live

Every Vitest file is under `tests/`, mirroring `src/` (MB.41), and Playwright's
specs live in `tests/e2e/` beside their harness; `tests/guards/test-location.test.ts`
pins both. Nothing under `src/` is a test.

```
tests/
  app/ components/ lib/ db/   # mirror the src/ path of the code under test
  rsc/                        # what can only be seen from inside a server render, mirroring src/ below it
  acceptance/                 # one describe per user story — make test-stories
  guards/                     # the mechanical guards
  scripts/                    # mirror scripts/ and .github/scripts/lib/ — the pure half of a script, imported by its .d.mts
  support/                    # the harness: as-user, db-setup, seeded-database, msw, paths
  e2e/                        # Playwright specs and their harness (database, fixtures, axe, coverage)
  support/fixtures/           # makeIngredient / makeSpell / makeWorkspace
  db/support/                 # the db-only half: useTestDatabase, tableFacts, the audit lists
```

Three consequences worth knowing before writing a test:

- **A test imports the code under test by the `@/` alias**, not by a relative
  path — `import { users } from '@/modules/identity/schema/users'`. `vitest.config.mts` sets
  `resolve: { tsconfigPaths: true }` so Vite reads the `@/*` → `./src/*`
  mapping tsconfig already declared; each project spells out `extends: true`
  to inherit it. Imports _within_ `tests/` stay relative.
- **A test that reads a file from disk goes through `tests/support/paths.ts`**
  — `REPO_ROOT`, `fromRoot('…')`, `MIGRATIONS_DIR` — rather than counting
  `../` from its own location. The chain is counted once, there.
- **The project split is a path glob**, so where a file sits — and what it is
  called — decides how it runs. A test that touches Postgres and is not under
  `tests/db/` or `tests/modules/` lands in `unit` or `dom`, against the
  plain `sorrel` database; of those two, a `.tsx` file gets jsdom and a
  `.ts` file gets plain node unless the config's `DOM_TS` names it (MB.97).
  A test that has to watch a server render is under `tests/rsc/`, or React's
  `cache()` is a pass-through and there is nothing to watch.

`tests/guards/test-location.test.ts` holds the rule. It is a test rather than
a lint rule because Oxlint has no custom-rule API and cannot express a
statement about the tree; it reads the shared listing below — the index plus
the untracked files git would not ignore — so a test written in `src/` fails
in the diff that adds it, before it is staged. Until MB.42 it read the index
alone: CI's container then kept every file deleted since its image was built
(`checkout-to-app` lays the checkout over `/app` with `cp -a`, which never
deletes), and an untracked scan reported all of them; the image carries no
source layer now, which `image-source-layer.test.ts` holds. The failure it
prevents is silent: `include` is scoped to `tests/`, so a misplaced test is
not a red test, it is a file nothing runs.

**The guards share one scan** (MB.184; [`layer-ownership.md`](layer-ownership.md),
"The owning layer"). `tests/support/unit-global-setup.ts`, the `unit`
project's `globalSetup`, runs `git ls-files --cached --others
--exclude-standard` once — the spelling `scripts/doc-citations.mjs` uses, so
the two sweeps see one tree — drops what is in the index but gone from the
working tree, and `provide`s the list as `repoFiles`; a guard that
enumerates files `inject`s it and filters by prefix and extension where it
used to pass git a pathspec. The same setup writes every lint guard's probes
(`tests/support/lint-probes/`, one module per guard, each exporting its probe
tables and a `ProbeSet`), runs oxlint once over all of them under
`.oxlintrc.json`, and provides the report as `lintDiagnostics` with the
file list it was pointed at as `lintedFiles`, removing the probes as soon as
oxlint has read them, so no test in any project finds them on disk and a
watch session does not leave them in `src/`. A watch rerun takes both scans
again (`onTestsRerun`), so a file added since the last run is seen. Each guard still opens by asserting it found what it scans — an
empty listing satisfies every `toEqual([])` — and the lint guards assert
their probes are in `lintedFiles` and drew a diagnostic.
`tests/guards/shared-scan.test.ts` holds the setup to what it provides, and
holds every other test to reading it: a file under `tests/` that imports
`node:child_process` and names the listing or the linter's binary fails there.
Reading a file's contents stays in the guard; it is the listing that is
shared, not the reading.

- **`unit`** — `environment: 'node'`, `globals: true`. `include`s
  `tests/**/*.test.ts`, excluding `tests/db/**`, `tests/modules/**`,
  `tests/rsc/**`, `tests/acceptance/**`, `tests/e2e/**` and the two `DOM_TS`
  files `dom` claims (below). That glob does reach a test inside a directory
  literally named `[...all]` (`tests/app/api/auth/[...all]/route.test.ts`) —
  `[...]` is glob metacharacter syntax, so it was worth confirming rather
  than assuming. Its one setup file is `tests/support/setup-msw.ts`, the MSW
  lifecycle — `beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))`,
  `afterEach(() => server.resetHandlers())`, `afterAll(() => server.close())`
  — against the `server` exported from `tests/support/msw/server.ts`
  (`setupServer()`, no base handlers — every operation is registered per
  test, see `dom` below). `dom` runs the same file, so a guard that reaches
  for the network fails as loudly as a component test does. Its
  `globalSetup` is `tests/support/unit-global-setup.ts`, the guards' shared
  scan (above), which provides `repoFiles`, `lintDiagnostics` and
  `lintedFiles` the way the `db` project's provides `templateDatabase`.
  - **A `unit` or `dom` test that opens a connection gets the plain `sorrel`
    database, not a clone.** The per-worker `sorrel_test_<n>` rewrite is
    `db`-only — it lives in that project's `setupFiles` (below) and nothing
    rewrites `DATABASE_URL` for the other two. So such a test needs schema
    that is actually in `sorrel`, and M1.27's seeded template will not help
    it: the template is never in its path. This is a real trap — it is what
    made a `POST /api/auth/sign-in/social` test pass locally (a hand-run
    `drizzle-kit migrate` had left `sorrel` migrated) and fail in CI, where
    `sorrel` was empty. Keep database-touching tests in the `db` project.
- **`dom`** — `environment: 'jsdom'`, `globals: true` (enables
  `@testing-library/react`'s automatic post-test `cleanup()`, which hooks
  itself onto the global `afterEach` at import time). `include`s
  `tests/**/*.test.tsx` plus `DOM_TS`, the `.ts` tests that need jsdom's
  `location` all the same — `tests/lib/auth-client.test.ts`, because Better
  Auth's client reads `window.location.origin` and `document.cookie`, and
  `tests/support/msw/graphql.test.ts`, which fetches the relative
  `/api/graphql` the helpers match — with `unit`'s excludes. The extension
  is the rule (MB.97): a `.tsx` test renders and a `.ts` test does not, and
  jsdom, jest-dom and React Testing Library together cost a `.ts` guard more
  than its own assertions do — `environment` was a third of CI's worker time
  while every unit file paid it. `tests/guards/test-location.test.ts` holds
  every test file to exactly one project, evaluated against the config's own
  globs, since a file in none is a file nothing runs and a file in two runs
  twice unnoticed.
  - `setupFiles: ['@testing-library/jest-dom/vitest']` registers the jest-dom
    matchers (`toBeInTheDocument`, `toHaveClass`, …); `tests/vitest-env.d.ts`
    (`/// <reference types="@testing-library/jest-dom/vitest" />`) gives `tsc`
    the same augmentation, since a `setupFiles` entry only affects the Vitest
    runtime, not the separate `typecheck` pass.
  - **Vitest's jsdom environment resolves `import.meta.url` against the
    mocked browser `location`, not a real `file://` URL** — matching real
    browser semantics (a bundled ES module's `import.meta.url` is an `http(s)`
    URL there too), not a bug. So a `dom` test cannot reach its own path that
    way. `tests/support/paths.ts` is built on `import.meta.dirname`, which is
    a real path in every project, which is why one helper serves them all; the
    one place still reading a file by convention is `ThemeToggle`'s test,
    which uses `path.join(process.cwd(), …)` to reach the component's
    `index.scss` now that the two no longer sit in the same directory.
  - **`setupFiles` also runs `setup-msw.ts` (above) and
    `./tests/support/setup-dom.ts`** (M1.8, ported from `resume-2026`; one
    file until MB.97 split the MSW half out for `unit`), which adds two global
    hooks on top of the RTL `cleanup()` that `globals: true` already registers
    on its own:
    - a second, explicit `afterEach(cleanup())` — redundant with the
      `globals: true` side effect above, but that's what the source repo
      does and it's harmless to call twice;
    - a `localStorage` polyfill (`Object.defineProperty(window,
'localStorage', …)` with a minimal in-memory `Storage` class),
      because Node's own native `localStorage` global shadows jsdom's once
      Vitest merges jsdom's `window` into the global scope.
    - Covered by `tests/support/vitest-setup.test.tsx`, which asserts each
      hook's effect directly rather than testing the setup files themselves.
  - **`tests/support/msw/graphql.ts`** (M1.10) scopes MSW's `graphql` helper to
    `/api/graphql` with `graphql.link('/api/graphql')`, and exports
    `mockGraphQLQuery(operationName, resolveData)` /
    `mockGraphQLMutation(operationName, resolveData)` for a component test to
    register a one-off response for a single named operation
    (`server.use(graphqlLink.query(...))` / `.mutation(...)` under the hood).
    `mockGraphQLError(operationName, { code, fieldErrors?, message? })` (MB.43)
    answers the named query or mutation the way the route answers a service
    that threw — `data: null` and one error carrying `extensions.code`, plus
    `fieldErrors` for `VALIDATION`. It builds the body by throwing the matching
    type through the route's own `maskError`, so it cannot drift from what the
    route sends; its test holds it against a real Yoga instance's answer. It
    carries no `path` or `locations`, since it answers for the operation rather
    than for one field, and nothing a form reads is in either.
    A component test wraps its tree in a `QueryClientProvider` holding
    `makeQueryClient()`, a fresh client per test — `Providers` keeps one for the
    tab, which would carry one test's cache into the next — and
    `graphql-request` resolves `/api/graphql` against jsdom's location, which
    the link matches. A test with no client posts a plain `fetch` of
    `JSON.stringify({ query })` to `/api/graphql`; msw's graphql matcher parses
    the operation name out of the `query` document itself, no explicit
    `operationName` field required. A request against `http://localhost/...`
    rather than the relative `/api/graphql` will not match, since jsdom's
    default location is `http://localhost:3000`.
    Because no base handler answers an un-overridden operation, it falls
    through to `onUnhandledRequest: 'error'` and fails loudly instead of
    hitting the network; `afterEach(() => server.resetHandlers())` means an
    override from one test never leaks into the next.
    Covered by `tests/support/msw/graphql.test.ts`.
- **`db`** — `environment: 'node'`. `include`s `tests/db/**/*.test.ts` and
  `tests/modules/**/*.test.ts`. The `tests/db/**` half is real as of Wave 1
  (`audit`, `bootstrap`, `users-schema`, `test-database-isolation`); since
  M1.27 every file in it runs against a clone that already carries the full
  migrated schema and the `standard` scenario, so a schema test asserts
  against the real table (`tests/db/seeded-template.test.ts` states that
  baseline) and no file builds tables of its own. The `tests/modules/**` half
  is real as of M6.3 (`membership`, `access-control`) — a service test lands
  here rather than in `unit` because a service reads Postgres, and the split is
  a path glob. Nothing in this
  project's config ever points at
  Neon (`Docker/docker-compose.yaml`'s `postgres` service publishes **5432**
  for exactly this — "the host-side Vitest `db` project").
  - **`globalSetup: ['./tests/support/db-global-setup.ts']`** (M1.9, M1.27)
    runs once, before any worker starts. It first builds the run's template,
    `sorrel_test_template`, through `tests/support/seeded-database.ts`:
    M0.18's extensions-only `sorrel_template` cloned, then `npm run
db:migrate` and `SEED_SCENARIO=standard npm run db:seed` spawned against the
    clone — the same two scripts `Docker/docker-compose.yaml`'s `db-init`
    runs, which is what makes "local and CI run the same migrations and the
    same seed" literally true. About a second. It then clones
    `sorrel_test_1` through `sorrel_test_<maxWorkers>` from that template
    with `CREATE DATABASE ... TEMPLATE`, dropping each one first (`DROP
DATABASE IF EXISTS ... WITH (FORCE)`) so a crashed previous run self-heals
    instead of erroring on a stale database. `maxWorkers` comes off the
    `TestProject` Vitest hands the setup function — no per-worker variable is
    set inside the single setup process, so it pre-clones one database per
    possible worker instead. That number is `undefined` there unless the
    config pins it, so `tests/support/db-project.mts` pins `maxWorkers` to
    Vitest's own default (`os.availableParallelism() - 1`, floored at 1)
    under `DB_WORKER_CAP`, twelve, which is what bounds the connections a
    run can hold (MB.179; [`db-harness.md`](db-harness.md#connections-per-run-mb179)) —
    and `vitest.config.mts` pins its root `maxWorkers` to the same number:
    the projects share one pool group, and Vitest throws when two projects in
    a group disagree on `maxWorkers`, which is what makes "every slot has a
    clone" a guarantee rather than a hope. It `provide`s that list as `workerDatabases`,
    which `test-database-isolation.test.ts` asserts its own database is a
    member of (MB.14) — the point being that a worker's name is checked
    against what was actually created, not against a bound the test
    recomputed — and the template's name as `templateDatabase`, which
    `seeded-template.test.ts` asserts exists. The returned teardown drops all
    of them, template included. Requires `sorrel` to own `sorrel_template`
    and hold `CREATEDB` — both granted in
    `Docker/postgres-init/enable-extensions.sql` (M1.9) — since `postgres`'s
    own password is generated and discarded at image build time (M0.18) and
    so can never authenticate a real connection.
    - **The template is built here, at setup, not baked into the Postgres
      image.** TASKS.md first specified M1.27 as extending the image build;
      [`design-decisions/m1.27-template-at-setup-not-in-image.md`](../design-decisions/m1.27-template-at-setup-not-in-image.md)
      records the measurement and the argument. The short form: migrate +
      seed cost ~1 s once per run against a 30 ms clone, and a template built
      from the checkout cannot disagree with it, whereas a baked one silently
      would after a `git pull` without `make docker-rebuild`.
  - **`setupFiles: ['./tests/support/db-setup.ts']`** runs once per **test
    file** inside the worker process, and does two things in order. It
    re-clones the worker's `sorrel_test_${VITEST_POOL_ID}` from
    `sorrel_test_template` (M1.27) — `WITH (FORCE)`, so a previous file that
    never ended its pool cannot block it — and then points `DATABASE_URL` at
    that clone before any test file imports `connection.ts` (it can read the
    slot variable at all because `setupFiles`, unlike `globalSetup`, run
    inside the worker). Every file under `tests/db/` therefore starts from
    the full schema and the `standard` scenario exactly as `globalSetup`
    built them, whatever the previous file in that worker inserted, deleted,
    truncated or dropped: a file owes the next one no restoring and no
    discipline about what it deletes. A file that needs an empty table
    truncates it, `cascade` — every child foreign key in the schema is
    `NO ACTION`, so a `delete from` against seeded rows is refused. The
    files that are _about_ seeding (`tests/db/seed/*`,
    `updated-at-trigger.test.ts`) call `truncateAllTables(sql)` from
    `seeded-database.ts` first.
    - **What a `tests/db/` file may therefore assume**, and what its own
      header need not re-argue: every migration applied, the `standard`
      scenario present, and a database nothing else will touch. No file builds
      a table, stubs a parent table down to a bare `id`, or puts anything back
      in an `afterAll`.
    - **A db test names the seed's ids rather than inventing them.** The real
      `users`, `workspaces`, `ingredients` and `categories` all carry NOT NULL
      names, slugs and audit stamps, so a row that already exists is cheaper to
      point at than one to construct — `FIXTURE_USERS.A.id`, `WORKSPACE_W_ID`
      and friends out of `src/db/seed/standard`. Where the seed generates an id
      rather than fixing it (§6's categories, the compendium's entries, a seeded
      form), the file reads it back by name in `beforeAll`. That is the opposite
      of the [fixture-factory rule](fixture-factories.md): a fixture invents
      because it is writing a new row, a db test binds because it is pointing at
      a seeded one.
    - **The slot is `VITEST_POOL_ID`, not `VITEST_WORKER_ID`** (MB.14).
      Vitest sets both, and only the first is bounded by `maxWorkers`
      ("Value is between 1-`maxWorkers`", per its own typedef);
      `VITEST_WORKER_ID` is a counter incremented once per test file across
      the whole run, every project, so it passes `maxWorkers` as soon as
      there are more test files than workers. Keying the name off it worked
      until the repo had eleven test files and CI had three workers, at which
      point the isolation spec asked for a `sorrel_test_4` nobody had cloned.
      Both halves now share `tests/support/worker-database.ts`, which is also
      where a missing `DATABASE_URL`/`VITEST_POOL_ID` is turned into a named
      harness error rather than a `sorrel_test_undefined` connection failure.
  - Rejected alternative — wrapping each test in a rolled-back transaction —
    and the reason, is recorded in
    [`design-decisions/m1.9-test-db-isolation.md`](../design-decisions/m1.9-test-db-isolation.md).
- **`rsc`** (M3.8) — `environment: 'node'`, `include`s
  `tests/rsc/**/*.test.{ts,tsx}`, and resolves under the `react-server` export
  condition (`ssr.resolve.conditions` and `externalConditions`, the second for
  packages Node loads itself). That condition is what React's `cache()` and the
  Flight renderer both switch on: without it `cache()` is the default build's
  pass-through, and `react-server-dom-webpack` refuses to load at all. A test
  renders a tree with `renderToReadableStream` from
  `react-server-dom-webpack/server.edge` (a devDependency pinned to React's own
  version, and typed by hand in `tests/vitest-env.d.ts` because it ships no
  types) and reads the stream to a string; one render is one request.
  - **It is not `db` with a flag.** Under `react-server`, `react-dom/server`
    resolves to a file that throws on import, and nine `db` files reach it
    through `lib/auth` and react-email. So the render tests take no database:
    they mock `@/db/repository` whole and count its calls, which is an honest
    count of Postgres round trips because nothing else holds the client
    (CLAUDE.md rule 2).
  - **What belongs here:** anything whose behaviour exists only inside a render
    — today `assertMembership`'s one lookup per render
    (`tests/rsc/modules/coven/membership.test.ts`). A service's authorization is
    still tested in `db`, against the real rows.

**Coverage** (`test.coverage`, provider `v8`): thresholds are 80% on lines,
branches, functions, and statements, `include: ['src/**/*.{ts,tsx}']`,
excluding `*.stories.tsx`, `src/db/migrations/**`, and `src/db/seed/**` —
each a set of files that really exists, for its own stated reason. Two more,
`src/**/*.test.{ts,tsx}` and `src/test/**`, outlived MB.41's move of the suite
into `tests/` because `include` enumerates the disk rather than the repo and
CI's container still held every test file the repo had deleted — dropping them
took CI from 92% to 78.54% with every test passing; they went in MB.42, once
the image stopped carrying source, and the number did not move.
Coverage has been above the threshold
since Wave 3's schema tests landed (~92% of lines at M1.21), so
`npm run test:coverage` exits non-zero only on a test failure or on a change
that pulls a metric back under 80% — which is the threshold doing its job,
not a defect.

`npm run test` (`vitest run`, no coverage) and `npm run test:coverage`
(`vitest run --coverage`) both run all four projects — and neither runs
`tests/acceptance/`, which `unit` and `dom` exclude and only
`npm run test:stories` includes (["Acceptance"](acceptance.md)). Neither is
wired into `pre-commit` — CLAUDE.md's pre-commit list is unchanged by this task.

**Wired into CI (M1.14).** `pr-gate.yml`'s `vitest` job calls the real
`.github/workflows/vitest.yml`, path-filtered off `src/**`, `tests/**` less
`tests/e2e/**` (Playwright's, and nothing Vitest runs imports it — the `!`
exclusion is why the `changes` step sets
`predicate-quantifier: some-with-excludes`), `vitest.config.mts`, and
`package{,-lock}.json`. `tests/**` is load-bearing: without it a test-only PR —
the one kind whose whole content is what this job runs — would skip the job and
report green. It runs in `build-image.yml`'s shared `testing` container plus its
own `services: postgres:` (a `build-db-image` job feeding
`postgres://sorrel:sorrel@postgres:5432/sorrel`, reachable by service name — see
`claude-docs/ci/database-image.md`), and uploads `.reports/coverage/` as an
artifact on every run. `vitest.config.mts`'s coverage `reporter` also gained
`json-summary` alongside its existing `text`/`lcov`/`html`, so the PR comment
can show a coverage table (`.github/scripts/summarize-vitest.mjs`), and since
MB.180 a slowest-files block ([`layer-ownership.md`](layer-ownership.md), "The
file budget").

**Quiet under Claude Code (MB.142).** `CLAUDECODE=1`, which only Claude Code's
shell sets, switches the test reporter to `dot`, the coverage reporter to
`text-summary`, and `silent` to `passed-only`, which drops the console output
of passing tests — a green run printed ~12,000 lines of pg notices and React
warnings, against ~200 for the coverage table. A failure still prints in full,
with its console output, and the per-file numbers are read from
`.reports/coverage/coverage-summary.json`. The host and CI see everything as
before — CI's own `--reporter` flags replace the config's list either way.
