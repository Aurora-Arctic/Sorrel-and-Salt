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
  'variant_id',
  'quantity_on_hand',
  'unit',
  'unit_dimension',
  'low_stock_threshold',
  'source',
  'acquired_date',
];

const HELD_ONCE_INDEX = 'inventory_items_workspace_id_variant_id_unique';
const VARIANT_KEY = 'inventory_items_variant_fk';
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
  variantId,
  quantity = '12.5',
  unit = 'g',
  dimension = 'weight',
  threshold = '10',
  source = null,
  acquiredDate = null,
}: StockRow = {}): Promise<string> {
  const [inserted] = await sql`
    insert into inventory_items
      (workspace_id, ingredient_id, variant_id, quantity_on_hand, unit, unit_dimension,
       low_stock_threshold, source, acquired_date, created_by, updated_by)
    values (${workspaceId}, ${ingredientId}, ${variantId ?? sql`(${liveVariantOf(ingredientId)})`},
            ${quantity}, ${unit}::inventory_unit,
            ${dimension}::unit_dimension, ${threshold}, ${source}, ${acquiredDate}::date,
            ${MEMBER}, ${MEMBER})
    returning id
  `;
  return inserted.id as string;
}

/** The ingredient's seeded variant, the first it was given, as a subquery, for a row that names no other. */
const liveVariantOf = (ingredientId: string) => sql`
  select id from ingredient_variants where ingredient_id = ${ingredientId} and deleted_at is null
  order by created_at, id limit 1
`;

/** A second form of `ingredientId`, written here: the seed gives each entry one. */
async function anotherForm(ingredientId: string, form: string): Promise<string> {
  const [inserted] = await sql`
    insert into ingredient_variants ${sql({
      ingredient_id: ingredientId,
      form,
      created_by: MEMBER,
      updated_by: MEMBER,
    })}
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
  // Stock names the form a jar holds, so Mugwort herb and Mugwort
  // oil are two rows of one coven.
  describe('one live row per variant per workspace', () => {
    // The pair is unique, not either half: drop a column from the index and
    // one of the admitted rows reddens. A second live row of the pair, and its
    // release on a soft delete, are the partial-unique sweep's.
    it('refuses a second live row of the pair, and admits another form, ingredient or coven', async () => {
      await hold();

      const error = await failureOf(hold({ quantity: '3', unit: 'kg', dimension: 'weight' }));
      await hold({ variantId: await anotherForm(MUGWORT, 'Testoil') });
      await hold({ ingredientId: ROSEMARY });
      await hold({ workspaceId: OTHER_COVEN });

      // 23505 is unique_violation, named: this index refused, not something earlier.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(HELD_ONCE_INDEX);
      const [{ count }] = await sql`select count(*)::int as count from inventory_items`;
      expect(count).toBe(4);
    });

    // Why it could have been admitted: the variant exists and is live, only
    // another ingredient's.
    it("refuses another ingredient's variant beside its ingredient", async () => {
      const [rosemaryHerb] = await liveVariantOf(ROSEMARY);

      const error = await failureOf(hold({ variantId: rosemaryHerb.id as string }));

      // 23503 is foreign_key_violation, named: the composite key refused.
      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(VARIANT_KEY);
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
    // One mismatch; that the CHECK names every unit is proved unit by unit below.
    it('refuses a unit declared under another dimension', async () => {
      const error = await failureOf(hold({ unit: 'g', dimension: 'volume' }));

      // 23514 is check_violation, named: this constraint's, not the enum's or the index's.
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

  describe('the constraint covers the vocabulary rather than a list of its own', () => {
    // A hand-written constraint that forgets `pinch`, or files it under the
    // wrong dimension, passes every single-sample test above; every unit is
    // written here under its own dimension and under each other one.
    it('takes every unit under the dimension the module gives it, and refuses it under any other', async () => {
      for (const dimension of UNIT_DIMENSIONS) {
        for (const unit of UNITS_BY_DIMENSION[dimension]) {
          const id = await hold({ unit, dimension });
          await sql`delete from inventory_items where id = ${id}`;

          for (const other of UNIT_DIMENSIONS.filter((each) => each !== dimension)) {
            const error = await failureOf(hold({ unit, dimension: other }));

            expect(error.constraint_name, `${unit} under ${other}`).toBe(DIMENSION_CHECK);
          }
        }
      }
    });
  });
});
