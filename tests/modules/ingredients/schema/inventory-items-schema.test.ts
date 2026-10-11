import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import {
  UNITS,
  UNITS_BY_DIMENSION,
  UNIT_DIMENSIONS,
  dimensionOf,
} from '@/modules/ingredients/schema/units';
import { inventoryItems } from '@/modules/ingredients/schema/inventory-items';
import { FIXTURE_USERS, WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import type { StockRow } from './types';

// DESIGN.md §5's column list, transcribed.
const OWN_COLUMNS = [
  'id',
  'workspace_id',
  'ingredient_id',
  'quantity_on_hand',
  'unit',
  'unit_dimension',
  'low_stock_threshold',
  'source',
  'acquired_date',
];

const HELD_ONCE_INDEX = 'inventory_items_workspace_id_ingredient_id_unique';
const DIMENSION_CHECK = 'inventory_items_unit_matches_dimension';

describe('inventory_items schema', () => {
  const { byName } = tableFacts(inventoryItems);

  // The full six: story 25's delete is recoverable, so the unique index is partial.
  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });
});

const MEMBER = FIXTURE_USERS.A.id;
const COVEN = WORKSPACE_W_ID;
const OTHER_COVEN = WORKSPACE_X_ID;
let MUGWORT: string;
let ROSEMARY: string;

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

async function hold({
  workspaceId = COVEN,
  ingredientId = MUGWORT,
  quantity = '12.5',
  unit = 'g',
  dimension = 'weight',
  threshold = '10',
  source = null,
  acquiredDate = null,
}: StockRow = {}): Promise<string> {
  const [inserted] = await sql`
    insert into inventory_items
      (workspace_id, ingredient_id, quantity_on_hand, unit, unit_dimension,
       low_stock_threshold, source, acquired_date, created_by, updated_by)
    values (${workspaceId}, ${ingredientId}, ${quantity}, ${unit}::inventory_unit,
            ${dimension}::unit_dimension, ${threshold}, ${source}, ${acquiredDate}::date,
            ${MEMBER}, ${MEMBER})
    returning id
  `;
  return inserted.id as string;
}

async function compendiumIdOf(name: string): Promise<string> {
  const [found] = await sql`
    select id from ingredients where workspace_id is null and name = ${name}
  `;
  if (!found) throw new Error(`The standard seed carries no compendium entry named ${name}`);
  return found.id as string;
}

beforeAll(async () => {
  MUGWORT = await compendiumIdOf('Mugwort');
  ROSEMARY = await compendiumIdOf('Rosemary');
});

beforeEach(async () => {
  await sql`truncate inventory_items`;
});

