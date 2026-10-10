## The finder convention

The repository splits on the table's own shape, the way it already splits
`softDelete` from `delete`:

| The table                                                              | Reads                                                                                                                | Writes                                                                                                                               |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| carries `workspace_id`                                                 | `findManyInWorkspace` / `findOneInWorkspace` / `findOneByIdInWorkspace`, proof first                                 | `insertInWorkspace`, `updateInWorkspace`, `updateByIdInWorkspace`, `softDeleteInWorkspace`, `softDeleteByIdInWorkspace`, proof first |
| carries a nullable `workspace_id` (`ingredients`, its retired slugs)   | the scoped reads above, the named compendium finders, and `findIngredientsInSpellsIncludingSoftDeleted`, proof first | the scoped writes above, and `insertInCompendium`, `updateByIdInCompendium`, `softDeleteByIdInCompendium`, `SiteAdmin` first         |
| carries `visibility` (`spells` alone)                                  | `findManySpells` / `findOneSpell`, proof first                                                                       | the workspace-scoped writes above                                                                                                    |
| carries `spell_id` (the two spell join tables)                         | `findManyInSpell`, proof first                                                                                       | `insert`, `update`; a layer `updateById`, `softDelete`, `softDeleteByIds`; a category link `delete`                                  |
| carries `ingredient_id` and no `workspace_id` (folk names, categories) | `findManyOfIngredients`, proofs first; `findManyOfSpellIngredientsIncludingSoftDeleted`, proof first                 | `insert`, `update`, `softDelete` / `softDeleteByIds` / `delete`                                                                      |
| marked `namedWrites` (the pause ledger, the admin invitation)          | its named finders, and those its shape admits: the mark governs writes only                                          | its own named writes only; every generic write above and below refuses it (MB.198)                                                   |
| none of those                                                          | `findMany` / `findOne` / `findOneById` / `findManyByIds` / `findManyIncludingSoftDeleted`                            | `insert`, `update`, `updateById`, `softDelete`, `softDeleteByIds`, `delete`                                                          |

A marked table is decided by its schema file rather than by a column: the
mark is how a table says it takes only the calls named for it
(["Table marks"](write-path.md#table-marks-mb198)), and it holds
whatever the table's columns are, so a marked table with a `workspace_id`
is off the scoped writes as well.

`{ workspaceId: AnyPgColumn }` and `{ workspaceId?: never }` are the two
constraints, so each finder admits exactly one of the two sets and a table
cannot go through the wrong one. The spell rows are M10.3's, added by
excluding `visibility` and `spell_id` from the finders above and below them:
["Spell visibility"](spell-visibility.md). The ingredient-children row is
M4.8's, added the same way by excluding `ingredient_id` from the unscoped
finders: ["Ingredient children"](ingredient-children.md). A scoped finder ANDs `workspace_id =
membership.workspaceId` onto the query **itself** rather than trusting a
`workspaceId` beside the proof — a second source is a second thing to
disagree — and `insertInWorkspace` fills the column from the proof for the same
reason, which is why its `values` type has `workspaceId` removed the way it has
the audit columns removed. `updateInWorkspace` cannot reassign it either, so a
row cannot be moved between workspaces by an update.

`findManyIncludingSoftDeleted` takes the unscoped side: v1 has no restore UI
and the trash view is v2, so the task that adds one adds its proof-scoped
counterpart then rather than leaving a widened hatch waiting. It is one of
three hatches: the other two read what a spell holds past an ingredient's
tombstone, proof first
(["What a spell holds"](spell-visibility.md#what-a-spell-holds-m53)).

**`ingredients` is on the scoped side, so its compendium tier has no generic
finder.** The column is nullable — `workspace_id IS NULL` is the
compendium, everything else is a workspace's own — so the table matches
`{ workspaceId: AnyPgColumn }` and `findMany(ingredients)` does not compile.
The reads of it so far are `findSimilarIngredients` (see
["Fuzzy matching"](fuzzy-matching.md)), `findVocabularySuggestions` and
`findCommonNameSuggestions` (see ["The member's autofill"](member-autofill.md)),
`findManyOfIngredients` through the parent of a folk name or a category link
(see ["Ingredient children"](ingredient-children.md)), and
`findIngredientsInSpellsIncludingSoftDeleted` through a spell holding it (see
["What a spell holds"](spell-visibility.md#what-a-spell-holds-m53)), each naming
both tiers as explicitly as this paragraph asks, and each listed on
[the tier seam](../modules.md#the-tier-seam). The plain compendium read is
`findCompendiumPage` (M8.5), with its count `findCompendiumCount` (MB.105),
each ANDing `inCompendium` as explicitly as the scoped finders AND their proof, and `findOneIngredient` reads one row in the
compendium or a proof's coven (["The compendium read"](compendium-read.md)), and
`findCompendiumEntryByIdentity` (M5.2) reads the entry holding an identity
(["Compendium writes"](compendium-writes.md)); the local-beats-compendium
resolution (§5) wants both tiers under an anti-join and
is a further named finder, M8.3's. The point of the narrowing is that a read
of that table has to say which tier it means instead of getting whichever the
default was.

`findOneById` and `findManyByIds` are the read-side twins of `updateById`: a
service cannot build `eq(table.id, id)` or `inArray(...)` (MB.33), and a
by-id read, one or batched for a loader, is what nearly every service needs.
They sit on the unscoped side only; the workspace-scoped by-id read is
`findOneByIdInWorkspace` (M8.2), the read-side twin of
`updateByIdInWorkspace`, which ANDs the id onto the proof’s own clause. `findManyByIds` answers an empty list
without a query.
