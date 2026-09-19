# Testing — summary

Vitest 5, configured as two projects in `vitest.config.mts` (`.mts`, not
`.ts` — the root `package.json` deliberately carries no `"type"` field per
`MODULE_TYPELESS_PACKAGE_JSON`, so an explicit `.mts` extension is what tells
Vite's native config loader this file is ESM instead of warning about it), plus
the acceptance suite on a config of its own, `vitest.stories.config.mts` (M1.28,
below). The two share the Postgres harness through
`tests/support/db-project.mts` — `.mts` and imported with its extension for the
same reason, since a config's imports run at config-load time.

## Where tests live

Every Vitest file is under `tests/`, mirroring `src/` (MB.41). Nothing under
`src/` is a test.

```
tests/
  app/ components/ lib/ db/   # mirror the src/ path of the code under test
  acceptance/                 # one describe per user story — make test-stories
  guards/                     # the mechanical guards
  support/                    # the harness: as-user, db-setup, seeded-database, msw, paths
  support/fixtures/           # makeIngredient / makeSpell / makeWorkspace
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
    schema that is actually in `sorrel`, and M1.27's seeded template will not
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
  (`audit`, `bootstrap`, `users-schema`, `test-database-isolation`); since
  M1.27 every file in it runs against a clone that already carries the full
  migrated schema and the `standard` scenario, so a schema test asserts
  against the real table (`tests/db/seeded-template.test.ts` states that
  baseline) and no file builds tables of its own. `src/services/` doesn't
  exist yet, so `passWithNoTests: true` stays. Nothing in this
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
    possible worker instead. It `provide`s that list as `workerDatabases`,
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
since MB.41 — no test or harness file lives under `src/` — and were kept
deliberately: `include` enumerates the disk rather than the repo, and CI's
container held every file the repo had deleted. Dropping them took CI from
92% to 78.54% with every test passing. **MB.42 closed that condition** —
`checkout-to-app` now runs `git clean -fd` after its copy — so the two are
on their way out rather than load-bearing. They stay until the fixed action
is live, which needs it on `main`, since every caller references it at
`@main` and a merge to `staging` does not reach that; removing them before
then fails the 80% gate on the PR that does it. **MB.44 is the follow-up** —
it cuts that release and then removes both entries and this sentence.
Coverage has been above the threshold
since Wave 3's schema tests landed (~92% of lines at M1.21), so
`npm run test:coverage` exits non-zero only on a test failure or on a change
that pulls a metric back under 80% — which is the threshold doing its job,
not a defect.

`npm run test` (`vitest run`, no coverage) and `npm run test:coverage`
(`vitest run --coverage`) both run both projects — and neither runs
`tests/acceptance/`, which the `unit` project's `exclude` names and only
`npm run test:stories` includes (below). Neither is wired into
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

## Acceptance — `make test-stories` (M1.28)

`npm run test:stories` (`make test-stories`) runs `tests/acceptance/` alone —
`vitest run --config vitest.stories.config.mts` — and prints a checklist of
the v1 user stories, one line each:

```
[x] Story 1: Sign in with Google or GitHub, so I don't manage another password.
[ ] Story 2: As a newly signed-in user, be told plainly what I can do next, … — FAILING
[ ] Story 3: Create a workspace once I hold creation rights, … — skipped
[ ] Story 4: Generate an invitation link with a chosen role … — no test yet

1 of 45 stories passing · 1 failing · 1 skipped · 42 without a test
```

That is DESIGN.md §11's "live progress report against §10 rather than a
coverage percentage", and it is the whole of what "acceptance coverage"
means here — a count of stories, never a percentage of lines. Four decisions
make it hold:

- **A config of its own, not a third project.** `npm run test` and
  `npm run test:coverage` never see `tests/acceptance/` — the `unit` project's
  `exclude` names it, and `vitest.stories.config.mts` is the only include —
  so a scaffold that lands deliberately red (M2.1 is the first) cannot fail
  the unit run, and a story that passes cannot lift the 80% threshold. The
  stories run carries no `--coverage` at all.
- **The story list is read out of DESIGN.md §10, not copied.**
  `tests/support/stories.ts` parses the numbered list between
  "## 10. User stories" and the next section — 45 today, 1–34 and 47–57 — so
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

The suite runs on the same harness as `tests/db/` — node, one seeded
`sorrel_test_<slot>` clone per worker, re-cloned before every file — because
an acceptance test calls a service against the seeded world. A file that
needs a DOM (`04-modals.test.tsx`, M9.1) declares
`// @vitest-environment jsdom` in its own docblock. `passWithNoTests` is on:
the directory holds only its README until M2.1, and 45 stories with no test
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
fails the job when a story fails. M2.1, which lands the first acceptance
file deliberately red, decides how that is tolerated until its milestone
closes (TASKS.md, M2 sequencing) — nothing here pre-empts it.

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
every caller to write its row the way it already does. Each fixture is typed
against its table's own `$inferInsert` — the same idiom `src/db/seed`'s types
use — so a column renamed in `src/db/schema/` is a compile error in every
fixture that names it. The schema import is `import type`: a runtime import of
the schema is a runtime import of drizzle-orm, and `tests/support/` is not
among the paths allowed to make one (CLAUDE.md rule 4 / MB.33).

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
categories and layers, a workspace's members.

They carry **no audit columns**: the stamps come from the session and never
from a fixture (CLAUDE.md rule 3), so a raw-SQL test spreads its own author
beside them:

```ts
insert into ingredients ${sql({ ...ingredientColumns(makeIngredient(overrides)), created_by: AUTHOR, updated_by: AUTHOR })}
```

The camelCase→snake_case mapping is a string transform rather than a read of
Drizzle's column metadata, which would be the obvious source of truth:
`getTableColumns` is a runtime drizzle-orm import, and `tests/support/` may not
make one.

### Who uses them

`tests/db/ingredients-schema.test.ts` and `tests/db/ingredients-indexes.test.ts`
were carrying byte-identical copies of the same untyped `row()` helper, which
is where a partial identity would have gone on quietly disagreeing between the
two; both now build through `makeIngredient`. `tests/db/spells-schema.test.ts`
records through `makeSpell` — dropping `status` from the insert, so the
column's own default is still what "defaults a new spell to draft" observes —
and `tests/db/updated-at-trigger.test.ts` writes its workspace through
`makeWorkspace`, which is what took the hand-written `'hearth'` slug out of
that file.

## E2E — Playwright (M1.11)

`playwright.config.ts` (repo root) runs specs under `e2e/` against a
**production build**, not `next dev` — `webServer.command` is `npm run build
&& npm run start`, on **8001** (`PORT` env override; `start` defaults to
8000). Distinct from Vitest's `db` project, which clones one database per
worker — Playwright needs only one, `sorrel_e2e`, since `webServer` is a
single shared server.

- **`e2e/database.ts`** — the same two-tier shape as the Vitest harness,
  through the same `tests/support/seeded-database.ts` (M1.27).
  `e2eDatabaseUrl()` swaps `DATABASE_URL`'s pathname to `/sorrel_e2e` (handed
  to `webServer.env.DATABASE_URL` so the built app reads from it instead of
  the dev database). `seedE2eTemplate()` builds `sorrel_e2e_template` —
  `sorrel_template` cloned, migrated and `standard`-seeded, ~1 s;
  `recreateE2eDatabase()` clones `sorrel_e2e` from it, tens of milliseconds;
  `dropE2eTemplate()` removes the template again.
- **`globalSetup: './e2e/global-setup.ts'`** calls `seedE2eTemplate()` and
  then `recreateE2eDatabase()` once, before `webServer` starts — `sorrel_e2e`
  has to exist before the built app can connect to it. `global-teardown.ts`
  drops the template after the last spec; `sorrel_e2e` itself is left for
  inspection.
- **Reseeding between spec files** is each spec file's own `test.beforeAll`,
  not a Playwright hook that runs implicitly — see `e2e/smoke.spec.ts`. It
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
