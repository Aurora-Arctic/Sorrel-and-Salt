# Testing — summary

Vitest 5, configured as four projects in `vitest.config.mts` (`.mts`, not
`.ts` — the root `package.json` deliberately carries no `"type"` field per
`MODULE_TYPELESS_PACKAGE_JSON`, so an explicit `.mts` extension is what tells
Vite's native config loader this file is ESM instead of warning about it), plus
the acceptance suite on a config of its own, `vitest.stories.config.mts` (M1.28,
below). `db` and the acceptance config share the Postgres harness through
`tests/support/db-project.mts` — `.mts` and imported with its extension for the
same reason, since a config's imports run at config-load time.

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
  scripts/                    # mirror scripts/ — the pure half of a script, imported by its .d.mts
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
  for the network fails as loudly as a component test does.
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
    Vitest's own default (`os.availableParallelism() - 1`, floored at 1) —
    and it must keep mirroring that default: the projects share one pool
    group, and Vitest throws when two projects in a group disagree on
    `maxWorkers`, which is what makes "every slot has a clone" a guarantee
    rather than a hope. It `provide`s that list as `workerDatabases`,
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
      [`design-decisions/m1.27-template-at-setup-not-in-image.md`](design-decisions/m1.27-template-at-setup-not-in-image.md)
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
      rather than fixing it (§6's categories, the compendium's entries, a
      seeded form), the file reads it back by name in `beforeAll`. That is the
      opposite of the fixture-factory rule below: a fixture invents because it
      is writing a new row, a db test binds because it is pointing at a seeded
      one.
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
    [`design-decisions/m1.9-test-db-isolation.md`](design-decisions/m1.9-test-db-isolation.md).
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
`npm run test:stories` includes (below). Neither is wired into
`pre-commit` — CLAUDE.md's pre-commit list is unchanged by this task.

**Wired into CI (M1.14).** `pr-gate.yml`'s `vitest` job
calls the real `.github/workflows/vitest.yml`, path-filtered off `src/**`,
`tests/**` less `tests/e2e/**` (Playwright's, and nothing Vitest runs imports
it — the `!` exclusion is why the `changes` step sets `predicate-quantifier:
some-with-excludes`), `vitest.config.mts`, and `package{,-lock}.json`.
`tests/**` is load-bearing: without it a test-only
PR — the one kind whose whole content is what this job runs — would skip the
job and report green. It runs
in `build-image.yml`'s shared `testing` container plus its own `services:
postgres:` (a `build-db-image` job feeding
`postgres://sorrel:sorrel@postgres:5432/sorrel`, reachable by service name —
see `claude-docs/ci.md`), and uploads `.reports/coverage/` as an artifact on every
run. `vitest.config.mts`'s coverage `reporter` also gained `json-summary`
alongside its existing `text`/`lcov`/`html`, so the PR comment can show a
coverage table (`.github/scripts/summarize-vitest.mjs`).

**Quiet under Claude Code (MB.142).** `CLAUDECODE=1`, which only Claude Code's
shell sets, switches the test reporter to `dot`, the coverage reporter to
`text-summary`, and `silent` to `passed-only`, which drops the console output
of passing tests — a green run printed ~12,000 lines of pg notices and React
warnings, against ~200 for the coverage table. A failure still prints in full,
with its console output, and the per-file numbers are read from
`.reports/coverage/coverage-summary.json`. The host and CI see everything as
before — CI's own `--reporter` flags replace the config's list either way.

## The db test harness — `tests/support/db/` (MB.51)

Two modules the `tests/db/` and `tests/modules/` files share, a sweep built
on them, and the setup inserter. They sit in their own directory under `tests/support/` because
the rest of `tests/support/` may not import `drizzle-orm` at runtime —
`.oxlintrc.json`'s `no-restricted-imports` bans it everywhere but the database
layer and its tests (CLAUDE.md rule 4), and
`tests/guards/lint-db-client-boundary.test.ts` probes that ban by writing a
runtime import into `tests/support/` and asserting the lint fires.
`getTableConfig` from `drizzle-orm/pg-core` is what `table-metadata.ts` is
made of, so the database-layer override names `tests/support/db/**/*.ts`
beside `tests/db/**/*.ts` and `tests/modules/**/*.ts`;
`lint-db-client-boundary.test.ts` lists `tests/support/db` among its `EXEMPT`
probes, which proves the override actually reaches the harness.
`vitest.config.mts` collects only `*.test.ts` files, so a module there is never
run as a test.

