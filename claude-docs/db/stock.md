## Stock, and the one module that owns the units (M9.2)

`src/modules/ingredients/schema/inventory-items.ts` holds DESIGN.md §5's stock
table; `0013_illegal_red_hulk.sql` is the migration. The unit vocabulary it is
built from sits beside it, in `src/modules/ingredients/schema/units.ts`, and
imports nothing.

- **`inventory_items`** — §5's columns, with the full six-column audit
  spread. Story 20's table: what a
  workspace _holds_, as against what exists (the compendium) and what it makes
  (the grimoire).
- **Stock hangs off the ingredient, never the other way round.** A compendium
  entry carries no quantity; an ingredient gains one only when a workspace adds
  it, which is this row. It is also why `spell_ingredients` (M10.2) references
  `ingredients` rather than this table — a saved spell survives running out of
  something, and M10.21 tests exactly that.
- **`inventory_items_workspace_id_variant_id_unique`** is §5's partial
  unique index on the pair, the variant rather than the ingredient since
  MB.217: a row names the form the jar holds through `variant_id`, NOT NULL,
  held to its `ingredient_id` by the composite key
  `inventory_items_variant_fk`, so Rosemary herb and Rosemary oil are two
  rows of one coven. It is what "already added" _means_: M9.3's `createStock`, which M9.4's
  `addIngredientToWorkspace` calls, refuses a held form on it rather than
  defining the notion again. The predicate is
  load-bearing rather than ceremonial here — story 25 soft-deletes a row and
  calls it recoverable, so without it, throwing a jar out would reserve that
  ingredient against ever being stocked again. Verified by rebuilding the
  shipped migration with the predicate stripped, where re-adding after a
  soft delete is refused with a unique violation.

### One module owns the units

`src/modules/ingredients/schema/units.ts` is the single source of §5's
vocabulary, its three dimensions and their units. Both pgEnums (`inventory_unit`,
`unit_dimension`), the CHECK constraint below, M9.5's `unitConvert()` (in `src/modules/ingredients/units/convert.ts`), M9.8's
badges and every later Zod enum are built from it. **Adding a unit is one
edit** — that map, plus a regenerated migration.

It imports nothing, and that is what makes it importable from all three sides
despite sitting in `schema/`: the tables import it relatively, and so do the
conversion library and the Zod schemas, which must not reach the database
layer at all (rule 2, MB.33) — a file that imports no `drizzle-orm` carries
none in. It sits in `schema/` rather than in `src/lib/` because the tables are
built from it, which puts it in the graph drizzle-kit loads.

