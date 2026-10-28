## The grimoire (M10.2)

`src/modules/grimoire/schema/spells.ts` and `src/modules/grimoire/schema/spell-steps.ts` hold
DESIGN.md §5's two grimoire tables; `0014_cooing_bug.sql` is the migration, and
`0083_spell-steps-expand.sql` made the second one a list of steps (M13.1).
What a workspace _makes_, as against what exists (the compendium) and what it
holds (`inventory_items`).

- **`spells`** — §5's columns, with the full six-column audit spread, and a
  `revision` counter ("Revision (M13.15)" below). Stories 47 and 50's table.
- **`spell_steps`** — §5's columns, `ingredientId` nullable, with the
  full six-column audit spread: soft-deleted (MB.110), keyed on the surrogate `id`,
  with `(spell_id, position)` unique among live rows. Stories 50, 57 and 80's
  table: a step is an instruction (`body`), an ingredient laid in the jar (a
  layer), or both, and a layer's ingredient is one the workspace knows or a
  custom name written for this one jar. It was `spell_ingredients`, every row a
  layer, until M13.1 ("Steps (M13.1)" below). M10.2 shipped it keyed on `(spell_id, ingredient_id)`;
  MB.40 moved the key onto the layer (`0017`) once a row could exist without
  the pair, and MB.110 off it (`0029`) once a removed layer's tombstone would
  have held its depth.

### Steps (M13.1)

M13.1 made the recipe one ordered list ([`m13.1-spell-steps.md`](../design-decisions/m13.1-spell-steps.md)):
`0083` renamed `spell_ingredients` to `spell_steps`, with every index, CHECK
and foreign key renamed after it, and added `position` and `body`. Until M13.9
contracts it, three things from before stay:

- **A view named `spell_ingredients`**, `SELECT * FROM spell_steps`, made after
  the `ADD COLUMN`s so it carries `position` and `body` too. The deploy before
  `0083` reads and writes the rows through it.
- **`layer_order`**, the old name of `position`. The code writes both, the same
  number. `position` is nullable until M13.9, because the deploy before writes
  `layer_order` alone and a `NOT NULL` would refuse its inserts; `0083` filled
  `position` from `layer_order` for the rows already there.
- **`spells.instructions`**, the old name of `spells.note`, filled into it by
  `0083`. The saves write `note` alone and leave `instructions` as it was
  ("Saving a recipe" below).

`tests/db/schema-drift.test.ts` lists all three in `PENDING_DROPS`.

**`visibility` arrived a wave later than the rest of the table** (M10.3,
`0018_spell-visibility.sql`), after M1.23 had seeded spells against it — which
is what made "existing seeded spells migrate to workspace visibility" a
criterion that could be tested rather than one an empty table satisfied for
free (TASKS.md, "Breaking the M1.23 ↔ M10.3 cycle"). The rule it carries is
["Spell visibility"](spell-visibility.md).

### The join names the ingredient, never the stock row

`spell_steps.ingredientId` references `ingredients`. Stock is what a
workspace happens to hold today; a recipe pointing at it would be damaged by
running out of something, and M10.21 tests exactly that. The test proves the
target rather than asserting it twice: an id that exists only in
`inventory_items` is refused with a foreign-key violation naming
`spell_steps_ingredient_id_ingredients_id_fk`, while the same insert
against an ingredient the workspace holds no stock of is accepted. Repoint the
key and the pair swaps which one reddens.

### Position is the identity, and what that costs the reorder

`position` is an integer unique within a spell among live rows:
`spell_steps_spell_id_position_unique` on
`(spell_id, position) WHERE deleted_at IS NULL`. It was `layer_order` until
M13.1, and until M13.9 `layer_order` stays beside it, `NOT NULL`, under its
own index `spell_steps_spell_id_layer_order_unique`, which the code keeps
equal ("Steps (M13.1)" above). M10.2 had the pair as a
unique index beside a `(spell_id, ingredient_id)` key; MB.40 made it the
primary key once a row could exist without an ingredient id; MB.110 moved the
key onto a surrogate `id` once removing a layer became a soft delete, because
a tombstone in a key column would hold its depth for good. Each part is
load-bearing:

