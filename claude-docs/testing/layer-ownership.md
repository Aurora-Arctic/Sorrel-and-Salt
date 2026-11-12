# Test-layer ownership, and the file budget

Each kind of assertion has one owning layer, and a test at any other layer proves only what that layer adds. A repeat at a second layer is not a second safeguard: it fails in the same diff, for the same reason, and costs a worker the time on every run. A file is one worker's job however many workers there are, so one slow file sets the wall clock ("The file budget", below). What any test may assert at all is "What a test may assert", below.

## The owning layer

| Assertion                                                                                                       | Owner, and what the other layers may add                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A zod rule**                                                                                                  | `tests/modules/*/validation/`. A service test keeps one row proving the service parses its input and leaks no constraint name; a GraphQL file keeps none beyond its one `VALIDATION` refusal per field, which proves the mapping reaches that field, not the rule. The DB CHECK or index behind a rule is a deliberate second gate, not a repeat — its module schema test owns it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **A service rule** — authorization, soft delete, scoping, identity                                              | `tests/modules/*/services/`. Every refusal is direct-id with its precondition (CLAUDE.md, Testing), and none is ever deleted: a repeat goes only below it (repository) or above it (GraphQL). A service's documented READS table owns soft-delete per exported reader, so no reader carries a one-off elsewhere.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **The transport's half**                                                                                        | `tests/modules/*/graphql/`, run through `tests/support/graphql/run.ts` — Yoga with the route's `maskedErrors` (`src/graphql/errors.ts`) — and asserting `extensions.code`: one refusal per error code per field, with the precondition that would have let it succeed; SDL-level refusals; `authScopes` refusals; loader cache clearing after a mutation; one read per page; edge fields; and any mode no service test reaches — and nothing the service test already proves. `tests/db/graphql-query-scopes.test.ts` probes every Query and Mutation field signed-out, and every workspace-taking Query field with a null workspace, so no file holds a per-field signed-out test. It also runs every keeper write as one non-keeper fixture (A), with E admitted as the precondition, and holds the refusal to the scope's own message, which no service test can reach, so no field's own file needs a scope refusal of its own. The reasoning is in [`graphql.md`, "The GraphQL file holds the transport's half"](../design-decisions/graphql.md#the-graphql-file-holds-the-transports-half). |
| **The repository mechanism**                                                                                    | `tests/db/repository/`: the `Membership` proof ANDing `workspace_id`, once per finder family — never a service rule restated against the repository.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **A table's shape**                                                                                             | Its module schema test under `tests/modules/<name>/schema/`: own columns, constraints, and the exact audit set. A cross-table invariant is asserted once, by catalogue sweep in `tests/db/` — `audit-columns.test.ts`, `updated-at-trigger.test.ts`, and `partial-unique-indexes.test.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **A component behaviour**                                                                                       | The smallest component that has it — `Combobox`'s chips, keyboard and long entries in `tests/components/Combobox/`, not every form that embeds one. A page test holds the page's half: search params → service call, the guard, and `NotFound` against other errors.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Seed content**                                                                                                | No test of what the `standard` template holds: seed content is reviewed, not tested (rule 1 below). The seed-shape invariants — bootstrap actor, stamps, idempotency, no resurrection — are asserted once over the six production seeds `migrate.yml` runs (the compendium's on a small files fixture, since the real entry files make those sweeps 12 s against the fixture's 3 s), in `tests/db/seed/index.test.ts`'s `it.each(SEED_ENTRIES)` and `reference-data.test.ts`. Only the fill sweep and `tests/db/seed/compendium-files.test.ts:58` read the real files, because they must prove the shipped files; a per-seed file keeps only what is about _running_ that seed.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **A guard's scan**                                                                                              | One `git ls-files` listing and one oxlint run, shared through the `unit` project's setup and `inject`ed by each guard; each guard still asserts first that it found what it scans, since an empty scan satisfies every `toEqual([])`. A guard exists only where lint cannot reach (rule 8 below).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Copy** — a heading, label, hint, caption, placeholder, page title, email subject or body, an error's sentence | No test (rule 2 below). A test asserts the state the action left — the `status`, `alert`, row, chip or description is present, or carries the data the action used — and locators keep their exact names.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Presentation** — a class, a custom property, a z-index, compiled Sass, a layout                               | The component's workshop story and the Playwright axe scan (rule 4). A real browser measuring a layout requirement, and one contrast check per theme, are functional and stay.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **The harness, CI, docs, scripts, and code only agents run**                                                    | No test (rule 1). A bug in the harness fails the tests that use it; a bug in agent-only tooling is seen by the agent that runs it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **A rule lint can carry** — an import ban, a directive, a file path, a marker import                            | oxlint: `.oxlintrc.json` and `lint/sorrel-lint.js`, each rule proved once by a probe file `npm run lint` rejects in the PR that adds it (rule 8).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## What a test may assert

