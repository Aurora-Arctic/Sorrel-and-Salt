import { sql } from 'drizzle-orm';
import {
  check,
  date,
  numeric,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { UNITS, UNITS_BY_DIMENSION, UNIT_DIMENSIONS } from '../../lib/units';
import { auditColumns } from '../audit';
import { ingredients } from './ingredients';
import { workspaces } from './workspaces';

// Both enums are stocked from `src/lib/units.ts` and neither repeats it, so a
// unit added there reaches the database, the converter and the form in one
// edit. Nothing in this file may spell a unit or a dimension out;
// inventory-items-schema.test.ts asserts that against the source text.
export const inventoryUnit = pgEnum('inventory_unit', UNITS);

export const unitDimension = pgEnum('unit_dimension', UNIT_DIMENSIONS);

// DESIGN.md §5: "a row whose dimension contradicts its unit cannot be
// written". Built from the same map the two enums are built from, so the
// constraint cannot fall behind the vocabulary it constrains.
//
// Literal SQL text rather than interpolated Drizzle columns, for the reason
// ingredients.ts's generated expression carries: the expression names columns
// of the table whose column object is still being built. What is interpolated
// is this module's own constants, never a caller's input.
//
// **The first conjunct is not optional, because a CHECK passes on NULL.**
// `unit_dimension = 'weight'` against a null dimension evaluates to NULL rather
// than false, so a disjunction of dimension clauses alone would admit exactly
// the half-null rows it looks like it refuses. Written as a biconditional
// between two `is null` tests — the idiom ingredients.ts's nomenclature check
// uses — both sides are non-null booleans and the conjunct is decisive either
// way. A row measuring nothing at all is fine; one holding half the pair is the
// contradiction (claude-docs/db.md, "The dimension stored beside the unit").
const UNIT_MATCHES_DIMENSION = sql.raw(
  [
    '(unit is null) = (unit_dimension is null)',
    `(unit is null or (${UNIT_DIMENSIONS.map((dimension) => {
      const units = UNITS_BY_DIMENSION[dimension].map((unit) => `'${unit}'`).join(', ');
      return `(unit_dimension = '${dimension}' and unit in (${units}))`;
    }).join(' or ')}))`,
  ].join(' and '),
);

// DESIGN.md §5 / story 20 — what a workspace holds, as opposed to what exists
// (the compendium) or what it makes (the grimoire).
//
// **Stock hangs off the ingredient, not the other way round.** A compendium
// entry carries no quantity; it gains one only when a workspace adds it, which
// is this row. That is also why `spell_ingredients` references `ingredients`
// rather than this table — a saved spell survives running out of something.
export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    // `numeric`, not a float: 0.1 kg has to come back as 0.1, which M9.5's
    // round-trip criterion is unmeetable without. Three decimals is a milligram
    // expressed in grams — the finest distinction the unit vocabulary makes —
    // and twelve digits is more of anything than a kitchen holds; §5 names no
    // figure.
    //
    // Nullable, because zero is already taken: M9.8 renders `0` as out of
    // stock, so NOT NULL would make "we have this, unweighed" unsayable.
    quantityOnHand: numeric('quantity_on_hand', { precision: 12, scale: 3 }),
    unit: inventoryUnit('unit'),
    // Stored beside the unit rather than derived at each call site, so a query
    // can filter or group by it and M9.5 has something to check against. The
    // redundancy is deliberate and is what the CHECK above pays for.
    unitDimension: unitDimension('unit_dimension'),
    // Written onto the row at creation with a dimension-appropriate default
    // (M9.8) rather than defaulted at read time, so it stays visible and
    // editable and changing the constant cannot reinterpret existing rows. No
    // database default: the value depends on the row's own unit.
    lowStockThreshold: numeric('low_stock_threshold', { precision: 12, scale: 3 }),
    // Where this jar came from — "Miller's farm stand", "foraged by the creek".
    // Not to be confused with story 27's local-versus-compendium filter (M9.7),
    // which reads `ingredients.workspace_id`: that is where the *entry* came
    // from, this is where the *stock* did.
    source: text('source'),
    // A date, not a timestamp: nobody records the hour they were handed a jar.
    acquiredDate: date('acquired_date'),
    ...auditColumns,
  },
  (table) => [
    check('inventory_items_unit_matches_dimension', UNIT_MATCHES_DIMENSION),
    // What "already added" means — M9.4's `addIngredientToWorkspace` is
    // idempotent against it. Partial per CLAUDE.md rule 4, and load-bearing:
    // story 25 soft-deletes a row and calls it recoverable, so without the
    // predicate throwing a jar out would reserve that ingredient forever.
    uniqueIndex('inventory_items_workspace_id_ingredient_id_unique')
      .on(table.workspaceId, table.ingredientId)
      .where(sql`${table.deletedAt} is null`),
  ],
);
