## The grimoire (M10.2)

`src/modules/grimoire/schema/spells.ts` and `src/modules/grimoire/schema/spell-ingredients.ts` hold
DESIGN.md §5's two grimoire tables; `0014_cooing_bug.sql` is the migration.
What a workspace _makes_, as against what exists (the compendium) and what it
holds (`inventory_items`).

- **`spells`** — `id`, `workspaceId`, `title`, `intent`, `jarSize`,
  `sealWaxColor`, `moonPhase`, `dayOfWeek`, `instructions`, `status`,
  `visibility`, + the full six-column audit spread. Stories 47 and 50's table.
- **`spell_ingredients`** — `id`, `spellId`, `ingredientId` (nullable),
  `name`, `form`, `quantity`, `unit`, `layerOrder`, `note`, + the full
  six-column audit spread: soft-deleted (MB.110), keyed on the surrogate `id`,
  with `(spell_id, layer_order)` unique among live rows. Stories 50 and 57's
  table: a layer is an ingredient the workspace knows or a custom name written
  for this one jar. M10.2 shipped it keyed on `(spell_id, ingredient_id)`;
  MB.40 moved the key onto the layer (`0017`) once a row could exist without
  the pair, and MB.110 off it (`0029`) once a removed layer's tombstone would
  have held its depth.

**`visibility` arrived a wave later than the rest of the table** (M10.3,
`0018_spell-visibility.sql`), after M1.23 had seeded spells against it — which
is what made "existing seeded spells migrate to workspace visibility" a
criterion that could be tested rather than one an empty table satisfied for
free (TASKS.md, "Breaking the M1.23 ↔ M10.3 cycle"). The rule it carries is
["Spell visibility"](spell-visibility.md).

### The join names the ingredient, never the stock row

`spell_ingredients.ingredientId` references `ingredients`. Stock is what a
workspace happens to hold today; a recipe pointing at it would be damaged by
running out of something, and M10.21 tests exactly that. The test proves the
target rather than asserting it twice: an id that exists only in
`inventory_items` is refused with a foreign-key violation naming
`spell_ingredients_ingredient_id_ingredients_id_fk`, while the same insert
against an ingredient the workspace holds no stock of is accepted. Repoint the
key and the pair swaps which one reddens.

### Layer order is the identity, and what that costs the reorder

`layerOrder` is `integer NOT NULL` and unique within a spell among live rows:
`spell_ingredients_spell_id_layer_order_unique` on
`(spell_id, layer_order) WHERE deleted_at IS NULL`. M10.2 had the pair as a
unique index beside a `(spell_id, ingredient_id)` key; MB.40 made it the
primary key once a row could exist without an ingredient id; MB.110 moved the
key onto a surrogate `id` once removing a layer became a soft delete, because
a tombstone in a key column would hold its depth for good. Each part is
load-bearing:

- **Stored, not inferred.** Story 51 makes layering part of the recipe, and no
  query may lean on insertion order.
- **NOT NULL**, because a nullable column would satisfy neither half of "stored
  and unique within a spell": distinct NULLs collide with nothing, so an
  unordered row would sit outside the index meant to constrain it.
- **Leading on `spell_id`**, which both scopes the index to the one jar and
  makes it the one that answers "read this spell's ingredients in order" —
  every read of the table in M10.9 and MB.6.
- **Partial on `deleted_at IS NULL`**, so a removed layer frees its depth for
  the next layer written into the jar — and, by the same predicate on the other
  two indexes, its ingredient and its custom name.
- **A surrogate `id`, which says nothing about the jar.** It is the key
  because the layer can no longer be, and it is how a service names one layer
  to the writer's by-id methods (`updateById`, `softDeleteByIds`), since it
  cannot build a `where`.

A unique index is checked per row rather than at end of statement, so
**M10.16's reorder cannot be a single `set layer_order = layer_order + 1`
sweep** even though the final state is conflict-free. Nor can it remove and
re-add the jar's rows, which would leave a tombstone per layer on every
reorder. It moves the live rows in place, in one transaction: every depth out
of range by a scratch offset, then each to its new one. The schema test pins
both — the sweep is refused by the layer index, and the two-step move reorders
the jar and leaves no tombstone — so the constraint the reorder has to work
within is written down before the reorder is.

### Custom ingredients (MB.40)

Story 57: a spell may call for something the workspace will never stock. A row
in `spell_ingredients` is either an ingredient the workspace knows
(`ingredient_id`) or a name written for this one jar (`name`, with an optional
free-text `form`) — exactly one of the two. The design argument is in DESIGN.md
§5 and [`mb.40-custom-spell-ingredients.md`](../design-decisions/mb.40-custom-spell-ingredients.md);
this is what holds it in the database.

- **`ingredient_id` is nullable, and the foreign key stays.** Nullability costs
  nothing in integrity because the first CHECK below forbids the row that would
  exploit it — §14's "nullable FKs plus `num_nonnulls`" idiom.
