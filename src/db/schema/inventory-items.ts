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

// Both enums are stocked from `src/lib/units.ts`, so a unit added there reaches
// the database, the converter and the form in one edit; nothing in this file
// may spell a unit out (inventory-items-schema.test.ts checks the source text).
export const inventoryUnit = pgEnum('inventory_unit', UNITS);

export const unitDimension = pgEnum('unit_dimension', UNIT_DIMENSIONS);

// "A row whose dimension contradicts its unit cannot be written" (§5), built
// from the same map as the enums. Literal SQL for ingredients.ts's reason; only
// this module's constants are interpolated. The first conjunct is not optional:
// a CHECK passes on NULL, so without the `is null` biconditional a half-null
// row would slip through (claude-docs/db.md, "The dimension stored beside the unit").
const UNIT_MATCHES_DIMENSION = sql.raw(
  [
    '(unit is null) = (unit_dimension is null)',
    `(unit is null or (${UNIT_DIMENSIONS.map((dimension) => {
      const units = UNITS_BY_DIMENSION[dimension].map((unit) => `'${unit}'`).join(', ');
      return `(unit_dimension = '${dimension}' and unit in (${units}))`;
    }).join(' or ')}))`,
  ].join(' and '),
);

// What a workspace holds. Stock hangs off the ingredient, not the other way
// round, which is also why `spell_ingredients` references `ingredients` and
// not this table.
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
    // `numeric`, not a float, so 0.1 kg round-trips as 0.1; three decimals is a
    // milligram in grams. Nullable because `0` already means out of stock, and
    // "we have this, unweighed" must stay sayable.
    quantityOnHand: numeric('quantity_on_hand', { precision: 12, scale: 3 }),
    unit: inventoryUnit('unit'),
    // Stored beside the unit rather than derived, so a query can group by it.
    unitDimension: unitDimension('unit_dimension'),
    // Written at creation with a dimension-appropriate default, not defaulted
    // at read time; no database default, since it depends on the row's unit.
    lowStockThreshold: numeric('low_stock_threshold', { precision: 12, scale: 3 }),
    // Where this jar came from ("foraged by the creek") — where the stock came
    // from, not where the entry did (`ingredients.workspace_id`).
    source: text('source'),
    // A date, not a timestamp: nobody records the hour they were handed a jar.
    acquiredDate: date('acquired_date'),
    ...auditColumns,
  },
  (table) => [
    check('inventory_items_unit_matches_dimension', UNIT_MATCHES_DIMENSION),
    // What "already added" means. Partial per CLAUDE.md rule 4: throwing a jar
    // out is recoverable, so it must not reserve the ingredient.
    uniqueIndex('inventory_items_workspace_id_ingredient_id_unique')
      .on(table.workspaceId, table.ingredientId)
      .where(sql`${table.deletedAt} is null`),
  ],
);
