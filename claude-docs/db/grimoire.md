## Summary

DESIGN.md §5 and §6 are the specification; the detail is below and in `spell-visibility.md` and `spell-categories.md`.

**What the module owns.** `src/modules/grimoire/` owns what a coven makes: its spells, their steps, the categories a member assigns, and the workings (casting records) with their participants and stock deductions. The ingredients a spell names come from the `ingredients` module (`ingredients.md`).

**Tables.**

- `spells` holds the spell, its `visibility`, its status (draft or complete) and a `revision` counter.
- `spell_steps` holds an ordered list of steps. A step is an instruction, an ingredient laid in the jar (a layer), or both. A layer names a variant the coven knows, or a custom name written for that one jar.
- `spell_categories` holds the _assigned_ categories only: what the author says the spell is for. The _derived_ categories are the union of the spell's ingredients' categories, stored nowhere. Conflating the two is a bug (`spell-categories.md`).
- `spell_workings`, `spell_working_participants` and `spell_working_deductions` record a casting, who took part, and the stock it used.

**Services.** `spells.ts` saves and deletes, `recipe.ts` saves the steps and layers, `spell-categories.ts` saves the assigned categories, `workings.ts` records a working, and `spell-reads.ts` with `visibility-rule.ts` read. Every one takes the `Membership` proof first.

**Visibility** is in `spell-visibility.md`: a private spell is its author's alone, one SQL predicate keeps it from a resolver, a complete spell's visibility only widens, a complete spell never returns to a draft (a change goes through `duplicateSpell`), and observers write nothing.

## The tables

`src/modules/grimoire/schema/spells.ts` and `spell-steps.ts` hold DESIGN.md §5's two grimoire tables: what a workspace _makes_, as against what exists (the compendium) and what it holds (`inventory_items`).

- **`spells`** carries the full six-column audit spread and a `revision` counter ("Revision" below).
- **`spell_steps`** carries `ingredientId` nullable and the full audit spread, soft-deleted, keyed on a surrogate `id`, with `(spell_id, position)` unique among live rows. A step is an instruction (`body`), an ingredient laid in the jar (a layer), or both, and a layer's ingredient is one the workspace knows or a custom name for this one jar ([`m13.1-spell-steps.md`](../design-decisions/m13.1-spell-steps.md)). Steps are soft-deleted, unlike the other join tables, because a spell keeps what went into its jar and a removed step is a tombstone.

### Workings

A spell is the recipe; a working is the record of one time it was made ([`m13.4-spell-workings.md`](../design-decisions/m13.4-spell-workings.md)). Each table has its own `set_updated_at` trigger.

- **`spell_workings`** spreads `...auditColumns`, is soft-deleted, and its `visibility` reuses `spell_visibility`. CHECKs `spell_workings_note_not_blank` and `spell_workings_completed_at_with_status` (`(status = 'complete') = (completed_at IS NOT NULL)`).
- **`spell_working_participants`** spreads `...auditStampColumns`. CHECK `spell_working_participants_one_identity` (`num_nonnulls(user_id, name) = 1`): a participant is an account or a typed name. Plain unique indexes on `(working_id, user_id)` and `(working_id, lower(name))`.
- **`spell_working_deductions`** spreads `...auditStampColumns`. Its foreign key to `inventory_items` is named by hand (`spell_working_deductions_inventory_item_fk`), because the generated name is past Postgres's 63-character limit.
- A working of a deleted spell is read through the spell's own filter (`findWorkingsInSpell` and the other finders in `src/db/repository/workings.ts`). `findManyInSpell` and the readable-spell pagers refuse `spell_workings` at the type level (`NotVisibilityScoped`), because a working has a `visibility` of its own that the spell's rule would ignore.

### Working service

`src/modules/grimoire/services/workings.ts` records, completes, changes and deletes a working.

- **Who.** Recording needs `working:['create']`, so an observer cannot. The spell must be readable by the caller and complete: a draft or reopened spell refuses with an error that says so. Complete and update are the recorder's (`created_by`) or a coven member named on the working as an account (a participant row with their `user_id`); a typed name grants nothing. Delete is the recorder's alone. A private working is read by its recorder and the members named on it.
- **Visibility.** A working defaults to its spell's visibility and is never wider than it. A draft working moves either way; a complete one only widens (`assertWidens(current, next, 'working')`). Widening a spell leaves its workings as they were.
- **Completing.** One `withAudit`: take `lockCovenStock`, plan with `planDeductions` (the same function the preview uses), mark the working complete, then call `decrementStock` per stocked step and write one `spell_working_deductions` row each (`quantity` taken, `shortfall` the rest). A jar floors at zero. A custom step, an unstocked step, a step with no quantity and a refused conversion write no deduction and come back as warnings with a reason. A failure in any deduction rolls back the completion.
- **Participants.** A member is named by id, anyone else by name. Reads take names from `displayNamesOf`, so a removed member keeps the name their row last held.
- **`deleteSpell`** soft-deletes the spell's workings in the same `withAudit`; participant and deduction rows have no `deleted_at`.

