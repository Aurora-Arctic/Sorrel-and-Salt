import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import type { AuditWriter } from '@/db/repository';
import { Forbidden, NotFound } from '@/lib/errors';
import { deleteSpell, readSpell, updateSpell } from '@/modules/grimoire';
import { A, B, C, D, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertSpell } from '../../../support/db/insert-spell';
import { makeSpell } from '../../../support/fixtures';
import type { SpellVisibility } from '@/modules/grimoire';

// Deleting a spell: a soft delete of the spell and its steps in one
// transaction, by a role holding `spell: delete`, of a spell the caller can
// read. The visibility lock governs widening, not existence, so a shared spell
// goes too. Who may read which spell is spell-reads.test.ts's; here is who
// may delete what, and that the two tables fall together or not at all.

// `withAudit` as it is, with one seam: a test may wrap the writer it hands
// the service, so a failure between the two tables' writes can be staged and
// the transaction shown to roll both back.
const seam = vi.hoisted(() => ({
  wrap: undefined as ((write: AuditWriter) => AuditWriter) | undefined,
}));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  return {
    ...actual,
    withAudit: (
      session: Parameters<typeof actual.withAudit>[0],
      fn: (write: AuditWriter) => Promise<unknown>,
    ) => actual.withAudit(session, (write) => fn(seam.wrap ? seam.wrap(write) : write)),
  };
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  seam.wrap = undefined;
  await sql`truncate spells, ingredients cascade`;
});

/** A spell in W with two instruction steps, written by `author`, as setup rather than through the service. */
function seed(
  author: typeof A,
  visibility: SpellVisibility = 'workspace',
  extra: Parameters<typeof makeSpell>[0] = {},
): Promise<string> {
  return insertSpell(
    sql,
    makeSpell({
      workspaceId: WORKSPACE_W_ID,
      visibility,
      steps: [{ body: 'Stir.' }, { body: 'Seal.' }],
      ...extra,
    }),
    author.id,
  );
}

/** The spell's own tombstone and its steps', read raw: the finders hide a deleted row. */
async function tombstones(spellId: string) {
  const [spell] = await sql<{ deleted_at: Date | null; deleted_by: string | null }[]>`
    select deleted_at, deleted_by from spells where id = ${spellId}`;
  const steps = await sql<{ deleted_at: Date | null; deleted_by: string | null }[]>`
    select deleted_at, deleted_by from spell_steps where spell_id = ${spellId} order by position`;
  return { spell: spell!, steps };
}

