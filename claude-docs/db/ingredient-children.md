## Ingredient children (M4.8)

`ingredient_folk_names`, `ingredient_categories`, `ingredient_substitutes`
(MB.139) and `ingredient_deities` (MB.165, read from MB.167) hang off an ingredient and carry no `workspace_id` of their own, so
by column name they look unscoped while holding a coven's rows. They take the tier of their parent: a compendium
entry's children are public (MB.80), and a workspace entry's are its coven's.
The shape is the one M10.3 gave the spell join tables. `{ ingredientId:
AnyPgColumn }` is `IngredientScoped`, and the unscoped finders demand `{
ingredientId?: never }`, so `findMany(ingredientFolkNames)` does not compile
(`tests/db/repository/finders.test.ts` pins it with `@ts-expect-error`).
`inventory_items` carries an `ingredient_id` too, but also its own
`workspace_id`, so it never reached the unscoped finders to begin with.

**One finder, `findManyOfIngredients(memberships, table, ingredientIds)`.** It
returns the live child rows of those ingredients whose parent is live and is in
the compendium or in a coven one of the proofs names, a correlated `EXISTS`
built by `existsIn` for the reason `findManyInSpell` gives: the tier is decided
in SQL, and the parent's `deleted_at IS NULL` is the builder's rather than the
finder's. It takes a _list_ of proofs because one
page can hold both tiers and, in principle, several covens. An empty list reads
the compendium alone, which is how a signed-out request reads it. It reads both
tiers in one statement, so it is on [the tier seam](../modules.md#the-tier-seam).

**Substitutes have a finder of their own,
`findSubstitutesIncludingSoftDeleted(memberships, ingredientIds)`** (MB.140).
It reads the same rows `findManyOfIngredients` would, the parent's `EXISTS`
and tier included, and left-joins each row's linked ingredient, deleted or
not, so a link to a deleted ingredient reads under its last name (DESIGN.md
§5, `ingredient_substitutes`). The `EXISTS` also holds the link to the
compendium or the parent's own coven, the tier rule a write is held to, so a
row written past the service reads as nothing. It is the substitute's
`…IncludingSoftDeleted` hatch, beside M5.3's two for what a spell holds
([`soft-delete.md`](soft-delete.md)), and on the tier seam too. `replaceSubstitutes` reads the live rows it compares
against through `findManyOfIngredients`, since a write needs no linked
ingredient.

**Deities have a finder of their own too,
`findDeitiesOfIngredients(memberships, ingredientIds)`** (MB.167). It reads
the rows `findManyOfIngredients` would, tier and parent `EXISTS` included, and
left-joins each row's deity while it is curated — live, under a live tradition
— so a typed name, or a pick whose deity has since been retired, comes back
with no deity and reads as the name the row holds. It is not a hatch: the
retired deity is filtered as any finder filters it, and only the row is kept.
The rows come back unordered, and the caller sorts by `position`.

**A save brings the deity rows to the list sent, through `replaceDeities`**
(MB.167), in `services/ingredient-rows.ts`, which both services call in the
ingredient's `withAudit` transaction, after `resolvePicks` has checked the
picks against the vocabularies. A pick is matched to its row by the deity it
links, a typed name by its text, so an entry still listed keeps its row: the
dropped rows are soft-deleted first, so a name re-added in another case clears
the case-folded index; each kept row whose position changes moves to a
scratch offset one past the highest live position, then to its own, since
`ingredient_deities_position_unique` is checked per row, as a spell's layers
move ([`grimoire.md`](grimoire.md)); then the new rows are inserted. Nothing
is tombstoned for moving, and a list that changes nothing writes nothing. A
kept pick of a curated deity takes its current spelling; a held pick whose
deity is retired is kept, link and name, on a coven's ingredient, whether the
save sends back its id or its name
([`../design-decisions/mb.167-read-and-write-the-pick.md`](../design-decisions/mb.167-read-and-write-the-pick.md)).

**References have one too, `findReferencesOfIngredients(memberships,
ingredientIds)`** (MB.153). It reads each live link beside the live
reference it cites in one statement, through the same left join, and holds
the reference to the compendium or the parent's own coven inside the
parent's `EXISTS`, so a link written past the service's tier rule, or one
to a soft-deleted reference, reads as nothing. It is no hatch: every row it
answers is live. `replaceReferenceLinks` compares against what it answers,
so a link the ingredient does not show is left in place for a restore to
return ([`references.md`](references.md)).

**Five services and five loaders over them**, in `ingredients`:
`categoriesOf`, `folkNamesOf`, `substitutesOf`, `deitiesOf` (MB.167) and
`referencesOf` (MB.153) in `services/ingredient-children.ts`, batched as
`categoriesByIngredient`, `folkNamesByIngredient`, `substitutesByIngredient`,
`deitiesByIngredient` and `referencesByIngredient`
([`graphql/loaders.md`](../graphql/loaders.md), "Loaders"). A key is the parent
row's `{ id, workspaceId }`. The `workspaceId` decides which proof to ask for,
one `assertMembership(…, { ingredient: ['read'] })` per coven the batch names,
and a coven the caller may not read answers `Forbidden` in its own keys' slots
while the rest of the batch stands. It is never the scope. A key that lies about
its tier gets zero rows, because the `EXISTS` reads the parent's real one. So a
workspace entry's children are refused by three layers, each sufficient alone:
the check, the SQL, and the type above. `tests/modules/ingredients/loaders/`
asserts the first two by direct id, each with its precondition, and each fails
with its layer removed.

Folk names come back as strings, flattened as §7's `folkNames: [String!]!`
exposes them; categories come back as rows, with a soft-deleted category
dropped by `findManyByIds`; substitutes come back as §7's `Substitute`, the
name each shows and the live ingredient it leads to, or null; deities come
back as §7's `IngredientDeity`, the name and the curated deity, or null. Each
list is sorted by name, but the deities, which keep the order entered by
`position`. The cost is one read each for folk names, substitutes and deities,
and two for categories, plus one role lookup per coven in the batch, whatever the
number of ingredients.
