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
`findSubstitutesIncludingSoftDeleted(memberships, of, ids)`** (MB.140; `of`,
`'ingredient'` or `'variant'`, since MB.218).
It reads the same rows `findManyOfIngredients` would, the parent's `EXISTS`
and tier included, and left-joins each row's linked ingredient, deleted or
not, so a link to a deleted ingredient reads under its last name (DESIGN.md
§5, `ingredient_substitutes`). The `EXISTS` also holds the link to the
compendium or the parent's own coven, the tier rule a write is held to, so a
row written past the service reads as nothing. With `of: 'variant'` the ids
are variants, and the parent is read as `findManyOfVariants` reads it (below).
It is the substitute's
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
(MB.167), in `services/ingredient-rows.ts`, which `writeChildren` calls in the
ingredient's `withAudit` transaction (MB.211), after `resolvePicks` has checked the
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

**References have one too, `findReferencesOf(memberships, 'ingredientId',
ingredientIds)`** (MB.153; the key since MB.208, which reads any sourced
table's links). It reads each live link beside the live
reference it cites in one statement, through the same left join, and holds
the reference to the compendium or the parent's own coven inside the
parent's `EXISTS`, so a link written past the service's tier rule, or one
to a soft-deleted reference, reads as nothing. It is no hatch: every row it
answers is live. A variant's links, `'ingredientVariantId'`, are read the same
way through `inUseVariantParent` (MB.218, M12.24): the registry gave the column
(MB.217), and the finder's one branch per parent table gives the tier, since a
variant is a coven's where its ingredient is though it carries no
`workspace_id`; read as global reference data, a coven's variant's links
would answer anyone. `replaceReferenceLinks` compares against what it answers,
so a link the ingredient does not show is left in place for a restore to
return ([`references.md`](references.md)).

**A save brings the category pairs to the set sent, through
`replaceCategories`** (MB.125), beside `replaceDeities` and called the same
way. `resolvePicks` first holds each id to a live category — an id naming
none, or a soft-deleted one, is a field error at `['categoryIds', i]`, in
either tier — and files a repeat once. The pairs it compares are the ones
`categoriesOf` shows, so a pair whose category is soft-deleted is left in
place for a restore to return, as a reference link is. A pair still listed is
not written, and keeps the stamps of whoever filed it; one dropped is
hard-deleted through `write.delete`, the table carrying no tombstone
([`hard-delete-join-tables.md`](hard-delete-join-tables.md)); one new is
inserted, stamped from the session.

**A variant's own rows, and the union rule** (MB.218). A category pair or a
substitute that one form of an ingredient owns carries its `variant_id`
beside the `ingredient_id` (MB.217), and a reference link its
`ingredient_variant_id` alone. `findManyOfVariants(memberships, table,
variantIds)` reads a form's rows under `inUseVariantParent(memberships,
variantColumn, heldBy)`, beside `readableIngredientParent` in `ingredient-parent.ts`:
an `EXISTS` over the live variant, holding an `EXISTS` over its readable
ingredient. Never by the variant's bare id, which carries no tier. Through the
variant rather than the row's own `ingredient_id`, so a soft-deleted form
hides its rows, which stay for a restore. `findManyOfIngredients` reads an
ingredient's own rows only, `variant_id IS NULL` (`ownedByIngredient` in
`predicates.ts`, decided by the table's shape as `notSoftDeleted` is), so
`Ingredient.categories` and `Ingredient.substitutes` never answer a form's
additions and a save comparing against them never drops one. Nothing merges
the two lists on read: a client shows a form's beside its ingredient's
(DESIGN.md §5, the union rule).

**Nine services and nine loaders over them**, in `ingredients`:
`categoriesOf`, `folkNamesOf`, `substitutesOf`, `deitiesOf` (MB.167),
`referencesOf` (MB.153) and `variantsOf` (MB.218), and a variant's
`categoriesOfVariants`, `substitutesOfVariants` and `referencesOfVariants`
(MB.218), in `services/ingredient-children.ts`, batched as
`categoriesByIngredient`, `folkNamesByIngredient`, `substitutesByIngredient`,
`deitiesByIngredient`, `referencesByIngredient` and `variantsByIngredient`, and
`categoriesByVariant`, `substitutesByVariant` and `referencesByVariant`
([`graphql/loaders.md`](../graphql/loaders.md), "Loaders"). A key is the parent
row's `{ id, workspaceId }`, a variant's `{ id, ingredientId, workspaceId }`,
its ingredient's tier carried on the row `variantsOf` answers. The
`workspaceId` decides which proof to ask for,
one `assertMembership(…, { ingredient: ['read'] })` per coven the batch names,
and a coven the caller may not read answers `Forbidden` in its own keys' slots
while the rest of the batch stands. It is never the scope. A key that lies about
its tier gets zero rows, because the `EXISTS` reads the parent's real one. So a
workspace entry's children are refused by three layers, each sufficient alone:
the check, the SQL, and the type above. `tests/modules/ingredients/loaders/`
asserts the first two by direct id, each with its precondition, and each fails
with its layer removed.

Folk names come back as `{ id, name }`, as §7's `folkNames: [FolkName!]!`
exposes them (the id is what `promoteFolkName` names, M12.1); categories come back as rows, with a soft-deleted category
dropped by `findManyByIds`; substitutes come back as §7's `Substitute`, the
name each shows and the live ingredient it leads to, or null; deities come
back as §7's `IngredientDeity`, the name and the curated deity, or null;
variants come back as their rows, each carrying the tier of the key it was
read under, which a variant's own children's loaders ask a proof for (MB.218).
Each list is sorted by name, but the deities, which keep the order entered by
`position`, and the variants, sorted by form, case aside. The cost is one read
each for folk names, substitutes, deities and variants, and two for categories, plus one role lookup per coven in the batch, whatever the
number of ingredients.

**MB.215: variants are a child, with children of their own.** `ingredient_variants`, an ingredient's forms, is `IngredientScoped` and read through `findManyOfIngredients` under the parent's tier like the tables above (MB.216). A variant's own categories, substitutes and references carry its `variant_id` beside the `ingredient_id` (MB.217), and MB.218 reads them through `readableVariantParent(memberships, variantColumn)`, beside `readableIngredientParent` in `ingredient-parent.ts`, which reaches the parent ingredient through the variant, and through `findManyOfVariants(memberships, table, variantIds)`, built on it and never by a bare id. `findSubstitutesIncludingSoftDeleted` gains `of: 'ingredient' | 'variant'`, and a variant's references come through `findReferencesOf(memberships, 'ingredientVariantId', ids)`. Four services join the five — `variantsOf`, sorted by folded form, `categoriesOfVariants`, `substitutesOfVariants` and `referencesOfVariants` — each through `admit()`, keyed `{ id, ingredientId, workspaceId }`, with their loaders in the record `clearIngredientChildren` clears. An ingredient's own lists are its rows with no variant, and nothing merges a variant's into them: a form adds to its ingredient (DESIGN.md §5, the union rule).

## Ingredient row writes

`src/modules/ingredients/services/ingredient-rows.ts` holds what an ingredient write does the same way in either tier. It is internal to the module: the two services import it and the index does not. A tier is told by `memberships`, as the repository's two-tier finders take it: none for a compendium entry, the proof's coven for a coven's.

- **Columns.** The parsed input becomes columns with every optional one written, `null` where the input has nothing, so an update replaces the row rather than merging into it. The slug is derived from the label and the formal name (`src/lib/slugify.ts`), never sent beside them. There is no form column: an entry's forms are its variants, written by `writeChildren`.
- **`writeChildren`.** It writes folk names, substitutes, deities, references, categories and forms, in that order, each form with its own substitutes, references and categories, all in the caller's `withAudit`. `'add'` is a new row's and reads nothing first; `'replace'` brings each list to exactly the input's. A seventh child table is its writers in this file, a line in each branch, and its list in `splitChildren` and `IngredientChildren`; neither service is edited. The ingredient's own rows are the ones with no variant, beside its forms' rows.
- **The parent's `updated_at`** says the entry changed, so a child list that changed moves it and a save that changed nothing leaves it. `watchWrites` wraps `write` and notes whether any call answered a row, since each `replace…` leaves an unchanged list unwritten.
- **Picks (`resolvePicks`).** Picks are checked against the vocabularies before the write, on another connection, so an admin retiring a row at the instant a member picks it can see the pick written. A form's `formId` must name a curated form, live and under a live group, and the text beside it folds to that form's name and is written in its spelling; on the compendium every form must be such a pick. A pick sent without its id is kept as its text. A deity picked anew must name a curated deity and is written in that deity's spelling. A deity the ingredient already `held` is kept on a coven's ingredient after the deity is retired, under the name it was saved with, and so is the typed name sent back for it; picks are resolved first, so a typed name can claim only a retired pick no entry sent by id. Every deity on a compendium entry must be a curated pick, held or not. Each category, the ingredient's and each form's, must name a live one in either tier, and one named twice is filed once.
- **Deities (`replaceDeities`).** A pick matches by the deity it links and a name as written. An entry still listed keeps its row and takes its new `position`, one dropped is soft-deleted, a new one is inserted, and a list that changes nothing writes nothing. Dropped rows go first, so a name re-added in another case clears the case-folded index. `ingredient_deities_position_unique` is checked per row, so moving rows go through a scratch offset above every live position, then to their own (claude-docs/db/grimoire.md), never by tombstone and re-add. A kept pick takes its curated row's spelling if it was renamed.
- **Categories (`replaceCategories`).** A pair still listed is left as it is, its stamps the first filer's; one dropped is hard-deleted, as a chip toggled off leaves no row; a new one is inserted, stamped from the session. The pairs compared are the ones the owner shows, so a pair whose category is soft-deleted stays for a restore to return. A form's pairs carry its ingredient too, so a delete names the owner's variant, `null` for the ingredient's own, and neither touches the other's.
- **Folk names, substitutes, references.** Folk names compare as written (a change of case is a new name). A substitute matches by the ingredient it links and a name as written; a reference link by the reference it cites. A listed entry keeps its row and takes the sent value, a dropped one is soft-deleted, a new one is inserted. A link to a soft-deleted ingredient or reference that is already held stays, for a restore. A new link, or a new form on a held substitute, is held to `refuseUnlinkable` or `refuseUncitable`; a held one is not checked again. A link names one sourced row, the ingredient or one of its forms. Dropped rows go first throughout.
- **Link rules.** A substitute's target must be a live ingredient the writer's own scope reads (the compendium, and the proof's coven for a coven write), and not the owner itself with the same form, while a sibling form may stand in; a form it names must be a live form of the ingredient it links (DESIGN.md §5, "A substitute links only what its ingredient's readers may read"). A reference must be live in the same scope (DESIGN.md §5, "A link names only what its row's readers may read"). An id that names nothing reads as one in another coven does, since that coven's contents are private.
- **Forms (`replaceVariants`).** An entry keeps the row its `id` names when the ingredient holds it, and otherwise the row its form folds to, `lower(btrim(form))` as the unique index folds it, so a form can be respelt in place. A row no entry keeps is soft-deleted with its children left for a restore; a kept row is rewritten only where a column differs; a new one is inserted with its children. An id the ingredient does not hold falls back to the form. Order is dropped, then kept, then new, so a form handed from one row to another clears the unique index first. A list the input leaves out (`undefined`) and a row holding none (`null`) are the same answer; read as different, every save would rewrite every form.
- **Unique-index errors.** `ingredient_variants_form_unique` is mapped to a `ValidationError` on that entry's `form` in `writeVariant`, since only it knows which entry it wrote. An identity collision (a second ingredient under a formal name the coven holds) is reported on `canonicalName`, or on `name` for an entry with none, naming the holder and pointing at adding the form to it. It is read after the write rolled back and reported whichever index Postgres names, since the label and address indexes are older than the identity one.
- **Deleting.** `removeIngredient` soft-deletes through its tier's writer and leaves the children, so a spell holding the ingredient still reaches them (claude-docs/db/spell-visibility.md, "What a spell holds"). An id that is not a uuid is `NotFound` before the write.
