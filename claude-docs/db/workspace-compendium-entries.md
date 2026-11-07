## `workspace_compendium_entries`, a compendium entry in a coven's cupboard

One row says "this coven's cupboard holds this compendium entry". It is the stated fact an earlier rule guessed, by matching a coven's own ingredient to a compendium entry on name. The row carries the coven's own say over the entry too: seven columns that each read as the compendium's value while null.

| Column                                                   | Meaning                                                                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                                     | the row's own key                                                                                                                     |
| `workspace_id`                                           | the coven whose cupboard holds the entry, required                                                                                    |
| `ingredient_id`                                          | the entry held, required                                                                                                              |
| `label`, `description`, `safety_notes`                   | the coven's own wording; null means the compendium's                                                                                  |
| `elements`, `celestial_bodies`, `zodiac_signs`, `colors` | the coven's own lists, typed as `ingredients` types them; null means the compendium's, `[]` means cleared on purpose                  |
| `created_*`, `updated_*`, `deleted_*`                    | `...auditColumns`, with the `set_updated_at` trigger the migration adds                                                               |
| `revision`                                               | `integer NOT NULL DEFAULT 1`, raised by one by the `bump_revision` trigger on every update, so an autosave names the revision it read |

A null and an empty array are different answers, as `none` and `unknown` are for a nomenclature: null defers to the compendium, `[]` says the coven wants none shown.

### Why a table of its own

An `ingredients` row cannot be an override: `name`, `slug` and `nomenclature` are required, `identity_key` is generated from the name, and the label and slug uniques are per coven. A row made to fit would have to invent a name and a slug for something that is not a second ingredient. This row holds only the pair and the differences.

### Indexes

- A live partial unique on `(workspace_id, ingredient_id)`: a coven holds an entry once. After a soft delete the entry can be added again.
- A live partial unique on `(workspace_id, lower(label))` where `label` is set: one coven cannot call two entries by the same label, whatever the case. Two covens may share a label, and a null label reserves nothing. Whether a label also clashes with the coven's own ingredients is a service check ("The label rule" below), since the index sees only this table.
- A plain index on `ingredient_id`, for the curator's count of the covens holding an entry.
- A trigram index on `unaccent_immutable(label)`, for the cupboard search, the same fold `ingredients_unaccent_trgm` gives the compendium search.

### What the table does not enforce

That `ingredient_id` is a compendium entry (`workspace_id IS NULL` on the ingredient) is a service rule and a read filter, not a constraint: a CHECK cannot see another row, and no tier rule in the schema is a trigger.

The repository's scoped writers accept it with no further marking, because they ask for the `workspaceId` and `ingredientId` columns by type. Its row type is `CupboardEntryRow`, and `tests/support/db/insert-cupboard-entry.ts` inserts one for a test.

### Reading it

The reads are in `src/db/repository/cupboard-entries.ts` and the `ingredients` service `services/cupboard-entries.ts`.

- **`findCupboardEntry(membership, ingredientId)`** and **`findCupboardEntriesOf(membership, ingredientIds)`** read the proof's coven's live rows, one or a batch. Each ANDs the proof's `workspace_id` and the row's tombstone filter, and keeps a row only while it names a live compendium entry: the private `inCupboard` filter checks the ingredient exists under `workspace_id IS NULL`. So a row naming a coven's own ingredient is never returned, which is the read filter half of the tier rule above, and neither is the row of an entry the compendium has deleted, which only the escape hatch below reads.
- **`findCompendiumMatchesByName(name)`** answers the live compendium entries whose name or formal name is `name`, exactly but for case. It takes no proof, because the compendium is public. It answers the add flow's question when the compendium already has a typed name, and, through `compendiumMatchesOf` in `services/replaced-entries.ts`, a coven's own entry's page. With a formal name the matches are kept to the same `identityKey` and fill **In the Compendium**; with none, every exact-name match fills **Similar in the Compendium**, a read-only list of links to the compendium's public pages. It offers no action: turning an own entry into the compendium entry it duplicates does not exist, because linking goes one way in v1 (DESIGN.md §13).

