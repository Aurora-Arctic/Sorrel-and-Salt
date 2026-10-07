# MB.125 — `write.delete` names its rows by value, and the join tables stay hard-deleted

**Status:** decided · **Date:** 2026-10-07

MB.125 is the first service to remove an `ingredient_categories` pair, and
found the writer's hard delete uncallable from where it is needed. The owner
settled two things while it was built: how `write.delete` takes its rows, and
whether the two category join tables should stay hard-deleted at all. DESIGN.md
§5 ("Audit columns — on every table, and the join-table exception") and §14
carry the results; this record carries the alternatives.

## Decided

**`write.delete(table, match)` takes column values.** `match` maps each column
to a value, or to a list the column must be in:
`write.delete(ingredientCategories, { ingredientId, categoryId: [...] })`. A
list left empty deletes nothing without a statement; a match naming no
column, or a key that is not one of the table's columns, throws. The type
constraints MB.34 gave the method — no `deleted_at`, no `workspace_id` — are
unchanged, and the writer keeps its twenty methods.

- _Why not keep `where: SQL`:_ a service may not import `drizzle-orm` at
  runtime (MB.33), so it cannot build the predicate. Until MB.125 the
  method's only callers were tests — MB.33 had made MB.34's escape hatch
  unreachable from the code it was written for.
- _Why not a named `deleteIngredientCategories`:_ `tests/db/repository/write.test.ts`
  treats a twenty-first writer method as a decision, and every named one so
  far exists because the generic methods could not or should not reach its
  table. Here the generic method already reaches the table and is typed for
  it; only its parameter was wrong. A named method would have papered over
  that, and `spell_categories` would have needed a second one.
- _Why only equality and `IN`:_ both hard-deleted tables are keyed on their
  pair, so naming rows by value covers every delete either needs, and the
  hatch is narrower than an arbitrary predicate.

**`ingredient_categories` and `spell_categories` stay hard-deleted** (MB.34
stands). MB.34's deciding argument was the `deleted_at IS NULL` a service
joining _through_ a soft-deleted join table would have to remember by hand.
`existsIn` (MB.100) has since ANDed a child's filter by construction for every
read through it, which is what let MB.110 soft-delete `spell_ingredients` — so
that argument no longer decides it. What does: a pair is a pairing, not
content. It holds no locator, position or typed text, so a removed pair is
restored by toggling the chip again, and a tombstone keeps nothing a restore
could return.

- _Why not soft-delete them now:_ it would buy a `deleted_by` on the row and
  one idiom across an ingredient's child writes. It would cost a surrogate
  key, partial unique indexes, the two delete columns, the `updated_at`
  trigger line and a destructive migration, for a row whose restore is a
  click. The v2 history trigger sees a `DELETE` with `app.current_user_id`
  beside it, so the actor is not lost.
- _Why `spell_ingredients`' reversal does not reach them:_ a layer is a record
  of a working (MB.110); an ingredient's or a spell's categories are a
  classification, corrected rather than kept.

**A pair whose category is soft-deleted survives a save.** `categoriesOf`
does not show it, so the form never sends it back, and `replaceCategories`
compares only the pairs it shows — as `replaceReferenceLinks` leaves a link to
a soft-deleted reference for a restore to return.
