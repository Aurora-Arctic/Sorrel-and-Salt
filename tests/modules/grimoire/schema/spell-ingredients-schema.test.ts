import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { UNITS, dimensionOf } from '@/modules/ingredients/schema/units';
import { ingredients } from '@/modules/ingredients/schema/ingredients';
import { inventoryUnit } from '@/modules/ingredients/schema/inventory-items';
import { spellIngredients } from '@/modules/grimoire/schema/spell-ingredients';
import { spells } from '@/modules/grimoire/schema/spells';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';
import type { LayerRow } from './types';

// §5's columns; `name` and `form` are a custom one-off layer's, in place of an
// `ingredient_id` (MB.40).
const OWN_COLUMNS = [
  'id',
  'spell_id',
  'ingredient_id',
  'name',
  'form',
  'quantity',
  'unit',
  'layer_order',
  'note',
];

// A removed layer is a tombstone that must not hold its depth, so the key is a
// surrogate id and the layer is unique among live rows — claude-docs/db.md,
// "Layer order is the identity, and what that costs the reorder".
const PRIMARY_KEY = 'spell_ingredients_pkey';
const LAYER_INDEX = 'spell_ingredients_spell_id_layer_order_unique';
const INGREDIENT_INDEX = 'spell_ingredients_spell_id_ingredient_id_unique';
const CUSTOM_NAME_INDEX = 'spell_ingredients_spell_id_custom_name_unique';
const UNIQUE_INDEXES = [LAYER_INDEX, INGREDIENT_INDEX, CUSTOM_NAME_INDEX].sort();
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
  const {
    byName,
    byIndexName: indexByName,
    primaryKeys,
    checks,
    foreignKeyByColumn,
  } = tableFacts(spellIngredients);

  // The full six (MB.110): a spell is a record of a working, so a layer
  // pulled out of it is a tombstone rather than gone.
  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  // Not the layer, which a tombstone would go on holding; not the pair, absent on a custom row.
  it('keys on a surrogate id, so a removed layer holds no depth', () => {
    expect(byName.id.primary).toBe(true);
    expect(byName.id.notNull).toBe(true);
    expect(byName.id.hasDefault).toBe(true);
    expect(primaryKeys).toEqual([]);
  });

  it('requires the spell and the layer, and makes the ingredient optional', () => {
    expect(byName.spell_id.notNull).toBe(true);
    expect(byName.layer_order.notNull).toBe(true);
    // Nullable because a custom row has no ingredient; the CHECK stops both halves being empty.
    expect(byName.ingredient_id.notNull).toBe(false);
    expect(byName.name.notNull).toBe(false);
    expect(byName.form.notNull).toBe(false);
  });

  // "A pinch of salt" names no number, and a draft is saved unfinished; zero
  // is a quantity and absence is not.
  it('leaves the measurement and the note nullable', () => {
    for (const column of ['quantity', 'unit', 'note']) {
      expect(byName[column].notNull).toBe(false);
    }
  });

  // The join points at the ingredient, so a spell survives its stock row being thrown out.
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

  // Three partial unique indexes over live rows: one layer per depth, and —
  // with the discriminator beside rule 4's predicate — one ingredient per jar
  // over linked rows and one custom name per jar over custom rows.
  it('declares three partial unique indexes: the depth, the ingredient, the custom name', () => {
    expect(Object.keys(indexByName).sort()).toEqual(UNIQUE_INDEXES);

    for (const name of UNIQUE_INDEXES) {
      expect(indexByName[name].config.unique).toBe(true);
      expect(indexByName[name].config.where).toBeDefined();
    }

    expect(
      indexByName[LAYER_INDEX].config.columns.map(
        (column: unknown) => (column as { name: string }).name,
      ),
    ).toEqual(['spell_id', 'layer_order']);
    expect(
      indexByName[INGREDIENT_INDEX].config.columns.map(
        (column: unknown) => (column as { name: string }).name,
      ),
    ).toEqual(['spell_id', 'ingredient_id']);

    // The second column is an expression, so only the leading one has a name
    // here; the Postgres half checks the expression itself.
    const customColumns = indexByName[CUSTOM_NAME_INDEX].config.columns;
    expect(customColumns).toHaveLength(2);
    expect((customColumns[0] as { name: string }).name).toBe('spell_id');
  });

  it('declares the four checks that make a row one kind or the other', () => {
    expect(checks.map((check) => check.name).sort()).toEqual(CHECKS);
  });

  // One vocabulary, one Postgres type: a second enum is the drift
  // `src/modules/ingredients/schema/units.ts` exists to prevent.
  it('measures in M9.2’s unit enum rather than a second copy of it', () => {
    expect(byName.unit.enumValues).toEqual([...UNITS]);
    expect(byName.unit.getSQLType()).toBe(inventoryUnit.enumName);
  });
});