The service reads the row for a practitioner, observers included, under `{ ingredient: ['read'] }`: `getCupboardEntry` one at a time, and `cupboardEntriesOf` as `Ingredient.cupboardEntry`'s batch, and `heldCompendiumEntryIds` as the public compendium page's question (which of these entries does the coven hold, as a set of ids, with a `Forbidden` thrown for a refused coven and no slots), one read per coven named, with a `Forbidden` in a refused coven's slots as `stockOf` answers. A coven's entry page reads the row through `ingredientDetailOf(session, entry, workspaceId)`, whose `cupboardEntry` is null on the public page, which names no coven.

**`applyCupboardEntry(row, entry)`** lays a row over its compendium entry, column by column as `entry?.x ?? row.x`, the label over the name. It uses `??` and never `||`, so an empty list stays cleared rather than falling back to the compendium's. Forms, folk names, substitutes, categories, references and `toxic` have no override and always read from the compendium, and the id and the tier stay the compendium's, so `isGlobal` stays true for a compendium entry. Over GraphQL the row is answered beside the entry rather than merged into it ([`graphql/schema.md`](../graphql/schema.md), "Cupboard entries").

`tests/db/repository/cupboard-entries.test.ts` holds the finders' rules, each case seeding the row a read must leave out beside the one it must return, and `tests/modules/ingredients/services/cupboard-entries.test.ts` holds the merge, per column for null, set and `[]`.

### In the cupboard list

The coven's ingredient list and its facet counts ([`stock.md`](stock.md), "The workspace ingredient list") read this table in two ways.

- **Which compendium entries are listed.** `workspaceListScopeIncludingSoftDeleted` keeps a compendium entry when the proof's coven has a live row for it, as one keyed `EXISTS` on the `(workspace_id, ingredient_id)` unique above, a retired entry included ("When the compendium retires the entry" below). A jar of the entry is neither needed nor enough. The source filter's `compendium` side counts exactly these entries, so it and the `local` side add up to the list's total.
- **What the listed entry says.** The statement left-joins the coven's live row, under the private alias `cupboard` in `src/db/repository/ingredients.ts`, joined only onto a compendium row, so a row naming one of the coven's own ingredients changes nothing. `listColumns(membership)` reads `coalesce(cupboard.x, ingredients.x)` for the label and for elements, celestial bodies and zodiac signs: the sort and the cursor run on `coalesce(label, name)`, the search adds the label as an arm, and the filters and facet counts read the three lists as the coven left them, with `[]` counting under nothing, as `applyCupboardEntry` treats it. Categories, forms and `toxic` have no override and read from the compendium; the `colors` override has no filter or facet to read it yet.

The joined row rides on each page entry as `cupboardEntry`, and the list's resolver primes the `cupboardEntryByIngredient` loader with it, so `Ingredient.cupboardEntry` on a listed row is answered without `findCupboardEntriesOf`. A row whose compendium entry has been retired (soft-deleted) still lists the entry, with its row joined as before.

`tests/modules/ingredients/services/workspace-ingredient-list.test.ts` holds the list's cases and `tests/modules/ingredients/services/ingredient-facets.test.ts` the counts, each seeding another coven's row beside the one that must count.

### Counting covens

**`countCovensUsing(curator, ingredientId)`** in `cupboard-entries.ts` answers how many distinct live covens have a live row naming the entry, as one `count(distinct workspace_id)`. It is unscoped by design: it takes the `Curator` proof where the other finders take a `Membership`, and it returns a number, so no coven name or id leaves the database layer. A soft-deleted row, a soft-deleted coven, and a row naming a coven's own ingredient are not counted. The `ingredients` service `countCompendiumEntryUsers(session, id)` in `services/compendium.ts` checks `assertCurator`, then `NotFound` for an id that is not a live compendium entry, and the delete confirm reads it through `Query.compendiumEntryUsers` ([`graphql/schema.md`](../graphql/schema.md), "The compendium mutations"). It sits in `compendium.ts` because that file holds the compendium tier's curator reads and `deleteCompendiumEntry`, whereas `cupboard-entries.ts` services act for a coven under a membership.

### When the compendium retires the entry

