# Raw SQL: a follow-up task, and two assessments

## Context

Reviewing M4.8, you asked why the new finder wrote `sql\`${ingredients.workspaceId} is null\``when`isNull()`exists, and why so much of the work was raw SQL. The`is null` was copied from three neighbouring finders and is fixed in the M4.8 branch. Three things follow from the question:

1. **A follow-up task** to audit the rest of the repository and keep raw SQL only where a rule or performance needs it.
2. **An assessment** of the raw `EXISTS` wrapper and the "one select builder" rule that forces it.
3. **An assessment** of tests writing their setup rows through the plain `postgres` client.

Three surveys were run for this: an inventory of every `sql\`` fragment in `src/`, a reading of the select-builder guard and Drizzle 0.45.2's `exists()`, and a census of how the 70 database test files set up rows. The facts below are theirs.

**Nothing changes in M4.8's PR.** The task is minted, the assessments are recorded here and in the task text, and the fixes land under the new id — one task per PR.

---

## Assessment 1 — the `EXISTS` wrapper and the one-select-builder rule

**What the rule is.** `tests/guards/soft-delete-finder-guard.test.ts` reads every `src/db/repository/*.ts` as text and asserts that the regex `\.select(` matches exactly once across the folder, inside `selectFrom` in `select.ts`. The stated purpose (`db.md`, "Soft-delete filtering"): with one builder, every read goes through the function that applies `deleted_at IS NULL`, so no unfiltered read handle exists.

**What it costs.** Four correlated subqueries are written as raw strings only because a builder-made one would be a second `.select(` and trip the guard:

| Finder                   | File                      | Subquery                                                       |
| ------------------------ | ------------------------- | -------------------------------------------------------------- |
| `findManyInSpell`        | `spells.ts:61`            | `exists (select 1 from spells where … and readableSpells)`     |
| `findMembershipsOfUsers` | `memberships.ts:52`       | `exists (select 1 from workspaces where … and notSoftDeleted)` |
| `findManyOfIngredients`  | `ingredients.ts:38`       | `exists (select 1 from ingredients where readableParent)`      |
| `deleteProvisionalUsers` | `provisional-users.ts:33` | `exists (select 1 from accounts where …)`                      |

Each remembers its own `notSoftDeleted`/`readableSpells` **by convention**. The guard cannot see inside a string, so the four subqueries are the least-checked reads in the folder — the rule's proof ("no unfiltered read exists") holds for the outer query only. The comment in each file cites the guard as the reason for the string, which is the rule producing the thing it was meant to prevent.

**Drizzle can do it.** `exists(subquery)` is exported from `drizzle-orm` (0.45.2, `sql/expressions/conditions`), and an un-executed `db.select().from(t).where(…)` is a `SQLWrapper` that renders as `(select …)`. Correlation works because Drizzle qualifies columns by table. Nothing runs until awaited.

**Verdict: the rule's purpose is right and its mechanism is wrong.** Keep "no read leaves `select.ts` unfiltered"; drop "exactly one `.select(`". The change:

- `select.ts` gains `existsIn(table, where): SQL` — built on the same `db`, ANDs `notSoftDeleted(table)` itself, returns `SQL` (not a builder, so a caller cannot add `.limit` or execute it). `notSoftDeleted` returns `undefined` for a table without the column (`accounts`, join tables), and `and()` drops it.
- The guard counts **two** `.select(` calls, both in `select.ts`, one in each named body, and asserts `existsIn`'s body contains `notSoftDeleted(`. `existsIn` joins `INTERNAL`, so the index can never re-export it.
- The four finders adopt it; the four "written as `sql` because of the guard" comments go.
- What stays raw, and why the doc names it: `Derived` sources and `union all` arms (pg_trgm, `mode() within group`, window functions) — there is no builder for those, and `selectFrom` already reads a `Derived` through its one call.

This is stronger than today, not merely tidier: the subquery's filter becomes enforced by construction, and the guard can check it the way it checks `selectFrom`. It goes into the follow-up task, since it is a rule change plus four finders plus docs.

---