describe('inventory_items table', () => {
  describe('one live row per ingredient per workspace', () => {
    // The pair is unique, not either half: drop a column from the index and
    // one of the admitted rows reddens. A second live row of the pair, and its
    // release on a soft delete, are the partial-unique sweep's.
    it('refuses a second live row of the pair, and admits either half again', async () => {
      await hold();

      const error = await failureOf(hold({ quantity: '3', unit: 'kg', dimension: 'weight' }));
      await hold({ ingredientId: ROSEMARY });
      await hold({ workspaceId: OTHER_COVEN });

      // 23505 is unique_violation, named: this index refused, not something earlier.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(HELD_ONCE_INDEX);
      const [{ count }] = await sql`select count(*)::int as count from inventory_items`;
      expect(count).toBe(3);
    });
  });

  describe('the unit vocabulary', () => {
    it('stores a unit beside its dimension', async () => {
      const id = await hold({ unit: 'tsp', dimension: dimensionOf('tsp') });

      const [row] = await sql`
        select unit::text, unit_dimension::text from inventory_items where id = ${id}
      `;

      expect(row).toEqual({ unit: 'tsp', unit_dimension: 'volume' });
    });

    // Against the shipped enums rather than the TypeScript list: a unit added
    // to the module and left out of a regenerated migration reddens.
    it('holds exactly the units and the dimensions the shared module names', async () => {
      const [row] = await sql`
        select enum_range(null::inventory_unit)::text[] as units,
               enum_range(null::unit_dimension)::text[] as dimensions
      `;

      expect(row.units).toEqual([...UNITS]);
      expect(row.dimensions).toEqual([...UNIT_DIMENSIONS]);
    });

    it('refuses a unit the vocabulary does not name', async () => {
      const error = await failureOf(hold({ unit: 'dram', dimension: 'weight' }));

      // 22P02 is invalid_text_representation: the enum refusing the cast before the CHECK.
      expect(error.code).toBe('22P02');
    });
  });

  describe('a dimension that contradicts its unit cannot be written', () => {
    // One mismatch; that the CHECK names every unit is read off its definition below.
    it('refuses a unit declared under another dimension', async () => {
      const error = await failureOf(hold({ unit: 'g', dimension: 'volume' }));

      // 23514 is check_violation, named: this constraint's, not the enum's or the index's.
      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(DIMENSION_CHECK);
    });

    it('refuses a contradiction introduced by an update, not only by an insert', async () => {
      const id = await hold({ unit: 'ml', dimension: 'volume' });

      const error = await failureOf(sql`
        update inventory_items set unit_dimension = 'weight' where id = ${id}
      `);

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(DIMENSION_CHECK);
    });

    it('refuses a unit with no dimension beside it', async () => {
      const error = await failureOf(hold({ unit: 'g', dimension: null }));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(DIMENSION_CHECK);
    });

    it('refuses a dimension with no unit beside it', async () => {
      const error = await failureOf(hold({ unit: null, dimension: 'weight' }));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(DIMENSION_CHECK);
    });

    // A row that measures nothing records no contradiction — why the check is
    // not simply `unit_dimension = dimension_of(unit)`.
    it('accepts a row that measures nothing at all', async () => {
      await expect(
        hold({ quantity: null, unit: null, dimension: null, threshold: null }),
      ).resolves.toBeDefined();
    });
  });

  describe('quantities', () => {
    it('keeps a fractional quantity exactly, without binary rounding', async () => {
      const id = await hold({ quantity: '0.1', unit: 'kg', dimension: 'weight' });

      const [row] = await sql`select quantity_on_hand from inventory_items where id = ${id}`;

      // The driver returns `numeric` as a string: 0.1 survives as 0.1.
      expect(row.quantity_on_hand).toBe('0.100');
    });

    it('distinguishes none left from never measured', async () => {
      const empty = await hold({ quantity: '0' });
      const unmeasured = await hold({ ingredientId: ROSEMARY, quantity: null });

      const rows = await sql`
        select id, quantity_on_hand from inventory_items where id in (${empty}, ${unmeasured})
      `;
      const quantityById = Object.fromEntries(rows.map((row) => [row.id, row.quantity_on_hand]));

      expect(quantityById[empty]).toBe('0.000');
      expect(quantityById[unmeasured]).toBeNull();
    });

    // Zero is stored as zero ("no warning wanted"), not as absent.
    it('stores a low-stock threshold of zero as zero, not as absent', async () => {
      const id = await hold({ threshold: '0' });

      const [row] = await sql`select low_stock_threshold from inventory_items where id = ${id}`;

      expect(row.low_stock_threshold).toBe('0.000');
    });
  });

  describe('the constraint covers the vocabulary rather than a list of its own', () => {
    // The shipped CHECK read back and compared to the module: a hand-written
    // constraint that forgets `pinch` passes every rejection test above, since
    // only one sample is refused above.
    it('names every unit, under the dimension the module gives it', async () => {
      const [row] = await sql`
        select pg_get_constraintdef(oid) as definition
        from pg_constraint
        where conrelid = 'inventory_items'::regclass and conname = ${DIMENSION_CHECK}
      `;
      const definition = row.definition as string;

      for (const dimension of UNIT_DIMENSIONS) {
        for (const unit of UNITS_BY_DIMENSION[dimension]) {
          const clause = definition
            .split(' OR ')
            .find((part) => part.includes(`'${unit}'::inventory_unit`));

          expect(clause).toContain(`'${dimension}'::unit_dimension`);
        }
      }
    });
  });
});
