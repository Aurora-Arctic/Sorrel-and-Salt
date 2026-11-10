## Hard delete on two join tables

`ingredient_categories` and `spell_categories` spread `...auditStampColumns`
rather than `...auditColumns`: four stamp columns, a composite primary key, and
no `deleted_at`. A chip toggled off removes the row. `spell_steps` is not one of
them: it is soft-deleted (see the last section).

**Why these two** is DESIGN.md §5's argument ("Audit columns — on every table,
and the join-table exception"): a pair is a pairing, not content. It holds
nothing of its own — no locator, no position, no typed text — so a pair removed
is restored by toggling the chip again, and a tombstone would keep nothing a
restore could return. The four stamp columns stay, and `workspace_members` and
`ingredient_folk_names` keep the full six (§5). Soft-deleting them would buy a
`deleted_by` on the row and one idiom across an ingredient's child writes, and
cost a surrogate key, partial indexes and the delete columns, for a row whose
restore is a click. The v2 history trigger sees a `DELETE` with
`app.current_user_id` beside it, so the actor is not lost.

The `deleted_at IS NULL` that a join through a soft-deleted table would have to
remember is not an argument against soft delete here: every read through a child
table goes by `existsIn`, which ANDs the child's filter by construction.

**No `deleted_at` also means no partial unique index.** Rule 4's convention
exists so a tombstone cannot reserve a name forever, and a composite primary key
has no tombstone to dodge: the pair is either there or it is not, re-adding one
that was removed is an ordinary insert, and `WHERE deleted_at IS NULL` would not
compile against these columns.

**What makes it impossible to get wrong.** Two type constraints, both proved by
`@ts-expect-error` lines in `tests/db/repository/write.test.ts` (which fail
`npm run typecheck`, not `vitest`, if either is ever loosened):

- `write.delete` takes `PgTable & { deletedAt?: never }`, so hard-deleting a
  soft-deletable table does not compile.
- `write.softDelete` takes `PgTable & { deletedAt: AnyPgColumn }`, so it cannot
  be pointed at a hard-deleted join table, where it would emit an `UPDATE` that
  sets nothing.

**How a service names the rows.** `write.delete(table, match)` takes column
values — `{ ingredientId, categoryId: [...] }`, a list matching by `IN` — rather
than an `SQL` predicate, which a service may not build. A list left empty deletes
nothing without a statement, as `softDeleteByIds` does for an empty id list, and
a match naming no column throws rather than emptying the table. The stamps are
not columns to match on, and a join table keyed on its pair needs no comparison
but equality.

`findMany`/`findOne` read both shapes: the private `notSoftDeleted(table)`
returns the predicate when the table has a `deleted_at` and `undefined` when it
does not, and `and()` drops an undefined condition. The decision is made from the
table's own columns, never from an argument a caller supplies. The scratch table
`repository_probe_pairs` in `tests/db/repository/write.test.ts` exercises it: a
delete leaves no row, the same pair can be re-added afterwards, and a delete
rolls back with the rest of its transaction.
`tests/modules/ingredients/schema/join-tables.test.ts` runs one template over
both real tables: `write.delete` removes the row outright, and the pair can be
re-added afterwards by a different member, whose stamps the new row carries.

**Why not `spell_steps`.** A spell is a recipe that keeps what went into its jar,
so a layer taken out of it is recoverable like every other delete
([`data.md`, "A spell keeps the ingredients it holds, deleted or not"](../design-decisions/data.md#a-spell-keeps-the-ingredients-it-holds-deleted-or-not)).
What reads through a layer does so by `existsIn`, so no filter is left for a
service to remember. The cost is the surrogate key and the partial indexes, under
["Position is the identity"](grimoire.md#position-is-the-identity-and-what-that-costs-the-reorder)
in the grimoire.