`fl oz` is stored as two values, **`fl_oz_uk`** and **`fl_oz_us`**, because the two fluid ounces are different sizes: a British kitchen's is 28.413 ml and a US bottle's is 29.574 ml, about four per cent apart. A single `fl_oz` would force `unitConvert()` to guess which one a recipe means. M11.17 made the change: migration `0072_fluid-ounces` renamed the stored `fl_oz` to `fl_oz_uk` and added `fl_oz_us`, so a row saved before it reads as the British ounce. §5 names the unit in prose, where a space is how a human writes it; the stored label has to survive a Postgres enum, a GraphQL enum (M9.4) and a URL query parameter (M9.7's filter chips), and of those a GraphQL enum value cannot contain a space at all. The unit is §5's; only its spelling is settled here, and how it is _displayed_ stays a question for the UI tasks rather than a column value.

The schema file is forbidden to spell a unit or a dimension out, and that is
asserted as a property of its source text rather than of its values: equal
lists stay equal when someone pastes the vocabulary in beside the import, while
a literal `'tsp'` in the file's code does not survive the guard. Comments are
stripped before the scan — prose quoting `unit_dimension = 'weight'` to explain
the constraint is what a reader needs, and a comment cannot drift from the
module because nothing reads it.

### The dimension stored beside the unit

`unitDimension` is stored for §5's reason, and so M9.5 has something to check
against. The redundancy is deliberate, and
`inventory_items_unit_matches_dimension` is what pays for it, refusing the
contradiction §5 rules out. The
expression is generated from the same map the enums are, so the constraint
cannot fall behind the vocabulary it constrains.

It is written as two conjuncts, and the first is not optional:

```sql
(unit is null) = (unit_dimension is null)
and (unit is null or ((unit_dimension = 'weight' and unit in ('mg', …)) or …))
```

A CHECK passes on NULL, so `unit_dimension = 'weight'` against a null dimension
evaluates to NULL rather than to false — and a disjunction of dimension clauses
_alone_ therefore admits exactly the half-null rows it looks like it refuses.
That was the first version of this expression, and the test caught it: `unit =
'g'` with no dimension beside it inserted cleanly. The biconditional between
two `is null` tests — the idiom `ingredients_nomenclature_declares_canonical_name`
already uses — has non-null booleans on both sides and is decisive either way.
Both failure modes were then re-verified against the shipped migration with
each half stripped in turn.

A stub row (both null) is admitted, because it claims nothing and so
contradicts nothing.

### Converting between units

`unitConvert(value, from, to)`, in `src/modules/ingredients/units/convert.ts`
and exported from `@/modules/ingredients` (M9.5), turns an amount in one unit
into another of the same dimension: teaspoons into millilitres, ounces into
grams. It imports only the two schema files that import nothing, `units.ts`
and `quantities.ts`, so it reaches no database code and could load in the
browser.

**What it answers.** A result the caller has to test, `{ ok: true, value }` or
`{ ok: false, reason }`. A refusal has no `value` at all, so TypeScript will
not let a caller read one as a number without checking `ok` first. It refuses
two kinds of pair:

- **`dimension`**: weight to volume, or volume to weight. Grams to teaspoons
  depends on what is being measured, and a wrong guess silently doubles or
  halves an ingredient in a working.
- **`count`**: any pair with a count unit in it, `piece` to `piece` included.
  Three pinches is no amount of millilitres, and no amount of pieces either.

**The sizes.** Each unit has one size in its dimension's base unit, milligrams
for weight and millilitres for volume, as the owner chose them on 2026-10-13:

| Weight | Size             | Volume     | Size             |
| ------ | ---------------- | ---------- | ---------------- |
| `mg`   | 1 mg             | `ml`       | 1 ml             |
| `g`    | 1,000 mg         | `l`        | 1,000 ml         |
| `kg`   | 1,000,000 mg     | `tsp`      | 5 ml             |
| `oz`   | 28,349.523125 mg | `tbsp`     | 15 ml            |
| `lb`   | 453,592.37 mg    | `cup`      | 250 ml           |
|        |                  | `fl_oz_uk` | 28.4130625 ml    |
|        |                  | `fl_oz_us` | 29.5735295625 ml |

Spoons and the cup are metric, as a British kitchen measures them, and both
fluid ounces are kept because a recipe's origin decides which it means. The
sizes are keyed by dimension, so no size can join two dimensions, and count
has none. A unit added to `units.ts` is a type error in the converter until it
is given a size.

**Exact, then rounded once.** The sizes are written as decimal text rather
than JavaScript numbers, because 29.5735295625 has no exact binary form. The
converter turns the amount and both sizes into whole numbers (`BigInt`), works
out amount × source size ÷ target size as one fraction, and rounds only that,
to three decimals, the scale of the stock columns' `numeric(12,3)`. Rounding at
the base unit on the way would be a thousandth out often enough to matter:
0.525 oz is 14,883.499640625 mg, which rounds to 14,883.5 mg and then to
14.884 g, where the true answer is 14.883 g. A half rounds up, as Postgres
rounds a positive `numeric`, so the value returned is the value the column
would store. A negative amount, like one that is not a finite number, throws:
the stock schema refuses both before a service could pass one in.

**Round trips.** Out to a unit no larger and back returns the original
exactly. Out to a larger unit loses what three decimals of it cannot hold: 1 mg
is 0.000 lb, and comes back as 0 mg. That is the column's precision rather
than the converter's, and the return is never further off than half a
thousandth of the larger unit.

**No density table**, anywhere in the app: DESIGN.md §11 refuses
cross-dimension conversion outright. The converter's sizes are keyed by
dimension, so it has nowhere to put one; elsewhere the rule is held by review.

### Nullability, and why zero is not the same as nothing

`quantityOnHand` is nullable because **zero is already taken**: M9.8 renders
`0` as out of stock, so a NOT NULL column with no default would force every add
to claim a number it may not have, and "held, not yet weighed" would be
unsayable except as a lie. `unit`, `unitDimension`, `lowStockThreshold`,
`source` and `acquiredDate` are nullable for the same reason and are pinned by
test: `0.000` and `NULL` are asserted to be distinguishable on the row.

- `quantityOnHand` and `lowStockThreshold` are `numeric(12, 3)`, not floats:
  0.1 kg has to come back as 0.1, and M9.5's round-trip criterion is unmeetable
  on a type that cannot represent the input. Three decimal places is a
  milligram expressed in grams — the finest distinction any unit pair in the
  vocabulary can make — and §5 names no figure, so the reasoning sits here.
  Both columns take precision and scale from `schema/quantities.ts`, which
  also gives `StockInput` its ceiling of 999,999,999.999, so an amount the
  column cannot hold is a field error rather than a raw overflow
  ([`validation.md`](../validation.md)).
- `lowStockThreshold` carries **no database default**. M9.3's `createStock` writes §5's
  dimension-appropriate value onto the row at creation (M9.8 shows it) rather than applying
  a constant at read time, so it stays visible and editable and changing the
  constant later does not silently reinterpret every existing row. A column
  default could not do it anyway: the value depends on the row's own unit,
  which a default cannot see.
- `source` is where the _stock_ came from — "Miller's farm stand", "foraged by
  the creek" — free text and member-written, per §5's rule that a vocabulary a
  member writes is text while one only an admin writes is a foreign key. It is
  **not** story 27's local-versus-compendium distinction, which M9.7 reads off
  `ingredients.workspace_id` and which never touches this column: that is where
  the _entry_ came from, this is where the stock did.
- `acquiredDate` is a `date`, not a timestamp. Nobody records the hour they
  were handed a jar.

No other constraint is declared. Non-negative checks on the two quantities
would be reasonable and §5 does not name them, so they are not here — the rule
against hooks the design doc does not name applies to CHECKs as readily as to
columns. A negative quantity is a validation error with something to say, which
makes it the service and Zod layers' job rather than a constraint's.

The table was inert from Wave 3 until M9.3's service in Wave 11, which is the
table-task-then-behaviour-task rule and the reason the DDL could be constrained
while the table was empty.

### The stock service

`src/modules/ingredients/services/stock.ts` (M9.3) is how anything reads or
writes a coven's stock. It has six functions, each taking the coven's id and
checking membership first:

| Function                                               | Checks              | What it does                                                                       |
| ------------------------------------------------------ | ------------------- | ---------------------------------------------------------------------------------- |
| `createStock(session, workspaceId, variantId, input)`  | `inventory: update` | Starts a jar of one form the coven does not hold yet, stored on that form (M12.28) |
| `updateStock(session, workspaceId, id, input)`         | `inventory: update` | Changes a jar: a field left out keeps its value, `null` clears it                  |
| `deleteStock(session, workspaceId, id)`                | `inventory: update` | Soft-deletes a jar: marks it deleted, leaving the row in place                     |
| `saveStock(session, workspaceId, ingredientId, batch)` | `inventory: update` | One ingredient's creates, updates and deletes in one transaction (M9.9)            |
| `getStock(session, workspaceId, id)`                   | `inventory: read`   | One jar, for any member of the coven, viewers included                             |
| `stockOf(session, refs)`                               | `inventory: read`   | The jars of many ingredients at once, for `Ingredient.stock`                       |
| `heldFormsOf(session, refs)`                           | `ingredient: read`  | The forms of compendium entries a coven holds, a retired one included (M9.12)      |

The permission is the `inventory` statement in
`src/modules/coven/services/access-control.ts`: viewers hold `read`, members
and owners `read` and `update`. The statement has no `create` or `delete`,
so all four writes check `update`; the `ingredient` statement is not used for
stock.

- **A jar is read through a live form of a live ingredient.** M5.3's ingredient
  delete leaves the jar in place, so the repository's stock finders
  (`src/db/repository/stock.ts`) add `readableVariantParent` to the proof's
  own scope: the form must be live, and its ingredient live and in the
  compendium or this coven. A deleted ingredient's jar is then in no read, and
  an update or delete of it answers `NotFound`. The writes read the jar first
  for this reason: the writer's by-id methods see the jar's own tombstone, not
  its ingredient's. `findStockOfIngredients` is the batch read behind
  `stockOf`, which M9.4's `Ingredient.stock` loader calls. `stockOf` takes
  each ingredient with the coven it was asked about, checks each coven once and
  reads each coven's jars in one call, so a coven the caller is not in refuses
  its own entries and no others.
- **The form must be one the coven may read.** `createStock` looks the variant up
  with `findReadableVariant` under the coven's proof, so another coven's form,
  a deleted form, or a form of a deleted ingredient is `NotFound`. The
  composite foreign key alone would accept another coven's form, since it holds
  only the variant to its ingredient. The one deleted parent it admits is a
  compendium entry the curators retired while this coven's live cupboard row
  names it: it passes the coven's proof as `heldBy`, and checks the row again
  through `heldCompendiumEntry` under the stock lock, so a coven may still
  start a jar of a retired entry it holds (the owner's decision, 2026-10-19;
  [`m12.24-retired-entry-stays-readable.md`](../design-decisions/m12.24-retired-entry-stays-readable.md)).
  A coven's own deleted ingredient's forms stay refused.
- **A jar of a compendium form lists the entry (M12.15).** `createStock` also
  inserts the coven's cupboard row for the entry when it has none (never for a
  retired entry, which is reached only through a live row), in the same
  transaction, under the coven's stock lock. The jar is stored on the
  compendium form asked for even when the coven's own entry shares the entry's
  name or formal name: a name match takes nothing from it (M12.28). A second jar of another form adds no second row
  ([`workspace-compendium-entries.md`](workspace-compendium-entries.md), "Writing it").
