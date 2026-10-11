# Test-layer ownership, and the file budget (MB.180)

In the first week of October the Vitest suite went from about 2,200 test cases
to 3,400 (204 files to 257), and the run's wall clock was one file:
`tests/components/IngredientForm/index.test.tsx`, 82.7 s of a 215 s summed run
that took 114 s on seven workers, because a file is one worker's job however
many workers there are. Behind the hot spot, three explorations found the same
rule asserted at every layer it passed through — 75 of the 119 ingredients
GraphQL tests re-ran a service, repository or validation test; seed files
re-seeded per test when the clone already held `standard`; module schema tests
and the audit-columns sweep pinned the same columns; ten guards each ran
`git ls-files` and four each ran oxlint. A repeat at a second layer is not a
second safeguard: it fails in the same diff, for the same reason, and costs a
worker the time on every run.

The rule this page sets: **each kind of assertion has one owning layer, and a
test at any other layer proves only what that layer adds** — and, since
MB.224, what any test may assert at all ("What a test may assert", below). The table is what
the owner column of a consolidation PR cites, and what the ten tasks
MB.180–MB.189 consolidate toward
([`mb.180-plan.md`](../design-decisions/mb.180-plan.md)).

## The owning layer

| Assertion                                                                                                       | Owner, and what the other layers may add                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A zod rule**                                                                                                  | `tests/modules/*/validation/`. A service test keeps one row proving the service parses its input and leaks no constraint name; a GraphQL file keeps none beyond its one `VALIDATION` refusal per field, which proves the mapping reaches that field, not the rule. The DB CHECK or index behind a rule is a deliberate second gate, not a repeat — its module schema test owns it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **A service rule** — authorization, soft delete, scoping, identity                                              | `tests/modules/*/services/`. Every refusal is direct-id with its precondition (CLAUDE.md, Testing), and none is ever deleted: a repeat goes only below it (repository) or above it (GraphQL). A service's documented READS table owns soft-delete per exported reader, so no reader carries a one-off elsewhere.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **The transport's half**                                                                                        | `tests/modules/*/graphql/`, run through `tests/support/graphql/run.ts` — Yoga with the route's `maskedErrors` (`src/graphql/errors.ts`) — and asserting `extensions.code`: one refusal per error code per field, with the precondition that would have let it succeed; SDL-level refusals; `authScopes` refusals; loader cache clearing after a mutation; one read per page; edge fields; and any mode no service test reaches — and nothing the service test already proves. `tests/db/graphql-query-scopes.test.ts` probes every Query and Mutation field signed-out, and every workspace-taking Query field with a null workspace (the Mutation and null-workspace loops since MB.185), so no file holds a per-field signed-out test. Since M5.7 it also runs every admin write as one non-admin fixture (A), with E admitted as the precondition, and holds the refusal to the scope's own message, which no service test can reach, so no field's own file needs a scope refusal of its own. The doctrine change is recorded in [`mb.180-graphql-transport-half.md`](../design-decisions/mb.180-graphql-transport-half.md). |
| **The repository mechanism**                                                                                    | `tests/db/repository/`: the `Membership` proof ANDing `workspace_id`, once per finder family — never a service rule restated against the repository.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **A table's shape**                                                                                             | Its module schema test under `tests/modules/<name>/schema/`: own columns, constraints, and the exact audit set. A cross-table invariant is asserted once, by catalogue sweep in `tests/db/` — `audit-columns.test.ts`, `updated-at-trigger.test.ts`, and `partial-unique-indexes.test.ts` (MB.188).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **A component behaviour**                                                                                       | The smallest component that has it — `Combobox`'s chips, keyboard and long entries in `tests/components/Combobox/`, not every form that embeds one. A page test holds the page's half: search params → service call, the guard, and `NotFound` against other errors.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Seed content**                                                                                                | No test of what the `standard` template holds: seed content is reviewed, not tested (rule 1 below). The seed-shape invariants — bootstrap actor, stamps, idempotency, no resurrection — are asserted once over the five production seeds `migrate.yml` runs, in `tests/db/seed/index.test.ts`'s `it.each(SEED_ENTRIES)`; a per-seed file keeps only what is about _running_ that seed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **A guard's scan**                                                                                              | One `git ls-files` listing and one oxlint run, shared through the `unit` project's setup (MB.184) and `inject`ed by each guard; each guard still asserts first that it found what it scans, since an empty scan satisfies every `toEqual([])`. A guard exists only where lint cannot reach (rule 8 below).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Copy** — a heading, label, hint, caption, placeholder, page title, email subject or body, an error's sentence | No test (rule 2 below). A test asserts the state the action left — the `status`, `alert`, row, chip or description is present, or carries the data the action used — and locators keep their exact names.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Presentation** — a class, a custom property, a z-index, compiled Sass, a layout                               | The component's workshop story and the Playwright axe scan (rule 4). A real browser measuring a layout requirement, and one contrast check per theme, are functional and stay.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **The harness, CI, docs, scripts, and code only agents run**                                                    | No test (rule 1). A bug in the harness fails the tests that use it; a bug in agent-only tooling is seen by the agent that runs it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **A rule lint can carry** — an import ban, a directive, a file path, a marker import                            | oxlint: `.oxlintrc.json` and `lint/sorrel-lint.js`, each rule proved once by a probe file `npm run lint` rejects in the PR that adds it (rule 8).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## What a test may assert

