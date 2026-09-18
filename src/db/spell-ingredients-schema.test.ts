import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { UNITS, dimensionOf } from '../lib/units';
import { ingredients } from './schema/ingredients';
import { inventoryUnit } from './schema/inventory-items';
import { spellIngredients } from './schema/spell-ingredients';
import { spells } from './schema/spells';
import { users } from './schema/users';

const STAMP_COLUMNS = ['created_at', 'created_by', 'updated_at', 'updated_by'];
const DELETE_COLUMNS = ['deleted_at', 'deleted_by'];

// DESIGN.md §5's column list, transcribed.
const OWN_COLUMNS = ['spell_id', 'ingredient_id', 'quantity', 'unit', 'layer_order', 'note'];

const PRIMARY_KEY = 'spell_ingredients_spell_id_ingredient_id_pk';
const LAYER_INDEX = 'spell_ingredients_spell_id_layer_order_unique';
const SPELL_FK = 'spell_ingredients_spell_id_spells_id_fk';
const INGREDIENT_FK = 'spell_ingredients_ingredient_id_ingredients_id_fk';

describe('spell_ingredients schema', () => {
  const { columns, indexes, primaryKeys, foreignKeys, checks } = getTableConfig(spellIngredients);
  const byName = Object.fromEntries(columns.map((column) => [column.name, column]));
  const indexByName = Object.fromEntries(indexes.map((index) => [index.config.name, index]));
  const foreignKeyByColumn = Object.fromEntries(
    foreignKeys.map((fk) => {
      const { columns: local, foreignColumns, foreignTable } = fk.reference();
      return [
        local[0].name,
        { name: fk.getName(), foreignColumnName: foreignColumns[0].name, foreignTable },
      ];
    }),
  );

  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...STAMP_COLUMNS].sort());
  });

  // MB.34: the four stamps, not the six. `created_by` still answers who put
  // this ingredient in this jar, which is story 13's question; what goes is the
  // tombstone, because pulling an ingredient back out of a spell leaves no row.
  it('spreads the four audit stamps, each required', () => {
    for (const column of STAMP_COLUMNS) {
      expect(byName[column]).toBeDefined();
      expect(byName[column].notNull).toBe(true);
    }
  });

  it('carries no delete columns: an ingredient pulled out leaves no row', () => {
    for (const column of DELETE_COLUMNS) {
      expect(byName[column]).toBeUndefined();
    }
  });

  it('has no surrogate id, keying on the pair instead', () => {
    expect(byName.id).toBeUndefined();

    const [key, ...rest] = primaryKeys;
    expect(rest).toEqual([]);
    expect(key.columns.map((column) => column.name)).toEqual(['spell_id', 'ingredient_id']);
    expect(key.getName()).toBe(PRIMARY_KEY);
  });

  it('requires both sides of the pair, and the layer they sit at', () => {
    expect(byName.spell_id.notNull).toBe(true);
    expect(byName.ingredient_id.notNull).toBe(true);
    expect(byName.layer_order.notNull).toBe(true);
  });

  // A measurement may be missing without the row being meaningless — "a pinch
  // of salt" names no number, and a draft is saved before it is finished. The
  // same call §5 makes on `inventory_items.quantityOnHand`, for the same
  // reason: zero is a quantity, and absence is not.
  it('leaves the measurement and the note nullable', () => {
    for (const column of ['quantity', 'unit', 'note']) {
      expect(byName[column].notNull).toBe(false);
    }
  });

  // The acceptance criterion, as a property of the schema rather than of a
  // comment: the join points at the ingredient, so a spell is a record of what
  // was used and survives the stock row for it being thrown out (M10.21).
  it('points at the ingredient, never at the inventory item', () => {
    expect(foreignKeyByColumn.ingredient_id.foreignTable).toBe(ingredients);
    expect(foreignKeyByColumn.ingredient_id.foreignColumnName).toBe('id');
    expect(foreignKeyByColumn.ingredient_id.name).toBe(INGREDIENT_FK);
  });

  it('points at the spell whose jar it describes', () => {
    expect(foreignKeyByColumn.spell_id.foreignTable).toBe(spells);
    expect(foreignKeyByColumn.spell_id.foreignColumnName).toBe('id');
    expect(foreignKeyByColumn.spell_id.name).toBe(SPELL_FK);
  });

  it('references users.id from both audit ids (MB.5)', () => {
    for (const column of ['created_by', 'updated_by']) {
      expect(foreignKeyByColumn[column]).toBeDefined();
      expect(foreignKeyByColumn[column].foreignColumnName).toBe('id');
      expect(foreignKeyByColumn[column].foreignTable).toBe(users);
    }
    expect(foreignKeyByColumn.deleted_by).toBeUndefined();
  });

  it('declares exactly one index: one ingredient per layer of a spell', () => {
    expect(Object.keys(indexByName)).toEqual([LAYER_INDEX]);
    expect(indexByName[LAYER_INDEX].config.unique).toBe(true);
    expect(
      indexByName[LAYER_INDEX].config.columns.map(
        (column: unknown) => (column as { name: string }).name,
      ),
    ).toEqual(['spell_id', 'layer_order']);
  });

  // Rule 4's partial-index convention exists to stop a tombstone reserving a
  // name, and a hard-deleted table has no tombstone to dodge. A `WHERE
  // deleted_at IS NULL` here would not even compile.
  it('carries no partial index: there is no soft-delete predicate to write', () => {
    for (const index of indexes) {
      expect(index.config.where).toBeUndefined();
    }
  });

  it('declares no check of its own', () => {
    expect(checks).toEqual([]);
  });

  // One vocabulary, one Postgres type. M9.2 declared `inventory_unit` from
  // `src/lib/units.ts`, and a spell measuring in tablespoons means the same
  // tablespoon a jar is measured in — a second enum would be the drift that
  // module exists to prevent.
  it('measures in M9.2’s unit enum rather than a second copy of it', () => {
    expect(byName.unit.enumValues).toEqual([...UNITS]);
    expect(byName.unit.getSQLType()).toBe(inventoryUnit.enumName);
  });
});

