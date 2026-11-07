# Raw SQL: a follow-up task, and two assessments

**Status:** decided and built. Only the decisions, the reasons and what they rule out are kept here.

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
