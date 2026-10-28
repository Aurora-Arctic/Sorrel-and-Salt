import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { createSpell, readSpell, stepsOfSpells } from '@/modules/grimoire';
import { deleteStock, stockOf } from '@/modules/ingredients';
import { B, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf } from '../../../support/db/read-variants';
import { makeIngredient, makeVariant } from '../../../support/fixtures';

// M10.21: a spell names an ingredient and a form, never the coven's jar of it
// (M10.15), so running out of the jar, which soft-deletes the stock row, leaves
// the recipe whole. What changes is only that the form is no longer held.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate spells, ingredients cascade`;
});

/** A spell with a held ingredient, a one-off ingredient and an instruction, and the held jar's id. */
async function seedSpell() {
  const ingredientId = await insertIngredient(
    sql,
    makeIngredient({
      workspaceId: null,
      name: 'Fixture Rosewort',
      nomenclature: 'none',
      variants: [makeVariant()],
    }),
    E.id,
  );
  const variantId = await variantIdOf(sql, ingredientId, 'Testform');
  const jarId = await insertStock(
    sql,
    { workspaceId: WORKSPACE_W_ID, ingredientId, variantId, quantityOnHand: '20', unit: 'g' },
    B.id,
  );
  const spell = await createSpell(asUser(B), WORKSPACE_W_ID, {
    title: 'Fixture Working',
    steps: [
      { ingredientId, variantId, quantity: 2, unit: 'g' },
      { name: 'Testwort', form: 'Dried Root' },
      { body: 'Light the candle' },
    ],
  });
  return { spell, ingredientId, variantId, jarId };
}

const readSteps = async (spell: Awaited<ReturnType<typeof seedSpell>>['spell']) => {
  const [steps] = await stepsOfSpells(asUser(B), [spell]);
  if (!Array.isArray(steps)) throw steps;
  return steps;
};

describe('a spell whose ingredient has had its stock row soft-deleted', () => {
  it('reads in full, with every step as it was', async () => {
    const { spell, jarId } = await seedSpell();
    const before = await readSteps(spell);
    // Why it could have changed: the jar is live until deleted, and is the only
    // thing deleted.
    expect(
      (await sql`select 1 from inventory_items where id = ${jarId} and deleted_at is null`).length,
    ).toBe(1);

    await deleteStock(asUser(B), WORKSPACE_W_ID, jarId);

    expect(
      (await sql`select deleted_at from inventory_items where id = ${jarId}`)[0].deleted_at,
    ).not.toBeNull();
    expect(await readSteps(spell)).toEqual(before);
    expect((await readSpell(asUser(B), WORKSPACE_W_ID, spell.id)).title).toBe('Fixture Working');
    expect(before).toHaveLength(3);
  });

  it('still names the ingredient and its form, and the coven no longer holds it', async () => {
    const { spell, ingredientId, variantId, jarId } = await seedSpell();
    const ref = { ingredientId, workspaceId: WORKSPACE_W_ID };
    expect((await stockOf(asUser(B), [ref]))[0]).toHaveLength(1);

    await deleteStock(asUser(B), WORKSPACE_W_ID, jarId);

    const [laid] = await readSteps(spell);
    expect(laid).toMatchObject({
      ingredientId,
      variantId,
      ingredient: { id: ingredientId, deleted: false },
      variant: { id: variantId, deleted: false },
    });
    expect((await stockOf(asUser(B), [ref]))[0]).toEqual([]);
  });

  it('leaves a one-off ingredient and an instruction in the same spell untouched', async () => {
    const { spell, jarId } = await seedSpell();
    const [, oneOffBefore, instructionBefore] = await readSteps(spell);

    await deleteStock(asUser(B), WORKSPACE_W_ID, jarId);

    const [, oneOff, instruction] = await readSteps(spell);
    expect(oneOff).toEqual(oneOffBefore);
    expect(oneOff).toMatchObject({ ingredientId: null, name: 'Testwort', form: 'Dried Root' });
    expect(instruction).toEqual(instructionBefore);
    expect(instruction).toMatchObject({ ingredientId: null, body: 'Light the candle' });
  });
});
