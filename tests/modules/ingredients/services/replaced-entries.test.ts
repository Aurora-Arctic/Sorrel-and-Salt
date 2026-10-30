import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { findOneIngredient } from '@/db/repository';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { assertMembership } from '@/modules/coven';
import { compendiumMatchesOf } from '@/modules/ingredients';
import { A, B, C, D, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { type IngredientFixture, type Overrides, makeIngredient } from '../../../support/fixtures';

// The compendium entries a coven's own entry is (same identity) or may
// be (same label, when it declares no formal name). The table is emptied
// per test, so every row a result could come from is one this file wrote.

let sql: ReturnType<typeof postgres>;
const none = { kind: 'none', entries: [], total: 0 };

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

function add(entry: Overrides<IngredientFixture>): Promise<string> {
  const nomenclature = entry.canonicalName ? 'botanical' : 'none';
  return insertIngredient(sql, makeIngredient({ nomenclature, ...entry }), A.id);
}

/** The service's answer for the entry `id`, read as a member of its own coven. */
async function replacedBy(id: string, workspaceId: string | null, asMember = A) {
  const membership = workspaceId
    ? await assertMembership(asUser(A), workspaceId, { ingredient: ['read'] })
    : undefined;
  const row = await findOneIngredient(membership ? [membership] : [], id);
  if (!row) throw new Error('fixture row not found');
  return compendiumMatchesOf(asUser(asMember), row);
}

describe('compendiumMatchesOf', () => {
  it('gives an entry with a formal name only its same-identity entry, never a name-only match', async () => {
    const same = await add({ name: 'Fixturewort', canonicalName: 'Fixtura vulgaris' });
    // Precondition: this one shares the local's label, so only identity keeps it out.
    await add({ name: 'Cronefixture', canonicalName: 'Fixtura other' });
    const local = await add({
      name: 'Cronefixture',
      canonicalName: 'FIXTURA vulgaris',
      workspaceId: WORKSPACE_W_ID,
    });

    const found = await replacedBy(local, WORKSPACE_W_ID);
    expect(found.kind).toBe('same');
    expect(found.entries.map(({ id }) => id)).toEqual([same]);
    expect(found.total).toBe(1);
    expect(Object.keys(found.entries[0] ?? {}).sort()).toEqual([
      'canonicalName',
      'id',
      'name',
      'slug',
    ]);
  });

  it('gives an entry with no formal name each exact label match', async () => {
    const ids = [
      await add({ name: "Fixture Cat's Claw", canonicalName: 'Fixtura b' }),
      await add({ name: "fixture cat's claw", canonicalName: 'Fixtura a' }),
    ];
    const other = await add({ name: 'Fixture Other' });
    const local = await add({ name: "FIXTURE CAT'S CLAW", workspaceId: WORKSPACE_W_ID });

    const found = await replacedBy(local, WORKSPACE_W_ID);
    expect(found.kind).toBe('similar');
    expect(found.entries.map(({ id }) => id).sort()).toEqual([...ids].sort());
    expect(found.entries.map(({ id }) => id)).not.toContain(other);
    expect(found.total).toBe(2);
  });

  it('gives a viewer the same matches as a member', async () => {
    await add({ name: 'Fixturewort', canonicalName: 'Fixtura vulgaris' });
    const local = await add({ name: 'Fixturewort', workspaceId: WORKSPACE_W_ID });

    const member = await replacedBy(local, WORKSPACE_W_ID, B);
    const viewer = await replacedBy(local, WORKSPACE_W_ID, C);
    expect(viewer.total).toBe(1);
    expect(viewer).toEqual(member);
  });

  it('gives nothing for a compendium entry, whoever asks', async () => {
    const entry = await add({ name: 'Fixturewort', canonicalName: 'Fixtura vulgaris' });
    await add({ name: 'Fixturewort', workspaceId: WORKSPACE_W_ID });

    expect(await replacedBy(entry, null, D)).toEqual(none);
  });

  it('gives the first three by name and counts every one, leaving out a deleted entry', async () => {
    const ids: string[] = [];
    for (const latin of ['Fixtura d', 'Fixtura c', 'Fixtura b', 'Fixtura a']) {
      ids.push(await add({ name: 'Fixture Moss', canonicalName: latin }));
    }
    const gone = await add({ name: 'Fixture Moss', canonicalName: 'Fixtura z' });
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${gone}`;
    const local = await add({ name: 'Fixture Moss', workspaceId: WORKSPACE_W_ID });

    const found = await replacedBy(local, WORKSPACE_W_ID);

    expect(found.total).toBe(4);
    expect(found.entries).toHaveLength(3);
    expect(found.entries.map(({ id }) => id)).not.toContain(gone);
    expect(found.entries.map(({ id }) => id).every((id) => ids.includes(id))).toBe(true);
  });

  it('refuses a non-member, who is refused only for lack of a seat', async () => {
    await add({ name: 'Fixturewort', canonicalName: 'Fixtura vulgaris' });
    const local = await add({
      name: 'Cronefixture',
      canonicalName: 'Fixtura vulgaris',
      workspaceId: WORKSPACE_W_ID,
    });

    // Why it could have succeeded: a member of W is told the entry.
    expect((await replacedBy(local, WORKSPACE_W_ID, A)).total).toBe(1);
    await expect(replacedBy(local, WORKSPACE_W_ID, D)).rejects.toThrow(Forbidden);
  });
});
