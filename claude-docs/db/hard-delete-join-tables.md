## Hard delete on two join tables (MB.34)

`ingredient_categories` and `spell_categories` spread `...auditStampColumns`
rather than `...auditColumns`: four stamp columns, a composite primary key, and
no `deleted_at`. A chip toggled off removes the row. `spell_ingredients` was
the third until MB.110 — see "Why not `spell_ingredients`" at the end of this
section.

**Why these two** is DESIGN.md §5's argument ("Audit columns — on every table,
and the join-table exception"): what decided it is the `deleted_at IS NULL`
every service joining _through_ a soft-deleted join table would have to
remember by hand — CLAUDE.md rule 4's mistake, in the one place the repository
cannot prevent it, since `findMany` filters the table it selects **from**. The
four stamp columns stay, and `workspace_members` and `ingredient_folk_names`
keep the full six (§5).

**No `deleted_at` also means no partial unique index**, on either.
Rule 4's convention exists so a tombstone cannot reserve a name forever, and a
composite primary key has no tombstone to dodge: the pair is either there or it
is not, re-adding one that was removed is an ordinary insert, and
`WHERE deleted_at IS NULL` would not compile against these columns.

**What makes it impossible to get wrong.** Two type constraints, both proved by
`@ts-expect-error` lines in `tests/db/repository/write.test.ts` (which fail `npm run typecheck`,
not `vitest`, if either constraint is ever loosened):

- `write.delete` takes `PgTable & { deletedAt?: never }` — a table carrying the
  column does not satisfy it, so hard-deleting a soft-deletable table does not
  compile.
- `write.softDelete` takes `PgTable & { deletedAt: AnyPgColumn }` — so it cannot
  be pointed at a hard-deleted join table, where it would emit an `UPDATE`
  that sets nothing.

`findMany`/`findOne` read both shapes: the private `notSoftDeleted(table)`
returns the predicate when the table has a `deleted_at` and `undefined` when it
does not, and `and()` drops an undefined condition. The decision is made from
the table's own columns, never from an argument a caller supplies, so there is
nothing to pass that would skip the filter where it applies. The third scratch
table in `tests/db/repository/write.test.ts` (`repository_probe_pairs`) exercises it: a delete
leaves no row, the same pair can be re-added afterwards with no partial index
to make it possible, and a delete rolls back with the rest of its transaction.

**Both are written.** `ingredient_categories` (M4.4, migration
`0009_amusing_ken_ellis.sql`) is the shape the other takes, and
`ingredient-categories-schema.test.ts` runs the same three assertions against
the real table rather than the scratch pair: `write.delete` removes the row
outright, the pair can be re-added afterwards — by a different member, whose
stamps the new row carries — and an ingredient's other categories are untouched.
`spell_categories` (M10.4, migration `0015_wooden_zaran.sql`) is the second,
and repeats those three assertions against its own table, so the shape is
proved where it is used rather than once in the abstract.

**Why not `spell_ingredients`** (MB.110). It was the third, and is
soft-deleted since `0029`: a spell is a record of a working, so a layer taken
out of it should be recoverable like every other delete
([`m5.3-spells-keep-deleted-ingredients.md`](../design-decisions/m5.3-spells-keep-deleted-ingredients.md)).
The deciding argument above does not reach it. What reads through a layer does
so by `existsIn` (MB.100), which ANDs the layer's `deleted_at IS NULL` by
construction, so there is no filter left for a service to remember. What it
cost is the surrogate key and the partial indexes, under
["Layer order is the identity"](grimoire.md#layer-order-is-the-identity-and-what-that-costs-the-reorder)
in the grimoire.