const AUTHOR = FIXTURE_USERS.A.id;
const REMOVER = FIXTURE_USERS.B.id;
const COVEN = WORKSPACE_W_ID;
const ABSENT = '99999999-9999-9999-9999-999999999999';

let sql: ReturnType<typeof postgres>;
const catalogue = useTestDatabase((client) => (sql = client));
let MUGWORT: string;
let ROSEMARY: string;
// A stock row's own id, in `inventory_items` and nowhere else: a probe for
// which table the foreign key points at.
let STOCK_ONLY: string;
let hearthGuard: string;
let otherSpell: string;

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

/** Pulls the live layer at `layerOrder` out of the jar, as `B`. */
async function removeLayer(layerOrder: number, spellId: string = hearthGuard): Promise<void> {
  await sql`
    update spell_ingredients set deleted_at = now(), deleted_by = ${REMOVER}
    where spell_id = ${spellId} and layer_order = ${layerOrder} and deleted_at is null
  `;
}

async function layerOrders(spellId: string): Promise<number[]> {
  const rows = await sql`
    select layer_order from spell_ingredients where spell_id = ${spellId} order by layer_order
  `;
  return rows.map((row) => row.layer_order as number);
}

async function compendiumIdOf(canonicalName: string): Promise<string> {
  const [found] = await sql`
    select id from ingredients where workspace_id is null and canonical_name = ${canonicalName}
  `;
  if (!found) throw new Error(`The standard seed carries no compendium entry ${canonicalName}`);
  return found.id as string;
}

beforeAll(async () => {
  MUGWORT = await compendiumIdOf('Artemisia vulgaris');
  ROSEMARY = await compendiumIdOf('Salvia rosmarinus');

  // `standard` seeds no stock; the probe's ingredient must be one no test below lays in a jar.
  const [stock] = await sql`
    insert into inventory_items (workspace_id, ingredient_id, created_by, updated_by)
    values (${COVEN}, ${await compendiumIdOf('Laurus nobilis')}, ${AUTHOR}, ${AUTHOR})
    returning id
  `;
  STOCK_ONLY = stock.id as string;
});