- **Stored, not inferred.** Stories 51 and 80 make the order part of the recipe, and no
  query may lean on insertion order.
- **NOT NULL from M13.9**, because a nullable column would satisfy neither half
  of "stored and unique within a spell": distinct NULLs collide with nothing, so
  an unordered row would sit outside the index meant to constrain it. Until
  then `layer_order`'s `NOT NULL` holds that line, and the code writes both.
- **Leading on `spell_id`**, which both scopes the index to the one jar and
  makes it the one that answers "read this spell's steps in order" —
  every read of the table in M10.9 and MB.6.
- **Partial on `deleted_at IS NULL`**, so a removed step frees its place for
  the next step written into the spell — and, by the same predicate on the other
  two indexes, its ingredient and its custom name.
- **A surrogate `id`, which says nothing about the jar.** It is the key
  because the place can no longer be, and it is how a service names one step
  to the writer's by-id methods (`updateById`, `softDeleteByIds`), since it
  cannot build a `where`.

A unique index is checked per row rather than at end of statement, so
**M10.16's reorder cannot be a single `set position = position + 1`
sweep** even though the final state is conflict-free. Nor can it remove and
re-add the spell's rows, which would leave a tombstone per step on every
reorder. It moves the live rows in place, in one transaction: every place out
of range by a scratch offset, then each to its new one. The schema test pins
both — the sweep is refused by the position index, and the two-step move reorders
the steps and leaves no tombstone — so the constraint the reorder has to work
within is written down before the reorder is.

### Saving a recipe (M10.10)

`createSpell` and `updateSpell` (`src/modules/grimoire/services/spells.ts`)
take the recipe as **one ordered list of steps**, and
`src/modules/grimoire/services/recipe.ts` writes it. A step's place is its
index in the list, written to `position` and `layer_order` alike. The list is
the whole recipe:

- **A step with an `id` is a saved step, kept.** The id must name one of this
  spell's live steps, or the save is refused with a `VALIDATION` error at
  `steps[i].id`, so a save cannot reach another spell's step or bring a
  removed one back.
- **A step with no `id` is new**, and is inserted.
- **A saved step left out of the list is removed**, as a soft delete. So one
  save can add, remove and reorder steps together.
- **`updateSpell` with no `steps` at all leaves the recipe as it is**, while an
  empty list removes every step. The rest of the input reads the same way: a
  field left out keeps its value, and null clears it.

The checks, before anything is written:

- **The Zod schema** (`src/modules/grimoire/validation/spell.ts`) refuses a
  step that names both an ingredient and a custom name, or neither and no
  instruction, and a recipe that names one form, one custom name or one step id
  twice. Each of those would otherwise reach a unique index as a bare database
  error.
- **A link is checked only when it is new.** A new step, or a kept step whose
  ingredient or form changed, must name a live form of a live ingredient in the
  compendium or this coven, and the form must belong to the ingredient named
  beside it. Anything else is `VALIDATION` at `steps[i].ingredientId`, not
  `NOT_FOUND`, because it is a field of the form the member can correct. A
  kept step whose link did not change is not checked again, so a step laying
  an ingredient deleted since survives the save ("What a spell holds" in
  [spell-visibility.md](spell-visibility.md)).
- **A step's unit must fit the coven's jar of its form (M13.2, story 77).** A
  jar is a stock row: what the coven holds of one form, counted in one unit.
  When the coven holds a live jar of the form a step lays, the step's unit must
  be one `unitConvert` can turn into the jar's unit (any weight against a
  weight jar, any volume against a volume jar) or, for a count unit (`piece`,
  `drop`, `pinch`), exactly the jar's unit. For example, a `tsp` step against a
  jar in `ml` saves, while a `g` step against it, or a `pinch` step against a
  jar in `piece`, is refused with a `VALIDATION` error at `steps[i].unit`.
  Without this, making the spell could not take the step out of stock.
  - Not checked: a custom step, a form the coven holds no live jar of, a step
    or a jar with no unit, and a kept step whose form and unit did not change.
  - The jars are read in one query for every linked form in the recipe,
    through `jarsOfForms` in `@/modules/ingredients`, under the caller's
    `Membership`, so only the caller's coven's jars are read. Every role that
    writes a spell may also read stock.
  - A jar whose unit changes after the spell is saved does not block a later
    save of that step. Warning about that drift is M13.5's job, when a
    working takes the spell out of stock.