describe('deleteSpell', () => {
  it('soft-deletes a member’s own spell and its steps together, stamped with the deleter', async () => {
    const id = await seed(B);

    await deleteSpell(asUser(B), WORKSPACE_W_ID, id);

    const { spell, steps } = await tombstones(id);
    expect(spell.deleted_at).not.toBeNull();
    expect(spell.deleted_by).toBe(B.id);
    expect(steps).toHaveLength(2);
    for (const step of steps) {
      expect(step.deleted_at).not.toBeNull();
      expect(step.deleted_by).toBe(B.id);
    }
    // Gone from every finder: the read is a NotFound, as for a spell that never was.
    await expect(readSpell(asUser(B), WORKSPACE_W_ID, id)).rejects.toBeInstanceOf(NotFound);
  });

  it('deletes a shared spell another member wrote, and a complete one: the rule is about widening, not existence', async () => {
    // Why this could have been refused: the spell is complete and shared, which locks its
    // visibility from narrowing.
    const id = await seed(A, 'workspace', { status: 'complete', title: 'Shared Working' });
    await expect(
      updateSpell(asUser(B), WORKSPACE_W_ID, id, { visibility: 'private', expectedRevision: null }),
    ).rejects.toBeInstanceOf(Forbidden);

    await deleteSpell(asUser(B), WORKSPACE_W_ID, id);

    expect((await tombstones(id)).spell.deleted_at).not.toBeNull();
    await expect(readSpell(asUser(A), WORKSPACE_W_ID, id)).rejects.toBeInstanceOf(NotFound);
  });

  it('lets an owner delete, and the author delete their own private spell', async () => {
    const shared = await seed(B);
    const own = await seed(A, 'private');

    await deleteSpell(asUser(A), WORKSPACE_W_ID, shared);
    await deleteSpell(asUser(A), WORKSPACE_W_ID, own);

    expect((await tombstones(shared)).spell.deleted_at).not.toBeNull();
    expect((await tombstones(own)).spell.deleted_at).not.toBeNull();
  });

  it('refuses a viewer by direct id, who reads the spell', async () => {
    const id = await seed(B);
    // Why this could have succeeded: C is a live member of W and reads this very spell;
    // a member of W with `spell: delete` deletes it (above). C's role lacks the permission.
    await expect(readSpell(asUser(C), WORKSPACE_W_ID, id)).resolves.toMatchObject({ id });

    await expect(deleteSpell(asUser(C), WORKSPACE_W_ID, id)).rejects.toBeInstanceOf(Forbidden);

    const { spell, steps } = await tombstones(id);
    expect(spell.deleted_at).toBeNull();
    expect(steps.map((step) => step.deleted_at)).toEqual([null, null]);
  });

  it('refuses a member of another coven by direct id, in either coven’s name', async () => {
    const id = await seed(B);
    // Why this could have succeeded: D holds a live membership, of X, with `spell: delete`
    // there; the spell's id is real. D is not in W.
    const own = await insertSpell(sql, makeSpell({ workspaceId: WORKSPACE_X_ID }), D.id);
    await expect(deleteSpell(asUser(D), WORKSPACE_X_ID, own)).resolves.toBeUndefined();

    await expect(deleteSpell(asUser(D), WORKSPACE_W_ID, id)).rejects.toBeInstanceOf(Forbidden);
    // Naming their own coven with W's spell: the proof scopes the write, so nothing is there.
    await expect(deleteSpell(asUser(D), WORKSPACE_X_ID, id)).rejects.toBeInstanceOf(NotFound);

    expect((await tombstones(id)).spell.deleted_at).toBeNull();
  });

  it('refuses another member’s private spell as if it did not exist', async () => {
    const hidden = await seed(A, 'private');
    // Why this could have succeeded: B is a member of W with `spell: delete`, and the spell is
    // in W; its author deletes the same row (above). B may not read it.
    await expect(readSpell(asUser(B), WORKSPACE_W_ID, hidden)).rejects.toBeInstanceOf(NotFound);

    await expect(deleteSpell(asUser(B), WORKSPACE_W_ID, hidden)).rejects.toBeInstanceOf(NotFound);

    expect((await tombstones(hidden)).spell.deleted_at).toBeNull();
  });

  it('answers NotFound for a spell already deleted, and for an id that is not one', async () => {
    const id = await seed(B);
    await deleteSpell(asUser(B), WORKSPACE_W_ID, id);

    await expect(deleteSpell(asUser(B), WORKSPACE_W_ID, id)).rejects.toBeInstanceOf(NotFound);
    await expect(deleteSpell(asUser(B), WORKSPACE_W_ID, 'not-an-id')).rejects.toBeInstanceOf(
      NotFound,
    );
  });

  it('leaves the spell and its steps alive when the write fails part-way', async () => {
    const id = await seed(B);
    // The steps' write succeeds and the spell's, which follows it, is made to fail: one
    // transaction, so the steps' tombstones go with it.
    seam.wrap = (write) => ({
      ...write,
      softDeleteSpell: () => Promise.reject(new Error('staged failure')),
    });

    await expect(deleteSpell(asUser(B), WORKSPACE_W_ID, id)).rejects.toThrow('staged failure');

    const { spell, steps } = await tombstones(id);
    expect(spell.deleted_at).toBeNull();
    expect(steps.map((step) => step.deleted_at)).toEqual([null, null]);
  });
});
