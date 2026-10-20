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
// Counts what a split would move: the coven's jars, and the spells laying the
// form, private ones of other members included.

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
  it('counts each live form’s jars and the spells laying it, private ones included', async () => {
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
    // A's private spell, which B cannot read but the split would move.
    await spellLaying(root, 'private');
    const deleted = await spellLaying(leaf, 'workspace');
    await sql`update spells set deleted_at = now(), deleted_by = ${A.id} where id = ${deleted}`;

    const holdings = await localHoldings(asUser(B), WORKSPACE_W_ID, local);

    expect(holdings.map(({ form, jars, spells }) => ({ form, jars, spells }))).toEqual([
      { form: 'Leafform', jars: 0, spells: 0 },
      { form: 'Rootform', jars: 1, spells: 2 },
    ]);
    expect(holdings.find((row) => row.form === 'Rootform')!.formId).toBe(root);
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
