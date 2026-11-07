## `workspace_compendium_entries`, a compendium entry in a coven's cupboard

One row says "this coven's cupboard holds this compendium entry", and carries the coven's own say over it: seven columns (`label`, `description`, `safety_notes`, `elements`, `celestial_bodies`, `zodiac_signs`, `colors`) that each read as the compendium's value while null. The columns are `src/modules/ingredients/schema/workspace-compendium-entries.ts`'s; it spreads `...auditColumns` with the `set_updated_at` trigger and carries `revision` (`integer NOT NULL DEFAULT 1`, raised by the `bump_revision` trigger on every update, so an autosave names the revision it read).

**A null and an empty array are different answers**, as `none` and `unknown` are for a nomenclature: null defers to the compendium, `[]` says the coven wants none shown. The lists are typed as `ingredients` types them.

**Why a table of its own.** An `ingredients` row cannot be an override: `name`, `slug` and `nomenclature` are required, `identity_key` is generated from the name, and the label and slug uniques are per coven. A row made to fit would have to invent a name and a slug for something that is not a second ingredient. This row holds only the pair and the differences.

### Indexes

All live-partial where noted:

- A unique on `(workspace_id, ingredient_id)`: a coven holds an entry once; after a soft delete it can be added again.
- A unique on `(workspace_id, lower(label))` where `label` is set: one coven cannot call two entries by the same label. Two covens may share one, and a null label reserves nothing. Whether a label also clashes with the coven's own ingredients is a service check ("The label rule"), since the index sees only this table.
- A plain index on `ingredient_id`, for the curator's count of covens holding an entry.
- A trigram index on `unaccent_immutable(label)`, for the cupboard search, the same fold `ingredients_unaccent_trgm` gives the compendium search.

That `ingredient_id` is a compendium entry (`workspace_id IS NULL` on the ingredient) is a service rule and a read filter, not a constraint: a CHECK cannot see another row, and no tier rule in the schema is a trigger. The repository's scoped writers accept the table with no further marking, because they ask for `workspaceId` and `ingredientId` by type. Its row type is `CupboardEntryRow`; `tests/support/db/insert-cupboard-entry.ts` inserts one for a test.

### Reading it

The reads are `src/db/repository/cupboard-entries.ts` and the service `src/modules/ingredients/services/cupboard-entries.ts`.

