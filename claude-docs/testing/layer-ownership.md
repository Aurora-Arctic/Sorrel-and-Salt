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
test at any other layer proves only what that layer adds.** The table is what
the owner column of a consolidation PR cites, and what the ten tasks
MB.180–MB.189 consolidate toward
([`mb.180-plan.md`](../design-decisions/mb.180-plan.md)).

## The owning layer

| Assertion                                                          | Owner, and what the other layers may add                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A zod rule**                                                     | `tests/modules/*/validation/`. A service test keeps one row proving the service parses its input and leaks no constraint name; a GraphQL file keeps none beyond its one `VALIDATION` refusal per field, which proves the mapping reaches that field, not the rule. The DB CHECK or index behind a rule is a deliberate second gate, not a repeat — its module schema test owns it.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **A service rule** — authorization, soft delete, scoping, identity | `tests/modules/*/services/`. Every refusal is direct-id with its precondition (CLAUDE.md, Testing), and none is ever deleted: a repeat goes only below it (repository) or above it (GraphQL). A service's documented READS table owns soft-delete per exported reader, so no reader carries a one-off elsewhere.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **The transport's half**                                           | `tests/modules/*/graphql/`, run through Yoga with the route's `maskedErrors` (`src/graphql/errors.ts`) and asserting `extensions.code`: one refusal per error code per field, with the precondition that would have let it succeed; SDL-level refusals; `authScopes` refusals; loader cache clearing after a mutation; one read per page; edge fields; and any mode no service test reaches — and nothing the service test already proves. `tests/db/graphql-query-scopes.test.ts` probes every Query and Mutation field signed-out, and every workspace-taking Query field with a null workspace (the Mutation and null-workspace loops land in MB.185), so no file holds a per-field signed-out test. The doctrine change is recorded in [`mb.180-graphql-transport-half.md`](../design-decisions/mb.180-graphql-transport-half.md). |
| **The repository mechanism**                                       | `tests/db/repository/`: the `Membership` proof ANDing `workspace_id`, once per finder family — never a service rule restated against the repository.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **A table's shape**                                                | Its module schema test under `tests/modules/<name>/schema/`: own columns, constraints, and the exact audit set. A cross-table invariant is asserted once, by catalogue sweep in `tests/db/` — `audit-columns.test.ts`, `updated-at-trigger.test.ts`, and the partial unique indexes (MB.188, in `seed-keys.test.ts`'s shape).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **A component behaviour**                                          | The smallest component that has it — `Combobox`'s chips, keyboard and long entries in `tests/components/Combobox/`, not every form that embeds one. A page test holds the page's half: search params → service call, the guard, and `NotFound` against other errors.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Seed content**                                                   | `tests/db/seeded-template.test.ts`, which reads the `standard` template every `db` file is cloned from. The seed-shape invariants — bootstrap actor, stamps, idempotency, no resurrection — are asserted once over every entry point, in `tests/db/seed/index.test.ts`'s `it.each(SEED_ENTRIES)`; a per-seed file keeps only what is about _running_ that seed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **A guard's scan**                                                 | One `git ls-files` listing and one oxlint run, shared through the `unit` project's setup (MB.184) and `inject`ed by each guard; each guard still asserts first that it found what it scans, since an empty scan satisfies every `toEqual([])`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

## How a consolidation PR shows its work

The PR body carries a two-column table, _deleted test_ → _owning test
(file:line)_. A row with no owner is a test that stays. It is how a reviewer
checks that nothing was merely dropped, and the owner column cites the table
above. Per-file coverage of the touched `src/` directories is compared against
the previous run's `.reports/coverage/coverage-summary.json` too: the 80 %
threshold alone would let a file lose its only test.

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
82.7 s, and the wall 114 s — so the wall was the file, not the suite.

A file over the budget is split along the owning layer above, not argued for:
render the smaller component, seed once per file instead of per test, move the
rule to the layer that owns it. The budget is not raised.

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