### The join names the ingredient, never the stock row

`spell_steps.ingredientId` references `ingredients`. Stock is what a workspace happens to hold today; a recipe pointing at it would be damaged by running out of something. The schema test proves the target: an id that exists only in `inventory_items` is refused with a foreign-key violation naming `spell_steps_ingredient_id_ingredients_id_fk`.

### Position is the identity, and what that costs the reorder

`position` is an integer unique within a spell among live rows: `spell_steps_spell_id_position_unique` on `(spell_id, position) WHERE deleted_at IS NULL`. Each part is load-bearing:

- **Stored, not inferred.** The order is part of the recipe, and no query may lean on insertion order.
- **NOT NULL**, because distinct NULLs collide with nothing, so an unordered row would sit outside the index meant to constrain it.
- **Leading on `spell_id`**, which scopes the index to the one jar and makes it the one that answers "read this spell's steps in order".
- **Partial on `deleted_at IS NULL`**, so a removed step frees its place for the next step written into the spell, and, by the same predicate on the other two indexes, its ingredient and its custom name.
- **A surrogate `id`** is the key, because a tombstone in a key column would hold its depth for good. It is how a service names one step to the writer's by-id methods (`updateById`, `softDeleteByIds`), since a service cannot build a `where`.

A unique index is checked per row rather than at end of statement, so **a reorder cannot be a single `set position = position + 1` sweep** even though the final state is conflict-free. Nor can it remove and re-add the spell's rows, which would leave a tombstone per step on every reorder. It moves the live rows in place, in one transaction: every place out of range by a scratch offset, then each to its new one. The schema test pins both.

### Saving a recipe

`createSpell` and `updateSpell` (`services/spells.ts`) take the recipe as **one ordered list of steps**, and `services/recipe.ts` (`writeRecipe`, after `checkRecipe`) writes it. A step's place is its index in the list. The list is the whole recipe:

- **A step with an `id` is a saved step, kept.** The id must name one of this spell's live steps, or the save is refused with a `VALIDATION` error at `steps[i].id`, so a save cannot reach another spell's step or bring a removed one back.
- **A step with no `id` is new**, and is inserted.
- **A saved step left out of the list is removed**, as a soft delete. So one save can add, remove and reorder steps together.
- **`updateSpell` with no `steps` at all leaves the recipe as it is**, while an empty list removes every step. The rest of the input reads the same way: a field left out keeps its value, and null clears it.

The checks, before anything is written:

- **The Zod schema** (`validation/spell.ts`) refuses a step that names both an ingredient and a custom name, or neither and no instruction, and a recipe that names one form, one custom name or one step id twice, each of which would otherwise reach a unique index as a bare database error.
- **A link is checked only when it is new.** A new step, or a kept step whose ingredient or form changed, must name a live form of a live ingredient in the compendium or this coven, and the form must belong to the ingredient named beside it. Anything else is `VALIDATION` at `steps[i].ingredientId`, not `NOT_FOUND`, because it is a field the member can correct. A kept step whose link did not change is not checked again, so a step laying an ingredient deleted since survives the save ("What a spell holds" in [spell-visibility.md](spell-visibility.md)).
- **A step's unit must fit the coven's jar of its form** (`unmeasurableSteps`). When the coven holds a live jar of the form a step lays, the step's unit must be one `unitConvert` can turn into the jar's unit (any weight against a weight jar, any volume against a volume jar) or, for a count unit (`piece`, `drop`, `pinch`), exactly the jar's unit; otherwise `VALIDATION` at `steps[i].unit`. Without this, making the spell could not take the step out of stock.
  - Not checked: a custom step, a form the coven holds no live jar of, a step or a jar with no unit, and a kept step whose form and unit did not change. So a jar whose unit changes after the spell is saved does not block a later save; the working warns of it instead.
  - The jars are read in one query for every linked form in the recipe, through `jarsOfForms` in `@/modules/ingredients`, under the caller's `Membership`, so only this coven's jars are read.

