## Stock, and the one module that owns the units (M9.2)

`src/modules/ingredients/schema/inventory-items.ts` holds DESIGN.md §5's stock
table; `0013_illegal_red_hulk.sql` is the migration. The unit vocabulary it is
built from sits beside it, in `src/modules/ingredients/schema/units.ts`, and
imports nothing.

- **`inventory_items`** — `id`, `workspaceId`, `ingredientId`,
  `quantityOnHand`, `unit`, `unitDimension`, `lowStockThreshold`, `source`,
  `acquiredDate`, + the full six-column audit spread. Story 20's table: what a
  workspace _holds_, as against what exists (the compendium) and what it makes
  (the grimoire).
- **Stock hangs off the ingredient, never the other way round.** A compendium
  entry carries no quantity; an ingredient gains one only when a workspace adds
  it, which is this row. It is also why `spell_ingredients` (M10.2) references
  `ingredients` rather than this table — a saved spell survives running out of
  something, and M10.21 tests exactly that.
- **`inventory_items_workspace_id_ingredient_id_unique`** is §5's partial
  unique index on `(workspace_id, ingredient_id) WHERE deleted_at IS NULL`. It
  is what "already added" _means_: M9.4's `addIngredientToWorkspace` is
  idempotent against it rather than defining the notion again. The predicate is
  load-bearing rather than ceremonial here — story 25 soft-deletes a row and
  calls it recoverable, so without it, throwing a jar out would reserve that
  ingredient against ever being stocked again. Verified by rebuilding the
  shipped migration with the predicate stripped, where re-adding after a
  soft delete is refused with a unique violation.

### One module owns the units

`src/modules/ingredients/schema/units.ts` is the single source of the vocabulary — three dimensions,
metric and imperial in each: weight (mg, g, kg, oz, lb), volume (ml, l, tsp,
tbsp, fl_oz, cup), count (piece, drop, pinch). Both pgEnums (`inventory_unit`,
`unit_dimension`), the CHECK constraint below, M9.5's `unitConvert()`, M9.8's
badges and every later Zod enum are built from it. **Adding a unit is one
edit** — that map, plus a regenerated migration.

It imports nothing, and that is what makes it importable from all three sides
despite sitting in `schema/`: the tables import it relatively, and so do the
conversion library and the Zod schemas, which must not reach the database
layer at all (rule 2, MB.33) — a file that imports no `drizzle-orm` carries
none in. It sits in `schema/` rather than in `src/lib/` because the tables are
built from it, which puts it in the graph drizzle-kit loads.

`fl oz` is stored as **`fl_oz`**. §5 names the unit in prose, where a space is
how a human writes it; the stored label has to survive a Postgres enum, a
GraphQL enum (M9.4) and a URL query parameter (M9.7's filter chips), and of
those a GraphQL enum value cannot contain a space at all. The unit is §5's;
only its spelling is settled here, and how it is _displayed_ stays a question
for the UI tasks rather than a column value.

The schema file is forbidden to spell a unit or a dimension out, and that is
asserted as a property of its source text rather than of its values: equal
lists stay equal when someone pastes the vocabulary in beside the import, while
a literal `'tsp'` in the file's code does not survive the guard. Comments are
stripped before the scan — prose quoting `unit_dimension = 'weight'` to explain
the constraint is what a reader needs, and a comment cannot drift from the
module because nothing reads it.

### The dimension stored beside the unit

`unitDimension` is stored rather than derived at each call site, so a query can
filter or group by it and M9.5 has something to check against. The redundancy
is deliberate, and `inventory_items_unit_matches_dimension` is what pays for
it: a row whose dimension contradicts its unit cannot be written. The
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
- `lowStockThreshold` carries **no database default**. M9.8 writes a
  dimension-appropriate value onto the row at creation (3 for count, 10 g for
  weight, 15 ml for volume, converted into the row's unit) rather than applying
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

The table is inert at Wave 3: nothing queries it until M9.3's service and
M9.4's mutations land in Wave 11, which is the table-task-then-behaviour-task
rule and the reason the DDL can be constrained now, while the table is empty.
