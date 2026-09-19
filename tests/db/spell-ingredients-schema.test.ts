import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { MIGRATIONS_DIR } from '../support/paths';
import { UNITS, dimensionOf } from '@/lib/units';
import { ingredients } from '@/db/schema/ingredients';
import { inventoryUnit } from '@/db/schema/inventory-items';
import { spellIngredients } from '@/db/schema/spell-ingredients';
import { spells } from '@/db/schema/spells';
import { users } from '@/db/schema/users';

const STAMP_COLUMNS = ['created_at', 'created_by', 'updated_at', 'updated_by'];
const DELETE_COLUMNS = ['deleted_at', 'deleted_by'];

// DESIGN.md §5's column list, transcribed. `name` and `form` are MB.40's: a
// custom, one-off ingredient carries them instead of an `ingredient_id`.
const OWN_COLUMNS = [
  'spell_id',
  'ingredient_id',
  'name',
  'form',
  'quantity',
  'unit',
  'layer_order',
  'note',
];

// MB.40 moved the primary key onto the layer. The pair `(spell_id,
// ingredient_id)` no longer exists on every row, so it cannot be the key; the
// guarantee it gave — one ingredient per jar — is the partial index's now.
const PRIMARY_KEY = 'spell_ingredients_spell_id_layer_order_pk';
const INGREDIENT_INDEX = 'spell_ingredients_spell_id_ingredient_id_unique';
const CUSTOM_NAME_INDEX = 'spell_ingredients_spell_id_custom_name_unique';
const SPELL_FK = 'spell_ingredients_spell_id_spells_id_fk';
const INGREDIENT_FK = 'spell_ingredients_ingredient_id_ingredients_id_fk';

