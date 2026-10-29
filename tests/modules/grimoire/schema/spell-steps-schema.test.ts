import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { spellSteps } from '@/modules/grimoire/schema/spell-steps';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';
import type { StepRow } from './types';

// §5's columns; `name` and `form` are a custom one-off layer's, in place of an
// `ingredient_id`, and `body` is a step's instruction.
const OWN_COLUMNS = [
  'id',
  'spell_id',
  'ingredient_id',
  'variant_id',
  'name',
  'form',
  'quantity',
  'unit',
  'position',
  'body',
];

// A removed step is a tombstone that must not hold its place, so the key is a
// surrogate id and the place is unique among live rows — claude-docs/db/grimoire.md,
// "Position is the identity, and what that costs the reorder".
const POSITION_INDEX = 'spell_steps_spell_id_position_unique';
const VARIANT_KEY = 'spell_steps_variant_fk';
const CHECK_VARIANT_WITH_INGREDIENT = 'spell_steps_variant_with_ingredient';
const CUSTOM_NAME_INDEX = 'spell_steps_spell_id_custom_name_unique';

const CHECK_ONE_IDENTITY = 'spell_steps_one_identity';
const CHECK_NOT_EMPTY = 'spell_steps_not_empty';
const CHECK_AMOUNT_ON_INGREDIENT = 'spell_steps_amount_on_ingredient';
const CHECK_FORM_ONLY_ON_CUSTOM = 'spell_steps_form_only_on_custom';
const CHECK_NAME_NOT_BLANK = 'spell_steps_name_not_blank';
const CHECK_FORM_NOT_BLANK = 'spell_steps_form_not_blank';
const CHECK_BODY_NOT_BLANK = 'spell_steps_body_not_blank';

