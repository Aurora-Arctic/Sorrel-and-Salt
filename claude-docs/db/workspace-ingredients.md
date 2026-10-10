## Workspace ingredients (M8.2)

A coven's own ingredients are written and read by four services in
`ingredients`' `services/workspace-ingredients.ts`:
`createWorkspaceIngredient`, `updateWorkspaceIngredient` and
`deleteWorkspaceIngredient` ask `{ ingredient: ['create'] }`, `['update']` and
`['delete']`, which owners and members hold, and
`getWorkspaceIngredient` asks `['read']`, which viewers hold too. A site admin
holds none of them, as everywhere in a coven.

**The tier is the proof's, so nothing here promotes a row to the compendium.**
`insertInWorkspace` fills `workspace_id` from the proof, `updateByIdInWorkspace`
cannot reassign it, and `LocalIngredientInput` strips a `workspaceId` a caller
smuggles in. The update and the read reach only a live row, and only through
`workspace_id = membership.workspaceId`, so a compendium entry's id, another
coven's or a soft-deleted ingredient's answers `NotFound`, the same as an id that names nothing, and naming a
coven the caller is not in answers `Forbidden` before any row is read, a coven
id that is not a uuid included
(["What the check asks"](membership-proof.md#what-the-check-asks)). An
ingredient id that is not a uuid is `NotFound`, as `getIngredient` answers it,
rather than a driver error.

**Every read that shows a coven ingredient beside the compendium's names both
tiers in one predicate** (MB.206). `readableInTiers(memberships, ingredients)`
in `src/db/repository/predicates.ts` is the row live and in the compendium or
a coven one of the proofs names, and `readableIngredientParent` is the same
test made of a child row's parent, for the folk names, categories, deities,
substitutes and references, which carry no `workspace_id` of their own. A
coven ingredient reaches another coven's reader through neither, and
`tests/guards/soft-delete-finder-guard.test.ts` pins what each holds.

**A delete is soft, and frees what the ingredient held** (M5.3).
`deleteWorkspaceIngredient` tombstones the row through
`softDeleteByIdInWorkspace`, with the update's reach: an id this coven does not
hold live answers `NotFound`. Its folk names, category links and stock row stay.
A spell holding the ingredient still reaches it (["What a spell
holds"](spell-visibility.md#what-a-spell-holds-m53)), and nothing else reads
past a deleted parent — stock included, whose reads go through a live ingredient
(M9.3). The service test's `READS` table asks every exported read a member
reaches the coven's ingredients through whether it shows the ingredient,
before the delete and after — the read by id, with and without the coven
named; its folk names, categories, substitutes, deities and references; the
substitute picker, the duplicate warning, and the common-name, form, planet,
sign and deity suggestions — so the table is where each reader's soft-delete
filter is proved, and no reader's own test carries a one-off (MB.187). It then
brings back its label, its formal name under another label and the whole
ingredient at its old address, each refused while it was live. Inside a coven
the label is unique too, so there a label coming back does prove its index's
predicate. Its mutation is `deleteIngredient`
([`graphql/schema.md`](../graphql/schema.md), "The workspace ingredient
mutations").

**The input is the whole ingredient**, as `IngredientForm` submits it, parsed
again by the service with `parseInput` because the browser is not the only
caller. An update therefore replaces the row: every optional column is written,
`null` where the input has nothing. A merge would break the kind↔name
CHECK, because a missing `nomenclature` with no formal name parses to `none`,
and `none` beside a kept `canonical_name` is the row the CHECK refuses. Categories are not
written here, since `LocalIngredientInput` carries none. The service itself
clears a field the input leaves out. Its mutation, `updateIngredient`, makes
leaving one out a schema error and clearing an explicit `""` or `[]`
([`graphql/schema.md`](../graphql/schema.md), "The workspace ingredient
mutations").

**Folk names are written in the ingredient's own `withAudit` transaction**,
never in a second round trip. A create inserts each one. An update diffs the
list against the live rows, read through `findManyOfIngredients` under the
proof, comparing names as written. A name still listed keeps its row and its
`created_by`. A dropped one is soft-deleted through `softDeleteByIds`. A new
one is inserted. The tombstones go first, so a name re-added in another case
clears the case-folded unique index before the insert meets it. The service
test asserts the one transaction by comparing `xmin`: every row a
transaction writes carries its id.

**The slug follows the label, the form and the formal name.** `slug` is
`NOT NULL`, so a create writes `ingredientSlug` of the three, and an update
writes it again from the new values. Nothing redirects from the old one: no
route reads a coven ingredient's slug, so MB.82's retirements are the
compendium's alone (["Ingredient slugs"](ingredient-slugs.md)).

**A collision is a `ValidationError` on the field that caused it**, never the
raw index error. The service catches the write's failure and reads the index
name off it with `violatedUniqueIndex` (`src/lib/unique-violation.ts`), which
walks the error's `cause` chain for SQLSTATE 23505 without importing the
database layer, since a service may not (MB.33). The label index lands on `name`, and so does the
identity index for an entry with no formal name, whose label is its identity.
With a formal name, the identity index lands on `canonicalName`. The slug index lands on `name`, naming
the address, on a create or on an update that moves the slug. Catching the failure rather than checking first is deliberate: a
check-then-write leaves a window for a concurrent save, and the index is the
one arbiter either way. The message names what the input asked for, not the
row already holding it. The compendium's writes do name the holder, through a
finder that builds the key from the values
(["Compendium writes"](compendium-writes.md)); inside one
coven the label index makes the case that needs it rarer, and a coven-scoped
twin of that finder is the change that would add it here.