const CHECK_INGREDIENT_OR_NAME = 'spell_ingredients_ingredient_or_name';
const CHECK_FORM_ONLY_ON_CUSTOM = 'spell_ingredients_form_only_on_custom';
const CHECK_NAME_NOT_BLANK = 'spell_ingredients_name_not_blank';
const CHECK_FORM_NOT_BLANK = 'spell_ingredients_form_not_blank';
const CHECKS = [
  CHECK_INGREDIENT_OR_NAME,
  CHECK_FORM_ONLY_ON_CUSTOM,
  CHECK_NAME_NOT_BLANK,
  CHECK_FORM_NOT_BLANK,
].sort();

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
  // MB.40 does not change that: a custom row carries content, but content
  // addressable only through its spell, and nothing in v1 reads a removed one.
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

  // The identity of a row is the layer it sits at. Not a surrogate id, which
  // would say nothing about the jar; not the `(spell_id, ingredient_id)` pair,
  // which a custom row does not have.
  it('has no surrogate id, keying on the layer instead', () => {
    expect(byName.id).toBeUndefined();

    const [key, ...rest] = primaryKeys;
    expect(rest).toEqual([]);
    expect(key.columns.map((column) => column.name)).toEqual(['spell_id', 'layer_order']);
    expect(key.getName()).toBe(PRIMARY_KEY);
  });

  it('requires the spell and the layer, and makes the ingredient optional', () => {
    expect(byName.spell_id.notNull).toBe(true);
    expect(byName.layer_order.notNull).toBe(true);
    // Nullable, because a custom row has no ingredient to point at. The CHECK
    // below is what stops a row leaving both halves empty.
    expect(byName.ingredient_id.notNull).toBe(false);
    expect(byName.name.notNull).toBe(false);
    expect(byName.form.notNull).toBe(false);
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

  // Two partial unique indexes, one per kind of row. Both are partial, and
  // neither predicate is rule 4's `deleted_at is null` — there is still no
  // tombstone on this table to dodge. The predicate is the discriminator: an
  // index over linked rows and an index over custom rows, each unique within
  // its own kind, because a linked row has no name to collide on and a custom
  // row has no ingredient id to.
  it('declares two partial unique indexes: one ingredient per jar, one custom name per jar', () => {
    expect(Object.keys(indexByName).sort()).toEqual([INGREDIENT_INDEX, CUSTOM_NAME_INDEX].sort());

    for (const name of [INGREDIENT_INDEX, CUSTOM_NAME_INDEX]) {
      expect(indexByName[name].config.unique).toBe(true);
      expect(indexByName[name].config.where).toBeDefined();
    }

    expect(
      indexByName[INGREDIENT_INDEX].config.columns.map(
        (column: unknown) => (column as { name: string }).name,
      ),
    ).toEqual(['spell_id', 'ingredient_id']);

    // `(spell_id, lower(name))` — the second column is an expression, so only
    // the leading column has a name to read here; the Postgres half checks
    // the expression itself.
    const customColumns = indexByName[CUSTOM_NAME_INDEX].config.columns;
    expect(customColumns).toHaveLength(2);
    expect((customColumns[0] as { name: string }).name).toBe('spell_id');
  });

  it('declares the four checks that make a row one kind or the other', () => {
    expect(checks.map((check) => check.name).sort()).toEqual(CHECKS);
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

// The behaviour half, applying the shipped migrations into this worker's
// disposable clone rather than hand-copying their DDL: 0014 creates the table,
// 0017 reshapes it. `users` and `ingredients` are stubbed to the one column
// the foreign keys point at; `spells` is the real table, created by the same
// migration. `inventory_items` is stubbed too, and only so that "references
// ingredients, not inventory_items" has something to fail against.

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
  ingredientId?: string | null;
  name?: string | null;
  form?: string | null;
  quantity?: string | null;
  unit?: string | null;
  layerOrder?: number;
  note?: string | null;
}

async function layer({
  spellId = hearthGuard,
  ingredientId = MUGWORT,
  name = null,
  form = null,
  quantity = '2.000',
  unit = 'tbsp',
  layerOrder = 1,
  note = null,
}: LayerRow = {}): Promise<void> {
  await sql`
    insert into spell_ingredients
      (spell_id, ingredient_id, name, form, quantity, unit, layer_order, note, created_by, updated_by)
    values (${spellId}, ${ingredientId}, ${name}, ${form}, ${quantity}, ${unit}::inventory_unit,
            ${layerOrder}, ${note}, ${AUTHOR}, ${AUTHOR})
  `;
}

/** A custom, one-off layer: a name in place of an ingredient id. */
async function custom(name: string | null, overrides: Omit<LayerRow, 'name'> = {}): Promise<void> {
  await layer({ ingredientId: null, name, ...overrides });
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
  // MB.40's reshaping, found by the one constraint name only it carries — 0014
  // already contains `ALTER TABLE "spell_ingredients"`, so that marker would
  // find the wrong file.
  for (const statement of migrationStatementsContaining(`"${CHECK_INGREDIENT_OR_NAME}"`)) {
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

  // MB.40, story 57: a layer is either an ingredient the workspace knows or a
  // name written for this one jar — never both, never neither. The CHECK is
  // DESIGN.md §14's "nullable FKs plus num_nonnulls" idiom, and it is what
  // makes `ingredient_id` safe to leave nullable.
  describe('a layer names an ingredient or a custom name, never both or neither', () => {
    it('stores a custom ingredient by name and form, with no ingredient row', async () => {
      await custom('Garden dust', { form: 'powder' });

      const [row] = await sql`
        select ingredient_id, name, form from spell_ingredients where spell_id = ${hearthGuard}
      `;

      expect(row.ingredient_id).toBeNull();
      expect(row.name).toBe('Garden dust');
      expect(row.form).toBe('powder');
    });

    it('lets a custom ingredient name no form', async () => {
      await expect(custom('Garden dust')).resolves.toBeUndefined();
    });

    it('refuses a layer naming neither', async () => {
      // 23514 is check_violation, named: the refusal is the CHECK's.
      const error = await failureOf(layer({ ingredientId: null }));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(CHECK_INGREDIENT_OR_NAME);
    });

    it('refuses a layer naming both', async () => {
      const error = await failureOf(layer({ ingredientId: MUGWORT, name: 'Mugwort' }));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(CHECK_INGREDIENT_OR_NAME);
    });

    // `form` beside an ingredient id would be a second copy of
    // `ingredients.form`, which is half of that ingredient's identity — the
    // drift `canonical_key` exists to prevent. The positive case above ("with
    // no ingredient row") is why this refusal could have succeeded: the same
    // `form` is accepted the moment `ingredient_id` is null.
    it('refuses a form beside an ingredient id', async () => {
      const error = await failureOf(layer({ form: 'powder' }));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(CHECK_FORM_ONLY_ON_CUSTOM);
    });

    // A blank name would satisfy `num_nonnulls` and name nothing — the
    // `ingredients_form_not_blank` idiom, applied to both text columns.
    it('refuses a blank custom name', async () => {
      const error = await failureOf(custom('   '));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(CHECK_NAME_NOT_BLANK);
    });

    it('refuses a blank form', async () => {
      const error = await failureOf(custom('Garden dust', { form: '  ' }));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(CHECK_FORM_NOT_BLANK);
    });
  });

  // The primary key: one row per depth in a jar, whichever kind of row it is.
  describe('the layer is the identity', () => {
    it('refuses two ingredients laid at the same depth', async () => {
      await layer();

      // 23505 is unique_violation, named: the refusal is the primary key's.
      const error = await failureOf(layer({ ingredientId: ROSEMARY }));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(PRIMARY_KEY);
    });

    it('refuses a custom name laid at the depth an ingredient occupies', async () => {
      await layer();

      const error = await failureOf(custom('Garden dust'));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(PRIMARY_KEY);
    });

    it('refuses two custom names laid at the same depth', async () => {
      await custom('Garden dust');

      const error = await failureOf(custom('Threshold salt'));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(PRIMARY_KEY);
    });

    // Why those refusals could have succeeded: the key leads on `spell_id`, so
    // the layering of one jar says nothing about the layering of another.
    it('lets two spells each have a first layer', async () => {
      await layer();

      await expect(layer({ spellId: otherSpell })).resolves.toBeUndefined();
    });

    it('lets a custom row sit beside a linked one', async () => {
      await layer({ layerOrder: 1 });
      await custom('Garden dust', { layerOrder: 2 });

      const rows = await sql`
        select ingredient_id, name from spell_ingredients
        where spell_id = ${hearthGuard} order by layer_order
      `;
      expect(rows.map((row) => [row.ingredient_id, row.name])).toEqual([
        [MUGWORT, null],
        [null, 'Garden dust'],
      ]);
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

      // 23502 is not_null_violation. A primary key column is NOT NULL by
      // construction, so an unordered row has nowhere to sit.
      expect(error.code).toBe('23502');
      expect(error.column_name).toBe('layer_order');
    });

    // The key is checked per row, not at end of statement, so M10.16's
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

  // What the old primary key used to guarantee, now held by a partial index
  // over the linked rows — and its mirror over the custom rows, in the shape of
  // `ingredients_workspace_label_unique`: inside one jar an ambiguous label is
  // a mistake, not a distinction. An ingredient wanted at two depths is one
  // row with a note, not two rows competing to describe the same thing.
  describe('one ingredient per jar, one custom name per jar', () => {
    it('refuses the same ingredient twice in one spell', async () => {
      await layer();

      const error = await failureOf(layer({ layerOrder: 2 }));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(INGREDIENT_INDEX);
    });

    // Why the refusal above could have succeeded: the pair is what is unique,
    // not either half of it.
    it('lets one spell hold two different ingredients', async () => {
      await layer();

      await expect(layer({ ingredientId: ROSEMARY, layerOrder: 2 })).resolves.toBeUndefined();
    });

    it('lets two spells each call for the same ingredient', async () => {
      await layer();

      await expect(layer({ spellId: otherSpell })).resolves.toBeUndefined();
    });

    it('refuses the same custom name twice in one spell, whatever its case', async () => {
      await custom('Threshold Salt');

      const error = await failureOf(custom('threshold salt', { layerOrder: 2 }));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(CUSTOM_NAME_INDEX);
    });

    it('lets one spell hold two different custom names', async () => {
      await custom('Threshold salt');

      await expect(custom('Garden dust', { layerOrder: 2 })).resolves.toBeUndefined();
    });

    it('lets two spells each call for the same custom name', async () => {
      await custom('Threshold salt');

      await expect(custom('Threshold salt', { spellId: otherSpell })).resolves.toBeUndefined();
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

    // A custom row has no ingredient id to be addressed by; the layer is its
    // address, which is the primary key doing its job.
    it('removes a custom row by its layer, and lets the name be written again', async () => {
      await custom('Garden dust');

      await sql`
        delete from spell_ingredients where spell_id = ${hearthGuard} and layer_order = 1
      `;

      const rows = await sql`select * from spell_ingredients where spell_id = ${hearthGuard}`;
      expect(rows).toEqual([]);
      await expect(custom('Garden dust')).resolves.toBeUndefined();
    });
  });

  it('declares the primary key and the two partial indexes, and nothing else', async () => {
    const rows = await sql`
      select c.relname as name
      from pg_index i
      join pg_class c on c.oid = i.indexrelid
      where i.indrelid = 'spell_ingredients'::regclass
      order by c.relname
    `;

    expect(rows.map((row) => row.name)).toEqual(
      [PRIMARY_KEY, INGREDIENT_INDEX, CUSTOM_NAME_INDEX].sort(),
    );
  });

  // The predicates, read back from the catalogue: each index covers exactly
  // one kind of row, and the custom-name one folds case.
  it('partitions the indexes by kind of row', async () => {
    const rows = await sql`
      select indexname, indexdef from pg_indexes
      where tablename = 'spell_ingredients' and indexname in (${INGREDIENT_INDEX}, ${CUSTOM_NAME_INDEX})
    `;
    const definitionOf = Object.fromEntries(
      rows.map((row) => [row.indexname as string, row.indexdef as string]),
    );

    expect(definitionOf[INGREDIENT_INDEX]).toContain('(spell_id, ingredient_id)');
    expect(definitionOf[INGREDIENT_INDEX]).toContain('WHERE (ingredient_id IS NOT NULL)');
    expect(definitionOf[CUSTOM_NAME_INDEX]).toContain('(spell_id, lower(name))');
    expect(definitionOf[CUSTOM_NAME_INDEX]).toContain('WHERE (ingredient_id IS NULL)');
  });

  it('declares the four checks and no others', async () => {
    const rows = await sql`
      select conname from pg_constraint
      where conrelid = 'spell_ingredients'::regclass and contype = 'c'
      order by conname
    `;

    expect(rows.map((row) => row.conname)).toEqual(CHECKS);
  });
});