// The behaviour half, applying the shipped migration into this worker's
// disposable clone rather than hand-copying its DDL. `users` and `ingredients`
// are stubbed to the one column the foreign keys point at; `spells` is the real
// table, created by the same migration. `inventory_items` is stubbed too, and
// only so that "references ingredients, not inventory_items" has something to
// fail against.
const MIGRATIONS_DIR = fileURLToPath(new URL('./migrations', import.meta.url));

function migrationStatementsContaining(marker: string): string[] {
  const file = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => fileURLToPath(new URL(`./migrations/${name}`, import.meta.url)))
    .find((path) => readFileSync(path, 'utf8').includes(marker));

  if (!file) throw new Error(`No migration in src/db/migrations contains ${marker}`);

  return readFileSync(file, 'utf8')
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

const AUTHOR = '11111111-1111-1111-1111-111111111111';
const COVEN = '22222222-2222-2222-2222-222222222222';
const MUGWORT = '44444444-4444-4444-4444-444444444444';
const ROSEMARY = '55555555-5555-5555-5555-555555555555';
// Stock for an ingredient this workspace does not have an entry for — the id
// exists in `inventory_items` and nowhere else, which is what makes it a probe
// for which table the foreign key points at.
const STOCK_ONLY = '66666666-6666-6666-6666-666666666666';
const ABSENT = '99999999-9999-9999-9999-999999999999';

let sql: ReturnType<typeof postgres>;
let createdUnitEnum = false;
let hearthGuard: string;
let otherSpell: string;

interface LayerRow {
  spellId?: string;
  ingredientId?: string;
  quantity?: string | null;
  unit?: string | null;
  layerOrder?: number;
  note?: string | null;
}

async function layer({
  spellId = hearthGuard,
  ingredientId = MUGWORT,
  quantity = '2.000',
  unit = 'tbsp',
  layerOrder = 1,
  note = null,
}: LayerRow = {}): Promise<void> {
  await sql`
    insert into spell_ingredients
      (spell_id, ingredient_id, quantity, unit, layer_order, note, created_by, updated_by)
    values (${spellId}, ${ingredientId}, ${quantity}, ${unit}::inventory_unit, ${layerOrder},
            ${note}, ${AUTHOR}, ${AUTHOR})
  `;
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

async function layerOrders(spellId: string): Promise<number[]> {
  const rows = await sql`
    select layer_order from spell_ingredients where spell_id = ${spellId} order by layer_order
  `;
  return rows.map((row) => row.layer_order as number);
}

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });

  await sql`drop table if exists spell_ingredients`;
  await sql`drop table if exists spells`;
  await sql`drop type if exists spell_status`;
  await sql`create table if not exists users (id uuid primary key)`;
  await sql`create table if not exists workspaces (id uuid primary key)`;
  await sql`create table if not exists ingredients (id uuid primary key)`;
  await sql`create table if not exists inventory_items (id uuid primary key)`;
  await sql`insert into users (id) values (${AUTHOR}) on conflict do nothing`;
  await sql`insert into workspaces (id) values (${COVEN}) on conflict do nothing`;
  await sql`insert into ingredients (id) values (${MUGWORT}), (${ROSEMARY}) on conflict do nothing`;
  await sql`insert into inventory_items (id) values (${STOCK_ONLY}) on conflict do nothing`;

  // `unit` reuses M9.2's `inventory_unit`, so this migration does not create
  // the type and the clone may or may not already carry it, depending on what
  // else has run in this worker.
  const [{ present }] = await sql`
    select exists (select 1 from pg_type where typname = 'inventory_unit') as present
  `;
  if (!present) {
    createdUnitEnum = true;
    for (const statement of migrationStatementsContaining(
      'CREATE TYPE "public"."inventory_unit"',
    ).filter((statement) => statement.includes('CREATE TYPE "public"."inventory_unit"'))) {
      await sql.unsafe(statement);
    }
  }

  for (const statement of migrationStatementsContaining('CREATE TABLE "spell_ingredients"')) {
    await sql.unsafe(statement);
  }
});