The write, inside one `withAudit` transaction:

1. The removed steps are soft-deleted first, which frees their places and their ingredients for the steps that follow.
2. **Every kept step that moves, or changes what it lays, is first moved aside**: to a negative place, and, if it changes what it lays, to no ingredient and a custom name made from its own id. Each unique index is checked row by row, so without this a swap of two steps' places or ingredients would collide halfway through.
3. Each kept step is then written with its final columns. **A step the save leaves exactly as it was is not written**, so its `updated_by` and `updated_at` go on saying who last changed it.
4. The new steps are inserted.

`updateSpell` writes the spell row through `updateRevisioned` with the `expectedRevision` the caller sends. Null writes whatever the revision is (the "Keep My Version" path). A revision that is no longer current throws `StaleWrite`, answered on the wire as `STALE_WRITE` with the current revision, and nothing is written. Over GraphQL the field must be sent, even as null: a save that leaves it out is refused as `VALIDATION`, so a client that forgets it cannot overwrite another member's save (claude-docs/design-decisions/m13.14-autosave.md). A visibility in the input follows the one-way rule of [spell-visibility.md](spell-visibility.md).

### Saving its categories

Only the assigned categories are saved, by `createSpell` and `updateSpell` taking `categoryIds` (`services/spell-categories.ts`).

- The ids are the whole set, the same way `steps` is the whole recipe: a category the save leaves out is unassigned. On `updateSpell`, leaving `categoryIds` out leaves the set as it is, and `[]` empties it. An id sent twice is written once.
- An id that names no live category is refused before anything is written, at `['categoryIds', index]`. An id that is not a uuid is refused earlier, by the schema, at the same path.
- A kept pair is not written again; a dropped one is hard-deleted, because the table has no `deleted_at` (MB.34); a new one is inserted, stamped by the session. **A pair whose category was soft-deleted since is kept**, even though the save leaves it out: the builder never shows a deleted category, so it could never send it, and keeping the pair lets a restore of the category bring it back. The ingredient form's categories work the same way (`replaceCategories` in `ingredients/services/ingredient-rows.ts`).
- The table carries no `workspace_id`. The spell is read as the caller first, so its pairs can be written exactly when the spell can.

### Custom ingredients

A step's ingredient is either one the workspace knows (`ingredient_id`) or a name written for this one jar (`name`, with an optional free-text `form`) — at most one of the two, and none on an instruction-only step. The design argument is in DESIGN.md §5 and [`mb.40-custom-spell-ingredients.md`](../design-decisions/mb.40-custom-spell-ingredients.md); this is what holds it in the database.

