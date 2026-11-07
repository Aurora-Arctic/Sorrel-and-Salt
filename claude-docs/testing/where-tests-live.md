## Where tests live

Every Vitest file is under `tests/`, mirroring `src/`, and Playwright's
specs live in `tests/e2e/` beside their harness; `tests/guards/test-location.test.ts`
pins both. Nothing under `src/` is a test.

```
tests/
  app/ components/ lib/ db/   # mirror the src/ path of the code under test
  rsc/                        # what can only be seen from inside a server render, mirroring src/ below it
  guards/                     # the sweeps lint cannot carry (below)
  support/                    # the harness: as-user, db-runner, seeded-database, msw, paths
  e2e/                        # Playwright specs and their harness (database, fixtures, axe, coverage)
  e2e/stories/                # one browser flow per user story, tagged @story-N — npm run test:stories
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
  — `REPO_ROOT` and `fromRoot('…')` — rather than counting
  `../` from its own location. The chain is counted once, there.
- **The project split is a path glob**, so where a file sits — and what it is
  called — decides how it runs. A test that touches Postgres and is not under
  `tests/db/` or `tests/modules/` lands in `unit` or `dom`, against the
  plain `sorrel` database; of those two, a `.tsx` file gets happy-dom and a
  `.ts` file gets plain node unless the config's `DOM_TS` names it.
  The one exception runs the other way: a file under those two trees that
  never reaches the database is named in the config's `DB_FREE` and runs in
  `unit` (MB.189; `db`, below). A test that has to watch a server render is
  under `tests/rsc/`, or React's `cache()` is a pass-through and there is
  nothing to watch.

`tests/guards/test-location.test.ts` holds the rule, in one case: every test
file sits in exactly one project, evaluated against the config's own globs,
and every spec under `tests/e2e/`. It reads the shared listing below — the
index plus the untracked files git would not ignore — so a test written in
`src/` fails in the diff that adds it, before it is staged. The failure it
prevents is silent: `include` is scoped to `tests/`, so a misplaced test is
not a red test, it is a file nothing runs.

**The guards**. A rule lint can carry is a lint rule, not a guard
([`layer-ownership.md`](layer-ownership.md), "What a test may assert", rule
8): import bans in `.oxlintrc.json`'s `no-restricted-imports` (the database
client and `drizzle-orm`, `dataloader`, deep module imports, `slugify`,
`next/cache`, Apollo, and what a validation file may reach) and
`import/no-cycle`, and the rules a path glob cannot express in
`lint/sorrel-lint.js`, an oxlint JS plugin: `no-use-server`,
`service-server-only`, `route-allowlist`, `pagination-helper` and
`module-boundaries`. Each was proved once, by a probe file `npm run lint`
rejected in the PR that added it.

Seven more were Vitest guards that read the source as text or as a syntax
tree. They are rules in `lint/source-sweeps.js`, spread into the same
plugin, each proved by one passing and one failing case in
`tests/lint/source-sweeps.test.ts` (oxlint's `RuleTester`, in the `unit`
project) and by the whole tree passing `npm run lint`:

- `no-bare-router-navigation` — no `router.push`,
  `replace` or `refresh` outside `src/lib/navigation/`.
- `form-shown-through-form-label` — a variant's
  form is shown through `formLabel`.
- `spell-visibility-read-in-one-place` —
  only `readableSpells` compares a spell's visibility to decide a read (rule 7).
- `compendium-review-mark-switch-only` —
  only `setCompendiumEntryReviewed` sets the review mark.
- `modal-focus-return-through-modal` — no
  hand-built `.focus()` return beside a dialog.
- `long-form-guards-leaving` — every form calls
  `useDiscardGuard` or `useLeaveGuard`, or the spell builder's
  `useSaveOnClose`, which calls `useLeaveGuard`.
- `e2e-chained-tests-serial` — a Playwright
  spec whose tests chain is serial (M11.18; claude-docs/testing/e2e.md, "E2E — Playwright").
  `.oxlintrc.json` turns it on for `tests/e2e/**/*.spec.ts` alone.

The two that keep an allowance list (`modal-focus-return-through-modal` and
`long-form-guards-leaving`) also report a listed file that no longer needs its
place, so the list can only shrink.

What stays in `tests/guards/` reads the
schema, the repository's source, the config or the module graph, which lint
cannot:

- `pagination.test.ts` — no `Query` field is a bare list, and every
  connection takes `first` and `after` (CLAUDE.md rule 8).
- `soft-delete-finder-guard.test.ts` — every finder the repository's index
  exports filters tombstones, bar the escape hatches each named
  `…IncludingSoftDeleted` (rule 4).
- `lint-db-client-boundary.test.ts` and `lint-loader-boundary.test.ts` — the
  two exemption-count pins, six files and one, plus one probe each that the
  ban still fires.
- `test-location.test.ts` — above.
- `browser-floor.test.ts` — a web API past Baseline Widely Available is used
  in JavaScript only behind a `typeof` or `in` check; it reads the
  `web-features` package, which lint cannot.
- `migration-order-check.test.ts` and `destructive-ddl-check.test.ts` — the
  rules of the two CI scripts that guard production's migrations.
- `axe-scans.test.ts` — the accessibility sweep's scan list names every
  page under `src/app`, every route in §9 (`design/routes.md`) and every file that draws
  a modal, and nothing that has gone ("Accessibility — axe-core", below).
- `pulled-env-assertion.test.ts` — no value of a pulled Vercel environment
  reaches a CI log.
- `daily-job-starts.test.ts` — a daily job starts from its Vercel Cron route alone; the set of callers is pinned.
- `lint-job-boundary.test.ts` — only the adapter in `src/lib/jobs/` imports the Workflow SDK at runtime, and the ban still fires.
- `no-admin-addresses.test.ts` — nothing in `src/` names an `/admin` address but Better Auth's own endpoints.
- `shell-page-guards.test.ts` — every `(shell)` page, or a file it imports from `src/app`, calls a session guard.
- `stock-decrement-path.test.ts` — only the repository's stock writer lowers `quantityOnHand`, through `decrementStock`.
- `workflow-run-interpolation.test.ts` — no `${{ }}` of untrusted event data sits inside a `run:` script under `.github/`.

**The guards share one scan**. `tests/support/unit-global-setup.ts`,
the `unit` project's `globalSetup`, runs `git ls-files --cached --others
--exclude-standard` once, drops what is in the index but gone from the
working tree, and `provide`s the list as `repoFiles`. The same setup writes
the two lint guards' probes (`tests/support/lint-probes/`), runs oxlint once
over them under `.oxlintrc.json`, and provides the report as
`lintDiagnostics` with the file list as `lintedFiles`, removing the probes as
soon as oxlint has read them, so no test finds them on disk. A watch rerun
takes both scans again (`onTestsRerun`). Each guard still asserts it found
what it scans — an empty listing satisfies every `toEqual([])`.

- **`unit`** — `environment: 'node'`, `globals: true`. `include`s
  `tests/**/*.test.ts`, excluding every file `db` runs, `tests/rsc/**`,
  `tests/e2e/**` and the two `DOM_TS` files `dom`
  claims (below). `db`'s files are listed by a `globSync` when the config
  loads rather than excluded as two trees, since Vitest's `exclude` takes no
  negation and `DB_FREE` could not be carved back out of them; a file added
  under those trees during a watch session is in both projects until the
  session restarts. That glob does reach a test inside a directory
  literally named `[...all]` (`tests/app/api/auth/[...all]/route.test.ts`) —
  `[...]` is glob metacharacter syntax, so it was worth confirming rather
  than assuming. Its one setup file is `tests/support/setup-msw.ts`, the MSW
  lifecycle — `beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))`,
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
- **`dom`** — `environment: 'happy-dom'`, `globals: true` (enables
  `@testing-library/react`'s automatic post-test `cleanup()`, which hooks
  itself onto the global `afterEach` at import time). `include`s
  `tests/**/*.test.tsx` plus `DOM_TS`, the `.ts` tests that need a browser's
  `location` all the same — `tests/lib/auth-client.test.ts`, because Better
  Auth's client reads `window.location.origin` and `document.cookie`, and
  `tests/support/msw/graphql.test.ts`, which fetches the relative
  `/api/graphql` the helpers match — with `unit`'s excludes. The extension
  is the rule: a `.tsx` test renders and a `.ts` test does not, and
  happy-dom, jest-dom and React Testing Library together cost a `.ts` guard more
  than its own assertions do — `environment` was a third of CI's worker time
  while every unit file paid it. `tests/guards/test-location.test.ts` holds
  every test file to exactly one project (above).
  - A file's environment is its project's. The CLI's `--environment node` does
    not override a project that sets `environment` itself, so a test moves to
    another environment only by moving to another project.
  - `setupFiles: ['@testing-library/jest-dom/vitest']` registers the jest-dom
    matchers (`toBeInTheDocument`, `toHaveClass`, …); `tests/vitest-env.d.ts`
    (`/// <reference types="@testing-library/jest-dom/vitest" />`) gives `tsc`
    the same augmentation, since a `setupFiles` entry only affects the Vitest
    runtime, not the separate `typecheck` pass.
  - **`import.meta.url` is a real `file://` URL under happy-dom but was not
    under jsdom**, which the `dom` project used before M11.25: Vitest's jsdom
    environment resolved it against the mocked browser `location`, as a bundled
    browser module's is. `tests/support/paths.ts` is still built on
    `import.meta.dirname`, a real path in every project, so one helper serves
    them all whichever environment a project runs; the
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
      because Node's own native `localStorage` global shadows the DOM
      library's once Vitest merges its `window` into the global scope;
    - an `afterEach` emptying that `localStorage`, as `cleanup()`
      empties the document, so nothing one test stores is there for the next.
    - Untested since MB.224: the harness is not a functional requirement, and
      a broken hook fails the component tests that rely on it.
    - a stand-in for `<dialog>`'s `showModal` and `close` that sets and clears
      `open`, so a change in the library's own version cannot reach a test.
    - **two declarations that say what this environment is**, which
      `tests/support/setup-dom.test.tsx` pins, so removing either fails there
      first rather than in thirty component tests:
      - a `matchMedia` reporting `prefers-reduced-motion: reduce` and nothing
        else. It is true of an environment that draws no CSS transitions, and
        it makes `Modal` close at once instead of waiting for a
        `transitionend` event nothing here can fire (jsdom has no
        `matchMedia`, which gave the same result by accident; happy-dom
        answers "no preference" and hung the modal). A test of the fade or of
        a system theme stubs `matchMedia` itself over it.
      - a default stylesheet, `:where(a, abbr, b, …, span, strong, …) { display:
inline; }`, for the HTML rendering section's inline elements.
        happy-dom leaves their computed `display` empty (its issue #2467, open
        at the time of M11.25), and the accessible-name library puts a space
        between the parts of a name whose `display` is not `inline`, so a
        dialog's name came out with spaces inside words. `:where` gives it
        zero specificity, so a test's own styles still win, and a happy-dom
        release that fixes the bug leaves it redundant and harmless.
  - **A log fails the test.** `setup-dom.ts` installs `tests/support/console-guard.ts`, which
    replaces `console.error` and `console.warn` for each test and, afterwards, fails it with the text
    of every call it did not expect. A test that means to log declares each call with
    `expectConsole('error', /pattern/)`; the call is then swallowed, and a declaration that
    never matches fails too, so a stale one cannot linger. The methods are replaced by hand rather
    than with `vi.spyOn`, so `restoreMocks` and `vi.restoreAllMocks()` cannot switch the guard
    off, and a test's own spy would hide the call from it, which is why a `dom` test declares
    instead of spying. It guards the `dom` project only; MSW's refusal of an unhandled request
    prints through `console.error`, so a missing handler fails its test here.
  - **Why happy-dom.** The `dom` project runs on happy-dom, not jsdom, because it runs the same tests in much less time; the version is pinned exactly in `package.json` and the setup test above fails first if a release changes what the environment reports ([`ci.md`, "Component tests run on happy-dom"](../design-decisions/ci.md#component-tests-run-on-happy-dom)).
  - **A test that stubs `location` uses `stubLocationAssign(assign)`**
    (`tests/support/location.ts`), never `{ ...window.location }`. A spread
    copies the fields only where they are own properties, which is jsdom's
    doing; under happy-dom they are getters on the prototype and the spread is
    empty, and the GraphQL client needs `origin`.
  - **`tests/support/msw/graphql.ts`** scopes MSW's `graphql` helper to
    `/api/graphql` with `graphql.link('/api/graphql')`, and exports
    `mockGraphQLQuery(operationName, resolveData)` /
    `mockGraphQLMutation(operationName, resolveData)` for a component test to
    register a one-off response for a single named operation
    (`server.use(graphqlLink.query(...))` / `.mutation(...)` under the hood).
    `mockGraphQLError(operationName, { code, fieldErrors?, message? })`
    answers the named query or mutation the way the route answers a service
    that threw — `data: null` and one error carrying `extensions.code`, plus
    `fieldErrors` for `VALIDATION`. It builds the body by throwing the matching
    type through the route's own `maskError`, so it cannot drift from what the
    route sends. It
    carries no `path` or `locations`, since it answers for the operation rather
    than for one field, and nothing a form reads is in either.
    A component test wraps its tree in a `QueryClientProvider` holding
    `makeQueryClient()`, a fresh client per test — `Providers` keeps one for the
    tab, which would carry one test's cache into the next — and
    the client wrapper resolves `/api/graphql` against happy-dom's location, which
    the link matches. A test with no client posts a plain `fetch` of
    `JSON.stringify({ query })` to `/api/graphql`; msw's graphql matcher parses
    the operation name out of the `query` document itself, no explicit
    `operationName` field required. A request against `http://localhost/...`
    rather than the relative `/api/graphql` will not match, since happy-dom's
    default location is `http://localhost:3000`.
    Because no base handler answers an un-overridden operation, it falls
    through to `onUnhandledFrame: 'error'` and fails loudly instead of
    hitting the network; `afterEach(() => server.resetHandlers())` means an
    override from one test never leaks into the next.
    `tests/support/msw/graphql.test.ts` holds the loud failure, the one harness
    behaviour a test could otherwise pass without.
- **`workflow`** — real runs of durable jobs, in process. `include`s `tests/workflows/**/*.test.ts`, on the `db` harness (a cloned database per file) with the Workflow SDK's Vitest plugin, which compiles the `"use workflow"` and `"use step"` files under the repo into bundles and runs them in its local world. A step runs from its bundle's own copy of the code, so a mock in a test never reaches it, and a test wakes a run's sleep with `waitForSleep` and `wakeUp` rather than waiting it out. A workflow that exists only for a test lives in `tests/workflows/fixtures/`, never in `src/`. Test files there may import the SDK; `src/` may not outside `src/lib/jobs/`.
- **`db`** and **`db-mocking`** — one project split in two: the
  files that mock, stub or reset modules run isolated in `db-mocking`, the rest
  share a module registry per worker in `db`, chosen by a scan of each file's
  source ([`db-harness.md`](db-harness.md#two-db-projects-mb238)); everything
  below holds for both. `environment: 'node'`. `include`s `tests/db/**/*.test.ts` and
  `tests/modules/**/*.test.ts`, and `exclude`s the config's `DB_FREE`
  : the files under those trees that never reach a database, which
  run in `unit` instead of waiting on a fresh clone before each. They are
  `tests/modules/**/validation/**` — Zod schemas, which run in the browser
  too — and `tests/db/audit.test.ts` (`applyAudit`),
  `tests/modules/coven/schema/workspaces-schema.test.ts`
  (Drizzle's introspection of the table), `tests/modules/coven/services/access-control.test.ts`
  (the permission matrix), `tests/modules/identity/services/site-admin.test.ts`
  and `workshop-access.test.ts` (checks that read the session alone), and
  `tests/modules/ingredients/schema/units.test.ts` (the unit vocabulary).
  They stay where they mirror `src/`, which is why it is a list. A
  database-free file added to `db` is named in `DB_FREE` by review: it costs
  a clone, not a failure. Every file in it runs against a clone that already carries the full
  migrated schema and the `standard` scenario, so a schema test asserts
  against the real table and no file builds tables of its own. A service test lands here rather than in `unit` because a service reads Postgres. Nothing in this
  project's config ever points at
  Neon (`Docker/docker-compose.yaml`'s `postgres` service publishes **5432**
  for exactly this — "the host-side Vitest `db` project").
  - **`globalSetup: ['./tests/support/db-global-setup.ts']`**
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
    member of — the point being that a worker's name is checked
    against what was actually created, not against a bound the test
    recomputed — and the template's name as `templateDatabase`. The returned teardown drops all
    of them, template included. Requires `sorrel` to own `sorrel_template`
    and hold `CREATEDB` — both granted in
    `Docker/postgres-init/enable-extensions.sql` — since `postgres`'s
    own password is generated and discarded at image build time and
    so can never authenticate a real connection.
    - **The template is built here, at setup, not baked into the Postgres
      image.** [`ci.md`, "The seeded test template is built at test-run setup, not baked into the Postgres image"](../design-decisions/ci.md#the-seeded-test-template-is-built-at-test-run-setup-not-baked-into-the-postgres-image)
      records the measurement and the argument. The short form: migrate +
      seed cost ~1 s once per run against a 30 ms clone, and a template built
      from the checkout cannot disagree with it, whereas a baked one silently
      would after a `git pull` without `make docker-rebuild`.
  - **`runner: './tests/support/db-runner.ts'`** runs `onBeforeCollect` once per **test
    file** inside the worker process, before the file imports anything, and
    does two things in order. It re-clones the worker's
    `sorrel_test_${VITEST_POOL_ID}` from `sorrel_test_template` —
    `WITH (FORCE)`, so a previous file that never ended its pool cannot block
    it — and then points `DATABASE_URL` at that clone before any test file
    imports `connection.ts` (it can read the slot variable at all because the
    runner, unlike `globalSetup`, runs
    inside the worker). A setup file would not do: its top level runs once per
    worker in some runs (`--changed`), not once per file. Every file under `tests/db/` therefore starts from
    the full schema and the `standard` scenario exactly as `globalSetup`
    built them, whatever the previous file in that worker inserted, deleted,
    truncated or dropped: a file owes the next one no restoring and no
    discipline about what it deletes. A file that needs an empty table
    truncates it, `cascade` — every child foreign key in the schema is
    `NO ACTION`, so a `delete from` against seeded rows is refused. The
    files that are _about_ seeding (`tests/db/seed/*`,
    `updated-at-trigger.test.ts`) call `truncateAllTables(sql)` from
    `seeded-database.ts` before a seed run they assert — once per file for
    the reads, and in the test for a re-run over a keeper's edit — and a
    seed test that only reads what a seed wrote reads the clone, since the
    template ran the same function (MB.183;
    [`layer-ownership.md`](layer-ownership.md), "Seed content").
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
    - **The slot is `VITEST_POOL_ID`, not `VITEST_WORKER_ID`**.
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
    [`ci.md`, "Test database isolation: per-worker clone vs. rolled-back transaction"](../design-decisions/ci.md#test-database-isolation-per-worker-clone-vs-rolled-back-transaction).
- **`rsc`** — `environment: 'node'`, `include`s
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

**Coverage** (`test.coverage`, provider `istanbul`, which replaced `v8` on
measurement in MB.191: [`ci.md`, "The coverage provider, chosen by measurement"](../design-decisions/ci.md#the-coverage-provider-chosen-by-measurement)):
thresholds are 80% on lines, branches, functions, and statements, `include: ['src/**/*.{ts,tsx}']`,
excluding `*.stories.tsx`, `src/db/migrations/**`, and `src/db/seed/**` —
each a set of files that really exists, for its own stated reason. `include` enumerates the disk, not the repo, so a stale test file left in a CI container's `src/` would count against the figure.
`npm run test:coverage` exits non-zero only on a test failure or on a change
that pulls a metric back under 80% — which is the threshold doing its job,
not a defect.

istanbul instruments at transform time, so a file's first import of a large
graph — `@/lib/auth`, or the GraphQL route and its schema — costs more than it
did under `v8`, and `vi.resetModules()` keeps the transform cache, so only that
first import pays. A file that imports one inside its tests calls
`warmImport` (`tests/support/warm-import.ts`) to pay it in a `beforeAll` with its
own timeout instead: charged to a test, it overran the 5 s budget on CI's
loaded runner (#737). Every project's `testTimeout` is 20 s rather than Vitest's
5 s: it guards against a hang, and three workers sharing GitHub's four vCPUs ran
a 1.2 s test past 5 s ([Runner budget](../ci/runner-budget.md)).

`npm run test` (`vitest run`, no coverage) and `npm run test:coverage`
(`vitest run --coverage`) both run all six projects — and neither runs
the story suite, which is Playwright (`tests/e2e/stories/`, `npm run test:stories`;
["Acceptance"](acceptance.md)). Neither is
wired into `pre-commit` — CLAUDE.md's pre-commit list is unchanged by this task.

**Wired into CI.** `pr-gate.yml`'s `vitest` job calls the real
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

### Quiet under Claude Code

`CLAUDECODE=1`, which only Claude Code's
shell sets, switches the test reporter to `dot`, the coverage reporter to
`text-summary`, and `silent` to `passed-only`, which drops the console output
of passing tests — a green run printed ~12,000 lines of pg notices and React
warnings, against ~200 for the coverage table. A failure still prints in full,
with its console output, and the per-file numbers are read from
`.reports/coverage/coverage-summary.json`. To see everything under Claude Code, run
`env -u CLAUDECODE npx vitest run <file>`, which also shows `act()` warnings. The host and CI see everything as
before — CI's own `--reporter` flags replace the config's list either way.

Playwright follows the same flag. The gate config's local reporter list
is `html` alone, which prints no failure text; under `CLAUDECODE=1` with `CI`
unset it becomes `dot` plus the same `html` entry, so a run prints dots, each
failure's error and a summary, and `.reports/playwright-report/` is still
written. The story config swaps `list` for `dot` the same way, keeping the
story reporter; `PW_REPORTER=list` (or any reporter name) overrides that choice
when the per-test lines and timings are wanted. CI's lists are unchanged. The
config carries the list rather than a `--reporter` flag because a flag drops
the html folder.

### Accessibility — axe-core

**`tests/e2e/axe.ts`** exports `assertNoAccessibilityViolations(page)`, the one
scan helper every spec imports; accessibility is asserted in Playwright, not
via `vitest-axe`. It runs `@axe-core/playwright`'s `AxeBuilder` against the
current page and fails the test with a per-rule summary (rule id, help text,
node count) if any violations are returned. `tests/e2e/axe.spec.ts` seeds a
violation (`page.setContent` with an `<img>` missing `alt`) and asserts the
helper rejects, proof the scan fails a run instead of passing vacuously.

**The sweep.** `tests/e2e/axe-scans.ts` is the scan list: every route the app
serves, each with the people it is scanned as (signed out, an account with no
seat, each coven role, a curator, a keeper, and the accounts the gates hold
back), and every modal, each with the file that draws it and who opens it. A
route §9 (`design/routes.md`) names with no page yet is listed as `unbuilt` and skipped.
`axe.spec.ts`'s "the accessibility sweep" runs one test per person for the
pages and one for the modals. Each seeds its own coven, signs in, visits or
opens every entry in turn, and scans it in the dark theme and then the light.
Findings are collected rather than thrown, so one run reports them all; the
test fails at the end with one line per finding and writes the full result,
with each finding's selector, to `.reports/axe-sweep/<person>-<pages|modals>.json`.
A scan the sweep could not reach is reported the same way, with the page's
accessibility tree. `tests/e2e/axe-sweep.ts` holds the visits and the openers,
typed by the scan list, so an entry added without one fails the type check;
`tests/guards/axe-scans.test.ts` fails when a page, a §9 route or a file that
draws a modal has no entry, or an entry has no page or file left.

`pr-gate.yml`'s `playwright` job calls `.github/workflows/playwright.yml`,
path-filtered off `src/**`, `tests/e2e/**`, `tests/support/**` (which
`tests/e2e/database.ts` imports), `playwright.config.ts`, `next.config.ts`
and `package{,-lock}.json`.

### Debugging tests

`npm run test:debug` runs Vitest single-worker under `--inspect-brk`, halted
on 9230 until a debugger attaches (single-worker so the breakpoint lands inside
a known `sorrel_test_${VITEST_POOL_ID}` clone). `npm run test:ui` opens
`@vitest/ui`. For Playwright, `npm run e2e:ui` and `npm run e2e:trace` cover
interactive and recorded-run debugging, and a local (non-CI) run captures a
trace and a screenshot on failure, never a video. Running `npm run e2e` from
inside the devcontainer needs a remote browser, selected by
`PLAYWRIGHT_WS_ENDPOINT`, which is scoped to the `devcontainer` compose service
alone, so `make docker-e2e` and CI keep launching Chromium locally
([`debugging.md`](debugging.md)).

React's "not wrapped in act(...)" warning means a test asserted before an
update it caused had landed. Under Claude Code Vitest hides a passing test's
output, so run `env -u CLAUDECODE npx vitest run --project dom` to see them.
The fix is to wait for that update and assert the same state: an action that
sends a request is pressed inside `await act(async () => …)`, a native
`.focus()` or `.click()` goes through `act` or `fireEvent`, and `waitFor` in
`tests/support/ingredient-form.tsx` settles first. Never set
`IS_REACT_ACT_ENVIRONMENT` or silence the warning. linkedom and Vitest browser
mode were ruled out for component tests.
