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

// Both enums are stocked from `src/lib/units.ts` and neither repeats it. That
// module is the one module the acceptance criterion names — the conversion
// library (M9.5), the stock badges (M9.8) and every later Zod enum import the
// same map, so a unit added there reaches the database, the converter and the
// form in one edit. Nothing in this file may spell a unit or a dimension out;
// inventory-items-schema.test.ts asserts that as a property of the source
// text, because two lists that agree today are exactly what drifts.
export const inventoryUnit = pgEnum('inventory_unit', UNITS);

export const unitDimension = pgEnum('unit_dimension', UNIT_DIMENSIONS);

// DESIGN.md §5: "a row whose dimension contradicts its unit cannot be
// written". Built from the same map the two enums are built from, so the
// constraint cannot fall behind the vocabulary it constrains — adding a unit
// to the module rewrites this expression on the next `db:generate`, and a
// migration that fails to appear is what the test reading this constraint
// back out of `pg_constraint` catches.
//
// Literal SQL text rather than interpolated Drizzle columns, for the reason
// ingredients.ts's generated expression carries: the expression names columns
// of the table whose column object is still being built. The values
// interpolated are this module's own constants and never a caller's input.
//
// Two conjuncts, and the first is not optional. A stub row measures nothing
// — `unit` and `unit_dimension` both null — and contradicts nothing because
// it claims nothing; a row holding one half of the pair is the contradiction
// the column exists to prevent, since `unit = 'g'` with no dimension beside
// it is precisely the row M9.5 has nothing to check against and a grouping by
// dimension silently drops.
//
// The pairing is written as a biconditional between two `is null` tests, the
// idiom ingredients.ts's nomenclature check uses, because a CHECK passes on
// NULL: `unit_dimension = 'weight'` against a null dimension evaluates to
// NULL, not false, so a disjunction of dimension clauses alone admits exactly
// the half-null rows it looks like it refuses. Both sides of `=` here are
// non-null booleans, so the conjunct is decisive either way — and the second
// conjunct only evaluates its disjunction once there is a unit to place.
const UNIT_MATCHES_DIMENSION = sql.raw(
  [
    '(unit is null) = (unit_dimension is null)',
    `(unit is null or (${UNIT_DIMENSIONS.map((dimension) => {
      const units = UNITS_BY_DIMENSION[dimension].map((unit) => `'${unit}'`).join(', ');
      return `(unit_dimension = '${dimension}' and unit in (${units}))`;
    }).join(' or ')}))`,
  ].join(' and '),
);

// DESIGN.md §5: `id`, `workspaceId`, `ingredientId`, `quantityOnHand`,
// `unit`, `unitDimension`, `lowStockThreshold`, `source`, `acquiredDate`, +
// audit. Story 20's table — what a workspace holds, as opposed to what
// exists (the compendium) or what it makes (the grimoire).
//
// **Stock hangs off the ingredient, not the other way round.** A compendium
// entry carries no quantity; an ingredient gains one only when a workspace
// adds it, which is this row. That is also why `spell_ingredients` (M10.2)
// references `ingredients` rather than this table — a saved spell survives
// running out of something.
//
// The table is inert at Wave 3. Nothing queries it until M9.3's service and
// M9.4's mutations land in Wave 11 — CLAUDE.md's table-task-then-behaviour-
// task rule, which is why the DDL can be constrained now, while the table is
// empty.
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
    // `numeric`, not a float: 0.1 kg has to come back as 0.1, and M9.5's
    // round-trip criterion ("returning the original within the defined
    // precision") is unmeetable on a type that cannot represent the input.
    // Three decimal places is the precision — a milligram expressed in grams,
    // the finest distinction any unit pair in the vocabulary can make — and
    // twelve digits is more of any unit than a kitchen holds. §5 names no
    // figure, so the choice and its reasoning sit here.
    //
    // Nullable, because zero is already taken: M9.8 renders `0` as out of
    // stock, so a NOT NULL column would make "we have this, unweighed"
    // unsayable except as a lie. §13's bulk add depends on the same nullability
    // for its stub rows, but the argument stands without it.
    quantityOnHand: numeric('quantity_on_hand', { precision: 12, scale: 3 }),
    unit: inventoryUnit('unit'),
    // Stored beside the unit rather than derived at each call site, so a query
    // can filter or group by it and M9.5 has something to check against. The
    // redundancy is deliberate and is what the CHECK above pays for.
    unitDimension: unitDimension('unit_dimension'),
    // Written onto the row at creation with a dimension-appropriate default
    // (M9.8: 3 for count, 10 g for weight, 15 ml for volume, converted into
    // the row's unit) rather than left null and defaulted at read time — so
    // it stays visible and editable, and changing the constant later does not
    // silently reinterpret every existing row. No database default: the value
    // depends on the row's own unit, which a column default cannot see.
    lowStockThreshold: numeric('low_stock_threshold', { precision: 12, scale: 3 }),
    // Where this jar came from — "Miller's farm stand", "foraged by the
    // creek". Free text and member-written, per §5's rule that a vocabulary a
    // member writes is text while one only an admin writes is a foreign key.
    //
    // Not to be confused with story 27's local-versus-compendium filter
    // (M9.7), which reads `ingredients.workspace_id` and never this column:
    // that is where the *entry* came from, this is where the *stock* did.
    // §13's bulk add offers this as one of the shared defaults for a batch,
    // which is only sensible if it is provenance rather than a restatement of
    // something already derivable.
    source: text('source'),
    // A date, not a timestamp: nobody records the hour they were handed a jar.
    acquiredDate: date('acquired_date'),
    ...auditColumns,
  },
  (table) => [
    check('inventory_items_unit_matches_dimension', UNIT_MATCHES_DIMENSION),
    // DESIGN.md §5: unique on `(workspaceId, ingredientId) WHERE deleted_at
    // IS NULL`. This is what "already added" means — M9.4's
    // `addIngredientToWorkspace` is idempotent against it, and §13's bulk add
    // leans on the same index rather than defining the notion again.
    //
    // Partial per CLAUDE.md rule 4, and load-bearing rather than ceremonial
    // here: story 25 soft-deletes a row and calls it recoverable, so without
    // the predicate, throwing a jar out would reserve that ingredient against
    // ever being stocked again.
    uniqueIndex('inventory_items_workspace_id_ingredient_id_unique')
      .on(table.workspaceId, table.ingredientId)
      .where(sql`${table.deletedAt} is null`),
  ],
);
