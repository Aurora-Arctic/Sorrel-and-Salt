import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { withAudit } from '@/db/repository';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { assertMembership } from '@/modules/coven';
import { A, D, E, asUser } from '../../support/as-user';
import { useTestDatabase } from '../../support/db/database';
import { insertIngredient } from '../../support/db/insert-ingredient';
import { insertStock } from '../../support/db/insert-stock';
import { variantIdOf } from '../../support/db/read-variants';
import { makeIngredient } from '../../support/fixtures';

// The one writer that decrements stock: it joins the caller's transaction, floors at zero and
// reports what it took, so a working's deduction records the shortfall.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

async function jarOf(workspaceId: string, quantityOnHand: string | null, unit: 'g' | null = 'g') {
  const ingredient = await insertIngredient(sql, makeIngredient(), E.id);
  const variantId = await variantIdOf(sql, ingredient, 'Testform');
  return insertStock(
    sql,
    { workspaceId, ingredientId: ingredient, variantId, quantityOnHand, unit },
    A.id,
  );
}

const onHand = async (id: string) =>
  (await sql`select quantity_on_hand from inventory_items where id = ${id}`)[0].quantity_on_hand;

describe('decrementStock', () => {
  it('takes the amount, stamps the actor and reports what it took', async () => {
    const jar = await jarOf(WORKSPACE_W_ID, '10.000');
    const w = await assertMembership(asUser(A), WORKSPACE_W_ID, { inventory: ['update'] });

    const result = await withAudit(asUser(A), (write) => write.decrementStock(w, jar, 2.5));

    expect(result).toEqual({ taken: 2.5 });
    expect(await onHand(jar)).toBe('7.500');
    const [row] = await sql`select updated_by from inventory_items where id = ${jar}`;
    expect(row.updated_by).toBe(A.id);
  });

  it('floors at zero and reports only what the jar held', async () => {
    const jar = await jarOf(WORKSPACE_W_ID, '1.250');
    const w = await assertMembership(asUser(A), WORKSPACE_W_ID, { inventory: ['update'] });

    const result = await withAudit(asUser(A), (write) => write.decrementStock(w, jar, 4));

    expect(result).toEqual({ taken: 1.25 });
    expect(await onHand(jar)).toBe('0.000');
  });

  it('takes nothing from a jar kept without an amount', async () => {
    const jar = await jarOf(WORKSPACE_W_ID, null, null);
    const w = await assertMembership(asUser(A), WORKSPACE_W_ID, { inventory: ['update'] });

    await expect(withAudit(asUser(A), (write) => write.decrementStock(w, jar, 1))).resolves.toEqual(
      {
        taken: 0,
      },
    );
    expect(await onHand(jar)).toBeNull();
  });

  it('touches no other coven’s jar, whatever id it is handed', async () => {
    const theirs = await jarOf(WORKSPACE_X_ID, '10.000');
    const w = await assertMembership(asUser(A), WORKSPACE_W_ID, { inventory: ['update'] });
    // Why it could have taken: the id names a live jar with stock, and only the proof's coven keeps it out.
    expect(await onHand(theirs)).toBe('10.000');

    await expect(
      withAudit(asUser(A), (write) => write.decrementStock(w, theirs, 3)),
    ).resolves.toEqual({
      taken: 0,
    });
    expect(await onHand(theirs)).toBe('10.000');
    // D is X's member and could hold X's proof; W's A never could.
    expect(D.id).not.toBe(A.id);
  });

  it('rolls back with the transaction it joined', async () => {
    const jar = await jarOf(WORKSPACE_W_ID, '10.000');
    const w = await assertMembership(asUser(A), WORKSPACE_W_ID, { inventory: ['update'] });

    await expect(
      withAudit(asUser(A), async (write) => {
        await write.decrementStock(w, jar, 4);
        throw new Error('a later write failed');
      }),
    ).rejects.toThrow('a later write failed');

    expect(await onHand(jar)).toBe('10.000');
  });
});
