import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { ValidationError } from '@/lib/errors';
import { createSpell, updateSpell } from '@/modules/grimoire';
import type { Unit } from '@/modules/ingredients/schema/units';
import { A, B, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertSpell } from '../../../support/db/insert-spell';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf } from '../../../support/db/read-variants';
import { makeIngredient, makeSpell, makeVariant } from '../../../support/fixtures';

// A step linking a form the coven holds a jar of must be
// measured in a unit the jar's converts to, so that making the spell can take
// it out of stock. Weight and volume each convert within themselves; a count
// unit matches only itself. A custom step, and a form with no jar, are not
// checked. Every refusal is asserted by the rows left behind, read raw.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate spells, ingredients cascade`;
});

/** A compendium ingredient with one form, `Testform`, which any coven may lay: its ids. */
async function compendiumForm(name: string) {
  const ingredientId = await insertIngredient(
    sql,
    makeIngredient({ workspaceId: null, name, nomenclature: 'none', variants: [makeVariant()] }),
    E.id,
  );
  return { ingredientId, variantId: await variantIdOf(sql, ingredientId, 'Testform') };
}

type Form = Awaited<ReturnType<typeof compendiumForm>>;

/** A jar of `form` in `unit`, held by `workspaceId`, written raw. */
function jar(form: Form, unit: Unit, workspaceId = WORKSPACE_W_ID, deleted = false) {
  return insertStock(
    sql,
    { workspaceId, ...form, unit, quantityOnHand: '100', deleted },
    workspaceId === WORKSPACE_X_ID ? D.id : A.id,
  );
}

const countSpells = async (): Promise<number> =>
  Number((await sql`select count(*) from spells`)[0].count);

/** Every step row of the spell, live and tombstoned, in place order. */
const stepRowsOf = (spellId: string) =>
  sql`select variant_id, name, unit, deleted_at from spell_steps where spell_id = ${spellId} order by position, id`;

/** Creates a spell in W as B whose second step lays `form` in `unit`, after an instruction. */
const create = (form: Form, unit: Unit, workspaceId = WORKSPACE_W_ID) =>
  createSpell(asUser(workspaceId === WORKSPACE_X_ID ? D : B), workspaceId, {
    title: 'Measured Jar',
    steps: [{ body: 'Cleanse the jar.' }, { ...form, quantity: 1, unit }],
  });

describe('createSpell, a step measured against the coven’s jar', () => {
  it.each([
    ['a weight step against a volume jar', 'g', 'ml'],
    ['a pinch against a jar counted in pieces', 'pinch', 'piece'],
    ['a count step against a weight jar', 'piece', 'g'],
  ] as const)('refuses %s at the step’s unit, and writes nothing', async (_, unit, jarUnit) => {
    const form = await compendiumForm('Fixture Measurewort');
    await jar(form, jarUnit);
    const before = await countSpells();

    const refusal = await create(form, unit).catch((error: unknown) => error);

    expect(refusal).toBeInstanceOf(ValidationError);
    expect((refusal as ValidationError).issues).toEqual([
      { path: ['steps', 1, 'unit'], message: expect.any(String) },
    ]);
    expect(await countSpells()).toBe(before);
    expect(await sql`select count(*)::int as n from spell_steps`).toEqual([{ n: 0 }]);
  });

  it.each([
    ['a tsp step against an ml jar', 'tsp', 'ml'],
    ['a kg step against an oz jar', 'kg', 'oz'],
    ['a count step against a jar counted in the same unit', 'piece', 'piece'],
  ] as const)('saves %s', async (_, unit, jarUnit) => {
    const form = await compendiumForm('Fixture Measurewort');
    await jar(form, jarUnit);

    const spell = await create(form, unit);

    expect((await stepRowsOf(spell.id)).map((row) => row.unit)).toEqual([null, unit]);
  });

  it('saves any unit for a form the coven holds no live jar of', async () => {
    const unstocked = await compendiumForm('Fixture Unstocked Root');
    const emptied = await compendiumForm('Fixture Emptied Root');
    // Why the emptied form could have been checked: a jar of it in ml was there.
    await jar(emptied, 'ml', WORKSPACE_W_ID, true);

    const spell = await createSpell(asUser(B), WORKSPACE_W_ID, {
      title: 'Unmeasured Jar',
      steps: [
        { ...unstocked, quantity: 2, unit: 'pinch' },
        { ...emptied, quantity: 2, unit: 'g' },
      ],
    });

    expect((await stepRowsOf(spell.id)).map((row) => row.unit)).toEqual(['pinch', 'g']);
  });

  it('does not check a custom step, which no jar can hold', async () => {
    const form = await compendiumForm('Fixture Measurewort');
    await jar(form, 'ml');

    const spell = await createSpell(asUser(B), WORKSPACE_W_ID, {
      title: 'Custom Jar',
      steps: [{ name: 'Fixture Measurewort', form: 'whole', quantity: 3, unit: 'g' }],
    });

    expect(await stepRowsOf(spell.id)).toEqual([expect.objectContaining({ unit: 'g' })]);
  });

  it('reads only the caller’s coven’s jars, under its proof', async () => {
    const form = await compendiumForm('Fixture Shared Root');
    await jar(form, 'ml', WORKSPACE_W_ID);
    await jar(form, 'g', WORKSPACE_X_ID);

    // Why W's save could have been refused: X's jar of the very same form is
    // in grams, and the check refuses a millilitre step against it under X's proof.
    await expect(create(form, 'ml', WORKSPACE_X_ID)).rejects.toMatchObject({
      issues: [{ path: ['steps', 1, 'unit'] }],
    });
    // And W's own jar is read: a gram step is refused against it.
    await expect(create(form, 'g')).rejects.toBeInstanceOf(ValidationError);

    const spell = await create(form, 'tsp');
    expect((await stepRowsOf(spell.id)).map((row) => row.unit)).toEqual([null, 'tsp']);
  });
});