- **A form the coven holds is refused.** `createStock` throws a
  `ValidationError` beside `variantId` and writes nothing. It neither
  returns the held jar nor adds the input's amount to it: either would
  report success for a write that did not happen as asked, and someone
  sending 10 g to a jar of 5 g could not tell whether they now hold 5 g or
  15 g. Changing a jar is `updateStock`'s. The check is the insert breaking
  `inventory_items_workspace_id_variant_id_unique`, with no read before it,
  so two creates racing for one form are refused alike. After a soft delete
  there is no live jar, so the create inserts a new row and the old one stays
  as it was ([`design-decisions/m9.3-create-stock-refuses-held-form.md`](../design-decisions/m9.3-create-stock-refuses-held-form.md)).
- **The dimension is never input.** `StockInput` has no `unitDimension`
  field, so one sent anyway is dropped while parsing, and the service writes
  `dimensionOf(unit)` wherever it writes a unit.
- **A new jar gets the default threshold.** When the input names a unit and no
  threshold, `createStock` writes 3 for a count unit, and 10 g or 15 ml
  converted into the jar's own unit with `unitConvert` for a weight or a
  volume: 10 g is 0.01 in kilograms and 15 ml is 3 in teaspoons. A threshold the
  input states, `0` included, is kept. A jar with no unit gets none. The rule is
  `defaultThreshold` in `validation/default-threshold.ts`, in `validation/` (the seed may reach only that, `schema/` and the index), so
  the demo seed (which may not import a service) reads the same one.
  `updateStock` applies it once, to a jar that had no unit and gets one while its
  threshold is empty (M9.9); a threshold the jar holds or the input states, `0`
  included, is kept, and a jar that already had a unit gets none.

