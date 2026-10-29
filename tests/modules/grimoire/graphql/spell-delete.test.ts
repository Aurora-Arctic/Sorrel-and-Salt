import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { A, B, C, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertSpell } from '../../../support/db/insert-spell';
import { makeSpell } from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';

// `deleteSpell` over the wire (M13.11): what the transport adds to
// services/spell-delete.test.ts, which owns who may delete what. Here: the
// answer is the deleted id, for the page to leave by, and one refusal per
// code the delete can answer.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate spells, ingredients cascade`;
});

const DELETE = `mutation ($workspaceId: ID!, $id: ID!) {
  deleteSpell(workspaceId: $workspaceId, id: $id)
}`;

const ONE = `query ($workspaceId: ID!, $id: ID!) {
  spell(workspaceId: $workspaceId, id: $id) { id }
}`;

function savedSpell(author = B, visibility: 'workspace' | 'private' = 'workspace') {
  return insertSpell(
    sql,
    makeSpell({ workspaceId: WORKSPACE_W_ID, visibility, steps: [{ body: 'Stir.' }] }),
    author.id,
  );
}

describe('deleteSpell', () => {
  it('answers the deleted id, and the spell then reads as NOT_FOUND', async () => {
    const id = await savedSpell();

    const result = await run<{ deleteSpell: string }>(asUser(B), DELETE, {
      workspaceId: WORKSPACE_W_ID,
      id,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data!.deleteSpell).toBe(id);
    const after = await run(asUser(B), ONE, { workspaceId: WORKSPACE_W_ID, id });
    expect(after.data).toBeNull();
    expect(after.errors?.[0]?.extensions).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('answers FORBIDDEN to a viewer, and writes nothing', async () => {
    const id = await savedSpell();
    // Why this could have succeeded: the viewer reads the spell by this id.
    const read = await run<{ spell: { id: string } }>(asUser(C), ONE, {
      workspaceId: WORKSPACE_W_ID,
      id,
    });
    expect(read.data!.spell.id).toBe(id);

    const result = await run(asUser(C), DELETE, { workspaceId: WORKSPACE_W_ID, id });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions).toMatchObject({ code: 'FORBIDDEN' });
    const [row] = await sql<{ deleted_at: Date | null }[]>`
      select deleted_at from spells where id = ${id}`;
    expect(row!.deleted_at).toBeNull();
  });

  it('answers NOT_FOUND for another member’s private spell, as for one that is not there', async () => {
    const hidden = await savedSpell(A, 'private');

    const result = await run(asUser(B), DELETE, { workspaceId: WORKSPACE_W_ID, id: hidden });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions).toMatchObject({ code: 'NOT_FOUND' });
  });
});