describe('updateSpell, a step measured against the coven’s jar', () => {
  /** A spell in W laying `form` in `unit` as its one step, written raw. */
  async function seeded(form: Form, unit: Unit) {
    return insertSpell(
      sql,
      makeSpell({
        workspaceId: WORKSPACE_W_ID,
        steps: [{ ingredientId: form.ingredientId, quantity: '1', unit }],
      }),
      B.id,
    );
  }

  /** The spell's one live step's id. */
  const stepIdOf = async (spellId: string) =>
    (await sql`select id from spell_steps where spell_id = ${spellId} and deleted_at is null`)[0]
      .id as string;

  it('refuses a step changed to a unit the jar cannot be measured against, and writes nothing', async () => {
    const form = await compendiumForm('Fixture Measurewort');
    await jar(form, 'ml');
    const spellId = await seeded(form, 'tsp');
    const id = await stepIdOf(spellId);
    const [before] = await sql`select title, revision from spells where id = ${spellId}`;

    // Why it could have succeeded: the same save in tbsp is written.
    await expect(
      updateSpell(asUser(B), WORKSPACE_W_ID, spellId, {
        expectedRevision: null,
        steps: [{ id, ...form, quantity: 1, unit: 'tbsp' }],
      }),
    ).resolves.toBeDefined();
    const [saved] = await sql`select title, revision from spells where id = ${spellId}`;

    await expect(
      updateSpell(asUser(B), WORKSPACE_W_ID, spellId, {
        expectedRevision: null,
        title: 'Renamed',
        steps: [{ body: 'Stir.' }, { id, ...form, quantity: 1, unit: 'g' }],
      }),
    ).rejects.toMatchObject({ issues: [{ path: ['steps', 1, 'unit'] }] });

    expect(saved.revision).toBeGreaterThan(before.revision);
    expect(await sql`select title, revision from spells where id = ${spellId}`).toEqual([saved]);
    expect(await stepRowsOf(spellId)).toEqual([
      expect.objectContaining({ unit: 'tbsp', deleted_at: null }),
    ]);
  });

  it('refuses a new step against the jar, as a create does', async () => {
    const form = await compendiumForm('Fixture Measurewort');
    await jar(form, 'piece');
    const other = await compendiumForm('Fixture Other Root');
    const spellId = await seeded(other, 'g');

    await expect(
      updateSpell(asUser(B), WORKSPACE_W_ID, spellId, {
        expectedRevision: null,
        steps: [
          { id: await stepIdOf(spellId), ...other, quantity: 1, unit: 'g' },
          { ...form, quantity: 1, unit: 'drop' },
        ],
      }),
    ).rejects.toMatchObject({ issues: [{ path: ['steps', 1, 'unit'] }] });
  });

  it('keeps a saved step whose jar has since changed unit: the drift is the working’s to report', async () => {
    const form = await compendiumForm('Fixture Measurewort');
    const jarId = await jar(form, 'ml');
    const spellId = await seeded(form, 'tsp');
    const id = await stepIdOf(spellId);
    await sql`update inventory_items set unit = 'g', unit_dimension = 'weight' where id = ${jarId}`;

    const spell = await updateSpell(asUser(B), WORKSPACE_W_ID, spellId, {
      expectedRevision: null,
      title: 'Renamed',
      steps: [{ id, ...form, quantity: 1, unit: 'tsp' }],
    });

    expect(spell.title).toBe('Renamed');
    expect(await stepRowsOf(spellId)).toEqual([expect.objectContaining({ unit: 'tsp' })]);
  });
});