- **`findCupboardEntry(membership, ingredientId)`** and **`findCupboardEntriesOf(membership, ingredientIds)`** read the proof's coven's live rows. Each ANDs the proof's `workspace_id` and the tombstone filter, and keeps a row only while it names a live compendium entry (the private `inCupboard` filter checks the ingredient exists under `workspace_id IS NULL`). So a row naming a coven's own ingredient is never returned, and neither is the row of an entry the compendium has deleted, which only the escape hatch reads.
- **`findCompendiumMatchesByName(name)`** answers the live compendium entries whose name or formal name is `name`, exact but for case (a near spelling is `findPossibleDuplicates`'). It takes no proof, because the compendium is public. It answers the add flow's question and, through `compendiumMatchesOf` in `services/replaced-entries.ts`, a coven's own entry's page: with a formal name the matches are kept to the same `identityKey` and fill **In the Compendium**; with none, every exact-name match fills **Similar in the Compendium**, a read-only list of links to public pages. It offers no action: linking goes one way in v1, so turning an own ingredient into the compendium entry it duplicates does not exist (DESIGN.md §13, "Link to the Compendium"; [`m12.42-linking-goes-one-way.md`](../design-decisions/m12.42-linking-goes-one-way.md)).

The service reads the row for any member, observers included, under `{ ingredient: ['read'] }`: `getCupboardEntry` (null for an entry the coven does not hold, an id that is not a uuid, or a coven's own ingredient), `cupboardEntriesOf` as `Ingredient.cupboardEntry`'s batch, and `heldCompendiumEntryIds` (which of these entries the coven holds, as a set of ids). The multi-coven form takes one proof per coven, one read per coven named, and puts a `Forbidden` in a refused coven's slot as `stockOf` does. Covens are read one after another so a refusal leaves no read running. The set is for the viewer's own memberships, never cached (CLAUDE.md rule 6), so a keeper or curator gets only the covens they belong to, and a coven where the viewer's seat is paused is left out before the read (its proof would be refused and blank the answer for every coven). A coven's entry page reads the row through `ingredientDetailOf(session, entry, workspaceId)`, whose `cupboardEntry` is null on the public page, which names no coven.

**`applyCupboardEntry(row, entry)`** lays a row over its compendium entry, column by column as `entry?.x ?? row.x`, the label over the name. It uses `??`, never `||`, so an empty list stays cleared. Forms, folk names, substitutes, categories, references and `toxic` have no override and always read from the compendium; the id and the tier stay the compendium's, so `isGlobal` stays true. Over GraphQL the row is answered beside the entry, not merged into it ([`graphql/schema.md`](../graphql/schema.md), "Cupboard entries").

### In the cupboard list

The coven's ingredient list and its facet counts ([`stock.md`](stock.md), "The workspace ingredient list") read this table two ways.

- **Which compendium entries are listed.** `workspaceListScopeIncludingSoftDeleted` keeps a compendium entry when the proof's coven has a live row for it, as one keyed `EXISTS` on the `(workspace_id, ingredient_id)` unique, a retired entry included. A jar of the entry is neither needed nor enough. The source filter's `compendium` side counts exactly these entries, so it and the `local` side add up to the list's total.
- **What the listed entry says.** The statement left-joins the coven's live row under the private alias `cupboard` in `src/db/repository/ingredients.ts`, onto a compendium row only. `listColumns(membership)` reads `coalesce(cupboard.x, ingredients.x)` for the label and for elements, celestial bodies and zodiac signs: the sort and cursor run on `coalesce(label, name)`, the search adds the label as an arm, and the filters and facet counts read the three lists as the coven left them, with `[]` counting under nothing. Categories, forms and `toxic` read from the compendium; the `colors` override has no filter or facet yet.

The joined row rides on each page entry as `cupboardEntry`, and the list's resolver primes the `cupboardEntryByIngredient` loader with it, so `Ingredient.cupboardEntry` on a listed row needs no `findCupboardEntriesOf`.

### Counting covens

`countCovensUsing(curator, ingredientId)` answers how many distinct live covens have a live row naming the entry, as one `count(distinct workspace_id)`. It is unscoped by design: it takes the `Curator` proof where the other finders take a `Membership`, and returns a number, so no coven name or id leaves the database layer. A soft-deleted row, a soft-deleted coven, and a row naming a coven's own ingredient are not counted. The service `countCompendiumEntryUsers(session, id)` in `services/compendium.ts` checks `assertCurator`, then `NotFound` for an id that is not a live compendium entry; the delete confirm reads it through `Query.compendiumEntryUsers` ([`graphql/schema.md`](../graphql/schema.md), "The compendium mutations"). It sits in `compendium.ts` because that file holds the compendium tier's curator reads, whereas `cupboard-entries.ts` services act for a coven under a membership.

### When the compendium retires the entry

A curator's delete soft-deletes the `ingredients` row alone: its forms stay live, and so does every cupboard row naming it. The entry leaves the compendium at once, and a coven whose cupboard names it goes on reading it, marked, until the coven removes its own row. A coven that never added it reads nothing, even with a jar of one of its forms ([`m12.24-retired-entry-stays-readable.md`](../design-decisions/m12.24-retired-entry-stays-readable.md)). A coven's own deleted ingredient is gone, not retired.

- **The hatch.** `findCupboardEntryIncludingSoftDeleted(membership, ingredientId)` reads the entry past its tombstone beside the cupboard row ([`soft-delete.md`](soft-delete.md)), only while it is a compendium entry and the proof's coven has a live row naming it (the row's own tombstone still filters). The service reaches it as `heldCompendiumEntry`, and `isRetired(row)` (a compendium row with `deleted_at` set) is in `services/cupboard-entries.ts`.
- **The entry.** `getIngredient` tries the hatch only when its live read misses. `ingredientDetailOf` sees a retired entry, asks the coven for `{ ingredient: ['read'] }`, and reads the hatch again: `NotFound` without a coven named or a row, `Forbidden` without a session. It answers `retired: true`.
- **Its children.** The child readers in `services/ingredient-children.ts`, and the finders under them, take an optional last `heldBy` proof. With it, `inUseIngredientParent` and `inUseVariantParent` (`ingredient-parent.ts`) admit the retired parent while `heldBy`'s coven names it in its cupboard, and a live parent as `readableIngredientParent` does. The tier is checked on both arms, so a stray cupboard row naming a coven's own deleted ingredient admits nothing, and a retired entry's tier is still the compendium's, so a `where` comparing a child's tier with its parent's works unchanged. `ingredientDetailOf` passes the proof to every reader.
- **Its jars.** `findManyStock` reads every jar through `inUseVariantParent` with the coven's own proof, so `stockOf`, `updateStock` and `deleteStock` keep working on that coven's jars of a retired entry, and on no other coven's. `createStock` passes the proof to `findReadableVariant` as `heldBy`, finds a live form of a retired entry while the coven's row is live, and checks the row again through `heldCompendiumEntry` under the coven's stock lock. It never writes a second cupboard row for a retired entry. Over GraphQL a retired entry's jar answers `InventoryItem.ingredient` and `.variant` with "No such ingredient", because the `ingredientsById` loader reads live entries only.
- **The coven's list.** The Ingredients list, its pager count, its filter counts and its type-ahead (`workspaceIngredients`, the list's own reader, so the box never offers a row the list would not show) keep the entry on the same condition, through `workspaceListScopeIncludingSoftDeleted` and `findPageInScopeIncludingSoftDeleted` / `findPageCountInScopeIncludingSoftDeleted` in `finders.ts`, which add no tombstone filter of their own. The compendium arm skips the entry's tombstone but keeps `inCompendium` and the cupboard row's tombstone, through `existsIn`; the own-entry arm still filters. The card is marked **Retired**.
- **The writes it keeps.** The coven may still annotate its row, take the entry as its own, and remove it from its cupboard. `annotateCupboardEntry`, `convertCompendiumEntryToLocal` and `removeCupboardEntry` all find the row through `heldCompendiumEntry`, so each works while the coven's row is live and refuses with `NotFound` once it is soft-deleted. None writes the retired `ingredients` row. `annotateCupboardEntry`'s resolver reads the entry's name through `getIngredient`, not the `ingredientsById` loader.
- **What drops it at once.** The public page and list with its search (`findCompendiumEntryBySlug`, `findCompendiumPage`), the add flow's exact match, and both groups of the ingredient picker read live rows only and take no `heldBy`.
- **On the page.** `Ingredient.retired` is true. The coven's entry page marks it **Retired** (hover tip: no longer in the Compendium) and gives it no public link, no canonical address and no curator Edit. Its Edit menu offers Annotate, Make It Ours and Remove to a role that may do each, and no Add. Once Remove succeeds, the page leads to the coven's Ingredients list (it would be a 404 for the coven now); a live entry's page reads itself again and offers the plus to add it back.