A curator's delete soft-deletes the `ingredients` row alone: its forms stay live, and so does every cupboard row naming it. What those covens see: the entry leaves the compendium at once, and a coven whose cupboard names it goes on reading it, marked, until the coven removes its own row. A coven that never added it reads nothing, even if it has a jar of one of its forms. The record is [`m12.24-retired-entry-stays-readable.md`](../design-decisions/m12.24-retired-entry-stays-readable.md).

- **`findCupboardEntryIncludingSoftDeleted(membership, ingredientId)`** in `cupboard-entries.ts` is the escape hatch ([`soft-delete.md`](soft-delete.md)). It reads the entry past its tombstone and returns it beside the cupboard row, or `undefined`. It returns the entry only while it is a compendium entry and the proof's coven has a live row naming it; the row's own tombstone still filters. The service reaches it as `heldCompendiumEntry(membership, ingredientId)` in `services/cupboard-entries.ts`, and `isRetired(row)` there says whether an entry is retired: a compendium row with `deleted_at` set.
- **The entry.** `getIngredient(session, id, workspaceId)` tries the hatch only when its live read misses, so a live entry is read as before. `ingredientDetailOf` sees a retired entry, asks the coven for `{ ingredient: ['read'] }` (observers included), and reads the hatch again: `NotFound` without a coven named or a row, `Forbidden` without a session. It answers `retired: true`.
- **Its children.** The child readers in `services/ingredient-children.ts`, and the repository finders under them, take an optional last `heldBy` proof. With it, `inUseIngredientParent` and `inUseVariantParent` in `ingredient-parent.ts` admit the retired parent while `heldBy`'s coven names it in its cupboard, and admit a live parent exactly as `readableIngredientParent` does, the second through the variant. The tier is checked on both arms, so a stray cupboard row naming a coven's own deleted ingredient admits nothing. A retired entry's tier is still the compendium's, so a reader's `where` that compares a child's tier with its parent's works unchanged. `ingredientDetailOf` passes the proof to every reader: folk names, categories, deities, substitutes, references, and each form's categories, substitutes and references.
- **Its jars.** `findManyStock` reads every jar through `inUseVariantParent` with the coven's own proof, so `stockOf`, `updateStock` and `deleteStock` go on working on the coven's jars of a retired entry, and on no other coven's.
- **The coven's list.** The coven's Ingredients list, its pager count and its filter counts keep the entry on the same condition: `findWorkspaceIngredientPage`, `findWorkspaceIngredientCount` and `findWorkspaceIngredientFacets` read through the scope `workspaceListScopeIncludingSoftDeleted` in `ingredients.ts`. Its compendium arm skips the entry's tombstone but keeps `inCompendium` and the cupboard row's own tombstone, through `existsIn`; its own-entry arm still filters, so a coven's own deleted ingredient never lists. The page and the count page it through `findPageInScopeIncludingSoftDeleted` and `findPageCountInScopeIncludingSoftDeleted` in `finders.ts`, which add no tombstone filter of their own. The coven page already passes `heldBy` to the card's forms and categories, and marks the card **Retired**.
- **The coven's type-ahead.** The search box on the coven's Ingredients page asks `workspaceIngredients`, the list's own reader, so it suggests a retired entry the coven still holds, and no other coven's. One reader, so the box never offers a row the list it narrows would not show.
- **The writes it keeps.** The coven may still annotate its row, take the entry as its own, and remove it from its cupboard. `annotateCupboardEntry`, `convertCompendiumEntryToLocal` and `removeCupboardEntry` all find the row through `heldCompendiumEntry`, so each works on a retired entry while the coven's row is live, and refuses with `NotFound` once that row is soft-deleted. None writes the retired `ingredients` row: annotate writes the cupboard row, remove soft-deletes it (so the entry leaves the coven's list, its count and its filter counts), and Make It Ours creates the coven's own entry, moves the jars onto it and soft-deletes the cupboard row. `annotateCupboardEntry`'s resolver reads the entry's name through `getIngredient` rather than the `ingredientsById` loader, which reads live entries only.
- **New jars of its forms.** `createStock` passes the coven's proof to `findReadableVariant` as `heldBy`, so a live form of a retired compendium entry is found while the coven's cupboard row naming it is live, and checks that row again through `heldCompendiumEntry` under the coven's stock lock. It never writes a second cupboard row for a retired entry, and a coven's own deleted ingredient's forms are still refused. Over GraphQL, a retired entry's jar answers `InventoryItem.ingredient` and `InventoryItem.variant` with "No such ingredient", because the `ingredientsById` loader reads live entries only.
- **What drops it at once.** The public page and the public list with its search (`findCompendiumEntryBySlug`, `findCompendiumPage`), the add flow's exact match (`findCompendiumMatchesByName`), and both groups of the ingredient picker read live rows only and take no `heldBy`. `findReadableVariant` takes `heldBy` from `createStock` alone.
- **On the page and the wire.** `Ingredient.retired` is true for a retired entry. The coven's entry page marks it **Retired** (hover tip: no longer in the Compendium) and gives it no public link, no canonical address and no curator Edit, since the compendium no longer holds it. Its Edit menu offers Annotate, Make It Ours and Remove to a role that may do each, and no Add. Once Remove succeeds, the page leads to the coven's Ingredients list rather than reading itself again, since it would be a 404 for the coven now; a live entry's page reads itself again and offers the plus to add it back.

