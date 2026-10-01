## Hard delete on two join tables (MB.34)

`ingredient_categories` and `spell_categories` spread `...auditStampColumns`
rather than `...auditColumns`: four stamp columns, a composite primary key, and
no `deleted_at`. A chip toggled off removes the row. `spell_ingredients` was
the third until MB.110 — see "Why not `spell_ingredients`" at the end of this
section.

**Why these two.** They are the highest-churn tables in the schema, and
nothing in v1 reads a deleted join row — there is no restore UI, and the trash
view is v2. Soft-deleting them would cost a tombstone per toggle forever, a
partial unique index on each so the same pair could be re-added, and — the
argument that actually decided it — a `deleted_at IS NULL` that every service
joining _through_ the table has to remember by hand. That last one is the
mistake CLAUDE.md rule 4 exists to prevent, and the one place the repository
cannot prevent it for you: `findMany` filters the table it selects **from**, not
the tables it joins. The v2 history trigger records a `DELETE` as readily as an
`UPDATE`, so history is unaffected.

**What stays.** The four stamp columns: `created_by` on a join row answers "who
added this ingredient to this spell" (story 13). `workspace_members` keeps the
full six — who removed whom, and when, is worth keeping — and so does
`ingredient_folk_names`, which holds content rather than a link.

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
