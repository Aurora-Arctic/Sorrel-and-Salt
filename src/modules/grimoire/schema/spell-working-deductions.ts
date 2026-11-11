import { foreignKey, index, pgTable, uuid } from 'drizzle-orm/pg-core';
import { auditStampColumns } from '../../identity/schema/users';
import { inventoryItems, inventoryUnit } from '../../ingredients/schema/inventory-items';
import { quantityColumn } from '../../ingredients/schema/quantity-column';
import { idColumn } from '../../../db/schema-parts';
import { spellSteps } from './spell-steps';
import { spellWorkings } from './spell-workings';

// Written once at completion and never edited, so it carries the four stamp columns and no `deleted_at` (claude-docs/design-decisions/grimoire.md, "A working is the record of one making, in three tables").
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
    // In the stock row's own unit, so the amount reads back without a conversion.
    quantity: quantityColumn('quantity').notNull(),
    unit: inventoryUnit('unit').notNull(),
    shortfall: quantityColumn('shortfall').notNull().default('0'),
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