Not yet covered: the GraphQL child loaders and `Ingredient.cupboardEntry` read nothing for a retired entry, because a loader's key carries no reading coven to prove the cupboard row with. On the list this does not show: the list's resolver primes `cupboardEntryByIngredient` from the joined row, and the coven page reads the card's forms and categories through the services with `heldBy`. The mark on jars waits for that screen.

`tests/modules/ingredients/services/retired-entry.test.ts` holds the service half: the holding coven's reads and jars, the other coven's `NotFound`, and every reader that drops the entry, each beside its state before retirement. `tests/db/repository/cupboard-entries.test.ts` holds the hatch's rows and the `heldBy` arm. `tests/modules/ingredients/services/retired-entry-list.test.ts` holds the list's half: the list, the pager total, the filter counts and the type-ahead, for the holding coven and another, before and after the cupboard row goes. `tests/modules/ingredients/services/retired-entry-writes.test.ts` holds the writes: the holding coven annotates, removes, makes it its own, and adds, changes and removes a jar of its form, while another coven and an observer are refused by direct id, and the holding coven is refused once its row is gone. `tests/e2e/coven-ingredients.spec.ts` checks the card draws, marked, with its forms and categories, walks Annotate and then Make It Ours from the entry's page, and walks Remove from it to the coven's Ingredients list, where the entry is gone.

### Writing it

The three writes are in the same service, `services/cupboard-entries.ts`. Each checks membership first, then writes through `withAudit` (the one wrapper that opens the transaction and stamps who wrote).

| Function                                                           | Checks               | What it does                                                                                                                                                   |
| ------------------------------------------------------------------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `addCupboardEntry(session, workspaceId, ingredientId, input?)`     | `ingredient: create` | Inserts the row, bare or with overrides. It makes no jar and no form                                                                                           |
| `annotateCupboardEntry(session, workspaceId, ingredientId, patch)` | `ingredient: update` | Changes the overrides: a key left out keeps its value, `null` hands the column back to the compendium, and a value, a list even when empty, is the coven's own |
| `removeCupboardEntry(session, workspaceId, ingredientId)`          | `ingredient: delete` | Soft-deletes the row (marks it deleted). Refused while the coven holds a live jar of any form of the entry                                                     |

The three take the compendium entry's id, not the row's, because that is what a page holds. A coven's own ingredient, a deleted compendium entry and an id that is not a uuid give `NotFound` on an add. A second add of one entry is a `ValidationError` beside `ingredientId`. Remove takes the coven's stock lock (`lockCovenStock`) before it counts jars, so a first jar created at the same moment is either counted or queues behind the remove.

**The label rule.** A label is unique in the coven across its own ingredients' names and its cupboard labels, case folded. The database holds each half (`ingredients_workspace_label_unique` for own rows, `workspace_compendium_entries_workspace_label_unique` for labels) but cannot hold both in one index, so the service reads first. Add and annotate refuse a label that matches an own name or another label, as a `ValidationError` beside `label`. The own-row saves (`createWorkspaceIngredient`, `updateWorkspaceIngredient`, `promoteWorkspaceFolkName`) refuse a `name` that matches a live label, beside `name`, through `refuseCupboardLabelAsName`. An entry with no label reserves nothing. Two writes racing across the two tables could both pass the read; that race is accepted, and the result is a coven with one name on two rows, not a lost write.