- **Four CHECKs**, each named so a refusal says which rule it broke:
  `spell_ingredients_ingredient_or_name` is
  `num_nonnulls(ingredient_id, name) = 1`;
  `spell_ingredients_form_only_on_custom` is
  `ingredient_id is null or form is null`, because `form` beside an ingredient
  id would be a second copy of half that ingredient's identity;
  `spell_ingredients_name_not_blank` and `spell_ingredients_form_not_blank` are
  the `ingredients_form_not_blank` idiom, since a blank name would satisfy
  `num_nonnulls` and name nothing.
- **Two partial unique indexes, one per kind of row.**
  `spell_ingredients_spell_id_ingredient_id_unique` on
  `(spell_id, ingredient_id) WHERE ingredient_id IS NOT NULL` is one ingredient
  per jar — what the M10.2 key used to give — and
  `spell_ingredients_spell_id_custom_name_unique` on
  `(spell_id, lower(name)) WHERE ingredient_id IS NULL` is one custom name per
  jar, the shape of `ingredients_workspace_label_unique`. Both are partial on
  the discriminator, so each index covers exactly the rows that have the column
  it is unique on, and since MB.110 on rule 4's `deleted_at IS NULL` beside it.
- **Name only, not name plus form, in the custom-name index.** A custom row is
  never matched against anything, so there is no identity key for `form` to be
  part of; a jar that wants valerian root and valerian leaf writes two names.
  This is the one judgment call in the shape, and the decision record says so.
- **Soft-deleted with the rest of the table** (MB.110). MB.40 kept the table
  hard-deleted on MB.34's argument: the `deleted_at IS NULL` a service joining
  _through_ it would have to remember by hand, which is how derived categories
  (M10.7) reach `ingredient_categories`. M5.3 settled it the other way. A
  spell is a record of a working, so a removed layer, custom or linked, is a
  tombstone, and what joins through the table does so by `existsIn`, which ANDs
  the layer's filter by construction.
- **`form` is text, not a foreign key**, for the reason `ingredients.form` is
  not: a member must be able to write `rhizome` before anyone has curated it.

`spell-ingredients-schema.test.ts` proves every refusal by its
`constraint_name` and pairs each with the insert that shows why it could have
succeeded: `form` on a linked row is refused where the same `form` on a custom
row is accepted; `Threshold Salt` and `threshold salt` collide in one jar and
not across two; the same ingredient twice is refused by the partial index, a
layer collision by the layer index. Each reuse after a removal — the depth, the
ingredient, the custom name — is shown refused while the row was live. What Wave 13 inherits — the Zod exclusive-or, the
skip in derived categories, no suppression, no held/not-held, no safety source
— is written into each task's criteria rather than left to be remembered.

### The rest of the calls, and the ones not made

- **`status` is a `spell_status` enum defaulting to `draft`**, on the column
  rather than in the service: M10.20's "new spells default to draft" is a
  default that lives in one code path only if it is written where every code
  path meets it. An enum rather than a text column with a CHECK because §13's
  viewer-approval workflow adds `proposed` and `approved` to this same column in
  v2 — `ALTER TYPE ... ADD VALUE` is expand-only, where widening a CHECK
  re-validates every existing row.
- **`title` is the only required field on a spell.** §8's acceptance example
  creates one with a workspace and a title and nothing else, and a draft is the
  state a spell is saved in _before_ it is finished. `intent`, `jarSize`,
  `sealWaxColor`, `moonPhase`, `dayOfWeek` and `instructions` are all nullable
  free text — §5's rule that a vocabulary a member writes is text, and there is
  no curated list of moon phases or wax colours anywhere in the design to make a
  foreign key out of.
- **`spell_ingredients.unit` is M9.2's `inventory_unit`**, the same Postgres
  type and not a second copy of it: a tablespoon in a spell is the tablespoon a
  jar is measured in, and M9.5 converts between them. The type keeps its
  `inventory_unit` name — renaming it to suit a second consumer would be a
  `RENAME` under rule 10 for no gain. `quantity` is `numeric(12, 3)`, matching
  `inventory_items.quantityOnHand` exactly, so "do I have enough for this spell"
  loses no precision on the comparison. Both are nullable: a layer may name no
  measurement at all.
- **No `unitDimension` and no dimension CHECK on `spell_ingredients`.** §5 names
  neither on this table, the dimension is derivable through `src/modules/ingredients/schema/units.ts`,
  and the query that groups stock by dimension has no counterpart here.
- **No index and no CHECK on `spells`**, beyond the primary key's. §5 names
  none, the grimoire's own lookups are M10.9's, and a spell title is not unique
  — two workings may share a name in one coven.
- **No reverse index on `spell_ingredients`.** §5 asks for one on
  `ingredient_categories` ("what is in this category") and asks for none here;
  no v1 feature lists spells by ingredient, so the asymmetry is §5's rather than
  an oversight.

Both tables are inert until Wave 13. Nothing queries them until M10.5's service
and M10.10's mutations land — the table-task-then-behaviour-task rule, the
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
spell is recorded. MB.110's were checked the same way: with
`deleted_at IS NULL` stripped from the layer index or the ingredient index, a
removed layer's depth or ingredient stays reserved.