### The workspace ingredient list

`listWorkspaceIngredients(session, workspaceId, filter, page)`
(`src/modules/ingredients/services/workspace-ingredient-list.ts`, M9.4) is
the list on the coven's Ingredients page. It checks `ingredient: read`, so any
member of the coven, viewers included, may read it, and answers one page from
`findWorkspaceIngredientPage` in `src/db/repository/ingredients.ts`.
`countWorkspaceIngredients(session, workspaceId, filter, start)`, beside it, numbers its
pages (M9.6): it asserts the same permission and reads `findWorkspaceIngredientCount`, the
twin of `findCompendiumCount` over the same arms and scope, so the count and the page hold
the same rows. It is not cached.

A coven's ingredients are two kinds of row, in one query (M12.18):

- **The coven's own entries**, live.
- **The compendium entries its cupboard names.** A compendium entry is listed
  when the coven has a live row for it in `workspace_compendium_entries`
  ([`workspace-compendium-entries.md`](workspace-compendium-entries.md)), read
  as one keyed `EXISTS` on that row's `(workspace_id, ingredient_id)` unique.
  A jar no longer decides it: a compendium entry the coven holds a jar of but
  has no cupboard row for is not listed, and one with a cupboard row is listed
  with no jar at all. Another coven's cupboard row never puts an entry here.

