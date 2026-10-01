## Ingredient children (M4.8)

`ingredient_folk_names` and `ingredient_categories` hang off an ingredient and
carry no `workspace_id` of their own, so by column name they look unscoped
while holding a coven's rows. They take the tier of their parent: a compendium
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

**Two services and two loaders over it**, in `ingredients`: `categoriesOf` and
`folkNamesOf` in `services/ingredient-children.ts`, batched as
`categoriesByIngredient` and `folkNamesByIngredient`
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
dropped by `findManyByIds`. Each list is sorted by name. The cost is one read
for folk names and two for categories, plus one role lookup per coven in the
batch, whatever the number of ingredients.
