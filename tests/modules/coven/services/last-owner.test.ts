import { describe, expect, it } from 'vitest';
import { withAudit } from '@/db/repository';
import { Forbidden } from '@/lib/errors';
import { assertMembership, assertNotLastOwner, LastOwner } from '@/modules/coven';
import { A, B, C, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { insertWorkspace } from '../../../support/db/insert-workspace';

useRawClient();

async function guard(
  actor: typeof A,
  workspaceId: string,
  userId: string,
  becomes: 'owner' | 'member' | 'viewer' | null,
) {
  const session = asUser(actor);
  const membership = await assertMembership(session, workspaceId, { member: ['update'] });
  return withAudit(session, (write) => assertNotLastOwner(write, membership, userId, becomes));
}

describe('assertNotLastOwner', () => {
  it('refuses to demote, remove or let leave the only owner, offering the others as promotable', async () => {
    const covenId = await insertWorkspace(sql, 'Fixture Last Owner Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
      [C.id, 'viewer'],
    ]);

    for (const becomes of ['member', 'viewer', null] as const) {
      const error = await guard(A, covenId, A.id, becomes).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(LastOwner);
      expect(error).toBeInstanceOf(Forbidden);
      expect(error).toMatchObject({ remedy: 'promote' });
      expect([...(error as LastOwner).promotable].sort()).toEqual([B.id, C.id].sort());
    }
  });

  it('tells the only member to delete the coven instead', async () => {
    const covenId = await insertWorkspace(sql, 'Fixture Lone Owner Coven', [[A.id, 'owner']]);

    const error = await guard(A, covenId, A.id, null).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(LastOwner);
    expect(error).toMatchObject({ remedy: 'delete', promotable: [] });
  });

  it('lets two owners each step down to one, and then stops', async () => {
    const covenId = await insertWorkspace(sql, 'Fixture Two Owner Coven', [
      [A.id, 'owner'],
      [B.id, 'owner'],
    ]);

    await expect(guard(A, covenId, A.id, 'member')).resolves.toBeUndefined();
    await sql`update workspace_members set role = 'member' where workspace_id = ${covenId} and user_id = ${A.id}`;
    await expect(guard(B, covenId, B.id, 'member')).rejects.toBeInstanceOf(LastOwner);
  });

  it('lets a non-owner go, and an owner keep the role', async () => {
    const covenId = await insertWorkspace(sql, 'Fixture Free Passage Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);

    await expect(guard(A, covenId, B.id, null)).resolves.toBeUndefined();
    await expect(guard(A, covenId, A.id, 'owner')).resolves.toBeUndefined();
  });
});
