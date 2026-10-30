import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { withAudit } from '@/db/repository';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { type Membership, assertMembership } from '@/modules/coven';
import { spells } from '@/modules/grimoire/schema/spells';
import { StaleWrite } from '@/lib/errors';
import { A, B, D, asUser } from '../../support/as-user';
import { useTestDatabase } from '../../support/db/database';
import { insertSpell } from '../../support/db/insert-spell';
import { makeSpell } from '../../support/fixtures';

// A revisioned write names the revision it read and is refused with `StaleWrite` if the row has moved; `null` writes whatever the revision (claude-docs/components/autosave.md, "The server's half").
// The writes under test go through `withAudit` and only the setup through the raw client.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate spells cascade`;
});

const proofFor = (user: typeof A, workspaceId: string = WORKSPACE_W_ID): Promise<Membership> =>
  assertMembership(asUser(user), workspaceId, { spell: ['update'] });

const spell = () =>
  insertSpell(sql, makeSpell({ workspaceId: WORKSPACE_W_ID, title: 'Testwort Draught' }), A.id);

async function rowOf(id: string) {
  const [row] = await sql<{ title: string; revision: number; updated_by: string }[]>`
    select title, revision, updated_by from spells where id = ${id}`;
  return row;
}

/** Another writer's save, through the raw client: the row moves on to the next revision. */
const savedElsewhere = (id: string, title: string) =>
  sql`update spells set title = ${title}, updated_by = ${B.id} where id = ${id}`;

/** A's save of `title` against `expected`, through the writer. */
async function save(id: string, expected: number | null, title: string) {
  const membership = await proofFor(A);
  return withAudit(asUser(A), (write) =>
    write.updateRevisioned(membership, spells, id, expected, { title }),
  );
}

describe('updateRevisioned', () => {
  it('writes when the revision matches, and returns the row at its new revision', async () => {
    const id = await spell();
    expect((await rowOf(id)).revision).toBe(1);

    const [row] = await save(id, 1, 'Testwort Tonic');

    expect(row.revision).toBe(2);
    expect(row.title).toBe('Testwort Tonic');
    expect(await rowOf(id)).toEqual({ title: 'Testwort Tonic', revision: 2, updated_by: A.id });
  });

  it('refuses a stale revision with StaleWrite carrying the current one, and writes nothing', async () => {
    const id = await spell();
    await savedElsewhere(id, 'Fixture Philtre');
    // The precondition: the row is there, in A's coven, and someone else's
    // save has moved it past the revision A read. Without the revision check
    // A's write would match it and land.
    const before = await rowOf(id);
    expect(before).toEqual({ title: 'Fixture Philtre', revision: 2, updated_by: B.id });

    const refused = await save(id, 1, 'Testwort Tonic').catch((error: unknown) => error);

    expect(refused).toBeInstanceOf(StaleWrite);
    expect((refused as StaleWrite).currentRevision).toBe(2);
    expect(await rowOf(id)).toEqual(before);
  });

  it('writes over whatever the row holds when the expected revision is null', async () => {
    const id = await spell();
    await savedElsewhere(id, 'Fixture Philtre');
    expect((await rowOf(id)).revision).toBe(2);

    const [row] = await save(id, null, 'Testwort Tonic');

    expect(row.revision).toBe(3);
    expect(await rowOf(id)).toEqual({ title: 'Testwort Tonic', revision: 3, updated_by: A.id });
  });

  it('answers no row, not StaleWrite, for a row another coven holds', async () => {
    const id = await spell();
    // The row exists and sits at revision 1, which is what D sends: only the
    // proof's coven keeps D's write from it.
    expect((await rowOf(id)).revision).toBe(1);
    const membership = await proofFor(D, WORKSPACE_X_ID);

    const rows = await withAudit(asUser(D), (write) =>
      write.updateRevisioned(membership, spells, id, 1, { title: 'Foreign' }),
    );

    expect(rows).toEqual([]);
    expect(await rowOf(id)).toEqual({ title: 'Testwort Draught', revision: 1, updated_by: A.id });
  });

  it('answers no row, not StaleWrite, for a soft-deleted row', async () => {
    const id = await spell();
    await sql`update spells set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;
    expect((await rowOf(id)).revision).toBe(2);

    await expect(save(id, 1, 'Testwort Tonic')).resolves.toEqual([]);
  });
});
