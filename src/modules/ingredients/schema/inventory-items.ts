import { sql } from 'drizzle-orm';
import { check, date, foreignKey, numeric, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { QUANTITY_PRECISION, QUANTITY_SCALE } from './quantities';
import { UNITS, UNITS_BY_DIMENSION, UNIT_DIMENSIONS } from './units';
import { auditColumns } from '../../identity/schema/users';
import { ingredients } from './ingredients';
import { ingredientVariants } from './ingredient-variants';
import { workspaces } from '../../coven/schema/workspaces';
import { idColumn, liveUnique } from '../../../db/schema-parts';

// Both enums are stocked from `./units.ts`, so a unit added there reaches
// the database, the converter and the form in one edit; nothing in this file
// may spell a unit out (inventory-items-schema.test.ts holds the database's enums
// equal to the module's lists, and the CHECK to every unit's dimension).
export const inventoryUnit = pgEnum('inventory_unit', UNITS);

export const unitDimension = pgEnum('unit_dimension', UNIT_DIMENSIONS);

// "A row whose dimension contradicts its unit cannot be written" (§5), built from the same map as the enums. The `is null` biconditional is not optional:
// a CHECK passes on NULL, so a half-null row would slip through (claude-docs/db/stock.md, "The dimension stored beside the unit").
// `unit::text`, not `unit`: Postgres refuses an enum value added in the same transaction (55P04), as migration 0072 adds `fl_oz_us`.
const UNIT_MATCHES_DIMENSION = sql.raw(
  [
    '(unit is null) = (unit_dimension is null)',
    `(unit is null or (${UNIT_DIMENSIONS.map((dimension) => {
      const units = UNITS_BY_DIMENSION[dimension].map((unit) => `'${unit}'`).join(', ');
      return `(unit_dimension = '${dimension}' and unit::text in (${units}))`;
    }).join(' or ')}))`,
  ].join(' and '),
);

// What a workspace holds. Stock hangs off the ingredient, not the other way
// round, which is also why `spell_steps` references `ingredients` and
// not this table.
export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: idColumn(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id),
    // The form the jar holds: Rosemary herb and Rosemary oil are two
    // rows. NOT NULL from the start, since no stock row exists anywhere yet.
    variantId: uuid('variant_id').notNull(),
    // Precision and scale from ./quantities.ts, which the Zod ceiling reads too.
    // Nullable because `0` already means out of stock, and "we have this,
    // unweighed" must stay sayable.
    quantityOnHand: numeric('quantity_on_hand', {
      precision: QUANTITY_PRECISION,
      scale: QUANTITY_SCALE,
    }),
    unit: inventoryUnit('unit'),
    // Stored beside the unit rather than derived, so a query can group by it.
    unitDimension: unitDimension('unit_dimension'),
    // Written at creation with a dimension-appropriate default, not defaulted
    // at read time; no database default, since it depends on the row's unit.
    lowStockThreshold: numeric('low_stock_threshold', {
      precision: QUANTITY_PRECISION,
      scale: QUANTITY_SCALE,
    }),
    // Where this jar came from ("foraged by the creek") — where the stock came
    // from, not where the entry did (`ingredients.workspace_id`).
    source: text('source'),
    // A date, not a timestamp: nobody records the hour they were handed a jar.
    acquiredDate: date('acquired_date'),
    ...auditColumns,
  },
  (table) => [
    check('inventory_items_unit_matches_dimension', UNIT_MATCHES_DIMENSION),
    // What "already added" means, per form. Partial per CLAUDE.md
    // rule 4: throwing a jar out is recoverable, so it must not reserve the form.
    liveUnique(
      'inventory_items_workspace_id_variant_id_unique',
      table,
      table.workspaceId,
      table.variantId,
    ),
    // The variant and the ingredient beside it, as a pair, so no row holds
    // another ingredient's form.
    foreignKey({
      name: 'inventory_items_variant_fk',
      columns: [table.variantId, table.ingredientId],
      foreignColumns: [ingredientVariants.id, ingredientVariants.ingredientId],
    }),
  ],
);