beforeEach(async () => {
  await sql`delete from spell_ingredients`;
  await sql`delete from spells`;

  const [first] = await sql`
    insert into spells (workspace_id, title, created_by, updated_by)
    values (${COVEN}, 'Hearth Guard', ${AUTHOR}, ${AUTHOR}) returning id
  `;
  const [second] = await sql`
    insert into spells (workspace_id, title, created_by, updated_by)
    values (${COVEN}, 'Sweet Jar', ${AUTHOR}, ${AUTHOR}) returning id
  `;
  hearthGuard = first.id as string;
  otherSpell = second.id as string;
});

afterAll(async () => {
  await sql`drop table if exists spell_ingredients`;
  await sql`drop table if exists spells`;
  await sql`drop type if exists spell_status`;
  if (createdUnitEnum) await sql`drop type if exists inventory_unit`;
  await sql`drop table if exists inventory_items`;
  await sql`drop table if exists ingredients`;
  await sql`drop table if exists workspaces`;
  await sql`drop table if exists users`;
  await sql.end();
});

describe('spell_ingredients table', () => {
  it('carries §5’s columns beside the four audit stamps', async () => {
    expect(await columnNames('spell_ingredients')).toEqual(
      [...OWN_COLUMNS, ...STAMP_COLUMNS].sort(),
    );
  });

  it('stores the measurement, the layer and the note', async () => {
    await layer({ quantity: '0.125', unit: 'tsp', layerOrder: 3, note: 'crushed, not ground' });

    const [row] = await sql`
      select quantity, unit::text, layer_order, note from spell_ingredients
      where spell_id = ${hearthGuard}
    `;

    // `numeric`, not a float — M9.5 converts against these, and 0.125 has to
    // come back as 0.125 rather than as something near it.
    expect(row.quantity).toBe('0.125');
    expect(row.unit).toBe('tsp');
    expect(row.layer_order).toBe(3);
    expect(row.note).toBe('crushed, not ground');
  });

  it('accepts an ingredient with no measurement at all', async () => {
    await layer({ quantity: null, unit: null });

    const [row] = await sql`
      select quantity, unit from spell_ingredients where spell_id = ${hearthGuard}
    `;

    expect(row.quantity).toBeNull();
    expect(row.unit).toBeNull();
  });

  describe('the pair is the identity', () => {
    it('refuses the same ingredient twice in one spell', async () => {
      await layer();

      // 23505 is unique_violation, named: the refusal is the primary key's.
      const error = await failureOf(layer({ layerOrder: 2 }));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(PRIMARY_KEY);
    });

    // Why the refusal above could have succeeded: the pair is what is unique,
    // not either half of it. Drop a column from the key and one of these two
    // reddens while the refusal above stays green.
    it('lets one spell hold two different ingredients', async () => {
      await layer();

      await expect(layer({ ingredientId: ROSEMARY, layerOrder: 2 })).resolves.toBeUndefined();
    });

    it('lets two spells each call for the same ingredient', async () => {
      await layer();

      await expect(layer({ spellId: otherSpell })).resolves.toBeUndefined();
    });
  });

  describe('layer order is unique within a spell', () => {
    it('refuses two ingredients laid at the same depth', async () => {
      await layer();

      const error = await failureOf(layer({ ingredientId: ROSEMARY }));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(LAYER_INDEX);
    });

    // Why that refusal could have succeeded: the index leads on `spell_id`, so
    // the layering of one jar says nothing about the layering of another.
    it('lets two spells each have a first layer', async () => {
      await layer();

      await expect(layer({ spellId: otherSpell })).resolves.toBeUndefined();
    });

    it('records the sequence a jar is built in', async () => {
      await layer({ layerOrder: 1 });
      await layer({ ingredientId: ROSEMARY, layerOrder: 2 });

      expect(await layerOrders(hearthGuard)).toEqual([1, 2]);
    });

    it('refuses a row with no layer at all', async () => {
      const error = await failureOf(
        sql`
          insert into spell_ingredients (spell_id, ingredient_id, created_by, updated_by)
          values (${hearthGuard}, ${MUGWORT}, ${AUTHOR}, ${AUTHOR})
        `,
      );

      // 23502 is not_null_violation. Nullable would have made the uniqueness
      // above vacuous — distinct NULLs collide with nothing, so an unordered
      // row would be neither stored nor unique.
      expect(error.code).toBe('23502');
      expect(error.column_name).toBe('layer_order');
    });

    // The index is checked per row, not at end of statement, so M10.16's
    // reorder cannot be a single `set layer_order = layer_order + 1` sweep even
    // though the final state is conflict-free. Recorded here as the shape the
    // reorder has to take — rewrite the jar's rows, which a hard-deleted table
    // makes an ordinary delete-and-insert.
    it('refuses a shift that collides mid-statement, so a reorder rewrites', async () => {
      await layer({ layerOrder: 1 });
      await layer({ ingredientId: ROSEMARY, layerOrder: 2 });

      const error = await failureOf(
        sql`update spell_ingredients set layer_order = layer_order + 1 where spell_id = ${hearthGuard}`,
      );
      expect(error.code).toBe('23505');

      await sql`delete from spell_ingredients where spell_id = ${hearthGuard}`;
      await layer({ ingredientId: ROSEMARY, layerOrder: 1 });
      await layer({ layerOrder: 2 });

      const rows = await sql`
        select ingredient_id, layer_order from spell_ingredients
        where spell_id = ${hearthGuard} order by layer_order
      `;
      expect(rows.map((row) => row.ingredient_id)).toEqual([ROSEMARY, MUGWORT]);
    });
  });

  describe('the join names an ingredient, not a stock row', () => {
    it('refuses an id that exists only in inventory_items', async () => {
      const error = await failureOf(layer({ ingredientId: STOCK_ONLY }));

      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(INGREDIENT_FK);
    });

    // Why that refusal could have succeeded: the very same insert against an
    // id that *is* an ingredient is accepted. Point the key at
    // `inventory_items` instead and this pair swaps which one reddens.
    it('accepts an ingredient the workspace holds no stock of', async () => {
      const held = await sql`select id from inventory_items where id = ${MUGWORT}`;
      expect(held).toEqual([]);

      await expect(layer()).resolves.toBeUndefined();
    });

    it('refuses an ingredient that does not exist', async () => {
      const error = await failureOf(layer({ ingredientId: ABSENT }));

      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(INGREDIENT_FK);
    });

    it('refuses a spell that does not exist', async () => {
      const error = await failureOf(layer({ spellId: ABSENT }));

      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(SPELL_FK);
    });
  });

  describe('the unit vocabulary is M9.2’s', () => {
    it('stores the column as the inventory_unit type, not a second enum', async () => {
      const [row] = await sql`
        select udt_name from information_schema.columns
        where table_name = 'spell_ingredients' and column_name = 'unit'
      `;

      expect(row.udt_name).toBe('inventory_unit');
    });

    for (const unit of UNITS) {
      it(`measures a layer in ${unit} (${dimensionOf(unit)})`, async () => {
        await layer({ unit });

        const [row] = await sql`
          select unit::text from spell_ingredients where spell_id = ${hearthGuard}
        `;

        expect(row.unit).toBe(unit);
      });
    }

    it('refuses a unit the vocabulary does not name', async () => {
      const error = await failureOf(layer({ unit: 'dram' }));

      expect(error.code).toBe('22P02');
    });
  });

  // MB.34: an ingredient pulled out of a jar leaves no row, and re-adding it is
  // an ordinary insert rather than a resurrection. Nothing in v1 reads a
  // removed layer — there is no restore UI and the trash view is v2.
  describe('removal is a hard delete', () => {
    it('leaves no row behind', async () => {
      await layer();

      await sql`
        delete from spell_ingredients
        where spell_id = ${hearthGuard} and ingredient_id = ${MUGWORT}
      `;

      const rows = await sql`select * from spell_ingredients where spell_id = ${hearthGuard}`;
      expect(rows).toEqual([]);
    });

    it('lets the same ingredient be added back to the same spell', async () => {
      await layer();
      await sql`
        delete from spell_ingredients
        where spell_id = ${hearthGuard} and ingredient_id = ${MUGWORT}
      `;

      await expect(layer()).resolves.toBeUndefined();
    });
  });

  it('declares the primary key and the layer index, and nothing else', async () => {
    const rows = await sql`
      select c.relname as name
      from pg_index i
      join pg_class c on c.oid = i.indexrelid
      where i.indrelid = 'spell_ingredients'::regclass
      order by c.relname
    `;

    expect(rows.map((row) => row.name)).toEqual([LAYER_INDEX, PRIMARY_KEY].sort());
  });

  it('declares no check constraint of its own', async () => {
    const rows = await sql`
      select conname from pg_constraint
      where conrelid = 'spell_ingredients'::regclass and contype = 'c'
    `;

    expect(rows.map((row) => row.conname)).toEqual([]);
  });
});