## Assessment 2 — test setup through the raw `postgres` client

**What the convention is.** 59 database test files open a plain `postgres` client; 11 write through `withAudit`. There is **no written rule** either way — CLAUDE.md rule 3 is about application writes and names its two exceptions (sign-up hook, seed); `testing.md` documents the raw-client insert as the normal pattern and built the `…Columns()` fixture helpers for it ("The db tests talk to Postgres through `postgres` directly, so they insert by column name"). Lint bans `db` from tests (one pinned exemption) and allows `withAudit`.

**Three kinds of raw use, and only one is a choice:**

| Kind                                                    | Files | Raw SQL is…                                                                    |
| ------------------------------------------------------- | ----- | ------------------------------------------------------------------------------ |
| Schema tests — constraints, indexes, error codes        | 15    | the subject. They must write rows the writer refuses.                          |
| `tests/db` — seed, triggers, isolation, auth-flow state | 25    | required. Seed tests truncate and hand-write; auth tests set Better Auth rows. |
| Service / loader / GraphQL tests inserting fixture rows | 17    | a convention — with one hard limit below.                                      |

**The hard limit.** A **compendium** ingredient (`workspace_id IS NULL`) cannot be written through `withAudit` at all: `write.insert` rejects `ingredients` (it is `WorkspaceScoped`), and `insertInWorkspace` fills the column from the proof. No service writes compendium rows yet (M5.2 will). So today raw SQL is the only way a test seeds the compendium — which every ingredient-family test does. The writer also cannot produce an already-deleted row, an un-delete, a backdated timestamp, or a Better Auth row; setup regularly needs all four.

**What `withAudit` setup would buy and cost.** Real stamps and the GUC (nothing reads it in v1; the seed publishes it and stamps by hand for the same reason a test would); setup that matches how a future service writes. Against that: unrelated tests fail when the writer or `assertMembership` breaks, compendium rows still need raw SQL, and neither path runs Zod — validation lives in services, so "raw skips Zod" is not a difference.

**Verdict: the raw client is the right default for setup, and no rule needs changing.** Setup should not depend on the code under test, the writer refuses states setup needs, and the seed — the one sanctioned non-`withAudit` writer — is exactly the category a test inserter belongs to. The actual hygiene problem is **duplication**: the 17 service/loader files each hand-roll an `addIngredient` with slightly different columns, and `makeIngredient()` carries `folkNames` and `categories` that nothing inserts. The fix is one shared inserter in `tests/support/db/` — `insertIngredient(sql, fixture, author)` writing the row, its folk names and its category links (names resolved to ids), stamping the author, in one transaction — plus a sentence in `testing.md` stating the convention: _setup rows go through the raw client and the shared inserters; a test whose subject is the write path uses `withAudit`._ That is MB.101, below — confirmed as a second task.

---

## MB.100 — the task to mint

**Title:** `MB.100 — Raw SQL only where a rule or the planner needs it` · **3h** · type Bug · milestone `Wave 08 — Compendium and admin` · label `tracked`.

**Placement:** Wave 8, immediately after M4.8 and before MB.81 / M8.2. The sweep-task rule: a code sweep lands as a mechanism plus a guard as early as it can be written, and M8.2's and M5.1's finders then adopt `existsIn` in their own PRs rather than retrofit it.

**Entry text** (goes into `TASKS.md` beside MB.99, and is the issue body):