Not covered: the GraphQL child loaders and `Ingredient.cupboardEntry` read nothing for a retired entry, because a loader's key carries no reading coven to prove the cupboard row with. The list does not show it (its resolver primes `cupboardEntryByIngredient` from the joined row, and the coven page reads the card's forms and categories through the services with `heldBy`). The mark on jars waits for that screen.

### Writing it

All in `services/cupboard-entries.ts`, each checking membership first, then writing through `withAudit`. They take the compendium entry's id, not the row's, because that is what a page holds.

| Function                                                           | Checks               | What it does                                                                                                                                                   |
| ------------------------------------------------------------------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `addCupboardEntry(session, workspaceId, ingredientId, input?)`     | `ingredient: create` | Inserts the row, bare or with overrides. It makes no jar and no form                                                                                           |
| `annotateCupboardEntry(session, workspaceId, ingredientId, patch)` | `ingredient: update` | Changes the overrides: a key left out keeps its value, `null` hands the column back to the compendium, and a value, a list even when empty, is the coven's own |
| `removeCupboardEntry(session, workspaceId, ingredientId)`          | `ingredient: delete` | Soft-deletes the row. Refused while the coven holds a live jar of any form of the entry; leaves the entry's spell layers untouched                             |

A coven's own ingredient, a deleted compendium entry and an id that is not a uuid give `NotFound` on an add; a second add of one entry is a `ValidationError` beside `ingredientId`. Remove takes the coven's stock lock (`lockCovenStock`) before it counts jars, so a first jar created at the same moment is either counted or queues behind the remove. A cupboard entry never creates or removes a jar or a form; `createStock` on a form of a compendium entry is the one other write, inserting the row when the coven has none in the same transaction, so no jar sits under an entry the cupboard does not list ([`stock.md`](stock.md)). A coven's own ingredient inserts nothing.

**The label rule.** A label is unique in the coven across its own ingredients' names and its cupboard labels, case folded. The database holds each half (`ingredients_workspace_label_unique`, `workspace_compendium_entries_workspace_label_unique`) but cannot hold both in one index, so the service reads first. Add and annotate refuse a label matching an own name or another label, as a `ValidationError` beside `label`. The own-row saves (`createWorkspaceIngredient`, `updateWorkspaceIngredient`, `promoteWorkspaceFolkName`) refuse a `name` matching a live label, beside `name`, through `refuseCupboardLabelAsName`. An entry with no label reserves nothing. Two writes racing across the two tables could both pass the read; that race is accepted (the result is a coven with one name on two rows, not a lost write), as `refuseEndingARedirect` accepts its own. The cupboard's index still catches two cupboard saves.

