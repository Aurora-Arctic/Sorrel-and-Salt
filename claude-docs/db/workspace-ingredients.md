## Workspace ingredients

A coven's own ingredients are written and read by four services in `ingredients`'
`services/workspace-ingredients.ts`: `createWorkspaceIngredient`,
`updateWorkspaceIngredient` and `deleteWorkspaceIngredient` ask `{ ingredient:
['create'] }`, `['update']` and `['delete']`, which stewards and practitioners
hold, and `getWorkspaceIngredient` asks `['read']`, which observers hold too. A site
keeper holds none of them, as everywhere in a coven.

**The tier is the proof's, so nothing here promotes a row to the compendium.**
`insertInWorkspace` fills `workspace_id` from the proof, `updateByIdInWorkspace`
cannot reassign it, and `LocalIngredientInput` strips a `workspaceId` a caller
smuggles in. The update and the read reach only a live row, and only through
`workspace_id = membership.workspaceId`, so a compendium entry's id, another
coven's or a soft-deleted ingredient's answers `NotFound`, the same as an id that
names nothing or is not a uuid (not a driver error). Naming a coven the caller is
not in answers `Forbidden` before any row is read, a coven id that is not a uuid
included (["What the check asks"](membership-proof.md#what-the-check-asks)).

**Every read that shows a coven ingredient beside the compendium's names both tiers
in one predicate.** `readableInTiers(memberships, ingredients)` in
`src/db/repository/predicates.ts` is the row live and in the compendium or a coven
one of the proofs names, and `readableIngredientParent`, in `ingredient-parent.ts`,
is the same test made of a child row's parent, for the folk names, categories,
deities, substitutes and references, which carry no `workspace_id` of their own. A
coven ingredient reaches another coven's reader through neither.

**A delete is soft, and frees what the ingredient held.**
`deleteWorkspaceIngredient` tombstones the row through `softDeleteByIdInWorkspace`,
with the update's reach: an id this coven does not hold live answers `NotFound`. Its
folk names, category links and stock row stay. A spell holding the ingredient still
reaches it (["What a spell holds"](spell-visibility.md#what-a-spell-holds-m53)), and
nothing else reads past a deleted parent — stock included, whose reads go through a
live ingredient. The service test's `READS` table asks every exported read a member
reaches the coven's ingredients through whether it shows the ingredient, before the
delete and after, so the table is where each reader's soft-delete filter is proved
and no reader's own test carries a one-off. It then brings back its label, its
formal name under another label and the whole ingredient at its old address, each
refused while it was live. Inside a coven the label is unique too, so there a label
coming back does prove its index's predicate. Its mutation is `deleteIngredient`
([`graphql/schema.md`](../graphql/schema.md), "The workspace ingredient
mutations").

**The input is the whole ingredient**, as `IngredientForm` submits it, parsed again
by the service with `parseInput` because the browser is not the only caller. An
update therefore replaces the row: every optional column is written, `null` where
the input has nothing. A merge would break the kind↔name CHECK, because a missing
`nomenclature` with no formal name parses to `none`, and `none` beside a kept
`canonical_name` is the row the CHECK refuses. Categories are not written here,
since `LocalIngredientInput` carries none. The service clears a field the input
leaves out; the `updateIngredient` mutation makes leaving one out a schema error and
clearing an explicit `""` or `[]` ([`graphql/schema.md`](../graphql/schema.md), "The
workspace ingredient mutations").

**Folk names are written in the ingredient's own `withAudit` transaction**, never in
a second round trip. A create inserts each one. An update diffs the list against the
live rows, read through `findManyOfIngredients` under the proof, comparing names as
written: a name still listed keeps its row and its `created_by`, a dropped one is
soft-deleted through `softDeleteByIds`, a new one is inserted. The tombstones go
first, so a name re-added in another case clears the case-folded unique index before
the insert meets it. The service test asserts the one transaction by comparing
`xmin`.

**Promoting a folk name** swaps the display name with one of the ingredient's common
names, in one `withAudit` transaction, through `promoteFolkName`
(`services/promote-folk-name.ts`). A null `workspaceId` goes to the compendium's
`promoteCompendiumFolkName`, anything else to `promoteWorkspaceFolkName`. The
promoted row is soft-deleted before the old name is inserted, since the unique index
on `(ingredient_id, lower(name))` would otherwise refuse a name that differs only by
case. The old name is added once: a remaining common name that matches it in any
case is kept instead. `identity_key` is a generated column, so a row with a formal
name keeps its key and a row with none moves to the new name's; a clash with another
entry is refused through the tier's `refuseCollision` as a `ValidationError` at
`name`. The slug is derived from the name, so it moves either way. On the compendium
tier the old slug is retired for the 180-day redirect, and a new slug sitting under
another entry's live redirect is refused (`refuseEndingARedirect`) without offering
to end it. Coven slugs redirect nowhere. Keepers promote on the compendium, stewards
and practitioners on their coven's rows, and an observer is `Forbidden`.

**Every child is written by one call, the compendium's own.** Each write hands
`writeChildren` in `services/ingredient-rows.ts` its folk names, substitutes,
deities, references, categories and forms, `'add'` on a create and `'replace'` on an
update, under `[membership]`; the compendium's make the same call with none. A new
child table costs one writer, one loader and one input field, and no edit to this
service or its mutations (["Compendium writes"](compendium-writes.md) says which
three). A coven's ingredient takes its forms the same way: `variants` through the
same `writeChildren` call, matched by id and then by folded text, each with its own
substitutes, references and categories. A coven's form is free text, an uncurated
one included, its pick checked only when one is sent. A substitute may name one form
of the ingredient it links, `substituteVariantId`, which must be a live form of that
ingredient in the writer's scope, refused on that field otherwise; a form's own link
must name one, which the schema refuses before the service reads anything
([`validation.md`](../validation.md)). A form may not stand in for itself, though a
sibling may.

**The slug follows the label and the formal name**, not the form. `slug` is `NOT
NULL`, so a create writes `ingredientSlug` of the two, through `ingredientColumns`,
and an update writes it again from the new values. Nothing redirects from the old
one: no route reads a coven ingredient's slug, so slug retirement is the
compendium's alone (["Ingredient slugs"](ingredient-slugs.md)).

**A collision is a `ValidationError` on the field that caused it**, never the raw
index error. The service catches the write's failure and reads the index name off it
with `violatedUniqueIndex` (`src/lib/unique-violation.ts`), which walks the error's
`cause` chain for SQLSTATE 23505 without importing the database layer, since a
service may not (MB.33). The label index lands on `name`, and so does the identity
index (`ingredients_workspace_identity_key_unique`, the formal name alone) for an
entry with no formal name, whose label is its identity. With a formal name, the
identity index lands on `canonicalName`. The slug index lands on `name`, naming the
address, on a create or on an update that moves the slug. Catching the failure rather
than checking first is deliberate: a check-then-write leaves a window for a
concurrent save, and the index is the one arbiter either way. An identity collision
names the ingredient already holding it, through `findWorkspaceIngredientByIdentity`
under the proof — the coven-scoped twin of the compendium's finder (["Compendium
writes"](compendium-writes.md)) — and points at adding the form to it; the label and
address indexes are older than the identity one, so an oil written under the herb's
own label meets one of them first, and those branches look for an identity holder
before their own message.

**A coven's identity is the formal name alone** (`identity_key`, unique per coven
through `ingredients_workspace_identity_key_unique`, or the `name` for an entry with
no formal name). A second form of a plant the coven already holds is a variant of
that ingredient, not an entry beside it, and the slug drops the form (["Ingredient
slugs"](ingredient-slugs.md)). Stock names a variant: `addIngredientToWorkspace(variantId)`,
one live stock row per coven and variant
([`ingredients.md`, "An ingredient and its forms"](../design-decisions/ingredients.md#an-ingredient-and-its-forms)).

**A save moves no jar.** The three saves assert only `ingredient` permissions and
take no stock lock (["A save never moves a jar"](stock.md)).

## Workspace ingredient service details

`src/modules/ingredients/services/workspace-ingredients.ts` writes a coven's own ingredients.

- **Create** is refused when the input collides with another of the coven's ingredients or a label it gave a compendium entry, picks a form or deity no curated row holds, files the ingredient under no live category, or links a substitute or cites a reference outside the compendium and this coven.
- **Update** keeps a folk name, substitute, deity, reference, category or form still listed with its row; one dropped is soft-deleted, and a category's is hard-deleted. A form keeps its own children when dropped.
- **Swap** keeps a row with a formal name on its identity key; one without moves it, and may meet another entry's.
- Delete, get and the writes answer `NotFound` for the compendium's and other covens' ingredients and for an id that is not one.
