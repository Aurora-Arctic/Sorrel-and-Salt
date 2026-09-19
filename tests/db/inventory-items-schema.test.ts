import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { MIGRATIONS_DIR, fromRoot } from '../support/paths';
import { UNITS, UNITS_BY_DIMENSION, UNIT_DIMENSIONS, dimensionOf } from '@/lib/units';
import { ingredients } from '@/db/schema/ingredients';
import { inventoryItems, inventoryUnit, unitDimension } from '@/db/schema/inventory-items';
import { users } from '@/db/schema/users';
import { workspaces } from '@/db/schema/workspaces';

// The full six. An inventory item is a workspace's record of what it holds,
// and story 25 deletes one with a confirmation and calls it recoverable — so
// it leaves a tombstone, and the unique index below is partial to let the
// same ingredient be re-added afterwards.
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

// Every single-quoted literal in a source file, with comments removed first so
// that the guard below reads the code rather than the prose about it.
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

  // Quantity is nullable because zero already means something else: M9.8
  // renders `0` as out of stock, and a NOT NULL column with no default would
  // force every add to claim a number it may not have. "Held, not yet
  // measured" and "held, none left" are different facts about a jar.
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

    // The acceptance criterion — "adding a unit means editing one module, not
    // three" — as a property of the file rather than of the values, which is
    // the only form of it a later edit can fail. Equal lists stay equal when
    // someone pastes the vocabulary in beside the import; a literal `'tsp'`
    // in this file's code does not survive it.
    //
    // Comments are stripped first, and that is not a loophole: prose quoting
    // `unit_dimension = 'weight'` to explain the constraint is what a reader
    // needs, and a comment cannot drift from the module because nothing reads
    // it. What must not exist is a *value* this file spells for itself.
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

// The behaviour half, following M4.1/M4.4/M4.4a/M7.1's idiom: apply the
// shipped migration into this worker's disposable clone rather than
// hand-copying its DDL, so what is asserted below is the SQL production runs.
// `users`, `workspaces` and `ingredients` are stubbed to the one column this
// table's foreign keys point at — applying their own migrations here would
// leave a __drizzle_migrations table behind for the next test file in this
// worker to trip over.

function migrationStatementsContaining(marker: string): string[] {
  const file = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => join(MIGRATIONS_DIR, name))
    .find((path) => readFileSync(path, 'utf8').includes(marker));

  if (!file) throw new Error(`No migration in src/db/migrations contains ${marker}`);

  return readFileSync(file, 'utf8')
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

const MEMBER = '11111111-1111-1111-1111-111111111111';
const COVEN = '22222222-2222-2222-2222-222222222222';
const OTHER_COVEN = '33333333-3333-3333-3333-333333333333';
const MUGWORT = '44444444-4444-4444-4444-444444444444';
const ROSEMARY = '55555555-5555-5555-5555-555555555555';
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

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });

  await sql`drop table if exists inventory_items`;
  await sql`drop type if exists inventory_unit`;
  await sql`drop type if exists unit_dimension`;
  await sql`create table if not exists users (id uuid primary key)`;
  await sql`create table if not exists workspaces (id uuid primary key)`;
  await sql`create table if not exists ingredients (id uuid primary key)`;
  await sql`insert into users (id) values (${MEMBER}) on conflict do nothing`;
  await sql`insert into workspaces (id) values (${COVEN}), (${OTHER_COVEN}) on conflict do nothing`;
  await sql`insert into ingredients (id) values (${MUGWORT}), (${ROSEMARY}) on conflict do nothing`;

  for (const statement of migrationStatementsContaining('CREATE TABLE "inventory_items"')) {
    await sql.unsafe(statement);
  }
});

beforeEach(async () => {
  await sql`delete from inventory_items`;
});

afterAll(async () => {
  await sql`drop table if exists inventory_items`;
  await sql`drop type if exists inventory_unit`;
  await sql`drop type if exists unit_dimension`;
  await sql`drop table if exists ingredients`;
  await sql`drop table if exists workspaces`;
  await sql`drop table if exists users`;
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

      // 23505 is unique_violation, named: proof the insert reached this index
      // rather than tripping something else on the way.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(HELD_ONCE_INDEX);
    });

    // Why the refusal above could have succeeded: the pair is what is unique,
    // not either half of it. Drop a column from the index and one of these two
    // reddens while the refusal above stays green.
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

    // Story 25 calls the delete recoverable, and CLAUDE.md rule 4's argument
    // is exactly this: without the partial predicate, throwing a jar out
    // permanently reserves that ingredient against ever being stocked again.
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
    // Every unit in the shared module, inserted against the dimension the
    // module assigns it. This is the criterion "unit enum covers weight,
    // volume and count, metric and imperial" asserted against the shipped
    // enum rather than against the TypeScript list — a unit added to the
    // module and left out of a regenerated migration reddens here.
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

      // 22P02 is invalid_text_representation — the enum refusing the cast,
      // before the CHECK is ever consulted.
      expect(error.code).toBe('22P02');
    });
  });

  describe('a dimension that contradicts its unit cannot be written', () => {
    // One mismatch per unit: each unit paired with a dimension that is not
    // its own. Sampling one pair would leave the constraint free to name only
    // the units someone thought of.
    for (const unit of UNITS) {
      const wrong = UNIT_DIMENSIONS.find((dimension) => dimension !== dimensionOf(unit));

      it(`refuses ${unit} declared as ${wrong}`, async () => {
        const error = await failureOf(hold({ unit, dimension: wrong }));

        // 23514 is check_violation, named: the refusal is this constraint's
        // and not the enum's or the index's.
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

    // The other half of the check, and the reason it is not simply
    // `unit_dimension = dimension_of(unit)`: a row that records nothing about
    // measurement records no contradiction either.
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

      // The driver hands back `numeric` as a string, which is the point:
      // 0.1 kg survives as 0.1 rather than as a float's nearest neighbour.
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

    // M9.8 writes the dimension-appropriate default onto the row at creation
    // rather than applying a constant at read time. The column takes what it
    // is given, including zero, which M9.8 reads as "no warning wanted"
    // rather than "always low".
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
    // Read the shipped CHECK back out of the catalogue and compare it against
    // the module: every unit named, grouped under the dimension the module
    // assigns it. A hand-written constraint that forgets `pinch` passes every
    // rejection test above — nothing there asserts what the check *admits*.
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