`createStock` on a form of a compendium entry inserts the cupboard row when the coven has none, in the same transaction, so no jar sits under an entry the cupboard does not list ([`stock.md`](stock.md)). A coven's own ingredient inserts nothing.

`tests/modules/ingredients/services/cupboard-entry-writes.test.ts` holds the rules and `tests/modules/ingredients/graphql/cupboard-entry-writes.test.ts` the transport's half.

### The last edit

The row's `updated_by` and `updated_at` count towards the "last edited by" line on the ingredient card, Quick Look and entry page (`lastEditsOf`), beside the coven's jars. They count whatever the row holds, since adding the entry to the cupboard is a coven edit too. The compendium entry's own stamp never counts, and neither does another coven's row: the read is `findCupboardEntriesOf` under the coven's proof.

### Converting an own entry

There is no such conversion in v1, and no **This Is It** action on the Similar block: linking goes one way, a coven annotating a compendium entry and making it its own (below), and turning an own ingredient into the compendium entry it duplicates waits for v2. DESIGN.md §13 ("Link to the Compendium") says why, and [`m12.42-linking-goes-one-way.md`](../design-decisions/m12.42-linking-goes-one-way.md) records the call.

### Converting a compendium entry into our own

`convertCompendiumEntryToLocal(session, workspaceId, ingredientId)` turns a compendium entry the coven holds into the coven's own ingredient, for the coven that wants to change what a cupboard row cannot override, such as the forms and sources, or to keep an entry the curators retired. The entry page offers it as **Make It Ours**. A new own ingredient is written, the coven's jars and spell layers move onto its forms, and the cupboard row is soft-deleted. The compendium entry itself is never written, and no other coven's cupboard changes.

It checks `ingredient: create` and `delete` and `inventory: update`, because it adds an ingredient, removes a cupboard row and moves jars. The set is exported as `MAKE_IT_OURS_PERMISSION`, so the page offers the button on exactly what the service checks. Everything happens in one `withAudit` transaction under the coven's stock lock (`lockCovenStock`), and a failure at any step leaves every row where it was.

**What the copy holds.** The new entry is written from what the coven reads on the entry page: the compendium's values with the cupboard row's overrides laid over them (`applyCupboardEntry`). So the label becomes its name, and the formal name and nomenclature are the compendium's. The write goes through the coven's own create path (`parseInput`, `resolvePicks`, `writeChildren` in `services/ingredient-rows.ts`), so the copy is checked as any own entry is. Its children are copies of the entry's:

- **Forms**, each with its description, notes, lists, categories, references and substitutes. A form keeps its curated pick only while that curated form is live and still spelt as the form is; otherwise the form is kept as text.
- **Folk names**, except one the new name now takes (the label equal to a folk name, ignoring case), which would repeat the name.
- **Substitutes.** A link to a live ingredient is kept, with the form it names while that form is live; when the form is gone it links the ingredient whole. A link whose ingredient is gone, and a typed name, are kept as the name they read as, once each. A substitute naming the entry itself is pointed at the copy, form for form; one naming a form that was not copied is left out.
- **Categories** and **deities**. A deity keeps its curated pick while that deity is live; otherwise its name.
- **References**, as links to the same compendium `references` rows with their locators. The coven tier may cite a compendium reference, so nothing is lost.

A retired entry the coven still holds converts the same way: its children are read through the coven's cupboard row (`heldBy`), as the page reads them.

**Moving.** Each jar of a copied form is updated in place, so its id, quantity, unit and threshold are unchanged and only its ingredient and form change; forms are matched by `foldForm`, which is exact here since the copy took the forms' own text. Spell layers move the same way through `moveLayers`, every spell of the coven included, private ones whoever wrote them. A jar or layer on a form deleted earlier is in no read and stays where it is.

**What is lost.** Only a folk name the new name took. The answer, a `ConvertedCompendium`, carries the new entry and a `DroppedOnConvert` whose `folkNames` lists it; every other list is empty.