- **`database.ts` — `useTestDatabase(bind)` and `failureOf(work)`.**
  `useTestDatabase` registers a `beforeAll` that opens one `postgres` client
  (reading `DATABASE_URL` inside the hook, after `db-setup.ts` has pointed it
  at the worker's clone) and an `afterAll` that ends it, and returns the
  catalogue reads — `columnNames(table)`, `indexRow(table, name)`,
  `uniqueIndexNames(table)` — closing over that client. **It is per file, not
  per worker, and that is not a style choice:** `db-setup.ts` re-clones the
  worker's database `WITH (FORCE)` before every test file, which terminates
  any session still open on it, so a connection shared across files would be
  killed by the next file's clone. Vitest's default `sequence.hooks` is
  `stack`, so a call at the top of a file opens before the file's own
  `beforeAll` (the ones that read seeded ids by name) and closes after its
  `afterAll` — no reordering needed. It hands the client to a `bind` callback
  rather than returning it so a file's existing `let sql` and every
  `` sql`…` ``, `sql(row)`, `sql(table)`, `sql.begin` and `sql.unsafe` call on
  it stay exactly as written:

  ```ts
  let sql: ReturnType<typeof postgres>;
  const catalogue = useTestDatabase((client) => (sql = client));
  ```

  `repository/*.test.ts` (through `tests/support/db/probe-tables.ts`), `updated-at-trigger.test.ts`,
  `test-database-isolation.test.ts`, `seeded-template.test.ts` and
  `tests/db/seed/*` still open their own client — the isolation test's subject
  _is_ the connection, and the others truncate everything first.

- **`table-metadata.ts` — the Drizzle half.** `tableFacts(table)` is
  `getTableConfig` plus the lookups every schema test used to build by hand:
  `byName`, `byIndexName`, `foreignKeyByColumn` (each entry
  `{ column, name, foreignColumnName, foreignTable }`) and
  `nonAuditForeignKeys`, the table's own references with the audit ids
  filtered out. `AUDIT_COLUMNS`, `STAMP_COLUMNS` and `DELETE_COLUMNS` are
  **literal string lists, deliberately not derived from `src/db/audit.ts`**:
  a test comparing a table against `Object.keys(auditColumns)` passes for any
  value of `auditColumns`, an empty one included. `AUDITED_TABLES` (eighteen
  names, the two hard-deleted join tables among them) and
  `UNAUDITED_TABLES` (Better Auth's `accounts`, `sessions`, `verifications`)
  moved here from `updated-at-trigger.test.ts` so the trigger sweep and the
  audit-columns sweep read one list.

- **`insert-ingredient.ts` — `insertIngredient(sql, fixture, author)`** (MB.101).
  The setup inserter for an ingredient and its children, on the raw client and
  in one transaction. Why setup goes this way rather than through `withAudit`
  is under "Fixture factories" below, where the convention is stated; its test
  is `tests/db/insert-ingredient.test.ts`, under `tests/db/` because that is
  the project with a database.

- **`insert-spell.ts` — `insertSpell(sql, fixture, author)`** (M5.3). The
  same for a spell: its row, its layers and its assigned categories, on
  `insertIngredient`'s terms. `author` is `created_by`, which is whom a
  private spell is readable by, and a layer's ingredient id is written as
  given, which is how a test writes the cross-coven link a finder must
  withhold. Its test is `tests/db/insert-spell.test.ts`.

- **`tests/db/audit-columns.test.ts` — one sweep instead of a copy per
  file.** It holds two transcribed lists of Drizzle table _objects_ — the
  sixteen six-column tables and the two four-column join tables — asserts
  both non-empty and their names equal to `AUDITED_TABLES`, and loops the same
  expectations over each, on **both sides**: the schema (the columns are
  defined, the stamps `NOT NULL`, `deleted_at` nullable or absent, every
  `*_by` a foreign key to `users.id`, `deleted_by` absent on a join table) and
  the catalogue (`information_schema.columns` carries the names,
  `referential_constraints` shows each `*_by` referencing `users(id)`). Both
  sides because they can disagree: a spread deleted from a schema file leaves
  the migrated database's columns standing, and a catalogue-only sweep would
  stay green. The `UNAUDITED_TABLES` are asserted to exist and carry no `*_by`
  column, which is what stops the catalogue half being satisfied by a table
  with nothing to check. The per-file `spreads the shared audit columns` /
  `references users.id from every audit id` tests are gone; a schema test now
  asserts the table's _own_ columns, constraints and behaviour. A new
  audited table added without `...auditColumns` fails this file, where
  before it would simply have had no test.

## Acceptance — `make test-stories` (M1.28)

`npm run test:stories` (`make test-stories`) runs `tests/acceptance/` alone —
`vitest run --config vitest.stories.config.mts` — and prints a checklist of
the v1 user stories, one line each:

```
[x] Story 1: Sign in with an account I already have, so I don't manage another password.
[ ] Story 2: As a newly signed-in user, be told plainly what I can do next, … — FAILING
[ ] Story 3: Create a workspace once I hold creation rights, … — skipped
[ ] Story 4: Generate an invitation link with a chosen role … — no test yet

1 of 51 stories passing · 1 failing · 1 skipped · 48 without a test
```

That is DESIGN.md §11's "live progress report against §10 rather than a
coverage percentage", and it is the whole of what "acceptance coverage"
means here — a count of stories, never a percentage of lines. Four decisions
make it hold:

- **A config of its own, not a third project.** `npm run test` and
  `npm run test:coverage` never see `tests/acceptance/` — `unit` and `dom`
  exclude it, and `vitest.stories.config.mts` is the only include —
  so a scaffold that lands deliberately red (M2.1 is the first) cannot fail
  the unit run, and a story that passes cannot lift the 80% threshold. The
  stories run carries no `--coverage` at all.
- **The story list is read out of DESIGN.md §10, not copied.**
  `tests/support/stories.ts` parses the numbered list between
  "## 10. User stories" and the next section — 51 today, 1–34 and 47–63 — so
  the spec is the one place a story is written down and a story added to §10
  joins the checklist without a harness edit. `stories.test.ts` pins the
  rules rather than the list: ids unique and ascending, none in 35–46, and the
  count equal to the one §10 states for itself in prose.
- **A story's status is the state of every suite naming it.** A suite names
  its story in its describe — `describe('Story 12: …')`, at any depth, from
  any file — and `tests/support/story-checklist.ts` folds those states: any
  failure is _failing_; otherwise any skip is _skipped_ (M2.1's
  skipped-with-reason option); otherwise _passing_. `pending`, what an
  interrupted run leaves, reads as failing so it can never look green. A
  suite naming a number §10 does not list is set aside under "Not a v1
  story" rather than counted.
- **Naming is guarded, not hoped for.** `tests/guards/story-naming.test.ts`
  reads every `tests/acceptance/*.test.ts(x)` — tracked and untracked, as
  `slug-rule.test.ts` does, since the file it exists to catch was just
  written — and fails on a top-level `describe` that names no story or a
  non-v1 number, or a top-level `it`. A story with a test that names it
  wrongly would otherwise show as "no test yet" while that test failed.

**A scaffold names only what typechecks.** A scaffold lands before the thing
it tests exists, and `npm run typecheck` runs over `tests/` too, so an import
of a page or a service that is not there yet would fail `tsc` rather than the
story. `01-accounts.test.ts` (M2.1) therefore reads an unbuilt page's source
with `existsSync` and `readFileSync` instead of rendering it, and
`07-admin.test.ts` (M5.1) looks each unbuilt service up on its module's
surface at runtime — `await import('@/modules/ingredients')` cast to an
interface stating the signature the story expects, each name checked with
`toBeTypeOf('function')` so the failure names the task it waits on. The task
that builds the page or the service replaces the workaround with the import
and drops the stated signature; the story's `describe` and its assertions
stay.

The suite runs on the same harness as `tests/db/` — node, one seeded
`sorrel_test_<slot>` clone per worker, re-cloned before every file — because
an acceptance test calls a service against the seeded world. A file that
needs a DOM (`04-modals.test.tsx`, M9.1) declares
`// @vitest-environment jsdom` in its own docblock. `passWithNoTests` is on:
the directory holds only its README until M2.1, and 51 stories with no test
is a true report rather than an error.

`tests/support/story-reporter.ts` is the Vitest reporter behind it, listed
by path after `default` in the config — so a failing story still prints its
assertion — and given by path rather than imported, since a config's imports
run at config-load time. With `--outputFile=<path>` (or
`--outputFile.stories=<path>`, the way the built-in `json` reporter is
addressed) it also writes the checklist as JSON, which is how CI gets it.

**Wired into CI (M1.28).** `vitest.yml` runs `npm run test:stories` as a
second step of the same job, after the coverage run and with `always()` so
the checklist is written even when that run is red;
`.github/scripts/summarize-stories.mjs` turns the JSON into a "3 of 45
stories passing" stat and a collapsible markdown checklist for its own job
summary section and its own PR comment thread (marker `stories`). The step
fails the job when a story fails — except across M2 (M2.1): that step carries
`continue-on-error: true` so a story still red while the rest of Wave 6 lands
cannot block a PR, while `steps.stories.outcome` (read by the summarize and
comment steps below it) still carries the real pass/fail, unaffected by
`continue-on-error`. Revert once every M2 story is green.

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

## Fixture factories (M1.25)

**`tests/support/fixtures/`** is `makeIngredient`, `makeSpell` and
`makeWorkspace` — plain objects with sensible defaults, so a test states the
one thing it is about and the factory answers the rest:

```ts
makeIngredient({ categories: ['Protection'] });
makeSpell({ layers: [{ ingredientId: mugwort }] });
makeWorkspace({ name: 'Fixture Coven Two' });
```

**They are objects, not inserts.** Nothing here opens a connection, which is
what lets the `unit` project test them with no Postgres in sight and leaves
the inserting to the caller — or, for an ingredient, to the shared inserter
below. Each fixture is typed
against its table's own `$inferInsert` — the same idiom `src/db/seed`'s types
use — so a column renamed in a module's `schema/` is a compile error in every
fixture that names it. The schema import is `import type`: a runtime import of
the schema is a runtime import of drizzle-orm, and `tests/support/` is not
among the paths allowed to make one (CLAUDE.md rule 4 / MB.33).

**Setup rows go through the raw `postgres` client and the shared inserters;
a test whose subject is the write path is the one that uses `withAudit`**
(MB.101). Setup must not depend on the code under test, and the writer refuses
states setup regularly needs — an already-deleted row, an un-delete, a
backdated stamp, a Better Auth row — while a compendium ingredient is written
through `withAudit` only by `insertInCompendium` under the `SiteAdmin` proof,
which is the compendium service's own write and so the code under test
wherever the compendium is ([`db.md`](db.md), "The SiteAdmin proof").
The seed is the one sanctioned writer outside `withAudit` (CLAUDE.md rule 3),
and a test inserter is the same kind of thing, so it does what the seed does.
[`tests/support/db/insert-ingredient.ts`](../tests/support/db/insert-ingredient.ts)'s
`insertIngredient(sql, fixture, author)` writes an `IngredientFixture`'s row,
its folk names and its category links in one transaction, stamps every row's
`created_by`/`updated_by` from `author`, and publishes `app.current_user_id`
inside the transaction, so a v2 history trigger would record the author
rather than nothing; category names are resolved through the seeded
`categories`, and a name with no live row is a thrown error naming it, never a
silent skip. Every ingredient-family service, loader and GraphQL test seeds
through it, and a test that needs a spell seeds through
`tests/support/db/insert-spell.ts`'s `insertSpell`, which does the same for a
spell, its layers and its categories — each keeping at most a one-line adapter from what the file states to a
fixture. Two kinds of raw insert stay, on purpose: a schema test's, which is
its subject, and the volume loads in
`tests/modules/ingredients/services/*-plan.test.ts` — tens of thousands of
`generate_series` rows that are the planner's ballast rather than fixtures,
and no business of a row-at-a-time inserter.

**Default names are invented, never real.** M1.27 seeds the `standard`
scenario into the template every `db` worker clones, and the
partial unique indexes reserve each seeded identity — so a default that
matched one would be a fixture no test could insert. A real ingredient merely
absent from the seed today is only safe until someone seeds it, so the
defaults are names that cannot be seeded: `makeIngredient()` is Testwort /
_Fixtura testalis_, every formal name the nomenclature table supplies is of
the same kind, `makeSpell()`'s default custom layer is Fixture Ash, and
`makeWorkspace()` is Fixture Coven. A fixture is what a test writes _beside_
the seeded world; the rule covers every ingredient or coven name a factory
supplies on its own, while a test that _states_ a real name is stating what
it is about. `makeSpell()` still lands in W — `workspaceId` is a reference,
not an insert, and a fixture spell and a seeded spell belong in the same
coven. `ingredient.test.ts` and `workspace.test.ts` also check the defaults
against `COMPENDIUM_INGREDIENTS` and `FIXTURE_WORKSPACES`, read from
`src/db/seed/standard` rather than copied — a backstop rather than the
mechanism.

### Overrides merge; arrays replace

`mergeFixture` applies an override as a sentence about the default rather than
as a replacement for it — a nested object merges key by key, and a field the
override does not mention keeps its default. Three decisions make that useful:

- **An array replaces wholesale.** `makeIngredient({ categories: ['Protection'] })`
  is filed under protection and nothing else. Merging element by element would
  leave the default's other entries behind and the test would be about
  categories it never named.
- **`undefined` says nothing; `null` says null.** `undefined` is what an absent
  optional property reads as, so treating it as a value would let
  `{ form: maybeForm }` erase a default whenever the caller's own variable
  happened to be unset.
- **Every call gets its own copy.** The defaults are cloned before anything is
  written into them, so a test that pushes a category onto one fixture is not
  editing the next test's — the hazard `asUser` returns a fresh session to
  avoid.

There is no `deepmerge` dependency: those three rules are the whole library,
and the one that matters most is the one a general-purpose merge is least
likely to agree with us about.

### The fields that have to agree with each other

This is what the factories are actually for. Several of §5's tables bind two
columns together with a CHECK, and a factory that merged a partial override
into its defaults would hand back a row Postgres refuses — failing a test for
a reason it was never about.

- **`makeIngredient` derives `canonicalName` from `nomenclature`.**
  `ingredients_nomenclature_declares_canonical_name` is a biconditional, so
  `{ nomenclature: 'none' }` drops the formal name and `{ nomenclature:
'mineral' }` supplies one. Every one of §5's seven kinds has an answer.
- **`makeSpell` derives a layer's shape from whether it names an ingredient.**
  A layer points at an ingredient _or_ names one of its own
  (`num_nonnulls(ingredient_id, name) = 1`, MB.40), with `form` allowed only
  beside a name, so `{ ingredientId: … }` clears both. Defaulted layers take
  distinct names, because `spell_ingredients_spell_id_custom_name_unique`
  folds `Salt` onto `salt` within one jar; `layerOrder` is the position in the
  array, 1-based, so the two cannot disagree.
- **`makeWorkspace` derives the slug from the name**, through
  `src/lib/slugify` — CLAUDE.md's slug rule, and a fixture is exactly where a
  second spelling would get written down.

**Derivation stops the moment the caller states the field**, including when
they state it as `null`. That is how a test writes the row a constraint exists
to reject: `makeIngredient({ nomenclature: 'none', canonicalName: 'Artemisia
vulgaris' })` is the CHECK's own counterexample, and it has to stay writable.

### `…Columns` for the raw-SQL tests

The db tests talk to Postgres through `postgres` directly, so they insert by
column name rather than by field. `ingredientColumns`, `spellColumns`,
`spellLayerColumns` and `workspaceColumns` translate, dropping what belongs to
another table — an ingredient's folk names and categories, a spell's
categories and layers, a workspace's members. `ingredientColumns` also adds
the ingredient's `slug`, derived from its label, form and formal name through
`ingredientSlug` exactly as the seed derives it, so a raw insert satisfies the
column's `NOT NULL` without a test writing a slug down beside a name.

They carry **no audit columns**: the stamps come from the session and never
from a fixture (CLAUDE.md rule 3), so a raw-SQL test spreads its own author
beside them:

```ts
insert into ingredients ${sql({ ...ingredientColumns(makeIngredient(overrides)), created_by: AUTHOR, updated_by: AUTHOR })}
```

That spread is what a schema test writes by hand. For an ingredient a test is
not testing the writing of, it is `insertIngredient`'s (above), which spreads
the author over the row and its children alike.

The camelCase→snake_case mapping is a string transform rather than a read of
Drizzle's column metadata, which would be the obvious source of truth:
`getTableColumns` is a runtime drizzle-orm import, and `tests/support/` may not
make one.

### Who uses them

`tests/modules/ingredients/schema/ingredients-schema.test.ts` and `…/ingredients-indexes.test.ts`
were carrying byte-identical copies of the same untyped `row()` helper, which
is where a partial identity would have gone on quietly disagreeing between the
two; both now build through `makeIngredient`. `tests/modules/grimoire/schema/spells-schema.test.ts`
records through `makeSpell` — dropping `status` from the insert, so the
column's own default is still what "defaults a new spell to draft" observes —
and `tests/db/updated-at-trigger.test.ts` writes its workspace through
`makeWorkspace`, which is what took the hand-written `'hearth'` slug out of
that file.

## E2E — Playwright (M1.11)

`playwright.config.ts` (repo root) runs specs under `tests/e2e/` against a
**production build**, not `next dev`: the first `webServer` entry is
`npm run build && npm run start`, on **8001** (`PORT` env override; `start`
defaults to 8000, `next dev`'s port, which an e2e run keeps clear of).
`reuseExistingServer` is off whenever `CI` is set, so a CI run always builds
and starts its own servers rather than attaching to ones left over on the
ports.

**Each worker slot has a server and a database of its own** (MB.112), as each
Vitest pool slot has a database. A database each, because a spec file's
reseed drops its database `WITH (FORCE)`: shared between workers, one file's
reseed would cut another worker's connections mid-test, and two files
starting together would race the same `CREATE DATABASE` — M5.4 held the suite
to one worker for that until MB.112. A server each, because in Playwright the
code under test does not run in the worker. Vitest's
`tests/support/db-setup.ts` sets `DATABASE_URL` before anything imports
`src/db/connection.ts`, which builds its client at import, so a Vitest
worker's own process reads the worker's own database. A Playwright worker
runs only the spec and drives the browser; the app runs in a `next start`
that built its client from `DATABASE_URL` once at boot. Swapping the variable
in the worker would move only what runs there — `recreateE2eDatabase()` and
`signInAs()` — so the worker would seed and sign in to its own database while
the page it opened read the server's.
[`design-decisions/mb.112-server-per-worker.md`](design-decisions/mb.112-server-per-worker.md)
records the two alternatives turned down: a server each worker starts for
itself, and one server choosing its database per request.

- **The slot is Playwright's `parallelIndex`** — `TEST_PARALLEL_INDEX` inside
  the worker, which `tests/e2e/slots.ts`'s `currentSlot()` reads. It is unique
  among running workers, and the worker Playwright starts to replace one
  after a failed test keeps it. The reseed, `signInAs()` and `baseURL` each
  read it, so a retried test's database, session and pages always agree on
  one slot.
- **The worker count is `E2E_WORKERS`, not `--workers`**, because the servers
  are declared up front, one per slot. `playwright.config.ts` sets `workers`
  to `E2E_SLOTS`: `E2E_WORKERS` if it is set, otherwise half the CPUs floored
  at one — Playwright's own default, so two on CI's four-vCPU runner.
  Anything but a whole number from 1 to `MAX_SLOTS` (99) throws, naming the
  variable. A `--workers` above the count would put a worker on a slot with
  no server, so `tests/e2e/fixtures.ts`'s worker-scoped auto fixture `slot`
  fails every test such a worker runs, with a message naming the limit and
  saying to raise `E2E_WORKERS` instead — before anything reaches for a
  server or a database that was never started.
- **Slot `n` serves on `8001 + n`, from `sorrel_e2e_<n>`.** Slot 0's entry
  builds; each further slot's runs `npm run start` over that build.
  Playwright starts `webServer` entries one after another, which is what lets
  the later ones serve the first's build. `tests/e2e/fixtures.ts` overrides
  `baseURL` with the slot's server for any project that sets none, so the
  default `chromium` project reaches its own slot's; there is no top-level
  `use.baseURL`.
- **A further slot costs about half a second and 180 MB.** One more
  `next start` over the built `.next-e2e` answers in about 0.5 s and holds
  about 180 MB resident, and the servers start one after another, so each
  slot adds its half second to startup.

**The configured-providers server is one more**, because the sign-in page
reads OAuth credentials per request and its two provider states cannot share
a process. Every slot's server runs with each provider variable set to `''` —
blank rather than absent, because Next never lets `.env.local` override a
variable already set, so a developer's real credentials cannot leak into it.
The last `webServer` entry runs `npm run start` on **8100** with placeholder
credentials for all four, against `sorrel_e2e_providers`, which no spec
reseeds. 8100 is fixed above every slot's port, and the 99-slot cap keeps it
there, so no slot can reach that server, or attach to it under a local
`reuseExistingServer`. Two projects split the specs between them: `chromium`
(everything except `tests/e2e/sign-in-configured-providers.spec.ts`, against
its slot's server) and `chromium-configured-providers` (that spec alone,
against 8100 through its own `baseURL`, with `reducedMotion: 'reduce'` so a
hover scan never samples a colour mid-transition). Only `chromium` collects
JS coverage (`tests/e2e/fixtures.ts`) — the second project runs the same
bundle. Placeholder ids are useless to a real authorization endpoint, so
nothing may click a provider button against 8100; the spec aborts and fails
on any request to `/api/auth/sign-in/`.

- **`tests/e2e/database.ts`** — the same two-tier shape as the Vitest harness,
  through the same `tests/support/seeded-database.ts` (M1.27).
  `seedE2eTemplate()` builds `sorrel_e2e_template` — `sorrel_template`
  cloned, migrated and `standard`-seeded, ~1 s — and `cloneE2eDatabases()`
  clones every slot's `sorrel_e2e_<slot>` and `sorrel_e2e_providers` from it,
  tens of milliseconds each. `e2eDatabaseUrl(database)` swaps
  `DATABASE_URL`'s pathname to that database, by default the calling worker's
  slot's; the config passes each server its own as `webServer.env.DATABASE_URL`,
  so the built app reads from it instead of the dev database.
  `recreateE2eDatabase()` re-clones the calling worker's slot database alone,
  and `dropE2eTemplate()` removes the template again.
- **`globalSetup: './tests/e2e/global-setup.ts'`** calls `seedE2eTemplate()`
  and then `cloneE2eDatabases()`, once per run. It runs _after_ the servers
  have started, not before, as this section once said: Playwright's runner
  orders plugin setup — the `webServer` entries — ahead of the global setups,
  and a throwaway config logged its server about 100 ms before its
  `globalSetup` ran. Setup still finishes before any test, and that is enough
  only because postgres.js connects on its first query, and the readiness
  poll's `GET /`, carrying no session cookie, reads no database.
  `global-teardown.ts` drops the template after the last spec; the slot and
  providers databases are left for inspection.
- **Reseeding between spec files** is each spec file's own `test.beforeAll`,
  not a Playwright hook that runs implicitly — see `tests/e2e/smoke.spec.ts`. It
  calls `recreateE2eDatabase()`, never `src/db/seed` directly: a clone of the
  seeded template _is_ the reseed, and it costs a clone rather than a seed.
  Until M1.27 the template it cloned was the empty `sorrel_template`, so the
  baseline every file started from was an empty database —
  [`design-decisions/m1.11-e2e-reseed-without-seed.md`](design-decisions/m1.11-e2e-reseed-without-seed.md)
  records why that was enough at the time.
  **Every db-touching spec file must open with
  `test.describe.configure({ mode: 'serial' })`** (M1.14) — `playwright.config.ts`
  sets `fullyParallel: true`, which lets Playwright split one file's tests
  across multiple workers, and `beforeAll` then runs once _per worker_
  handling that file rather than once for the file. Two workers both
  reaching `smoke.spec.ts` both ran `DROP`/`CREATE DATABASE sorrel_e2e`
  concurrently and threw `duplicate key value violates unique constraint
"pg_database_datname_index"` before this was added. `serial` pins the
  whole file to one worker, so the reset genuinely happens once. Per-slot
  databases have since ended that race but not the rule: `serial` is still
  what keeps a file's tests on one worker, running in order against its one
  reseed of that worker's database.
- **Mail is read back from Mailpit** (MB.65). `tests/e2e/mailpit.ts`'s
  `latestMessageTo(address)` searches Mailpit's REST API at `MAILPIT_URL` for
  the newest message to that address and returns its sender, recipients,
  subject, text and HTML, polling up to ten seconds because the app sends in
  the background of the request that caused it. The address goes in quoted:
  unquoted, Mailpit's query language splits it at a `+`. A spec that follows
  a mailed link gives its recipient a fresh address, so a retry or a parallel
  worker cannot read another's message; `tests/e2e/mail-transport.spec.ts`
  is the example, and sends from the runner because nothing in the app mails
  yet. Compose and `playwright.yml` both run Mailpit; outside them the helper
  throws on the unset URL rather than reporting that no mail arrived.
- **A signed-in browser without a provider** (MB.71). No spec can finish a
  real OAuth round trip, so `tests/e2e/session.ts`'s `signInAs(page, email,
providers, role)` writes what a Discord sign-in would leave into the calling
  worker's slot database, the one its server reads: a verified user stamped as
  its own creator, holding the site role given
  (`user` unless the spec asks for `admin`), one `accounts` row per provider
  named, and a session. It then hands the browser the session cookie Better
  Auth would have set. The value is the token, a dot, and its base64
  HMAC-SHA256 under `BETTER_AUTH_SECRET`, percent-encoded as better-call's
  `signCookieValue` does it. The runner and the served build share that
  secret: `playwright.yml` and compose set it at job level, and a local run
  sets it on the command line, or the helper throws. The name is
  `__Secure-better-auth.session_token` because a production build's base URL
  forces https. It rides as an extra request header, not in the cookie jar,
  since a browser never sends a `Secure` cookie to the plain-http
  `devcontainer:<port>` a remote browser uses. Give each call a fresh address:
  the email index is unique.
- **`next.config.ts`'s `distDir`** reads `NEXT_DIST_DIR`, defaulting to
  `.next`. `webServer.env` sets it to `.next-e2e` so a concurrent `next dev`
  on 8000 (CLAUDE.md's Commands table promises both can run at once) never
  shares — and can't corrupt — the production build e2e is serving from.
- **`next.config.ts`'s `experimental.isrFlushToDisk`** is off when
  `NEXT_ISR_FLUSH_TO_DISK` is `'false'`, which every e2e server sets. They
  all serve the one `.next-e2e` build, and Next flushes its data cache —
  `unstable_cache`, which the compendium read sits under (CLAUDE.md rule 6) —
  to `.next-e2e/cache/fetch-cache` and reads it back on a memory miss, while
  `revalidateTag` reaches only its own process: shared on disk, one slot's
  server would serve another slot's cached compendium. Off, each server
  keeps its data cache in its own memory. The flag also gates runtime ISR
  writes and the image optimiser's disk cache; pages prerendered at build
  are still read from disk. On Vercel it is off regardless — Next's build
  passes `false` under `hasNextSupport`, and a server in minimal mode never
  flushes — so this moves e2e towards production, not away from it.
- **No Neon connection anywhere** — `e2eDatabaseUrl()`/`adminUrl()` only ever
  rewrite the pathname of the ambient `DATABASE_URL`, which points at the
  local `postgres` Docker service exactly as Vitest's does.
- **The browser may be remote** (MB.22). `PLAYWRIGHT_WS_ENDPOINT` is set by
  the `devcontainer` compose service alone. When it is present,
  `playwright.config.ts` passes it as `connectOptions.wsEndpoint`, and every
  `baseURL` becomes `http://devcontainer:<port>` — the slot's server's port,
  or 8100 for the configured-providers project (`tests/e2e/slots.ts`'s
  `browserUrl`) — since a remote browser cannot resolve the runner's
  `localhost`. It reaches those ports inside the compose network;
  `devcontainer.json` forwards 8001 alone, for opening slot 0's server from
  the host. `webServer.url`'s readiness poll deliberately stays on
  `localhost`, because that poll runs in the runner's own process wherever the
  browser lives; making both sides match breaks one of them. Why the browser
  moves at all (Alpine/musl has no Chromium), why the variable must not be set
  any more broadly, and the full setup: `claude-docs/debugging.md`.

`npm run e2e` (`playwright test`) runs the suite; `E2E_WORKERS=<n> npm run e2e`
runs it on `n` workers, and so `n` slot servers. Browser binaries
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

## Coverage — monocart-coverage-reports (M1.13)

**`tests/e2e/coverage.config.ts`** exports the shared `CoverageReportOptions`:
`outputDir: './.reports/coverage-e2e'` (separate from Vitest's `.reports/coverage/`,
so the two suites' contributions stay visible independently — both under the
`.reports/` that `.gitignore` carves out), reports `['v8', 'console-details', 'json-summary']` (the
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

**Wired into CI (M1.14).** `playwright.yml`'s "Upload coverage artifact" step
uploads `.reports/coverage-e2e/` on every run (pass or fail), parallel to
`vitest.yml`'s `.reports/coverage/` upload. The run's reporters (`list`, `json`,
`html`) come from `playwright.config.ts` under `CI`, not from the command line —
a CLI `--reporter` replaces the config's list and with it the html report's
`outputFolder`.

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
