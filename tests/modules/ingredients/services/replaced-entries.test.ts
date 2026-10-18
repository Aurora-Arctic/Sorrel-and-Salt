import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { findCompendiumEntriesHiddenBy, findOneIngredient } from '@/db/repository';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { assertMembership } from '@/modules/coven';
import { compendiumEntriesReplacedBy } from '@/modules/ingredients';
import { A, B, C, D, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { type IngredientFixture, type Overrides, makeIngredient } from '../../../support/fixtures';

// M12.12: the compendium entries a coven's own entry hides, read from the
// local side with the predicate the lists drop them by. The table is emptied
// per test, so every row a result could come from is one this file wrote.

let sql: ReturnType<typeof postgres>;
const none = { entries: [], total: 0 };

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
  return compendiumEntriesReplacedBy(asUser(asMember), row);
}

describe('compendiumEntriesReplacedBy', () => {
  it('finds the entry sharing the identity, across differing labels', async () => {
    const entry = await add({ name: 'Fixturewort', canonicalName: 'Fixtura vulgaris' });
    const local = await add({
      name: 'Cronefixture',
      canonicalName: 'FIXTURA vulgaris',
      workspaceId: WORKSPACE_W_ID,
    });

    const found = await replacedBy(local, WORKSPACE_W_ID);
    expect(found.entries.map(({ id }) => id)).toEqual([entry]);
    expect(found.total).toBe(1);
    expect(found.entries[0]?.slug).toBeTruthy();
    expect(found.entries[0]?.canonicalName).toBe('Fixtura vulgaris');
    expect(Object.keys(found.entries[0] ?? {}).sort()).toEqual([
      'canonicalName',
      'id',
      'name',
      'slug',
    ]);
  });

  it('matches a label only when the local declares no formal name', async () => {
    const entry = await add({ name: 'Fixturewort', canonicalName: 'Fixtura vulgaris' });
    const unnamed = await add({ name: 'FIXTUREWORT', workspaceId: WORKSPACE_W_ID });

    expect((await replacedBy(unnamed, WORKSPACE_W_ID)).entries.map(({ id }) => id)).toEqual([
      entry,
    ]);

    // Precondition: the labels agree, so only the formal name stops the match.
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${unnamed}`;
    const named = await add({
      name: 'Fixturewort',
      canonicalName: 'Fixtura other',
      workspaceId: WORKSPACE_W_ID,
    });
    expect(await replacedBy(named, WORKSPACE_W_ID)).toEqual(none);
  });

  it('gives nothing for two differently identified entries sharing a label', async () => {
    await add({ name: 'Fixturewort', canonicalName: 'Fixtura vulgaris' });
    const local = await add({
      name: 'Fixturewort',
      canonicalName: 'Fixtura absinthium',
      workspaceId: WORKSPACE_W_ID,
    });

    expect(await replacedBy(local, WORKSPACE_W_ID)).toEqual(none);
  });

  it('gives nothing for a local hiding nothing', async () => {
    await add({ name: 'Fixturewort', canonicalName: 'Fixtura vulgaris' });
    const local = await add({ name: 'Unrelated Fixture', workspaceId: WORKSPACE_W_ID });

    expect(await replacedBy(local, WORKSPACE_W_ID)).toEqual(none);
  });

  it('gives nothing for a compendium entry, whoever asks', async () => {
    const entry = await add({ name: 'Fixturewort', canonicalName: 'Fixtura vulgaris' });
    await add({
      name: 'Cronefixture',
      canonicalName: 'Fixtura vulgaris',
      workspaceId: WORKSPACE_W_ID,
    });

    expect(await replacedBy(entry, null, D)).toEqual(none);
  });

  it('gives every entry sharing the label of an unnamed local, by name', async () => {
    const ids: string[] = [];
    for (const latin of ['Fixtura b', 'Fixtura a']) {
      ids.push(await add({ name: "Fixture Cat's Claw", canonicalName: latin }));
    }
    const other = await add({ name: 'Fixture Other' });
    const local = await add({ name: "fixture cat's claw", workspaceId: WORKSPACE_W_ID });

    const found = await replacedBy(local, WORKSPACE_W_ID);
    expect(found.entries.map(({ id }) => id).sort()).toEqual([...ids].sort());
    expect(found.entries.map(({ id }) => id)).not.toContain(other);
    expect(found.total).toBe(2);
  });

  it('gives the first three by name and counts every one, ties broken by id', async () => {
    // Four entries sharing the local's label, told apart by formal name.
    const ids = new Map<string, string>();
    for (const [name, latin] of [
      ['Fixture Moss', 'Fixtura d'],
      ['fixture moss', 'Fixtura c'],
      ['Fixture Moss', 'Fixtura b'],
      ['Fixture Moss', 'Fixtura a'],
    ] as const) {
      ids.set(latin, await add({ name, canonicalName: latin }));
    }
    const local = await add({ name: 'Fixture Moss', workspaceId: WORKSPACE_W_ID });

    const found = await replacedBy(local, WORKSPACE_W_ID);

    expect(found.total).toBe(4);
    expect(found.entries).toHaveLength(3);
    // The database's order: its name collation, then id. Read the same way here.
    const [expected] = await sql<{ ids: string[] }[]>`
      select array_agg(id order by name, id) as ids from ingredients
      where workspace_id is null and deleted_at is null`;
    expect(found.entries.map(({ id }) => id)).toEqual(expected?.ids.slice(0, 3));
  });

  it('orders by the database collation, where a plain code-unit compare differs', async () => {
    // Postgres's name order (when its collation is not C) puts case variants
    // together; a code-unit compare puts capitals first. Read the database's.
    const ids: string[] = [];
    for (const [name, latin] of [
      ['FIXTURE AB', 'Fixtura one'],
      ['fixture ab', 'Fixtura two'],
      ['Fixture Ab', 'Fixtura three'],
    ] as const) {
      ids.push(await add({ name, canonicalName: latin }));
    }
    const local = await add({ name: 'fixture ab', workspaceId: WORKSPACE_W_ID });
    const [expected] = await sql<{ ids: string[] }[]>`
      select array_agg(id order by name, id) as ids from ingredients
      where workspace_id is null and deleted_at is null`;

    const found = await replacedBy(local, WORKSPACE_W_ID);

    expect(found.entries.map(({ id }) => id)).toEqual(expected?.ids);
    expect(found.entries).toHaveLength(ids.length);
  });

  it('leaves out a soft-deleted compendium entry', async () => {
    const entry = await add({ name: 'Fixturewort', canonicalName: 'Fixtura vulgaris' });
    const local = await add({
      name: 'Cronefixture',
      canonicalName: 'Fixtura vulgaris',
      workspaceId: WORKSPACE_W_ID,
    });
    expect((await replacedBy(local, WORKSPACE_W_ID)).entries.map(({ id }) => id)).toEqual([entry]);

    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${entry}`;

    expect(await replacedBy(local, WORKSPACE_W_ID)).toEqual(none);
  });

  it('answers a viewer, who reads what a member does', async () => {
    const entry = await add({ name: 'Fixturewort', canonicalName: 'Fixtura vulgaris' });
    const local = await add({
      name: 'Cronefixture',
      canonicalName: 'Fixtura vulgaris',
      workspaceId: WORKSPACE_W_ID,
    });

    for (const reader of [B, C]) {
      expect((await replacedBy(local, WORKSPACE_W_ID, reader)).entries.map(({ id }) => id)).toEqual(
        [entry],
      );
    }
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

describe('findCompendiumEntriesHiddenBy', () => {
  it("never reads another coven's local passed by id under this coven's proof", async () => {
    const entry = await add({ name: 'Fixturewort', canonicalName: 'Fixtura vulgaris' });
    const inX = await add({
      name: 'Cronefixture',
      canonicalName: 'Fixtura vulgaris',
      workspaceId: WORKSPACE_X_ID,
    });
    const inW = await assertMembership(asUser(A), WORKSPACE_W_ID, { ingredient: ['read'] });
    const inXProof = await assertMembership(asUser(D), WORKSPACE_X_ID, { ingredient: ['read'] });

    // Why it could have matched: under X's own proof the same id hides the entry.
    const underX = await findCompendiumEntriesHiddenBy(inXProof, inX, 3);
    expect(underX.entries.map(({ id }) => id)).toEqual([entry]);
    expect(underX.total).toBe(1);
    expect(await findCompendiumEntriesHiddenBy(inW, inX, 3)).toEqual(none);
  });

  it('gives nothing for a soft-deleted local', async () => {
    await add({ name: 'Fixturewort', canonicalName: 'Fixtura vulgaris' });
    const local = await add({
      name: 'Cronefixture',
      canonicalName: 'Fixtura vulgaris',
      workspaceId: WORKSPACE_W_ID,
    });
    const inW = await assertMembership(asUser(A), WORKSPACE_W_ID, { ingredient: ['read'] });
    expect((await findCompendiumEntriesHiddenBy(inW, local, 3)).total).toBe(1);

    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${local}`;

    expect(await findCompendiumEntriesHiddenBy(inW, local, 3)).toEqual(none);
  });
});
