import { foreignKey, index, numeric, pgTable, uuid } from 'drizzle-orm/pg-core';
import { auditStampColumns } from '../../identity/schema/users';
import { inventoryItems, inventoryUnit } from '../../ingredients/schema/inventory-items';
import { QUANTITY_PRECISION, QUANTITY_SCALE } from '../../ingredients/schema/quantities';
import { idColumn } from '../../../db/schema-parts';
import { spellSteps } from './spell-steps';
import { spellWorkings } from './spell-workings';

// What completing a working took out of the coven's jars: one row per step
// and stock row, written once at completion and never edited, so it carries
// the four stamp columns and no `deleted_at` (claude-docs/design-decisions/m13.4-spell-workings.md).
export const spellWorkingDeductions = pgTable(
  'spell_working_deductions',
  {
    id: idColumn(),
    workingId: uuid('working_id')
      .notNull()
      .references(() => spellWorkings.id),
    spellStepId: uuid('spell_step_id')
      .notNull()
      .references(() => spellSteps.id),
    inventoryItemId: uuid('inventory_item_id').notNull(),
    // What came out of the jar, in the stock row's own unit, so the amount
    // reads back without a conversion.
    quantity: numeric('quantity', {
      precision: QUANTITY_PRECISION,
      scale: QUANTITY_SCALE,
    }).notNull(),
    unit: inventoryUnit('unit').notNull(),
    // What the jar could not cover; 0 when fully met.
    shortfall: numeric('shortfall', { precision: QUANTITY_PRECISION, scale: QUANTITY_SCALE })
      .notNull()
      .default('0'),
    ...auditStampColumns,
  },
  (table) => [
    index('spell_working_deductions_working_id_idx').on(table.workingId),
    // Named by hand: the generated name runs past Postgres's 63 characters and
    // is cut, so the schema and the database would disagree on it.
    foreignKey({
      name: 'spell_working_deductions_inventory_item_fk',
      columns: [table.inventoryItemId],
      foreignColumns: [inventoryItems.id],
    }),
  ],
);