### The last edit

The row's `updated_by` and `updated_at` count towards the "last edited by" line on the ingredient card, Quick Look and entry page (`lastEditsOf`), beside the coven's jars, whatever the row holds (adding the entry is a coven edit too). The compendium entry's own stamp never counts, nor another coven's row: the read is `findCupboardEntriesOf` under the coven's proof. Jars are read as `stockOf` reads them in one query for every entry, and the newest is picked in code, which is not a second filter.

### Converting a compendium entry into our own

`convertCompendiumEntryToLocal(session, workspaceId, ingredientId)` turns a compendium entry the coven holds into the coven's own ingredient, for a coven that wants to change what a cupboard row cannot override (forms, sources) or to keep an entry the curators retired. The entry page offers it as **Make It Ours**. A new own ingredient is written, the coven's jars and spell layers move onto its forms, and the cupboard row is soft-deleted. The compendium entry is never written and no other coven's cupboard changes.

It checks `ingredient: create` and `delete` and `inventory: update`, exported as `MAKE_IT_OURS_PERMISSION` so the page offers the button on exactly what the service checks. Everything happens in one `withAudit` transaction under `lockCovenStock` (the same lock `createStock` takes, so a jar cannot appear between the read and the moves), and a failure at any step leaves every row where it was.

**What the copy holds.** It is written from what the coven reads on the entry page: the compendium's values with the row's overrides laid over them (`applyCupboardEntry`). The label becomes its name; the formal name and nomenclature are the compendium's. The write goes through the coven's own create path (`parseInput`, `resolvePicks`, `writeChildren` in `services/ingredient-rows.ts`), so it is checked as any own entry is. Its children are copies:

- **Forms**, each with its description, notes, lists, categories, references and substitutes. A form keeps its curated pick only while that form is live and still spelt as the form is; otherwise it is kept as text.
- **Folk names**, except one the new name now takes (the label equal to a folk name, ignoring case).
- **Substitutes.** A link to a live ingredient is kept, with the form it names while that form is live, else the ingredient whole. A link whose ingredient is gone, and a typed name, are kept as the name they read as, once each. A substitute naming the entry itself is pointed at the copy, form for form; one naming a form that was not copied is left out.
- **Categories** and **deities** (a deity keeps its curated pick while that deity is live, otherwise its name).
- **References**, as links to the same compendium `references` rows with their locators, since the coven tier may cite a compendium reference.

A retired entry converts the same way, its children read through the cupboard row (`heldBy`).

**Moving.** Each jar of a copied form is updated in place, so its id, quantity, unit and threshold are unchanged and only its ingredient and form change; forms are matched by `foldForm`, exact here since the copy took the forms' own text. Spell layers move the same way through `moveLayers`, every spell of the coven included, private ones whoever wrote them. A jar or layer on a form deleted earlier is in no read and stays where it is.

**What is lost.** Only a folk name the new name took: the answer, a `ConvertedCompendium`, carries the new entry and a `DroppedOnConvert` whose `folkNames` lists it; every other list is empty.

| Refusal                                                                                 | Error             | Beside          |
| --------------------------------------------------------------------------------------- | ----------------- | --------------- |
| The caller lacks one of the three permissions; an observer, or not in the coven         | `Forbidden`       |                 |
| The coven holds no cupboard row for `ingredientId`, an own entry's id or another's      | `NotFound`        |                 |
| Another entry of the coven already uses the label as its label                          | `ValidationError` | `label`         |
| The coven already has its own entry of the same formal name                             | `ValidationError` | `canonicalName` |
| The coven already has its own entry of the same name, where the entry has no formal one | `ValidationError` | `name`          |

The identity refusals come from the identity index (`identity_key`, unique per coven), read back as the coven's own create reads it (`refuseCollision` in `services/ingredient-rows.ts`). Nothing moves when any is refused.

## Entry covens

`src/modules/ingredients/services/entry-covens.ts` returns the viewer's own covens an entry's page opens in, by name, for the coven switcher (claude-docs/components/workspace-switcher.md).

- A live compendium entry opens in every coven of the viewer's, held or not, since the compendium is every member's to read. A retired one opens only in a coven whose cupboard still names it. A coven's own entry opens in that coven alone.
- `entry` is the row the page already read: one lookup of the viewer's memberships, plus, for a retired entry only, one held read per coven under that coven's own `Membership` proof (the live held reads skip a retired entry).
- The covens come from the viewer's memberships, never from who holds the entry, so a coven they are not in is never named. Per viewer, never cached (rule 6).
- A coven where the viewer's seat is paused is never named, live or retired: the page opens nothing there, and the retired entry's held read would be refused.