> _Story:_ As a developer, I want a `sql\`` fragment in the repository to mean something a Drizzle builder cannot say, so that a reviewer reading one knows it is there for a reason rather than by habit.
>
> M4.8's review found the compendium-tier predicate written as `sql\`${ingredients.workspaceId} is null\``in a fourth finder, copied from three neighbours, where`isNull()`exists. A survey of`src/`found 48`sql\``fragments, every one in`src/db/repository/`— MB.33 holds above it. Three kinds: **31 have no builder** — pg_trgm's`%`, `<%`and`similarity()`, `union all`, `mode() within group`, window functions, `json_agg`, row-value cursor comparisons, casts to a column's own type, and `set_config`with bind parameters — and stay. **5 are plain swaps**:`notSoftDeleted`'s `is null`in`shapes.ts`, and the compendium predicate written three times in `ingredients.ts`, `vocabularies.ts`and`common-names.ts`, which becomes one helper beside `scopedTo`. **4 are correlated `exists (select 1 …)`subqueries** —`findManyInSpell`, `findMembershipsOfUsers`, `findManyOfIngredients`, `deleteProvisionalUsers`— written raw only because`soft-delete-finder-guard.test.ts`allows exactly one`.select(`in the folder. That rule's purpose, no read leaving`select.ts`unfiltered, is right; its mechanism makes those four the least-checked reads in the repository, since a guard cannot see inside a string and their`notSoftDeleted`is by convention. This task changes the mechanism, not the purpose:`existsIn(table, where)`beside`selectFrom`, on the same `db`, ANDing `notSoftDeleted(table)`itself and returning`SQL`rather than a builder; the guard counts two`.select(`calls, both in`select.ts`, one per named body, and asserts `existsIn`carries the filter;`existsIn`joins`INTERNAL`. `Derived`sources and`union all` arms stay raw and the doc says why.
>
> _Acceptance criteria:_
>
> - `existsIn` exists in `select.ts`, applies `notSoftDeleted` by construction, returns `SQL`, and is in the guard's `INTERNAL` list; the guard asserts exactly two `.select(` calls in the folder, both in `select.ts`, one in each of `selectFrom` and `existsIn`, and that `existsIn`'s body calls `notSoftDeleted(`
> - The four raw `exists (select 1 …)` fragments are gone; every direct-id denial test over those finders still passes, and each still fails with `existsIn`'s filter removed (the mutation check is recorded in the PR body)
> - No `sql\`… is null\``remains where`isNull()` serves; the compendium-tier predicate has one definition
> - Every `sql\`` left in `src/db/repository/`is one a reviewer can justify from`db.md` "Where queries may be built", which gains the list of what has no builder and what a rule requires; a fragment that is not obviously one of those carries a one-clause comment
> - `db.md` "Soft-delete filtering" and "Spell visibility", the four finder comments and CLAUDE.md rule 4's text describe the two-builder guard; `tests/db/repository/*` and the ingredient/spell/membership tests are green

**Files it touches (for the estimate):** `src/db/repository/{select,shapes,spells,memberships,ingredients,provisional-users,vocabularies,common-names}.ts`, `tests/guards/soft-delete-finder-guard.test.ts`, `claude-docs/db.md`, `CLAUDE.md`, `TASKS.md`.

---

## MB.101 — the second task to mint

**Title:** `MB.101 — One inserter for an ingredient and its children in tests` · **2h** · type Bug · milestone `Wave 08 — Compendium and admin` · label `tracked`.

**Placement:** Wave 8, after MB.100 and before MB.81 / M8.2 — M8.2's and M5.2's tests are the next to seed ingredients, and should call the inserter rather than add an eighteenth copy.