- **`ingredient_id` is nullable, and the foreign key stays.** Nullability costs nothing in integrity because the first CHECK below forbids the row that would exploit it (the "nullable FKs plus `num_nonnulls`" idiom).
- **The CHECKs**, each named so a refusal says which rule it broke: `spell_steps_one_identity` (`num_nonnulls(ingredient_id, name) <= 1`), `spell_steps_not_empty` (`num_nonnulls(ingredient_id, name, body) >= 1`), `spell_steps_amount_on_ingredient` (no `quantity` or `unit` on a step with no ingredient), `spell_steps_body_not_blank`, `spell_steps_form_only_on_custom` (`ingredient_id is null or form is null`, because `form` beside an ingredient id would be a second copy of half that ingredient's identity), and `spell_steps_name_not_blank` and `spell_steps_form_not_blank` (a blank name would satisfy `num_nonnulls` and name nothing).
- **No unique index on the form.** A spell may lay one form in several steps. A linked layer names its form in `variant_id`, set exactly when `ingredient_id` is (`spell_steps_variant_with_ingredient`) and held to it by the composite key `spell_steps_variant_fk`, so a jar may lay Rosemary herb and Rosemary oil, or the herb twice. The custom-name index, `spell_steps_spell_id_custom_name_unique` on `(spell_id, lower(name)) WHERE ingredient_id IS NULL`, is the one identity index: one custom name per jar, partial on the discriminator so it covers exactly the rows that have the column, and on `deleted_at IS NULL` beside it.
- **Name only, not name plus form, in the custom-name index**, since a custom row is matched against nothing. It is the one judgment call in the shape, and the decision record argues it.
- **A removed layer, custom or linked, is a tombstone**, and what joins through the table goes by `existsIn` ([`hard-delete-join-tables.md`](hard-delete-join-tables.md), "Hard delete on two join tables").
- **`form` is text, not a foreign key**, for the reason a variant's `form` is not (DESIGN.md §5).

`tests/db/partial-unique-indexes.test.ts` proves that a removal frees the depth, the ingredient and the custom name, once for every partial unique index.

### Revision

`spells.revision` is a whole number that starts at 1 and goes up by exactly one on every UPDATE of the row. Autosave (claude-docs/design-decisions/m13.14-autosave.md) sends the revision it last read with each save, so a save made against a row that someone else has changed since is refused rather than overwriting their work.

- **The database moves it, not the service.** A BEFORE UPDATE trigger, `bump_revision`, sets `NEW.revision := OLD.revision + 1` on every row updated, overwriting any value an UPDATE sets. One function serves every table: a table that takes the column adds its own trigger line in its own migration, as each audited table does for `set_updated_at`.
- **It counts writes, not changes.** An UPDATE that leaves every value as it was still moves it.
- **`set_updated_at()` leaves it out of its comparison.** Postgres runs a table's BEFORE triggers in name order, so `bump_revision` runs before `set_updated_at`; without the exclusion, every UPDATE would look like a change and an UPDATE changing nothing would stop keeping `updated_at` and `updated_by` (MB.106).
- **The helper is `revisionColumn()`**, beside `auditColumns` in `src/modules/identity/schema/users.ts`. It is named `revision` rather than `version`, because v2's edit history keeps "version" for a saved snapshot a person can open (claude-docs/design-decisions/m13.14-autosave.md, "`revision`, not `version`").
- **Guard:** `tests/db/revision-trigger.test.ts` fails a table that carries the column without the trigger.

### The grimoire search

`findGrimoirePage` in `src/db/repository/grimoire.ts` runs `weightedSearch` with one arm per field (title, intent), each testing `unaccent_immutable($1) <% unaccent_immutable(column)`, the compendium search's fold ([The compendium read](compendium-read.md)).

- **`spells_unaccent_trgm`** is the index each arm starts from: a GIN trigram index (`gin_trgm_ops`) over `unaccent_immutable(title)` and `unaccent_immutable(intent)`. It is an expression index because a fold reaches a trigram index only through an index over the same expression, and one index over both columns because a multicolumn GIN index serves a test on either column alone. It is not partial, because it reserves nothing; only a unique index must be partial.
- **Guard:** `tests/db/repository/grimoire-search-query.test.ts` explains the page read over about 20,000 spells with sequential scans off and expects both arms to start from the index.

### The Categories filter's counts

`findGrimoireCategoryCounts` in `src/db/repository/grimoire.ts`, behind `countGrimoireCategories` in `spell-reads.ts`, is one grouped read in the shape of the ingredient facets' `categoryFacet`: the spells the page would list, joined to their `spell_categories` pairs and each pair's live category, `count(distinct spells.id)` per category.

- **Visibility is the page's.** The read's `where` is `readableSpells`, the rule every spell finder ANDs, so another member's private spell is never counted (rule 7).
- **The rest of the query applies:** the tab's status and the search, through the same `whereOf` and `searchMatch` as the page. Under `all` the chosen categories stay in force, so each count is that category and the chosen ones together; under `any` they leave the query, so each count is that category alone under the rest of it.
- **A category no spell carries is absent** rather than at zero; the page reads a missing count as zero and the picker does not offer it.

### The four facets' counts

Beside Categories the grimoire filter has Moon Phase, Day of Week, Visibility and Coven Member. `findGrimoireFacetCounts`, behind `countGrimoireFacets` in `spell-reads.ts`, runs one grouped read per facet, together, over `readableSpells` and `count(distinct spells.id)`: another member's private spell is never counted or offered, and nothing of another coven (`readableSpells` ANDs the membership's `workspace_id`). The counts are also the choices: a value no readable spell carries is absent.

- **Each facet's counts drop its own picks** and keep the other facets, the categories, the tab's status and the search in force. A pick within a facet is an alternative; the facets are ANDed (`whereOf`).
- **Moon Phase and Day of Week** compare `lower(btrim(column))`, so `Full Moon` and `full moon ` are one choice, and name the group by its most-used spelling (`mode() within group (order by btrim(column))`, the smallest on a tie). A blank value is not a choice. The column has no vocabulary, so the choices are what spells hold.
- **Visibility** counts `private` and `workspace` of the readable spells, so a member's Private is their own private spells only. The column is named in `visibilityIn` and `visibilityText` in `spells.ts`, beside `readableSpells`, the only places the lint rule `sorrel/spell-visibility-read-in-one-place` allows it; they narrow after `readableSpells` and never decide who reads.
- **Coven Member** groups on `created_by`, the maker, never `updated_by`. It reads spells and not seats, so someone who has left the coven is still a choice while a readable spell of theirs stays. A pick of a user who made no readable spell lists nothing.

