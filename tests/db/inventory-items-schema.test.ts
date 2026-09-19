import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { fromRoot } from '../support/paths';
import { UNITS, UNITS_BY_DIMENSION, UNIT_DIMENSIONS, dimensionOf } from '@/lib/units';
import { ingredients } from '@/db/schema/ingredients';
import { inventoryItems, inventoryUnit, unitDimension } from '@/db/schema/inventory-items';
import { FIXTURE_USERS, WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { users } from '@/db/schema/users';
import { workspaces } from '@/db/schema/workspaces';

// The full six: story 25's delete is recoverable, so the unique index below is partial.
const AUDIT_COLUMNS = [
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
  'deleted_at',
  'deleted_by',
];

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
const WORKSPACE_FK = 'inventory_items_workspace_id_workspaces_id_fk';
const INGREDIENT_FK = 'inventory_items_ingredient_id_ingredients_id_fk';

const SCHEMA_SOURCE = fromRoot('src/db/schema/inventory-items.ts');

// Every single-quoted literal, comments stripped first so the guard reads code, not prose.
function quotedLiteralsIn(path: string): string[] {
  const code = readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  return (code.match(/'[^'\n]*'/g) ?? []).map((literal) => literal.slice(1, -1));
}

describe('inventory_items schema', () => {
  const { columns, indexes, foreignKeys, checks } = getTableConfig(inventoryItems);
  const byName = Object.fromEntries(columns.map((column) => [column.name, column]));
  const indexByName = Object.fromEntries(indexes.map((index) => [index.config.name, index]));
  const foreignKeyByColumn = Object.fromEntries(
    foreignKeys.map((fk) => {
      const { columns: local, foreignColumns, foreignTable } = fk.reference();
      return [local[0].name, { foreignColumnName: foreignColumns[0].name, foreignTable }];
    }),
  );

  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  it('requires the workspace and the ingredient the row is about', () => {
    for (const column of ['workspace_id', 'ingredient_id']) {
      expect(byName[column].notNull).toBe(true);
    }
  });

  // "Held, not yet measured" and "held, none left" are different facts —
  // claude-docs/db.md, "Nullability, and why zero is not the same as nothing".
  it('leaves the measurements nullable, so an unmeasured jar is not an empty one', () => {
    for (const column of [
      'quantity_on_hand',
      'unit',
      'unit_dimension',
      'low_stock_threshold',
      'source',
      'acquired_date',
    ]) {
      expect(byName[column].notNull).toBe(false);
    }
  });

  it('carries a surrogate id as its primary key', () => {
    expect(byName.id.primary).toBe(true);
    expect(byName.id.hasDefault).toBe(true);
  });

  it('points at the workspace holding the stock and the ingredient held', () => {
    expect(foreignKeyByColumn.workspace_id.foreignTable).toBe(workspaces);
    expect(foreignKeyByColumn.workspace_id.foreignColumnName).toBe('id');
    expect(foreignKeyByColumn.ingredient_id.foreignTable).toBe(ingredients);
    expect(foreignKeyByColumn.ingredient_id.foreignColumnName).toBe('id');
  });

  it('spreads the six audit columns, the four stamps required', () => {
    for (const column of AUDIT_COLUMNS) {
      expect(byName[column]).toBeDefined();
    }
    for (const column of ['created_at', 'created_by', 'updated_at', 'updated_by']) {
      expect(byName[column].notNull).toBe(true);
    }
    expect(byName.deleted_at.notNull).toBe(false);
    expect(byName.deleted_by.notNull).toBe(false);
  });

  it('references users.id from every audit id (MB.5)', () => {
    for (const column of ['created_by', 'updated_by', 'deleted_by']) {
      expect(foreignKeyByColumn[column]).toBeDefined();
      expect(foreignKeyByColumn[column].foreignColumnName).toBe('id');
      expect(foreignKeyByColumn[column].foreignTable).toBe(users);
    }
  });

  it('declares exactly one index: one live row per ingredient per workspace', () => {
    expect(Object.keys(indexByName)).toEqual([HELD_ONCE_INDEX]);
    expect(indexByName[HELD_ONCE_INDEX].config.unique).toBe(true);
    expect(indexByName[HELD_ONCE_INDEX].config.where).toBeDefined();
  });

  it('declares the unit/dimension check and no other constraint', () => {
    expect(checks.map((constraint) => constraint.name)).toEqual([DIMENSION_CHECK]);
  });

  describe('the enums are the shared module, not a second copy of it', () => {
    it('stocks the unit enum from UNITS', () => {
      expect(inventoryUnit.enumValues).toEqual([...UNITS]);
    });

    it('stocks the dimension enum from UNIT_DIMENSIONS', () => {
      expect(unitDimension.enumValues).toEqual([...UNIT_DIMENSIONS]);
    });

    // "Adding a unit means editing one module" as a property of the file:
    // equal lists stay equal when the vocabulary is pasted in beside the
    // import; a literal `'tsp'` in this file's code does not.
    it('names no unit of its own in the schema file’s code', () => {
      const named: readonly string[] = UNITS;

      expect(quotedLiteralsIn(SCHEMA_SOURCE).filter((value) => named.includes(value))).toEqual([]);
    });

    it('names no dimension of its own either', () => {
      const named: readonly string[] = UNIT_DIMENSIONS;

      expect(quotedLiteralsIn(SCHEMA_SOURCE).filter((value) => named.includes(value))).toEqual([]);
    });
  });
});

const MEMBER = FIXTURE_USERS.A.id;
const COVEN = WORKSPACE_W_ID;
const OTHER_COVEN = WORKSPACE_X_ID;
let MUGWORT: string;
let ROSEMARY: string;
const ABSENT = '99999999-9999-9999-9999-999999999999';

let sql: ReturnType<typeof postgres>;

interface StockRow {
  workspaceId?: string;
  ingredientId?: string;
  quantity?: string | null;
  unit?: string | null;
  dimension?: string | null;
  threshold?: string | null;
  source?: string | null;
  acquiredDate?: string | null;
}

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

async function failureOf(work: Promise<unknown>) {
  return await work.then(
    () => {
      throw new Error('expected the statement to be rejected, but it succeeded');
    },
    (error: postgres.PostgresError) => error,
  );
}

async function columnNames(table: string): Promise<string[]> {
  const rows = await sql`
    select column_name from information_schema.columns
    where table_name = ${table} order by column_name
  `;
  return rows.map((row) => row.column_name as string);
}

async function compendiumIdOf(name: string): Promise<string> {
  const [found] = await sql`
    select id from ingredients where workspace_id is null and name = ${name}
  `;
  if (!found) throw new Error(`The standard seed carries no compendium entry named ${name}`);
  return found.id as string;
}

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });

  MUGWORT = await compendiumIdOf('Mugwort');
  ROSEMARY = await compendiumIdOf('Rosemary');
});