// `spells` parents this table and `spell_categories`; the cascade empties all three.
beforeEach(async () => {
  await sql`truncate spells cascade`;

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

describe('spell_ingredients table', () => {
  it('carries §5’s columns beside the six audit columns', async () => {
    expect(await catalogue.columnNames('spell_ingredients')).toEqual(
      [...OWN_COLUMNS, ...AUDIT_COLUMNS].sort(),
    );
  });

  it('stores the measurement, the layer and the note', async () => {
    await layer({ quantity: '0.125', unit: 'tsp', layerOrder: 3, note: 'crushed, not ground' });

    const [row] = await sql`
      select quantity, unit::text, layer_order, note from spell_ingredients
      where spell_id = ${hearthGuard}
    `;

    // `numeric`, not a float: 0.125 comes back as 0.125.
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

  // Story 57: a layer is an ingredient or a custom name, never both or neither
  // — §14's "nullable FKs plus num_nonnulls" idiom.
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

    // `form` beside an ingredient id would duplicate half that ingredient's
    // identity. The positive case above is why this refusal could have
    // succeeded: the same `form` is accepted once `ingredient_id` is null.
    it('refuses a form beside an ingredient id', async () => {
      const error = await failureOf(layer({ form: 'powder' }));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(CHECK_FORM_ONLY_ON_CUSTOM);
    });

    // A blank name satisfies `num_nonnulls` and names nothing.
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

  // One live row per depth in a jar, whichever kind of row it is.
  describe('the layer is the identity', () => {
    it('refuses two ingredients laid at the same depth', async () => {
      await layer();

      // 23505 is unique_violation, named: the refusal is the layer index's.
      const error = await failureOf(layer({ ingredientId: ROSEMARY }));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(LAYER_INDEX);
    });

    it('refuses a custom name laid at the depth an ingredient occupies', async () => {
      await layer();

      const error = await failureOf(custom('Garden dust'));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(LAYER_INDEX);
    });

    it('refuses two custom names laid at the same depth', async () => {
      await custom('Garden dust');

      const error = await failureOf(custom('Threshold salt'));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(LAYER_INDEX);
    });

    // Why those refusals could have succeeded: the index leads on `spell_id`.
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

      // 23502: the depth is required whatever kind of row it is.
      expect(error.code).toBe('23502');
      expect(error.column_name).toBe('layer_order');
    });

    // A unique index is checked per row, not at end of statement, so a reorder
    // cannot be one `layer_order + 1` sweep even though the final state is
    // conflict-free. Nor can it remove and re-add the jar, which would leave a
    // tombstone per layer: it moves the live rows through a scratch offset.
    it('refuses a shift that collides mid-statement, so a reorder moves rows in place', async () => {
      await layer({ layerOrder: 1 });
      await layer({ ingredientId: ROSEMARY, layerOrder: 2 });

      const error = await failureOf(
        sql`update spell_ingredients set layer_order = layer_order + 1 where spell_id = ${hearthGuard}`,
      );
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(LAYER_INDEX);

      await sql.begin(async (tx) => {
        await tx`
          update spell_ingredients set layer_order = layer_order + 1000
          where spell_id = ${hearthGuard} and deleted_at is null`;
        await tx`
          update spell_ingredients set layer_order = 3 - (layer_order - 1000)
          where spell_id = ${hearthGuard} and deleted_at is null`;
      });

      const rows = await sql`
        select ingredient_id, layer_order, deleted_at from spell_ingredients
        where spell_id = ${hearthGuard} order by layer_order
      `;
      expect(rows.map((row) => row.ingredient_id)).toEqual([ROSEMARY, MUGWORT]);
      expect(rows.map((row) => row.deleted_at)).toEqual([null, null]);
    });
  });

  // The old primary key's guarantee, now a partial index over linked rows and
  // its mirror over custom rows: inside one jar an ambiguous label is a
  // mistake, not a distinction.
  describe('one ingredient per jar, one custom name per jar', () => {
    it('refuses the same ingredient twice in one spell', async () => {
      await layer();

      const error = await failureOf(layer({ layerOrder: 2 }));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(INGREDIENT_INDEX);
    });

    // Why the refusal above could have succeeded: the pair is unique, not either half.
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

    // Why that refusal could have succeeded: the same insert against a real
    // ingredient is accepted. Point the key at `inventory_items` and this pair
    // swaps which one reddens.
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

  // MB.110: pulled out is a tombstone, which frees everything the live row
  // held. Each reuse is shown refused while the row was live, so it is the
  // index's `deleted_at IS NULL` that lets it through.
  describe('removal is a soft delete', () => {
    it('keeps the removed layer, stamped by whoever removed it', async () => {
      await layer();

      await removeLayer(1);

      const [row] = await sql`
        select ingredient_id, deleted_at, deleted_by from spell_ingredients
        where spell_id = ${hearthGuard}
      `;
      expect(row.ingredient_id).toBe(MUGWORT);
      expect(row.deleted_at).toBeInstanceOf(Date);
      expect(row.deleted_by).toBe(REMOVER);
    });

    it('frees the removed layer’s depth', async () => {
      await layer();
      const refused = await failureOf(layer({ ingredientId: ROSEMARY }));
      expect(refused.constraint_name).toBe(LAYER_INDEX);

      await removeLayer(1);

      await expect(layer({ ingredientId: ROSEMARY })).resolves.toBeUndefined();
    });

    it('lets the removed ingredient be laid in the same spell again', async () => {
      await layer();
      const refused = await failureOf(layer({ layerOrder: 2 }));
      expect(refused.constraint_name).toBe(INGREDIENT_INDEX);

      await removeLayer(1);

      await expect(layer({ layerOrder: 2 })).resolves.toBeUndefined();
    });

    it('lets a removed custom name be written in the same spell again, whatever its case', async () => {
      await custom('Threshold Salt');
      const refused = await failureOf(custom('threshold salt', { layerOrder: 2 }));
      expect(refused.constraint_name).toBe(CUSTOM_NAME_INDEX);

      await removeLayer(1);

      await expect(custom('threshold salt', { layerOrder: 2 })).resolves.toBeUndefined();
    });

    // Tombstones are outside every index, so they cannot collide with each other either.
    it('lets the same layer be removed and written back more than once', async () => {
      for (let round = 0; round < 2; round += 1) {
        await layer();
        await removeLayer(1);
      }

      await expect(layer()).resolves.toBeUndefined();
      const [{ count }] = await sql`
        select count(*)::int as count from spell_ingredients
        where spell_id = ${hearthGuard} and deleted_at is not null
      `;
      expect(count).toBe(2);
    });
  });

  it('declares the surrogate key and the three partial indexes, and nothing else', async () => {
    const rows = await sql`
      select c.relname as name
      from pg_index i
      join pg_class c on c.oid = i.indexrelid
      where i.indrelid = 'spell_ingredients'::regclass
      order by c.relname
    `;

    expect(rows.map((row) => row.name)).toEqual([PRIMARY_KEY, ...UNIQUE_INDEXES].sort());
  });

  // Rule 4, read back from the catalogue: a unique index that counted
  // tombstones would let a removed layer hold its depth, ingredient or name.
  it('makes every unique index but the key partial on deleted_at IS NULL', async () => {
    const unique = await catalogue.uniqueIndexNames('spell_ingredients');
    // Precondition: the sweep below has every index to read, not an empty list.
    expect(unique).toEqual([PRIMARY_KEY, ...UNIQUE_INDEXES].sort());

    for (const name of UNIQUE_INDEXES) {
      const index = await catalogue.indexRow('spell_ingredients', name);
      expect(index?.predicate, name).toContain('deleted_at IS NULL');
    }

    const key = await catalogue.indexRow('spell_ingredients', PRIMARY_KEY);
    expect(key?.predicate).toBeNull();
    expect(key?.definition).toContain('(id)');
  });

  // Read back from the catalogue: each index covers one kind of row, and the custom one folds case.
  it('partitions the indexes by kind of row', async () => {
    const rows = await sql`
      select indexname, indexdef from pg_indexes
      where tablename = 'spell_ingredients' and indexname in (${INGREDIENT_INDEX}, ${CUSTOM_NAME_INDEX})
    `;
    const definitionOf = Object.fromEntries(
      rows.map((row) => [row.indexname as string, row.indexdef as string]),
    );

    expect(definitionOf[INGREDIENT_INDEX]).toContain('(spell_id, ingredient_id)');
    expect(definitionOf[INGREDIENT_INDEX]).toContain('(ingredient_id IS NOT NULL)');
    expect(definitionOf[CUSTOM_NAME_INDEX]).toContain('(spell_id, lower(name))');
    expect(definitionOf[CUSTOM_NAME_INDEX]).toContain('(ingredient_id IS NULL)');
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