The write, inside one `withAudit` transaction:

1. The removed steps are soft-deleted first, which frees their places and
   their ingredients for the steps that follow.
2. **Every kept step that moves, or changes what it lays, is first moved
   aside**: to a negative place, and, if it changes what it lays, to no
   ingredient and a custom name made from its own id. Each unique index is
   checked row by row, so without this a swap of two steps' places or
   ingredients would collide halfway through (the reorder constraint in
   "Position is the identity" above).
3. Each kept step is then written with its final columns. **A step the save
   leaves exactly as it was is not written**, so its `updated_by` and
   `updated_at` go on saying who last changed it.
4. The new steps are inserted.

`updateSpell` writes the spell row through `updateRevisioned` with the
`expectedRevision` the caller sends ("Revision (M13.15)" above). Null writes
whatever the revision is. A revision that is no longer current throws
`StaleWrite`, answered on the wire as `STALE_WRITE` with the current revision,
and nothing is written. Over GraphQL the field must be sent, even as null: a
save that leaves it out is refused as `VALIDATION`, so a client that forgets
it cannot overwrite another member's save. A visibility in the input follows
the one-way rule of [spell-visibility.md](spell-visibility.md).

### Saving its categories (M10.14)

A spell has two kinds of category. The ones its author **assigns** say what
the spell intends, and live in `spell_categories`. The ones **derived** from
its ingredients are read from those ingredients and never written here. Only
the assigned ones are saved, by `createSpell` and `updateSpell` taking
`categoryIds` (`services/spell-categories.ts`).

- The ids are the whole set, the same way `steps` is the whole recipe: a
  category on the spell that the save leaves out is unassigned. On
  `updateSpell`, leaving `categoryIds` out leaves the set as it is, and `[]`
  empties it. An id sent twice is written once, because a category is a chip
  that is either on or off.
- An id that names no live category (one deleted since the builder loaded
  it, or one that never existed) is refused before anything is written,
  at `['categoryIds', index]`. An id that is not a uuid is refused earlier,
  by the schema, at the same path.
- A kept pair is not written again; a dropped one is hard-deleted, because
  the table has no `deleted_at` (MB.34); a new one is inserted, stamped by the
  session. **A pair whose category was soft-deleted since is kept**, even
  though the save leaves it out. The builder never shows a deleted category,
  so it could never send it, and keeping the pair lets a restore of the
  category bring it back. The ingredient form's categories work the same
  way (`replaceCategories` in `ingredients/services/ingredient-rows.ts`).
- The table carries no `workspace_id`. The spell is read as the caller
  first, so its pairs can be written exactly when the spell can.

### Custom ingredients (MB.40)

For story 57, a step's ingredient is either one the workspace knows
(`ingredient_id`) or a name written for this one jar (`name`, with an optional
free-text `form`) — at most one of the two, and none on an instruction-only
step (story 80). The design argument is in DESIGN.md
§5 and [`mb.40-custom-spell-ingredients.md`](../design-decisions/mb.40-custom-spell-ingredients.md);
this is what holds it in the database.

- **`ingredient_id` is nullable, and the foreign key stays.** Nullability costs
  nothing in integrity because the first CHECK below forbids the row that would
  exploit it — §14's "nullable FKs plus `num_nonnulls`" idiom.