beforeEach(async () => {
  await sql`truncate inventory_items`;
});

afterAll(async () => {
  await sql.end();
});

describe('inventory_items table', () => {
  it('carries §5’s columns beside the six audit ones', async () => {
    expect(await columnNames('inventory_items')).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  describe('one live row per ingredient per workspace', () => {
    it('refuses a second live row for the same ingredient', async () => {
      await hold();

      const error = await failureOf(hold({ quantity: '3', unit: 'kg', dimension: 'weight' }));

      // 23505 is unique_violation, named: this index refused, not something earlier.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(HELD_ONCE_INDEX);
    });

    // Why the refusal above could have succeeded: the pair is unique, not
    // either half; drop a column from the index and one of these reddens.
    it('lets one workspace hold two different ingredients', async () => {
      await hold();

      await expect(hold({ ingredientId: ROSEMARY })).resolves.toBeDefined();
    });

    it('lets two workspaces each hold the same ingredient', async () => {
      await hold();

      await expect(hold({ workspaceId: OTHER_COVEN })).resolves.toBeDefined();
    });

    it('scopes the index to live rows only', async () => {
      const [index] = await sql`
        select i.indisunique as unique,
               pg_get_expr(i.indpred, i.indrelid) as predicate,
               pg_get_indexdef(i.indexrelid) as definition
        from pg_index i
        join pg_class c on c.oid = i.indexrelid
        where i.indrelid = 'inventory_items'::regclass and c.relname = ${HELD_ONCE_INDEX}
      `;

      expect(index?.unique).toBe(true);
      expect(index?.predicate).toBe('(deleted_at IS NULL)');
      expect(index?.definition).toContain('USING btree (workspace_id, ingredient_id)');
    });

    // Story 25's recoverable delete: without the predicate a thrown-out jar
    // reserves its ingredient forever.
    it('lets a workspace re-add an ingredient it soft-deleted', async () => {
      const id = await hold();
      await sql`
        update inventory_items set deleted_at = now(), deleted_by = ${MEMBER} where id = ${id}
      `;

      const readded = await hold();

      expect(readded).not.toBe(id);
    });
  });

  describe('the unit vocabulary', () => {
    // Every unit against the shipped enum rather than the TypeScript list: a
    // unit added to the module and left out of a regenerated migration reddens.
    for (const unit of UNITS) {
      it(`stores ${unit} as ${dimensionOf(unit)}`, async () => {
        const id = await hold({ unit, dimension: dimensionOf(unit) });

        const [row] = await sql`
          select unit::text, unit_dimension::text from inventory_items where id = ${id}
        `;

        expect(row.unit).toBe(unit);
        expect(row.unit_dimension).toBe(dimensionOf(unit));
      });
    }

    it('holds exactly the labels the shared module names', async () => {
      const [row] = await sql`select enum_range(null::inventory_unit)::text[] as labels`;

      expect(row.labels).toEqual([...UNITS]);
    });

    it('holds exactly the dimensions the shared module names', async () => {
      const [row] = await sql`select enum_range(null::unit_dimension)::text[] as labels`;

      expect(row.labels).toEqual([...UNIT_DIMENSIONS]);
    });

    it('refuses a unit the vocabulary does not name', async () => {
      const error = await failureOf(hold({ unit: 'dram', dimension: 'weight' }));

      // 22P02 is invalid_text_representation: the enum refusing the cast before the CHECK.
      expect(error.code).toBe('22P02');
    });
  });

  describe('a dimension that contradicts its unit cannot be written', () => {
    // One mismatch per unit; sampling one pair would leave the constraint free to forget units.
    for (const unit of UNITS) {
      const wrong = UNIT_DIMENSIONS.find((dimension) => dimension !== dimensionOf(unit));

      it(`refuses ${unit} declared as ${wrong}`, async () => {
        const error = await failureOf(hold({ unit, dimension: wrong }));

        // 23514 is check_violation, named: this constraint's, not the enum's or the index's.
        expect(error.code).toBe('23514');
        expect(error.constraint_name).toBe(DIMENSION_CHECK);
      });
    }

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

    it('records where the stock came from and when it arrived', async () => {
      const id = await hold({ source: "Miller's farm stand", acquiredDate: '2026-04-30' });

      const [row] = await sql`
        select source, acquired_date::text from inventory_items where id = ${id}
      `;

      expect(row.source).toBe("Miller's farm stand");
      expect(row.acquired_date).toBe('2026-04-30');
    });
  });

  describe('stock belongs to a real workspace and a real ingredient', () => {
    it('refuses a workspace id no workspace holds', async () => {
      const error = await failureOf(hold({ workspaceId: ABSENT }));

      // 23503 is foreign_key_violation.
      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(WORKSPACE_FK);
    });

    it('refuses an ingredient id no ingredient holds', async () => {
      const error = await failureOf(hold({ ingredientId: ABSENT }));

      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(INGREDIENT_FK);
    });
  });

  describe('the constraint covers the vocabulary rather than a list of its own', () => {
    // The shipped CHECK read back and compared to the module: a hand-written
    // constraint that forgets `pinch` passes every rejection test above, since
    // none asserts what the check admits.
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
