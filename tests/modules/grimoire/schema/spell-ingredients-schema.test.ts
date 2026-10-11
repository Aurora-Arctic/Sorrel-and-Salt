import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { spellIngredients } from '@/modules/grimoire/schema/spell-ingredients';
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
// surrogate id and the layer is unique among live rows — claude-docs/db/grimoire.md,
// "Layer order is the identity, and what that costs the reorder".
const LAYER_INDEX = 'spell_ingredients_spell_id_layer_order_unique';
const INGREDIENT_INDEX = 'spell_ingredients_spell_id_ingredient_id_unique';
const CUSTOM_NAME_INDEX = 'spell_ingredients_spell_id_custom_name_unique';

const CHECK_INGREDIENT_OR_NAME = 'spell_ingredients_ingredient_or_name';
const CHECK_FORM_ONLY_ON_CUSTOM = 'spell_ingredients_form_only_on_custom';
const CHECK_NAME_NOT_BLANK = 'spell_ingredients_name_not_blank';
const CHECK_FORM_NOT_BLANK = 'spell_ingredients_form_not_blank';

describe('spell_ingredients schema', () => {
  const { byName } = tableFacts(spellIngredients);

  // The full six (MB.110): a spell is a record of a working, so a layer
  // pulled out of it is a tombstone rather than gone.
  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });
});

const AUTHOR = FIXTURE_USERS.A.id;
const REMOVER = FIXTURE_USERS.B.id;
const COVEN = WORKSPACE_W_ID;

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));
let MUGWORT: string;
let ROSEMARY: string;
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
      // And with no form at all.
      await expect(custom('Threshold salt', { layerOrder: 2 })).resolves.toBeUndefined();
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
    // 23505 is unique_violation, named: the refusal is the layer index's,
    // across the two kinds of row.
    it('refuses a second live row at a depth, whichever kind either is', async () => {
      await layer();
      const linked = await failureOf(layer({ ingredientId: ROSEMARY }));
      const customOnLinked = await failureOf(custom('Garden dust'));
      await custom('Garden dust', { spellId: otherSpell });
      const customOnCustom = await failureOf(custom('Threshold salt', { spellId: otherSpell }));

      for (const error of [linked, customOnLinked, customOnCustom]) {
        expect(error.code).toBe('23505');
        expect(error.constraint_name).toBe(LAYER_INDEX);
      }
    });

    // Why those refusals could have succeeded: the index leads on `spell_id`,
    // and a custom row stacks on a linked one at the next depth.
    it('records the sequence a jar is built in, each spell from its own first layer', async () => {
      await layer({ layerOrder: 1 });
      await custom('Garden dust', { layerOrder: 2 });
      await layer({ spellId: otherSpell });

      const rows = await sql`
        select ingredient_id, name, layer_order from spell_ingredients
        where spell_id = ${hearthGuard} order by layer_order
      `;
      expect(rows.map((row) => [row.ingredient_id, row.name, row.layer_order])).toEqual([
        [MUGWORT, null, 1],
        [null, 'Garden dust', 2],
      ]);
      expect(await layerOrders(otherSpell)).toEqual([1]);
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
    // The pair is unique, not either half: another ingredient in the spell,
    // and the same one in another spell, are both admitted.
    it('refuses the same ingredient twice in one spell', async () => {
      await layer();

      const error = await failureOf(layer({ layerOrder: 2 }));
      await layer({ ingredientId: ROSEMARY, layerOrder: 2 });
      await layer({ spellId: otherSpell });

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(INGREDIENT_INDEX);
    });

    it('refuses the same custom name twice in one spell, whatever its case', async () => {
      await custom('Threshold Salt');

      const error = await failureOf(custom('threshold salt', { layerOrder: 2 }));
      await custom('Garden dust', { layerOrder: 2 });
      await custom('Threshold salt', { spellId: otherSpell });

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(CUSTOM_NAME_INDEX);
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

    it('measures a layer in a unit of it', async () => {
      await layer({ unit: 'pinch' });

      const [row] = await sql`
        select unit::text from spell_ingredients where spell_id = ${hearthGuard}
      `;

      expect(row.unit).toBe('pinch');
    });

    it('refuses a unit the vocabulary does not name', async () => {
      const error = await failureOf(layer({ unit: 'dram' }));

      expect(error.code).toBe('22P02');
    });
  });

  // MB.110: pulled out is a tombstone; that it frees the depth, the
  // ingredient and the custom name is the partial-unique sweep's.
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
  });
});
