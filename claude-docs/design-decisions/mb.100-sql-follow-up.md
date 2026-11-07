# Correlated subqueries go through `existsIn`, not raw SQL

**Status:** decided. Live home: `claude-docs/db/soft-delete.md`, "Soft-delete filtering and the partial-index convention"; the code is `existsIn` in `src/db/repository/select.ts`.

## Decision

- **The rule's purpose stays: no read leaves `select.ts` unfiltered.** Its mechanism changes from "exactly one `.select(`" to two named bodies.
- **`existsIn(table, where): SQL` in `select.ts`** is built on the same `db` and ANDs `notSoftDeleted(table)` itself. It returns `SQL`, not a builder, so a caller cannot add `.limit` or execute it. `notSoftDeleted` returns `undefined` for a table without the column (`accounts`, join tables) and `and()` drops it. `existsIn` joins `INTERNAL`, so the repository index can never re-export it.
- **`tests/guards/soft-delete-finder-guard.test.ts` counts two `.select(` calls, both in `select.ts`, one in `selectFrom` and one in `existsIn`**, and asserts `existsIn`'s body contains `notSoftDeleted(`.
- **Correlated `EXISTS` subqueries use `existsIn`** (`findManyInSpell`, `findMembershipsOfUsers`, `findManyOfIngredients`, `deleteProvisionalUsers`), not a raw `sql` string.
- **What stays raw:** `Derived` sources and `union all` arms (pg_trgm, `mode() within group`, window functions). There is no builder for those, and `selectFrom` already reads a `Derived` through its one call.

## Why

The guard cannot see inside a string, so the raw subqueries were the least-checked reads in the folder: each remembered its own `notSoftDeleted` or `readableSpells` by convention, and the comment citing the guard as the reason for the string was the rule producing what it was meant to prevent. Drizzle's `exists(subquery)` takes an un-executed `db.select().from(t).where(…)`, which renders as `(select …)`, and correlates because Drizzle qualifies columns by table. The filter becomes enforced by construction.

## Rules out

- Raw `exists (select 1 from …)` strings in finders.
- Returning a builder from `existsIn`.