**Entry text** (beside MB.100's in `TASKS.md`; the issue body):

> _Story:_ As a developer, I want a test to seed an ingredient with its folk names and categories in one call, so that the seventeen files that each hand-roll the insert stop drifting from each other.
>
> M4.8's review asked whether test setup should go through `withAudit` rather than the raw `postgres` client. It should not, and this task records why while fixing what the question found. The raw client is the right default for setup: it does not depend on the code under test, the writer refuses states setup needs — an already-deleted row, an un-delete, a backdated stamp, a Better Auth row — and a compendium ingredient cannot be written through `withAudit` at all (`write.insert` rejects `ingredients` as `WorkspaceScoped`; `insertInWorkspace` fills the column from the proof). The seed is the one sanctioned writer outside `withAudit`, and a test inserter is the same kind of thing. What is wrong is the duplication: every ingredient-family service, loader and GraphQL test carries its own `addIngredient` with slightly different columns, and `makeIngredient()` carries `folkNames` and `categories` that nothing inserts. One `insertIngredient(sql, fixture, author)` in `tests/support/db/` writes the row, its folk names and its category links (names resolved to ids through the seeded `categories`), stamps `created_by`/`updated_by` from `author`, and publishes `app.current_user_id` in its transaction the way the seed does, so a v2 history trigger records the author rather than nothing. `testing.md` states the convention: setup rows go through the raw client and the shared inserters; a test whose subject is the write path uses `withAudit`.
>
> _Acceptance criteria:_
>
> - `tests/support/db/insert-ingredient.ts` (or beside `probe-tables.ts`) exports `insertIngredient`, takes an `IngredientFixture` and an author id, writes ingredient + folk names + category links in one transaction with the GUC published, and returns the row's id; its own test covers a compendium row, a workspace row, and a category name the seed does not hold (a thrown error naming it, never a silent skip)
> - The ingredient-family tests — `ingredients/services/{common-name-suggestions,common-names-plan,duplicates,duplicates-plan}`, `ingredients/loaders/ingredient-children`, `ingredients/graphql/common-names`, `vocabulary/services/{form-suggestions,suggestions}`, `vocabulary/graphql/{form-suggestions,suggestions}` — seed through it; no file under `tests/modules/` still carries a private `insert into ingredients`
> - Schema tests and `tests/db/` are untouched: their raw inserts are the subject or the mechanism, and the entry says so
> - `testing.md` "Fixture factories" states the convention in one paragraph and links the inserter; CLAUDE.md's Testing section gains one line
> - Coverage is unchanged or higher; `npm run test:coverage` green

**Files it touches:** `tests/support/db/insert-ingredient.ts` (+ its test), the eleven test files named, `claude-docs/testing.md`, `CLAUDE.md`, `TASKS.md`.

---

## Execution steps (after approval)

0. **First, ship M4.8 as it stands:** commit the branch's work (the loaders, finder, shape, guard pins, docs and the stored plan copy — with the `isNull` fix) and open its PR through `/create-pr`. Only then start on the minting below.
1. **Re-check the next free id** — `MB.100` today on both the board and `TASKS.md`; another session may take it.
2. **`TASKS.md`**, in one pass: the entry above after MB.99's; a row in the MB summary table (`| MB.100 | Raw SQL only where a rule or the planner needs it | Wave 8 | M8.2, M5.1 |`); `M4.8 · MB.100 · MB.81` in the Wave 8 row of the execution-order table, with a clause in the reasoning column ("**MB.100 follows M4.8**: the review that found the copied predicate, and the sweep-task rule — `existsIn` lands before M8.2's and M5.1's finders so they adopt it rather than retrofit").
3. **Mint:** `gh issue create --title "MB.100 — Raw SQL only where a rule or the planner needs it" --type Bug --label tracked --milestone "Wave 08 — Compendium and admin" --body-file <notes>`, then `node scripts/task-board.mjs estimate MB.100 3`, then patch the Wave 08 milestone description (`M4.8 · MB.100 · MB.81` in the id list, plus the reasoning clause). If auto mode refuses the `gh` writes, I hand you the three commands rather than retry.
4. **MB.101** in the same pass: entry after MB.100's, summary row (`| MB.101 | One inserter for an ingredient and its children in tests | Wave 8 | M8.2 |`), `M4.8 · MB.100 · MB.101 · MB.81` in the execution order and the milestone description, issue, estimate 2.
5. **Memory:** save the standing preference — raw SQL only where it maintains a rule or improves performance — as a feedback memory, since it applies to every later task.
6. `npm run format:check` and `npm run lint` on the doc diff (doc-only change). The `TASKS.md` edit is committed onto the M4.8 branch as a follow-up commit and pushed, so the open PR carries it, and the PR body is edited to name it as the sub-hour change it is (MB.31) — the minting is what makes the board and the doc agree, and the PR is where the review that prompted it happened.

## Verification

- `node scripts/task-board.mjs find MB.100` and `find MB.101` each return one issue with the milestone, type and label above and estimates of 3 and 2.
- `TASKS.md` and the milestone description list the same Wave 8 order.
- `tests/guards/doc-citation.test.ts` passes (the entry cites only paths that resolve).