describe('spell_steps schema', () => {
  const { byName } = tableFacts(spellSteps);

  // The full six: a spell is a record of a working, so a step
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

/** The ingredient's seeded variant, the first it was given, as a subquery, for a layer that names no other. */
const liveVariantOf = (ingredientId: string) => sql`
  select id from ingredient_variants where ingredient_id = ${ingredientId} and deleted_at is null
  order by created_at, id limit 1
`;

/**
 * One step, a linked layer of Mugwort by default.
 */
async function layer({
  spellId = hearthGuard,
  ingredientId = MUGWORT,
  variantId,
  name = null,
  form = null,
  quantity = '2.000',
  unit = 'tbsp',
  position = 1,
  body = null,
}: StepRow = {}): Promise<void> {
  await sql`
    insert into spell_steps
      (spell_id, ingredient_id, variant_id, name, form, quantity, unit, position,
       body, created_by, updated_by)
    values (${spellId}, ${ingredientId},
            ${variantId === undefined && ingredientId !== null ? sql`(${liveVariantOf(ingredientId)})` : (variantId ?? null)},
            ${name}, ${form}, ${quantity}, ${unit}::inventory_unit,
            ${position}, ${body}, ${AUTHOR}, ${AUTHOR})
  `;
}

/** A custom, one-off layer: a name in place of an ingredient id. */
async function custom(name: string | null, overrides: Omit<StepRow, 'name'> = {}): Promise<void> {
  await layer({ ingredientId: null, name, ...overrides });
}

/** An instruction alone: no ingredient, no name, no amount. */
async function instruction(
  body: string | null,
  overrides: Omit<StepRow, 'body'> = {},
): Promise<void> {
  await layer({ ingredientId: null, quantity: null, unit: null, body, ...overrides });
}

/** Pulls the live step at `position` out of the jar, as `B`. */
async function removeStep(position: number, spellId: string = hearthGuard): Promise<void> {
  await sql`
    update spell_steps set deleted_at = now(), deleted_by = ${REMOVER}
    where spell_id = ${spellId} and position = ${position} and deleted_at is null
  `;
}

async function positions(spellId: string): Promise<number[]> {
  const rows = await sql`
    select position from spell_steps where spell_id = ${spellId} order by position
  `;
  return rows.map((row) => row.position as number);
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

describe('spell_steps table', () => {
  it('stores the measurement and the place', async () => {
    await layer({ quantity: '0.125', unit: 'tsp', position: 3 });

    const [row] = await sql`
      select quantity, unit::text, position from spell_steps
      where spell_id = ${hearthGuard}
    `;

    // `numeric`, not a float: 0.125 comes back as 0.125.
    expect(row.quantity).toBe('0.125');
    expect(row.unit).toBe('tsp');
    expect(row.position).toBe(3);
  });

  // Set NOT NULL by 0089.
  it('refuses a step with no position', async () => {
    const error = await failureOf(sql`
      insert into spell_steps (spell_id, ingredient_id, variant_id, created_by, updated_by)
      values (${hearthGuard}, ${MUGWORT}, (${liveVariantOf(MUGWORT)}), ${AUTHOR}, ${AUTHOR})
    `);

    expect(error.code).toBe('23502');
  });

  // A step is an instruction, an ingredient, or both.
  describe('a step is an instruction, an ingredient, or both', () => {
    it('stores an instruction alone, an ingredient alone, and both in one step', async () => {
      await instruction('Sweep the threshold.', { position: 1 });
      await layer({ position: 2 });
      await layer({ ingredientId: ROSEMARY, body: 'Lay it over the salt.', position: 3 });

      const rows = await sql`
        select ingredient_id, body, position from spell_steps
        where spell_id = ${hearthGuard} order by position
      `;
      expect(rows.map((row) => [row.ingredient_id, row.body, row.position])).toEqual([
        [null, 'Sweep the threshold.', 1],
        [MUGWORT, null, 2],
        [ROSEMARY, 'Lay it over the salt.', 3],
      ]);
    });

    // Why the refusal could have succeeded: the same step with a body is
    // admitted above.
    it('refuses an empty step', async () => {
      // 23514 is check_violation, named: the refusal is the CHECK's.
      const error = await failureOf(instruction(null));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(CHECK_NOT_EMPTY);
    });

    it('refuses a blank instruction', async () => {
      const error = await failureOf(instruction('   '));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(CHECK_BODY_NOT_BLANK);
    });

    // An amount says how much of an ingredient; on an instruction alone it
    // is about nothing. Admitted beside an
    // ingredient, as the first test of this table shows.
    it('refuses a quantity or a unit on an instruction alone', async () => {
      const quantity = await failureOf(instruction('Stir.', { quantity: '1.000' }));
      const unit = await failureOf(instruction('Stir.', { unit: 'pinch' }));

      for (const error of [quantity, unit]) {
        expect(error.code).toBe('23514');
        expect(error.constraint_name).toBe(CHECK_AMOUNT_ON_INGREDIENT);
      }
    });

    // A custom name is an identity too, so it carries an amount.
    it('admits an amount beside a custom name and an instruction', async () => {
      await custom('Garden dust', { body: 'Scatter it.', quantity: '1.000', unit: 'pinch' });

      const [row] =
        await sql`select name, body, quantity from spell_steps where spell_id = ${hearthGuard}`;
      expect(row).toEqual({ name: 'Garden dust', body: 'Scatter it.', quantity: '1.000' });
    });
  });

  it('accepts an ingredient with no measurement at all', async () => {
    await layer({ quantity: null, unit: null });

    const [row] = await sql`
      select quantity, unit from spell_steps where spell_id = ${hearthGuard}
    `;

    expect(row.quantity).toBeNull();
    expect(row.unit).toBeNull();
  });

  // A layer is an ingredient or a custom name, never both — §14's
  // "nullable FKs plus num_nonnulls" idiom. Neither is an instruction alone.
  describe('a layer names an ingredient or a custom name, never both', () => {
    it('stores a custom ingredient by name and form, with no ingredient row', async () => {
      await custom('Garden dust', { form: 'powder' });

      const [row] = await sql`
        select ingredient_id, name, form from spell_steps where spell_id = ${hearthGuard}
      `;

      expect(row.ingredient_id).toBeNull();
      expect(row.name).toBe('Garden dust');
      expect(row.form).toBe('powder');
      // And with no form at all.
      await expect(custom('Threshold salt', { position: 2 })).resolves.toBeUndefined();
    });

    it('refuses a layer naming both', async () => {
      const error = await failureOf(layer({ ingredientId: MUGWORT, name: 'Mugwort' }));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(CHECK_ONE_IDENTITY);
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

  // One live step per place in a recipe, whichever kind of step it is.
  describe('the position is the identity', () => {
    // 23505 is unique_violation, named: the refusal is the position index's,
    // across the kinds of step.
    it('refuses a second live step at a place, whichever kind either is', async () => {
      await layer();
      const linked = await failureOf(layer({ ingredientId: ROSEMARY }));
      const customOnLinked = await failureOf(custom('Garden dust'));
      const instructionOnLinked = await failureOf(instruction('Stir.'));
      await custom('Garden dust', { spellId: otherSpell });
      const customOnCustom = await failureOf(custom('Threshold salt', { spellId: otherSpell }));

      for (const error of [linked, customOnLinked, instructionOnLinked, customOnCustom]) {
        expect(error.code).toBe('23505');
        expect(error.constraint_name).toBe(POSITION_INDEX);
      }
    });

    // Why those refusals could have succeeded: the index leads on `spell_id`,
    // and a custom row and an instruction follow a linked one at the next places.
    it('records the order a recipe is written in, each spell from its own first step', async () => {
      await layer({ position: 1 });
      await custom('Garden dust', { position: 2 });
      await instruction('Seal it.', { position: 3 });
      await layer({ spellId: otherSpell });

      const rows = await sql`
        select ingredient_id, name, body, position from spell_steps
        where spell_id = ${hearthGuard} order by position
      `;
      expect(rows.map((row) => [row.ingredient_id, row.name, row.body, row.position])).toEqual([
        [MUGWORT, null, null, 1],
        [null, 'Garden dust', null, 2],
        [null, null, 'Seal it.', 3],
      ]);
      expect(await positions(otherSpell)).toEqual([1]);
    });

    // A unique index is checked per row, not at end of statement, so a reorder
    // cannot be one `position + 1` sweep even though the final state is
    // conflict-free. Nor can it remove and re-add the recipe, which would leave
    // a tombstone per step: it moves the live rows through a scratch offset.
    it('refuses a shift that collides mid-statement, so a reorder moves rows in place', async () => {
      await layer({ position: 1 });
      await layer({ ingredientId: ROSEMARY, position: 2 });

      const error = await failureOf(
        sql`update spell_steps set position = position + 1 where spell_id = ${hearthGuard}`,
      );
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(POSITION_INDEX);

      await sql.begin(async (tx) => {
        await tx`
          update spell_steps set position = position + 1000
          where spell_id = ${hearthGuard} and deleted_at is null`;
        await tx`
          update spell_steps set position = 3 - (position - 1000)
          where spell_id = ${hearthGuard} and deleted_at is null`;
      });

      const rows = await sql`
        select ingredient_id, position, deleted_at from spell_steps
        where spell_id = ${hearthGuard} order by position
      `;
      expect(rows.map((row) => row.ingredient_id)).toEqual([ROSEMARY, MUGWORT]);
      expect(rows.map((row) => row.deleted_at)).toEqual([null, null]);
    });
  });

  // A linked layer names the form it lays, a custom layer none.
  describe('a linked layer names a variant of its ingredient', () => {
    it('refuses a linked layer without a variant, and a custom one with a variant', async () => {
      const [mugwortHerb] = await liveVariantOf(MUGWORT);

      const linked = await failureOf(layer({ variantId: null }));
      const customWithOne = await failureOf(
        layer({ ingredientId: null, variantId: mugwortHerb.id as string, name: 'Garden dust' }),
      );

      for (const error of [linked, customWithOne]) {
        expect(error.code).toBe('23514');
        expect(error.constraint_name).toBe(CHECK_VARIANT_WITH_INGREDIENT);
      }
    });

    // Why it could have been admitted: the variant exists and is live, only
    // another ingredient's.
    it("refuses another ingredient's variant beside its ingredient", async () => {
      const [rosemaryHerb] = await liveVariantOf(ROSEMARY);

      const error = await failureOf(layer({ variantId: rosemaryHerb.id as string }));

      // 23503 is foreign_key_violation, named: the composite key refused.
      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(VARIANT_KEY);
    });
  });

  // A custom row is matched against nothing, so inside one jar its name is its
  // identity; a linked form is not.
  describe('one custom name per jar, any form any number of times', () => {
    it('admits the same variant twice in one spell, as well as another form of it', async () => {
      const [oil] = await sql`
        insert into ingredient_variants ${sql({
          ingredient_id: MUGWORT,
          form: 'Testoil',
          created_by: AUTHOR,
          updated_by: AUTHOR,
        })}
        returning id
      `;
      await layer();
      await layer({ position: 2 });
      await layer({ variantId: oil.id as string, position: 3 });
      await layer({ spellId: otherSpell });

      const forms = await sql`
        select count(*)::int as count from spell_steps where spell_id = ${hearthGuard}
      `;
      expect(forms[0].count).toBe(3);
    });

    it('refuses the same custom name twice in one spell, whatever its case', async () => {
      await custom('Threshold Salt');

      const error = await failureOf(custom('threshold salt', { position: 2 }));
      await custom('Garden dust', { position: 2 });
      await custom('Threshold salt', { spellId: otherSpell });

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(CUSTOM_NAME_INDEX);
    });
  });

  describe('the unit vocabulary is M9.2’s', () => {
    it('stores the column as the inventory_unit type, not a second enum', async () => {
      const [row] = await sql`
        select udt_name from information_schema.columns
        where table_name = 'spell_steps' and column_name = 'unit'
      `;

      expect(row.udt_name).toBe('inventory_unit');
    });

    it('measures a layer in a unit of it', async () => {
      await layer({ unit: 'pinch' });

      const [row] = await sql`
        select unit::text from spell_steps where spell_id = ${hearthGuard}
      `;

      expect(row.unit).toBe('pinch');
    });

    it('refuses a unit the vocabulary does not name', async () => {
      const error = await failureOf(layer({ unit: 'dram' }));

      expect(error.code).toBe('22P02');
    });
  });

  // Pulled out is a tombstone; that it frees the depth, the
  // ingredient and the custom name is the partial-unique sweep's.
  describe('removal is a soft delete', () => {
    it('keeps the removed step, stamped by whoever removed it', async () => {
      await layer();

      await removeStep(1);

      const [row] = await sql`
        select ingredient_id, deleted_at, deleted_by from spell_steps
        where spell_id = ${hearthGuard}
      `;
      expect(row.ingredient_id).toBe(MUGWORT);
      expect(row.deleted_at).toBeInstanceOf(Date);
      expect(row.deleted_by).toBe(REMOVER);
    });
  });
});