### Column decisions

- **`status` is a `spell_status` enum defaulting to `draft`**, on the column rather than in the service, so the default lives where every code path meets it. An enum rather than a text column with a CHECK because §13's viewer-approval workflow adds values to this same column in v2: `ALTER TYPE ... ADD VALUE` is expand-only, where widening a CHECK re-validates every existing row.
- **A spell needs a title only once it is complete.** `title` is nullable because autosave writes the row on the first keystroke, before the member may have named the spell. The CHECK `spells_complete_has_title` (`status <> 'complete' OR title IS NOT NULL`) keeps the rule in the table, so no code path can complete an untitled spell; `validation/spell.ts` states the same rule for the form. It is proved by `tests/modules/grimoire/schema/spells-schema.test.ts`.
- **`intent`, `jarDescription`, `sealWaxColor`, `moonPhase`, `dayOfWeek` and `note` are nullable free text**: a vocabulary a member writes is text (§5), and there is no curated table of moon phases, days or wax colours. The spell builder suggests the eight moon phases and the seven days from constants in code and still saves whatever is typed ([`../components/spell-builder.md`](../components/spell-builder.md)). `moonPhase` and `dayOfWeek` are the recipe's timing, when to work the spell; a working's own day and moon phase follow from its `workedOn` date.
- **`spell_steps.unit` is the `inventory_unit` type**, not a second copy: a tablespoon in a spell is the tablespoon a jar is measured in. `quantity` is `numeric(12, 3)`, built from `quantities.ts`'s precision and scale as the stock columns are, matching `inventory_items.quantityOnHand` exactly, so "do I have enough for this spell" loses no precision on the comparison. Both are nullable: a layer may name no measurement.
- **No `unitDimension` and no dimension CHECK on `spell_steps`**: §5 names neither on this table, and the dimension is derivable through `src/modules/ingredients/schema/units.ts`.
- **No index on `spells`** beyond the primary key's and the search index; a spell title is not unique.
- **No reverse index on `spell_steps`.** §5 asks for one on `ingredient_categories` ("what is in this category") and none here; no v1 feature lists spells by ingredient.

## Grimoire read details

`src/modules/grimoire/services/spell-reads.ts` holds the grimoire's reads: the paged list and its count, one spell, and the batches a spell's fields load through.

- Every read is a reader's of the coven (`spell: ['read']`) and every row comes through the finders that keep a private spell its author's (claude-docs/db/spell-visibility.md), so a spell the reader may not see is `NotFound` by id and absent from a batch. A private spell counts for its author alone, in every count and facet.
- A search shorter than `MIN_QUERY_LENGTH` is dropped, counted in composed code points as the compendium counts it: one character matches nearly every spell.
- A maker in the Coven Member facet is a user id, named by the caller.
- Batches answer one coven at a time: each coven named is checked once, its spells read together, and a ref naming a coven the caller may not read gets a `Forbidden` in its slot while the rest stands. A spell the caller may not read, or one not in the coven its ref names, answers as a spell with no rows.
- Assigned categories are what the author intended, sorted by name; a category deleted since drops out. Derived categories are the union of a linked step's ingredient's own pairs and the pairs of the form it lays, never another form's; a one-off row and an instruction contribute none, and an ingredient deleted since still contributes, read through the finder that keeps it (DESIGN.md §5, "Two kinds of spell category").
- **Step views** (`services/step-views.ts`, internal to the module). A linked ingredient is read through the finder that keeps a deleted one, and its forms through the finder that keeps deleted forms, each marked `deleted`: what went into the jar stays in it. A link to another coven's ingredient reads `null`, as the finder withholds it. Four statements whatever the number of spells. Order is `position`.
- **Category comparison** (`validation/categories/`). `compare` takes category id sets and nothing else, so no quantity or unit reaches it and no `unitConvert` refusal can. The two lists answer different questions and are returned apart, never merged. `summarize` skips a step with no `ingredientId` even if it carries category ids; a custom one-off ingredient is never an `ingredients` row. Both keep first-seen order so results do not shuffle between renders.
