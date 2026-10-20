import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound } from '@/lib/errors';
import { assertMembership } from '@/modules/coven';
import { localHoldings } from '@/modules/ingredients';
import { A, B, C, D, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertSpell } from '../../../support/db/insert-spell';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf } from '../../../support/db/read-variants';
import { makeIngredient, makeSpell, makeVariant } from '../../../support/fixtures';

// M8.17: what each form of a coven's own entry holds, which the Link dialog's
// form map shows before anything is chosen (the owner's call, 2026-10-20).
// Counts the coven's jars, and the spells laying the form that the caller may
// read: another member's private spell is left out, since a count would tell
// the caller it exists, though the split still moves its layers.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let local: string;
let root: string;
let leaf: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  local = await insertIngredient(
    sql,
    makeIngredient({
      workspaceId: WORKSPACE_W_ID,
      name: 'Our Holdwort',
      nomenclature: 'none',
      variants: [makeVariant({ form: 'Rootform' }), makeVariant({ form: 'Leafform' })],
    }),
    A.id,
  );
  root = await variantIdOf(sql, local, 'Rootform');
  leaf = await variantIdOf(sql, local, 'Leafform');
});

/** A spell of `author`'s in W laying `variantId` once per layer. */
async function spellLaying(variantId: string, visibility: 'private' | 'workspace', author = A.id) {
  const spellId = await insertSpell(
    sql,
    makeSpell({ workspaceId: WORKSPACE_W_ID, visibility, layers: [{ ingredientId: local }] }),
    author,
  );
  await sql`update spell_ingredients set variant_id = ${variantId} where spell_id = ${spellId}`;
  return spellId;
}

describe('localHoldings', () => {
  it('counts each live form’s jars and the spells laying it that the caller may read', async () => {
    await insertStock(
      sql,
      {
        workspaceId: WORKSPACE_W_ID,
        ingredientId: local,
        variantId: root,
        quantityOnHand: '3',
        unit: 'g',
      },
      A.id,
    );
    await spellLaying(root, 'workspace');
    // B's own private spell, which B reads.
    await spellLaying(root, 'private', B.id);
    const deleted = await spellLaying(leaf, 'workspace');
    await sql`update spells set deleted_at = now(), deleted_by = ${A.id} where id = ${deleted}`;

    const holdings = await localHoldings(asUser(B), WORKSPACE_W_ID, local);

    expect(holdings.map(({ form, jars, spells }) => ({ form, jars, spells }))).toEqual([
      { form: 'Leafform', jars: 0, spells: 0 },
      { form: 'Rootform', jars: 1, spells: 2 },
    ]);
    expect(holdings.find((row) => row.form === 'Rootform')!.formId).toBe(root);
  });

  it('leaves another member’s private spell out of the count', async () => {
    const spellId = await spellLaying(leaf, 'private', A.id);
    // Why it could have been counted: the layer is live on the form, and its author counts it.
    const [layer] = await sql`
      select id from spell_ingredients
      where spell_id = ${spellId} and variant_id = ${leaf} and deleted_at is null`;
    expect(layer).toBeDefined();
    const ofA = await localHoldings(asUser(A), WORKSPACE_W_ID, local);
    expect(ofA.find((row) => row.form === 'Leafform')!.spells).toBe(1);

    const ofB = await localHoldings(asUser(B), WORKSPACE_W_ID, local);

    expect(ofB.find((row) => row.form === 'Leafform')!.spells).toBe(0);
  });

  it('refuses an entry that is not a live own entry of the coven', async () => {
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${local}`;
    await expect(localHoldings(asUser(B), WORKSPACE_W_ID, local)).rejects.toBeInstanceOf(NotFound);
    await expect(localHoldings(asUser(B), WORKSPACE_W_ID, 'not-an-id')).rejects.toBeInstanceOf(
      NotFound,
    );
  });

  it('refuses a viewer by direct id, though they may read the entry', async () => {
    // Why it could have succeeded: C is a live member of W who reads ingredients.
    await expect(
      assertMembership(asUser(C), WORKSPACE_W_ID, { ingredient: ['read'] }),
    ).resolves.toBeDefined();

    await expect(localHoldings(asUser(C), WORKSPACE_W_ID, local)).rejects.toBeInstanceOf(Forbidden);
  });

  it('refuses a member of another coven by direct id, and its own coven’s id finds nothing', async () => {
    // Why it could have succeeded: D may convert in X.
    await expect(
      assertMembership(asUser(D), WORKSPACE_X_ID, { ingredient: ['create', 'delete'] }),
    ).resolves.toBeDefined();

    await expect(localHoldings(asUser(D), WORKSPACE_W_ID, local)).rejects.toBeInstanceOf(Forbidden);
    await expect(localHoldings(asUser(D), WORKSPACE_X_ID, local)).rejects.toBeInstanceOf(NotFound);
  });
});