A test verifies a
functional requirement; everything else is bloat, and the 80% threshold
([`coverage.md`](coverage.md)) exists partly to keep it out. Each rule is
cited by number in the PR table of the task that applies it.

1. **Functional requirements only.** A test proves a behaviour a user, admin
   or operator depends on. Tests of the harness, CI YAML, docs, scripts, the
   Dockerfile, `package.json` wiring or another test's helper are not
   written (a helper under `tests/support/` or `tests/e2e/` is proved by the
   tests that use it; the files in `tests/guards/` are not helpers), and **code used only by Claude agents is never tested** —
   `scripts/task-board.mjs`, the doc-splitting and citation tools, skills
   tooling, the CI summarizers: a bug there is seen by the agent that runs it,
   not a user. Three tests of the harness stay on purpose:
   `tests/e2e/axe.spec.ts`, the only proof that every axe assertion can fail
   ;
   `tests/guards/no-tracked-books.test.ts`, which reads repository content:
   a committed book stays published because the repository is public;
   and `tests/db/connection-under-msw.test.ts`, the regression test for a
   database client that opens a connection while msw listens (PR #1542):
   nothing else covers a pool opening its second connection after msw starts.
2. **State, never copy.** After an action, assert that the `status`,
   `alert`, `tooltip`, row, chip or description is present, or carries the
   data the action used. Never a heading, label, caption, column heading,
   placeholder, hint, empty-state sentence, dialog body, page title, email
   subject or body, or the sentence of an error whose kind (`Forbidden`,
   `extensions.code`, a zod `path`, a `reason`) is already asserted.
   **The exception:** when the copy is the only way to tell the state — a
   Yes/No cell that is the only rendering of a flag an action flipped, or
   which of two lock reasons won (`UserList`'s "keeps the primary keeper's
   Revoke on its own reason while paused") — the words are the state and
   stay. Locators keep their exact names.
3. **A regression test needs a shipped bug.** Only a bug that reached `staging` or
   production earns one, and its comment cites the PR or the incident. A bug
   caught while building, including one found in an open PR, earns none, and neither does "X stays removed": the
   exact-column test already fails if a column comes back.
4. **No presentation in happy-dom.** No class name, CSS custom property, z-index,
   compiled-Sass value or faked layout (a `getBoundingClientRect` mock). The
   workshop story and the Playwright axe scan own presentation. A real browser
   measuring a layout requirement (the 375 px scroll width) and a
   one-assertion token-contrast check per theme are functional, and allowed.
5. **One row per shared path.** A `describe.each` or `it.each` over a
   component's or module's own config table (`KINDS`, `VOCABULARY_COPY`,
   `VARIANTS`, `UNITS`, the vocabulary registry) runs the shared behaviour on
   one row; every other row gets only what it changes — its mutation name, its
   path, its parameter. An env matrix needs an env branch in the source, and so does a loop over widths, themes or personas: a loop whose rows run identical code is cut to one row (the axe sweep's themes are outside this). A
   fixed list is proven by one accepted value, one refused, and one equality
   check of the database's list against the code's.
6. **Each layer proves only what it adds** ("The owning layer" above). A service refusal is asserted once, as one non-keeper fixture with
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
   loading state and reset are tested once, in `CompendiumList`, its full
   load in `UserList`.
   **A page or parent test does not render its children.** It mocks its heavy
   children, or awaits `Page(...)` and walks the returned element tree (as
   `tests/app/(public)/compendium/held.test.tsx` does), and it owns only what
   it passes down and what it asks the services for. A form field or one builder step is proved
   in a `FormProvider` harness (as
   `tests/components/IngredientForm/list-field.test.tsx` does), not by
   rendering the whole form. The reason: whole-tree renders are most of the
   suite's CPU and the cause of every timeout the suite has had.
   **A rollback test fails the child write, never the parent's.** To prove a
   child write rolls back with its parent, make the child write fail (a
   trigger refusing it, as
   `tests/modules/ingredients/services/ingredient-categories.test.ts` does).
   If the parent write fails first, no child is ever written and the test
   cannot fail.
7. **A migration's data tests retire** once the migration is in production's
   journal. The shape tests of the tables it leaves stay.
8. **No guard for a rule lint can carry.** Import bans, `server-only`,
   `'use server'`, the route allowlist, `slugify` and type-only files are
   oxlint rules (`.oxlintrc.json`, `lint/sorrel-lint.js`) or conventions. A
   Vitest sweep stays only where it reads the schema, the catalogue or the
   module graph: the GraphQL field classification, every finder filtering
   soft-delete, the audit columns, the `updated_at` trigger, the
   `bump_revision` trigger (`tests/db/revision-trigger.test.ts:37`: every table
   with a `revision` column carries it), the browser floor
   (`tests/guards/browser-floor.test.ts`: it reads the `web-features` package,
   not source text, so no lint rule can carry it), the partial unique indexes, the two
   exemption-count pins, and the test-location check
   ([`where-tests-live.md`](where-tests-live.md), "Where tests live").
9. **A user story is proved by a browser flow**: the
   story suite in `tests/e2e/stories/` walks each story as a user would and
   tags it `@story-N`. The gate suite (`tests/e2e/*.spec.ts`) keeps only what
   no story walks and only a real server can prove: cookies, mail, the cache,
   the production build's config, the GraphQL route, and the axe scans of
   states the sweep cannot reach (below). A gate spec a story flow proves is deleted. A service rule keeps its
   own Vitest test, with its direct-id refusal; a story flow does not replace
   it, because a flow shows the control is absent and the rule shows the
   service refuses.
   Each axe check runs once per distinct markup and colour state:
   1. The axe sweep (`tests/e2e/axe.spec.ts`) scans every route and modal
      once with the full rule set, in light, at desktop width.
   2. In dark it runs only the colour rules (`color-contrast` and
      `link-in-text-block`), because a theme switch changes colour tokens and
      no markup. The dark scan stays because it checks colours in context;
      `tests/scss/tokens.test.ts` checks only the token pairs.
   3. A phone layout whose markup differs is its own state: the shell's tab
      bar and each phone sheet are scanned once, in full, at 375 px.
   4. Any other spec or story scans only a state the sweep cannot reach (an
      open menu, an error, a status), and a one-line `// Sweep gap:` comment
      names that state. A scan that repeats a sweep state is cut.
   5. No manual or keyboard check is cut: axe finds only part of the issues.
10. **SQL text appears only as the precondition of an EXPLAIN plan test**, and
    a plan test keeps its row counts.

A test whose title or comment names a thing one of these rules removed is
retitled: a title names the behaviour, not the wording or the bug.

## How a consolidation PR shows its work

The PR body carries a two-column table, _deleted test_ → _owning test (file:line)_; a row with no owner is a test that stays. The owner column cites the table above. Per-file coverage of the touched `src/` directories is compared against the previous run's `.reports/coverage/coverage-summary.json` too, since the 80 % threshold alone would let a file lose its only test. The previous run must use the same coverage provider, because istanbul and v8 count statements and branches differently ([`ci.md`, "The coverage provider, chosen by measurement"](../design-decisions/ci.md#the-coverage-provider-chosen-by-measurement)).

Never deleted, whatever the table says:

- **A service-layer authorization test**: direct-id, precondition-asserting.
- **A DB CHECK or index test**: the second gate behind a zod rule, there because the two can disagree.
- **`tests/e2e/stories/`**: measured apart from the 80 % line ([`acceptance.md`](acceptance.md)).
- **Plan-test row counts**: load-bearing for the index each EXPLAIN plan proves ([`db/fuzzy-matching.md`](../db/fuzzy-matching.md), [`db/member-autofill.md`](../db/member-autofill.md)); a plan test may seed once per file, never with fewer rows.
- **`tests/db/audit-columns.test.ts`'s catalogue half**: `tableFacts` in `tests/support/db/table-metadata.ts` reads `getTableConfig`, the code side, so the `information_schema` read is the one check that catches a spread deleted from a schema file.

## The file budget

A file's `startTime` to `endTime` in Vitest's JSON results spans its first test's start to its last test's end: the tests and the hooks between them. Module-level code, a file-level `beforeAll` and collection fall outside it, so a seed moved from a nested hook to the top of a file leaves the number without leaving the runner; the plan tests keep theirs inside the `describe` that plans. `.github/scripts/summarize-vitest.mjs` lists the ten slowest files in the PR comment and job summary, marks each over `BUDGET_MS` (10 s, in `.github/scripts/lib/slowest-files.mjs`) with ⚠, and adds the count to the stat line. It warns and never fails the job, because a failing budget would block a PR on a number that moves with the runner.

Why 10 s: the suite's summed time divided by its workers is the floor for the wall clock, and one file over the budget is the wall clock whatever the worker count, because a file is never split across workers.

A file over the budget is split along the owning layer above, not argued for: render the smaller component, seed once per file instead of per test, move the rule to the layer that owns it. Expensive setup (a PDF render, a password hash, a whole-form render, a real seed) runs once per file, and boundary values are tested on the pure function, not on the expensive output. Setup a file's tests only read runs once; a test that writes gets its own. The budget is not raised.

R-3: a Playwright test has a budget of 30 s (`TEST_BUDGET_MS` in `.github/scripts/summarize-playwright.mjs`). The PR comment and job summary list the slowest tests of the merged run and mark each over the budget with ⚠. It warns and never fails, for the reason above. Sharding splits the suite by test, so a test over 30 s is the one thing that sets a shard's span: split it along the owning layer, as a Vitest file is.

Two files stand over it by decision, and the ⚠ on them is expected:

- `tests/components/IngredientForm/index.test.tsx` holds only the tests that render the whole 25-field form: the save payload, kind↔name coupling, error routing, the save flow, one wiring test per lookup. Splitting it into two whole-form files would shorten the wall clock and not the summed time, which is not worth a second file to keep in step.
- `tests/modules/ingredients/services/common-names-plan.test.ts`: its time is the 80,000-row seed its plan is read over. The row count is what makes the planner choose the trigram indexes (`claude-docs/db/fuzzy-matching.md`), and plan tests keep their row counts.

CI's figures come from the `vitest` job, on GitHub's 4-vCPU runner with three workers ([`ci/runner-budget.md`](../ci/runner-budget.md)). It is a shared cloud machine, so a single run's block is a reading, not a measurement: one tree ran 64 s and 110 s of wall. Compare medians of several runs, and read a file against its own run's total.