Nothing is hidden. A coven's own entry and a compendium entry its cupboard
names are both listed, even when they share a formal name or a label: the
coven chose both, so the list never drops the compendium one in favour of
the local one (M12.18; the hiding rule was removed by M12.28).

A compendium entry is listed as the coven has it. The query left-joins the
coven's cupboard row and reads `coalesce(row, entry)` for the label and the
three lists that have filters (elements, celestial bodies, zodiac signs), so a
coven's override is what the list sorts, searches, filters and counts by. The
list sorts and pages on `coalesce(label, name)`, and the cursor is built from
the same expression, so a relabelled entry sits where its label puts it and
paging never skips or repeats it. The search matches the label as well as the
compendium's own name, formal name and folk names, through the sixth arm
M12.19 added for the substitute picker
([`compendium-read.md`](compendium-read.md), "The ingredient picker's search"), and ranks by
the match score alone, as the compendium does. The joined row rides on each
page entry, so the resolver primes the `cupboardEntryByIngredient` loader from
it and `Ingredient.cupboardEntry` on a list row costs no second read.

The search, category, form, deity, zodiac sign, celestial body and toxic filters (the
form filter a list, and the last four since M11.22) are the compendium's own,
from `compendiumList`, so the list matches, ranks and pages as the compendium
does. They run under the coven's proof rather than the compendium tier, so a
filter never reaches another coven's rows. Categories, forms, folk names and
`toxic` have no override and read from the compendium; so do a form's own
elements, which a cupboard row does not cover.

Two settings belong to the coven's list alone (M9.7), so they sit in
`workspaceListScopeIncludingSoftDeleted` and not in `compendiumList`, which the compendium's page
and count share. `source: 'local'` keeps the coven's own entries;
`source: 'compendium'` keeps the compendium entries its cupboard names; leaving
it out keeps both, so the two `source` counts add up to the list's total.
`inStock` keeps an entry only when one of the coven's live jars of it, of a
live form, is not at 0. A jar with no quantity is held but unweighed, so it
counts as in stock (the test is "null or not 0", since a bare `<> 0` is unknown
for null and would drop it). An entry whose jars are all at 0 leaves, and so
does an entry with no jar, whether the coven's own or one its cupboard names.
Because `workspaceListScopeIncludingSoftDeleted` is shared with the facets, a facet's count equals
the list's total under the same two settings.

