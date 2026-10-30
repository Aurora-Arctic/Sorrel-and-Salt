import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { A, B, C, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertSpell } from '../../../support/db/insert-spell';
import { makeSpell } from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';

// `duplicateSpell` over the wire: what the transport adds to services/spell-duplicate.test.ts,
// which owns who may duplicate what. Here: the answer is the new spell, and one refusal per code.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate spells, ingredients cascade`;
});

const DUPLICATE = `mutation ($workspaceId: ID!, $id: ID!) {
  duplicateSpell(workspaceId: $workspaceId, id: $id) {
    id title status visibility revision steps { body position }
  }
}`;

const savedSpell = (author = B, visibility: 'workspace' | 'private' = 'workspace') =>
  insertSpell(
    sql,
    makeSpell({
      workspaceId: WORKSPACE_W_ID,
      title: 'Hearth Warding Jar',
      visibility,
      steps: [{ body: 'Stir.' }, { body: 'Seal.' }],
    }),
    author.id,
  );

describe('duplicateSpell', () => {
  it('answers the new private draft with its steps in order', async () => {
    const id = await savedSpell();

    const result = await run<{ duplicateSpell: { id: string; steps: { body: string }[] } }>(
      asUser(A),
      DUPLICATE,
      { workspaceId: WORKSPACE_W_ID, id },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data!.duplicateSpell).toMatchObject({
      title: 'Hearth Warding Jar (Copy)',
      status: 'draft',
      visibility: 'private',
      steps: [{ body: 'Stir.' }, { body: 'Seal.' }],
    });
    expect(result.data!.duplicateSpell.id).not.toBe(id);
  });

  it('answers FORBIDDEN to a viewer who reads the spell, and writes nothing', async () => {
    const id = await savedSpell();
    // Why this could have succeeded: the viewer reads the spell by this id.
    const read = await run<{ spell: { id: string } }>(
      asUser(C),
      `query ($workspaceId: ID!, $id: ID!) { spell(workspaceId: $workspaceId, id: $id) { id } }`,
      { workspaceId: WORKSPACE_W_ID, id },
    );
    expect(read.data!.spell.id).toBe(id);

    const result = await run(asUser(C), DUPLICATE, { workspaceId: WORKSPACE_W_ID, id });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions).toMatchObject({ code: 'FORBIDDEN' });
    expect(Number((await sql`select count(*) from spells`)[0].count)).toBe(1);
  });

  it('answers NOT_FOUND for another member’s private spell', async () => {
    const hidden = await savedSpell(A, 'private');

    const result = await run(asUser(B), DUPLICATE, { workspaceId: WORKSPACE_W_ID, id: hidden });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions).toMatchObject({ code: 'NOT_FOUND' });
  });
});