| Refusal                                                                                 | Error             | Beside          |
| --------------------------------------------------------------------------------------- | ----------------- | --------------- |
| The caller lacks one of the three permissions; an observer, or not in the coven         | `Forbidden`       |                 |
| The coven holds no cupboard row for `ingredientId`, an own entry's id or another's      | `NotFound`        |                 |
| Another entry of the coven already uses the label as its label                          | `ValidationError` | `label`         |
| The coven already has its own entry of the same formal name                             | `ValidationError` | `canonicalName` |
| The coven already has its own entry of the same name, where the entry has no formal one | `ValidationError` | `name`          |

The identity refusals come from the identity index (`identity_key`, unique per coven), read back as the coven's own create reads it (`refuseCollision` in `services/ingredient-rows.ts`, shared by both). Nothing moves when any of them is refused.

`tests/modules/ingredients/services/convert-compendium-to-local.test.ts` holds the rules, the rollback included (a trigger fails the cupboard row's soft-delete after the moves), `tests/modules/ingredients/graphql/convert-compendium-to-local.test.ts` the transport's half, and `tests/e2e/make-it-ours.spec.ts` the button.

## Cupboard entry service details

`src/modules/ingredients/services/cupboard-entries.ts` reads and writes a coven's cupboard entries; the rules are in the sections above. In addition:

- **Reads.** `getCupboardEntry` answers null for an entry the coven does not hold, an id that is not a uuid, or a coven's own ingredient. The batch read costs one read per coven named plus a role lookup each. `findCompendiumMatchesByName` takes a name equal but for case ("The compendium has Rosemary"); a near spelling is `findPossibleDuplicates`'. The entries are public, so the coven is named for the member check alone. A retired entry is one soft-deleted in the compendium and still read by the covens whose cupboard names it; a coven's own deleted ingredient is gone, not retired.
- **Writes.** A cupboard entry never creates or removes a jar or a form; `createStock` is the one write that adds the entry, beside a first jar. Remove leaves the entry's spell layers untouched.
- **Label race.** A race between a cupboard save and an own-ingredient save can slip past the label read, as `refuseEndingARedirect` accepts its own; the cupboard's index still catches two cupboard saves.
- **Make It Ours.** The copy's name is the cupboard label; the formal name and nomenclature are the compendium's. A substitute naming the entry itself is written against the copy once it exists. The same lock as `createStock` stops a jar appearing between the read and the moves. A jar of a form deleted since has nowhere to go.
- **Held-in reads.** The set of compendium ids a coven holds is read for the viewer's own coven and never cached (CLAUDE.md rule 6). The multi-coven form takes one proof per coven and refuses the whole read if the caller is not in one; a coven holding none maps to an empty set. Covens are read one after another so a refusal leaves no read running. The covens-holding-this-entry read comes from the viewer's own memberships, so a keeper or curator gets only the covens they belong to (observers count). A coven where the viewer's seat is paused is left out before the read, since its proof would be refused and blank the answer for every coven.

Ingredient detail: a retired compendium entry's children are read on the coven's proof

## Entry covens

`src/modules/ingredients/services/entry-covens.ts` returns the viewer's own covens an entry's page opens in, by name, for the coven switcher (claude-docs/components/workspace-switcher.md).

- A live compendium entry opens in every coven of the viewer's, held or not, since the compendium is every member's to read. A retired one opens only in a coven whose cupboard still names it (`getIngredient` answers no other). A coven's own entry opens in that coven alone.
- `entry` is the row the page already read, so there is no second read of it: one lookup of the viewer's memberships, plus, for a retired entry only, one held read per coven under that coven's own `Membership` proof (the live held reads skip a retired entry, which is why they cannot answer).
- The covens come from the viewer's memberships, never from who holds the entry, so a coven they are not in is never named, and a keeper or curator gets only their own. Per viewer, so never cached (rule 6).
- A coven where the viewer's seat is paused is never named, live entry or retired: the page opens nothing there, and the retired entry's held read would be refused.

### Last edits

Last-edit read: jars are read as `stockOf` reads them (the coven's, live, of a form the coven may read) in one query for every entry, and the newest is picked from them in code, which is not a second filter

### Decisions

m12.13: the stub shows twice, with a nudge; a separate Ingredient type was rejected