- **The CHECKs**, each named so a refusal says which rule it broke:
  `spell_steps_one_identity` is `num_nonnulls(ingredient_id, name) <= 1`, so
  a step never names both; `spell_steps_not_empty` is
  `num_nonnulls(ingredient_id, name, body) >= 1`, so a step is never empty.
  The two replaced MB.40's `spell_ingredients_ingredient_or_name`,
  `num_nonnulls(ingredient_id, name) = 1`, in M13.1, once a row could be an
  instruction alone. `spell_steps_amount_on_ingredient` refuses `quantity`,
  `unit` or `note` on a step with no ingredient, since each describes one, and
  `spell_steps_body_not_blank` is the not-blank idiom on `body`.
  `spell_steps_form_only_on_custom` is
  `ingredient_id is null or form is null`, because `form` beside an ingredient
  id would be a second copy of half that ingredient's identity;
  `spell_steps_name_not_blank` and `spell_steps_form_not_blank` are
  the `ingredients_form_not_blank` idiom, since a blank name would satisfy
  `num_nonnulls` and name nothing.
- **Two partial unique indexes, one per kind of row.**
  `spell_steps_spell_id_variant_id_unique` on
  `(spell_id, variant_id)`, live rows only, is one form per jar since MB.217,
  where `spell_ingredients_spell_id_ingredient_id_unique` was one ingredient
  per jar — what the M10.2 key used to give. A linked layer names its form in
  `variant_id`, set exactly when `ingredient_id` is
  (`spell_steps_variant_with_ingredient`) and held to it by the
  composite key `spell_steps_variant_fk`, so a jar may lay Rosemary
  herb and Rosemary oil. Migration `0063` filled each existing linked layer
  from its ingredient's one live variant, refusing a database where one had
  none or several; and
  `spell_steps_spell_id_custom_name_unique` on
  `(spell_id, lower(name)) WHERE ingredient_id IS NULL` is one custom name per
  jar, the shape of `ingredients_workspace_label_unique`. Both are partial on
  the discriminator, so each index covers exactly the rows that have the column
  it is unique on, and since MB.110 on rule 4's `deleted_at IS NULL` beside it.
- **Name only, not name plus form, in the custom-name index**, since a custom
  row is matched against nothing. It is the one judgment call in the shape,
  and the decision record argues it.