`lowStockOnly` (M9.8) keeps an entry only when one of the coven's live jars of it,
of a live form, reads Out of Stock or Low Stock: its quantity is 0, or it is above 0
and at or below a threshold above 0. A threshold of 0 or none never makes a jar low,
and a jar with no quantity is neither. It is filtered in SQL in `holdsJarLowOrOut`
(`src/db/repository/ingredients.ts`), beside `inStock`, and `stockState`
(`src/components/StockBadge/stock-state.ts`) says the same table in code, so a
change to one is a change to both. Its facet count is the list's total with the
switch forced on, under the rest of the filter and the chosen Source.

**The coven's facet counts read the same rows.**
`workspaceIngredientFacets(session, workspaceId, filter)` (M12.3, in
`services/ingredient-facets.ts`) tells the coven's filter panel how many
entries each filter value would list, counted by the rules of
[`findCompendiumFacets`](compendium-read.md). It makes the same
`ingredient: read` check as the list, then calls
`findWorkspaceIngredientFacets`, which counts within `workspaceListScopeIncludingSoftDeleted`
(the coven's own entries and the compendium entries its cupboard names) over
the same left join, so the element, zodiac sign and celestial body counts read the
coven's overrides: an entry whose cupboard row moves it from one element to
another is counted under the new one, and a list cleared to `[]` counts under
none. Category counts stay the compendium's, as categories have no override.
The condition is shared rather than copied, so a count and the list cannot disagree on which
rows are the coven's. Unlike the compendium's, it is never cached: what it
counts differs from coven to coven (CLAUDE.md rule 6).

**A save never moves a jar** (M12.27). Saving a coven's own entry, whether a create, an update or a folk name promoted to the label, leaves every jar of the coven where it is, even when the save gives the entry a compendium entry's name or formal name. The save-time follow of M12.8 (`carryJarsToLocal`, `JarMergeNeeded`, the `jarMerges` input and the jar merge) is gone, and M12.28 removed the rest of M12.8, the `createStock` redirect that stored a new jar of a matched entry's form on the local's form. The three saves no longer take the per-coven advisory lock (`lockCovenStock`) or assert `inventory: update`; both were added by M12.8 for the carry alone. The lock now has three callers: `createStock`, `removeCupboardEntry` (M12.15), which counts jars under it, and `convertCompendiumEntryToLocal` (M12.23), which moves a held entry's jars and spell layers onto the forms of a new own entry ([`workspace-compendium-entries.md`](workspace-compendium-entries.md), "Converting a compendium entry into our own"). The reverse, turning an own entry into the compendium entry it duplicates, was built as M12.21 and removed by M12.42: linking goes one way in v1 and the other way waits for v2 (DESIGN.md §13). The convert also calls `lockJarsOfIngredient` and `lockLiveVariants`, the two locked reads left after M12.28 removed the redirect's `lockJarsOnHiddenEntries` and `lockLocalsHiding`. The retired design is recorded in [`m12.8-jar-follows-local.md`](../design-decisions/m12.8-jar-follows-local.md).

- **A batch save is one transaction (M9.9).** `saveStock` is the stock
  dialog's one Save: a `create` list (`{ variantId, input }`), an `update` list
  (`{ id, input }`) and a `delete` list of ids, all of one ingredient, in three
  lists so a delete cannot carry a quantity. It checks `inventory: update`
  once, parses every row with the same `StockInput`, then reads every jar with
  `findStockByIds` and every form with `findReadableVariant` before it writes
  anything. A jar or form of another coven, of another ingredient than
  `ingredientId`, deleted, or not a uuid refuses the whole batch with
  `NotFound`; a jar named twice (twice in one list, or in `update` and
  `delete`) is a `ValidationError`. The write is one `withAudit` that takes
  `lockCovenStock` first, then adds the cupboard row (once, for a first
  compendium jar; an all-delete adds none), then creates, updates and deletes.
  The per-row columns are `createStock`'s and `updateStock`'s own helpers, so
  the first-unit default threshold applies per row and no unit is ever
  converted. Every bad row comes back in one `ValidationError` whose paths
  carry the list and position: `create.0.input.quantityOnHand`,
  `update.1.input.lowStockThreshold`, and `create.2.variantId` for a form the
  coven already holds (the unique index breaking, mapped to the row being
  inserted). An empty batch opens no transaction. The result is the
  ingredient's live jars after the write (`findStockOfIngredients`).
  `findStockByIds` (`src/db/repository/stock.ts`) reads a coven's live jars by
  id under the same proof and readability rules as the other finders.

## Stock service details

`src/modules/ingredients/services/stock.ts` writes and reads a coven's jars.

- **Starting a jar.** `createStock` refuses a form the coven already holds rather than topping it up, so the caller knows nothing was written; a form whose jar was deleted gets a fresh one. A new jar with a unit and no threshold gets §5's default: 3 of a count unit, 10 g or 15 ml in its own unit. The jar sits on the form asked for, whatever the coven calls its own entries: an own entry sharing a compendium entry's name takes nothing from it. A jar of a compendium form puts that entry in the coven's cupboard in the same transaction when it is not there. The lock the create takes makes the cupboard read see a concurrent create's row, and the unique index backs it. A form of a retired compendium entry takes a jar while this coven's cupboard row names the entry, and never puts it back in the cupboard; the row is read again under the lock so a remove that tombstoned it first refuses the jar. The partial unique index is the check, with no read before it, so two creates racing for one form are refused alike.
- **Changing a jar.** A field the input leaves out keeps its value and one set to null is cleared; a new unit brings its own dimension. A jar that had no unit and gets one while its threshold is empty takes the unit's default; a threshold already set, or stated by the input, is never replaced, and a jar that already had a unit gets none. No unit is ever converted.
- **The dialog's Save (`saveStock`).** One ingredient's jars created, changed and deleted in one transaction, each row taking the single-jar write's rules so the two paths cannot drift. `ingredientId` scopes the batch: every jar and form named must be of that ingredient and this coven, or the whole batch is refused. Every id is read before anything is written, and a jar of another coven or ingredient, a deleted one, and an id that is not one are the same refusal. Every bad row's issues come back in one `ValidationError`, their paths prefixed by list and position (`create.0.input.quantityOnHand`, `update.1.input.lowStockThreshold`, `create.2.variantId` for a form already held) so a form can place each on its row. An empty batch writes nothing and opens no transaction.
- **Batch reads.** `stockOf` answers one array per ref in order, with one read per coven named plus a role lookup each; a coven the caller may not read gets a `Forbidden` in its slot while the rest stands. The compendium-forms batch reads a retired entry like a live one while the coven's cupboard names it, through that coven's proof as `heldBy`, which the SQL checks against the cupboard row; an entry the cupboard does not name, or an id that names nothing, gets `NotFound` in its slot. It costs one forms read per coven and one cupboard read per entry that came back with no forms, which few do.
- **Reading a jar for a write.** A write reads the jar through its live form and ingredient first, because the writer's by-id methods know the jar's own tombstone and not its ingredient's, and an ingredient delete leaves the jar beside it.
- **Spell measure.** `liveStockOfForms` reads the live jars of many forms in one read for the grimoire save; the caller has checked the proof, and every role that writes a spell also reads stock (`src/modules/coven/services/access-control.ts`).