The owner's rules of 2026-10-10 (MB.224), after a title-case change broke five
test files that asserted wording and no behaviour. A test verifies a
functional requirement; everything else is bloat, and the 80% threshold
([`coverage.md`](coverage.md)) exists partly to keep it out. Each rule is
cited by number in the PR table of the task that applies it.

1. **Functional requirements only.** A test proves a behaviour a user, admin
   or operator depends on. Tests of the harness, CI YAML, docs, scripts, the
   Dockerfile, `package.json` wiring or another test's helper are not
   written, and **code used only by Claude agents is never tested** —
   `scripts/task-board.mjs`, the doc-splitting and citation tools, skills
   tooling, the CI summarizers: a bug there is seen by the agent that runs it,
   not by a user.
2. **State, never copy.** After an action, assert that the `status`,
   `alert`, `tooltip`, row, chip or description is present, or carries the
   data the action used. Never a heading, label, caption, column heading,
   placeholder, hint, empty-state sentence, dialog body, page title, email
   subject or body, or the sentence of an error whose kind (`Forbidden`,
   `extensions.code`, a zod `path`, a `reason`) is already asserted.
   **The exception:** when the copy is the only way to tell the state — a
   Yes/No cell that is the only rendering of a flag an action flipped, or
   which of two lock reasons won (`UserList`'s "keeps the primary admin's
   Revoke on its own reason while paused") — the words are the state and
   stay. Locators keep their exact names.
3. **A regression test needs a shipped bug.** Only a bug that reached a PR or
   production earns one, and its comment cites the PR or the incident. A bug
   caught while building earns none, and neither does "X stays removed": the
   exact-column test already fails if a column comes back.
4. **No presentation in jsdom.** No class name, CSS custom property, z-index,
   compiled-Sass value or faked layout (a `getBoundingClientRect` mock). The
   workshop story and the Playwright axe scan own presentation. A real browser
   measuring a layout requirement (the 375 px scroll width) and a
   one-assertion token-contrast check per theme are functional, and allowed.
5. **One row per shared path.** A `describe.each` or `it.each` over a
   component's or module's own config table (`KINDS`, `VOCABULARY_COPY`,
   `VARIANTS`, `UNITS`, the vocabulary registry) runs the shared behaviour on
   one row; every other row gets only what it changes — its mutation name, its
   path, its parameter. An env matrix needs an env branch in the source. A
   fixed list is proven by one accepted value, one refused, and one equality
   check of the database's list against the code's.
6. **Each layer proves only what it adds** (MB.180, "The owning layer"
   above). A service refusal is asserted once, as one non-admin fixture with
   its precondition, never as A, B, C and D when the check reads only the
   site role. A GraphQL file never re-tests the service, the scope sweep
   (`tests/db/graphql-query-scopes.test.ts`) or a signed-out caller. A module
   validation test asserts only what its schema adds over
   `src/lib/validation.ts`. A module schema test holds the exact-column test
   and behaviour particular to that table — no property pins, no catalogue
   reads, no "no X column", no partial-unique pair, since the sweeps own those.
   A page test holds the guard, its search params reaching the service,
   `?edit`'s `NotFound` against other errors, and its modal's close href.
   `Pager` owns paging, so a list asserts only the hrefs it builds; a filter's
   spinner and reset are tested once, in `CompendiumList`.
7. **A migration's data tests retire** once the migration is in production's
   journal. The shape tests of the tables it leaves stay.
8. **No guard for a rule lint can carry.** Import bans, `server-only`,
   `'use server'`, the route allowlist, `slugify` and type-only files are
   oxlint rules (`.oxlintrc.json`, `lint/sorrel-lint.js`) or conventions. A
   Vitest sweep stays only where it reads the schema, the catalogue or the
   module graph: the GraphQL field classification, every finder filtering
   soft-delete, the audit columns, the `updated_at` trigger, the partial
   unique indexes, the two exemption-count pins, and the test-location check
   ([`where-tests-live.md`](where-tests-live.md), "Where tests live").
9. **e2e proves what only a real server can:** navigation, server render,
   cookies, mail, the cache, the production build's config, and one axe scan
   per page. A spec never re-runs a flow a component or service test proves
   wholesale; each admin page keeps its 403 and one flow.
10. **SQL text appears only as the precondition of an EXPLAIN plan test**, and
    a plan test keeps its row counts.

A test whose title or comment names a thing one of these rules removed is
retitled: a title names the behaviour, not the wording or the bug.

## How a consolidation PR shows its work

The PR body carries a two-column table, _deleted test_ → _owning test
(file:line)_. A row with no owner is a test that stays. It is how a reviewer
checks that nothing was merely dropped, and the owner column cites the table
above. Per-file coverage of the touched `src/` directories is compared against
the previous run's `.reports/coverage/coverage-summary.json` too: the 80 %
threshold alone would let a file lose its only test. The previous run must be
under the same provider: istanbul and v8 count statements and branches
differently, so a figure from before MB.191's switch is not a baseline
([`mb.191-coverage-provider.md`](../design-decisions/mb.191-coverage-provider.md)).

Never deleted, whatever the table says:

- **A service-layer authorization test** — direct-id, precondition-asserting;
  the constraint the rest of the suite is organised around.
- **A DB CHECK or index test** — the second gate behind a zod rule, there
  because the two can disagree.
- **`tests/acceptance/`** — a deliverable of its own, measured apart from the
  80 % line ([`acceptance.md`](acceptance.md)).
- **Plan-test row counts** — load-bearing for the index each EXPLAIN plan
  proves ([`db/fuzzy-matching.md`](../db/fuzzy-matching.md),
  [`db/member-autofill.md`](../db/member-autofill.md)); a plan test may seed
  once per file, never with fewer rows.
- **`tests/db/audit-columns.test.ts`'s catalogue half** — `tableFacts` in
  `tests/support/db/table-metadata.ts` reads `getTableConfig`, the code side,
  so the `information_schema` read is the one check that catches a spread
  deleted from a schema file.

## The file budget

A file's `startTime` to `endTime` in Vitest's JSON results is the span from
its first test's start to its last test's end — the tests and the hooks that
run between them, which is most of what the summed worker time is made of.
Module-level code, a file-level `beforeAll` and collection fall outside the
span, so a seed moved from a nested hook to the top of a file leaves the
number without leaving the runner (MB.184); the plan tests keep theirs inside
the `describe` that plans. `.github/scripts/summarize-vitest.mjs` lists the ten slowest files in
the PR comment and job summary, marks each over `BUDGET_MS` — 10 s, set in
`.github/scripts/lib/slowest-files.mjs` — with ⚠, and adds the count to the
stat line so the warning is read without opening the block. It warns and never
fails the job, on the owner's call: a failing budget would block a PR on a
number that moves with the runner.

Why 10 s: on an 8-vCPU runner the suite's summed time divided by its seven
workers is the floor for the wall clock, and one file over the budget is the
wall clock whatever the worker count, because a file is never split across
workers. When the budget was set the summed time was 215 s, the longest file
82.7 s, and the wall 114 s — so the wall was the file, not the suite. Those
were v8 coverage figures; the run has been timed under istanbul since MB.191,
which takes the instrumentation out of most of a dom file's time.

A file over the budget is split along the owning layer above, not argued for:
render the smaller component, seed once per file instead of per test, move the
rule to the layer that owns it. The budget is not raised.

Two files stand over it by the owner's decision, and the ⚠ on them is expected:

- `tests/components/IngredientForm/index.test.tsx`, whose exemption covers
  the tests that render the whole 25-field form — the save payload, kind↔name
  coupling, error routing, the save flow, one wiring test per lookup — after
  MB.181 moved everything else onto the components; MB.228 left it 40 tests,
  moving its linked-substitute block, which rendered only `ListField`, to
  `list-field.test.tsx`. Splitting it into two whole-form files
  would shorten the wall clock and not the summed time, which was judged not
  worth a second file to keep in step.
- `tests/modules/ingredients/services/common-names-plan.test.ts`, whose time is
  the 80,000-row seed its plan is read over. The row count is what makes the
  planner choose the trigram indexes (`claude-docs/db/fuzzy-matching.md`), and
  plan tests keep their row counts (MB.184).

CI's figures come from a free GitHub-hosted runner, shared and unpinned, so a
single run's block is a reading, not a measurement: one tree ran 64 s and
110 s of wall, and `index.test.tsx` 13 s and 30 s (MB.189). Compare medians of
several runs, and read a file against its own run's total. Nothing in the repo
removes the variance while the runners stay free.

## What this amends

The doctrine change — "each refusal is asserted as the browser receives it"
becomes "one refusal per error code per field, with its precondition; the
service owns the rules" — is recorded in
[`mb.180-graphql-transport-half.md`](../design-decisions/mb.180-graphql-transport-half.md),
and the whole scoping in [`mb.180-plan.md`](../design-decisions/mb.180-plan.md).
Each later task corrects the doc that names what it changes, in its own PR
(MB.31):

- [`db-harness.md`](db-harness.md)'s line on what a module schema test asserts
  (own columns only) — MB.188, once the tests assert the exact full set.
- [`graphql/schema.md`](../graphql/schema.md)'s per-field sentences on what
  each GraphQL test file holds — MB.185 for the ingredients files, MB.186 for
  the vocabulary, identity and coven ones.
- `tests/acceptance/README.md`'s Story 19 pointer at the workspace-isolation
  suite — MB.187, which rewrites that file's header and keeps it as the
  per-entity sweep.

MB.224 adds "What a test may assert" and the four rows after "A guard's
scan"; MB.225 to MB.230 apply them, one directory set each, scoped together in
[`mb.224-plan.md`](../design-decisions/mb.224-plan.md).