- **Soft-deleted with the rest of the table** (MB.110): a removed layer, custom
  or linked, is a tombstone, and what joins through the table goes by
  `existsIn` ([`hard-delete-join-tables.md`](hard-delete-join-tables.md), "Hard
  delete on two join tables").
- **`form` is text, not a foreign key**, for the reason a variant's `form` is
  not (DESIGN.md §5).

`spell-steps-schema.test.ts` proves every refusal by its
`constraint_name` and pairs each with the insert that shows why it could have
succeeded: `form` on a linked row is refused where the same `form` on a custom
row is accepted; `Threshold Salt` and `threshold salt` collide in one jar and
not across two; the same ingredient twice is refused by the partial index, a
place collision by the position index; an instruction-only step, an
ingredient-only step and a step with both are each accepted, and an empty
step, a blank instruction and an amount on an instruction alone are each
refused. That a removal frees the depth, the
ingredient and the custom name is `tests/db/partial-unique-indexes.test.ts`'s,
once for every partial unique index (MB.226). What Wave 13 inherits — the Zod exclusive-or, the
skip in derived categories, no suppression, no held/not-held, no safety source
— is written into each task's criteria rather than left to be remembered.

### Revision (M13.15)

`0084_spells-revision-and-draft-title.sql` gives every spell a `revision`: a
whole number that starts at 1 and goes up by exactly one on every UPDATE of the
row. Autosave (M13.14, claude-docs/design-decisions/m13.14-autosave.md) sends
the revision it last read with each save, so a save made against a row that
someone else has changed since can be refused rather than overwrite their
work. M13.15 added the column only; M10.10's `updateSpell` is the first save
that checks it ("Saving a recipe" below).

- **The database moves it, not the service.** A BEFORE UPDATE trigger,
  `bump_revision`, sets `NEW.revision := OLD.revision + 1` on every row
  updated. No code path can forget it, and a value an UPDATE sets for
  `revision` itself is overwritten. One function serves every table: a table
  that takes the column adds its own trigger line in its own migration, as each
  audited table does for `set_updated_at`.
- **It counts writes, not changes.** An UPDATE that leaves every value as it
  was still moves it. A save that changed nothing has still written after
  whatever another editor read.
- **`set_updated_at()` leaves it out of its comparison.** Postgres runs a
  table's BEFORE triggers in name order, so `bump_revision` runs before
  `set_updated_at`. Without the exclusion, every UPDATE would look like a
  change, and MB.106's rule that an UPDATE changing nothing keeps
  `updated_at` and `updated_by` would stop holding on spells. 0084 redefines
  `set_updated_at()` with `revision` beside `updated_at` and `updated_by`
  in the list of columns it ignores.
- **The helper is `revisionColumn()`**, beside `auditColumns` in
  `src/modules/identity/schema/users.ts`, so a later table takes the same
  column definition. It is named `revision` rather than `version`, because
  v2's edit history keeps "version" for a saved snapshot a person can open, and
  a counter that moves on every autosave is not that
  (claude-docs/design-decisions/m13.14-autosave.md, "`revision`, not
  `version`").
- **Guards:** `tests/db/revision-trigger.test.ts` fails a table that carries
  the column without the trigger, and proves the counter's behaviour.

### The grimoire search

The grimoire list's search (M10.11) matches a spell's title or intent as a word or
part of one, with accents and case set aside: `findGrimoirePage` in
`src/db/repository/grimoire.ts` runs `weightedSearch`, with one arm per field.
Each arm tests `unaccent_immutable($1) <% unaccent_immutable(column)`, the
compendium search's fold ([The compendium read](compendium-read.md)).

- **`spells_unaccent_trgm`** (`0085_spells-unaccent-trgm.sql`) is the index
  each arm starts from: a GIN trigram index (`gin_trgm_ops`) over
  `unaccent_immutable(title)` and `unaccent_immutable(intent)`. It is an
  expression index because a fold reaches a trigram index only through an index
  over the same expression, and it is one index over both columns because a
  multicolumn GIN index serves a test on either column alone, as
  `ingredients_unaccent_trgm` does. It is not partial, because it reserves
  nothing; only a unique index must be partial.
- **Guard:** `tests/db/repository/grimoire-search-query.test.ts` explains the
  page read the finder sends over about 20,000 spells and expects both arms to
  start from the index. Like the compendium's plan test, it turns sequential
  scans off, so it asks whether the index can be reached, not what the planner
  prefers. With sequential scans allowed, the planner still starts both arms
  from the index; it reads the coven's spells in full only to join the matches
  back to them, a hash join that costs less than the search.

### The Categories filter's counts

The grimoire list's Categories filter (M10.11) shows how many spells each
category holds: `findGrimoireCategoryCounts` in `src/db/repository/grimoire.ts`,
behind `countGrimoireCategories` in `spell-reads.ts`. It is one grouped read,
in the shape of the ingredient facets' `categoryFacet`
([The compendium read](compendium-read.md)): the spells the page would list,
joined to their `spell_categories` pairs and each pair's live category,
`count(distinct spells.id)` per category.

- **Visibility is the page's.** The read's `where` is `readableSpells`, the
  rule every spell finder ANDs, so another member's private spell is never
  counted (rule 7).
- **The rest of the query applies:** the tab's status and the search, through
  the same `whereOf` and `searchMatch` as the page. Under `all` the chosen
  categories stay in force, so each count is that category and the chosen
  ones together; under `any` they leave the query, so each count is that
  category alone under the rest of it.
- **A category no spell carries is absent** rather than at zero; the page
  reads a missing count as zero and the picker does not offer it.

### The rest of the calls, and the ones not made

- **`status` is a `spell_status` enum defaulting to `draft`**, on the column
  rather than in the service: M10.20's "new spells default to draft" is a
  default that lives in one code path only if it is written where every code
  path meets it. An enum rather than a text column with a CHECK because §13's
  viewer-approval workflow adds `proposed` and `approved` to this same column in
  v2 — `ALTER TYPE ... ADD VALUE` is expand-only, where widening a CHECK
  re-validates every existing row.
- **A spell needs a title only once it is complete.** M10.2 shipped `title`
  as `NOT NULL`, the only required field. M13.15 dropped the `NOT NULL`,
  because autosave writes the row on the first keystroke, before the member may
  have named the spell. The CHECK `spells_complete_has_title`,
  `status <> 'complete' OR title IS NOT NULL`, keeps the rule that a finished
  spell has a name, in the table, so no code path can complete an untitled
  spell. `src/modules/grimoire/validation/spell.ts` states the same rule for
  the form. `intent`, `jarSize`,
  `sealWaxColor`, `moonPhase`, `dayOfWeek` and `note` are all nullable
  free text — §5's rule that a vocabulary a member writes is text, and there is
  no curated vocabulary table of moon phases, days or wax colours to make a
  foreign key out of. The spell builder suggests the eight moon phases and the
  seven days from constants in code and still saves whatever is typed, so the
  columns stay free text and hold values written before the lists, such as
  "Full" (the owner, 2026-10-27;
  [`../components/spell-builder.md`](../components/spell-builder.md)).
  `moonPhase` and `dayOfWeek` are the recipe's timing, meaning when to work
  the spell, not a record of when it was worked. A working's own day and moon
  phase follow from its `workedOn` date (M13.4).
- **`spell_steps.unit` is M9.2's `inventory_unit`**, the same Postgres
  type and not a second copy of it: a tablespoon in a spell is the tablespoon a
  jar is measured in, and M9.5 converts between them. The type keeps its
  `inventory_unit` name — renaming it to suit a second consumer would be a
  `RENAME` under rule 10 for no gain. `quantity` is `numeric(12, 3)`, built from
  `quantities.ts`'s precision and scale as the stock columns are (MB.207), matching
  `inventory_items.quantityOnHand` exactly, so "do I have enough for this spell"
  loses no precision on the comparison. Both are nullable: a layer may name no
  measurement at all.
- **No `unitDimension` and no dimension CHECK on `spell_steps`.** §5 names
  neither on this table, the dimension is derivable through `src/modules/ingredients/schema/units.ts`,
  and the query that groups stock by dimension has no counterpart here.
- **No index on `spells`**, beyond the primary key's, and one CHECK, the
  title rule above. §5 names no index, the grimoire's own lookups are M10.9's,
  and a spell title is not unique — two workings may share a name in one coven.
- **No reverse index on `spell_steps`.** §5 asks for one on
  `ingredient_categories` ("what is in this category") and asks for none here;
  no v1 feature lists spells by ingredient, so the asymmetry is §5's rather than
  an oversight.

Both tables were inert until Wave 13. Nothing queried them until M10.5's service
and M10.10's mutations landed — the table-task-then-behaviour-task rule, the
reason the DDL could be constrained at Wave 3 while the tables were empty, and
the reason MB.40 could reshape `spell_ingredients` in Wave 4, and MB.110 in
Wave 8, as a contract migration against zero rows rather than as a retrofit
across every consumer.

Every guard above was verified load-bearing rather than assumed, by rebuilding
the shipped migration with each stripped in turn: without the layer index two
ingredients sit at depth 1, without `NOT NULL` an unordered row inserts, with
the key repointed at `inventory_items` a stock-only id is accepted, without the
composite key the same ingredient joins a spell twice, without the default a new
spell's status comes back null, and without `NOT NULL` on `title` a nameless
spell is recorded. M13.15 has since let a draft go nameless on purpose; its
CHECK is proved by `tests/modules/grimoire/schema/spells-schema.test.ts`. MB.110's were checked the same way: with
`deleted_at IS NULL` stripped from the layer index or the ingredient index, a
removed layer's depth or ingredient stays reserved.
