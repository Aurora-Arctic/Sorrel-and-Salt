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
writes a coven's stock. It has five functions, each taking the coven's id and
checking membership first:

| Function                                              | Checks              | What it does                                                                                             |
| ----------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------- |
| `createStock(session, workspaceId, variantId, input)` | `inventory: update` | Starts a jar of one form the coven does not hold yet; a hidden entry's form lands on the local's (M12.8) |
| `updateStock(session, workspaceId, id, input)`        | `inventory: update` | Changes a jar: a field left out keeps its value, `null` clears it                                        |
| `deleteStock(session, workspaceId, id)`               | `inventory: update` | Soft-deletes a jar: marks it deleted, leaving the row in place                                           |
| `getStock(session, workspaceId, id)`                  | `inventory: read`   | One jar, for any member of the coven, viewers included                                                   |
| `stockOf(session, refs)`                              | `inventory: read`   | The jars of many ingredients at once, for `Ingredient.stock`                                             |

The permission is the `inventory` statement in
`src/modules/coven/services/access-control.ts`: viewers hold `read`, members
and owners `read` and `update`. The statement has no `create` or `delete`,
so all three writes check `update`; the `ingredient` statement is not used for
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
  only the variant to its ingredient.
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
  input states, `0` included, is kept. A jar with no unit gets none, and
  `updateStock` never applies the default.

### The workspace ingredient list

`listWorkspaceIngredients(session, workspaceId, filter, page)`
(`src/modules/ingredients/services/workspace-ingredient-list.ts`, M9.4) is
the list on the coven's Ingredients page. It checks `ingredient: read`, so any
member of the coven, viewers included, may read it, and answers one page from
`findWorkspaceIngredientPage` in `src/db/repository/ingredients.ts`.

A coven's ingredients are two kinds of row, in one query:

- **The coven's own entries**, live.
- **The compendium entries it holds a jar of.** The jar must be live and of a
  live form; a deleted jar, or a jar of a deleted form, does not put its entry
  in the list. An entry is listed once however many of its forms the coven
  holds. Another coven's jar of a compendium entry never puts it here.

Both kinds pass `notHiddenByLocal`, the same anti-join `ingredientSuggestions`
uses: a compendium entry the coven has its own version of (same formal name, or
the same label when the local entry declares no formal name) is left out, and
the local entry shows in its place.

The search, category, form, deity, zodiac sign, planet and toxic filters (the form filter a list, and the last four, since M11.22) are the compendium's own, from
`compendiumList`, so the list matches, ranks and pages exactly as the
compendium does. They run under the coven's proof rather than the compendium
tier, so a filter never reaches another coven's rows.

Two settings belong to the coven's list alone (M9.7), so they sit in
`workspaceListScope` and not in `compendiumList`, which the compendium's page and
count share. `source: 'local'` keeps the coven's own entries; `source: 'compendium'`
keeps the compendium entries it holds; leaving it out keeps both. `inStock` keeps
an entry only when one of the coven's live jars of it, of a live form, is not at 0.
A jar with no quantity is held but unweighed, so it counts as in stock (the test is
"null or not 0", since a bare `<> 0` is unknown for null and would drop it). An entry
whose jars are all at 0 leaves, and so does a local entry with no jar. Because
`workspaceListScope` is shared with the facets, a facet's count equals the list's total
under the same two settings.

**The coven's facet counts read the same rows.**
`workspaceIngredientFacets(session, workspaceId, filter)` (M12.3, in
`services/ingredient-facets.ts`) tells the coven's filter panel how many
entries each filter value would list, counted by the rules of
[`findCompendiumFacets`](compendium-read.md). It makes the same
`ingredient: read` check as the list, then calls
`findWorkspaceIngredientFacets`, which counts within `workspaceListScope`:
the condition `findWorkspaceIngredientPage` lists by (the coven's own
entries, the compendium entries it holds, less those a local entry hides),
shared rather than copied, so a count and the list cannot disagree on which
rows are the coven's. Unlike the compendium's, it is never cached: what it
counts differs from coven to coven (CLAUDE.md rule 6).

**A jar follows a local entry that hides its compendium entry** (M12.8,
which supersedes M9.4's "stays where it is"). If a coven holds a jar of a
compendium entry and then saves its own version of that entry (a create, an
update, or a folk name promoted to the label), the jar moves to the local
entry's form of the same name, folded as `lower(btrim(form))`. A form the local
lacks is made, copying the compendium form's own facts (description, safety
notes, toxic, elements, celestial bodies, zodiac signs, colours, curated form)
and none of its references, substitutes or categories. The jar keeps its id and
every column but its ingredient and form. All of it happens in the save's
transaction, so a refused save moves nothing.

Where the local already holds a jar of that form, the two merge. Quantities add
exactly (as thousandths, never floats) when the units are equal, or when either
jar holds no amount at all; the local jar's source and acquired date stay, and
the moving jar is soft-deleted. So does its threshold, unless the merge changes
the jar's unit (a chosen amount in another unit, or a jar with no unit taking
the moving jar's): a threshold is a number in the jar's unit, so it is
converted when both units are of one dimension (10 g becomes 0.01 kg), and
cleared otherwise, with no unit on either side or across dimensions or counts,
rather than left to mean something else. Any other pair, grams against
kilograms included, is never converted: the save is refused with
`JarMergeNeeded` (a `ValidationError` pathed to `jarMerges`, carrying the
conflicting pairs), and the caller sends it again with a `jarMerges` entry
naming the amount to keep. `jarMerges` is on the service input only until M8.17
adds it to the SDL. A sum past the largest amount a jar holds is a plain
`ValidationError` on `jarMerges`. `createStock` on a form of a hidden entry
stores the jar on the local's form the same way. A promote's clash is worded for the promote (put the two jars in one unit, then promote again) and has no field in its path. The three saves and `createStock` each take a per-coven advisory lock (`lockCovenStock`) first in their transaction, so a save and a jar added at the same moment queue rather than miss each other. See
[`m12.8-jar-follows-local.md`](../design-decisions/m12.8-jar-follows-local.md).
