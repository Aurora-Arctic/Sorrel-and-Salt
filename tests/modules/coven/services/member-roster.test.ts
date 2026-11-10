import { describe, expect, it } from 'vitest';
import { Forbidden } from '@/lib/errors';
import { memberRoster, removeMember, type WorkspaceRow } from '@/modules/coven';
import { A, B, C, D, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { insertWorkspace } from '../../../support/db/insert-workspace';

useRawClient();

async function covenRow(
  name: string,
  members: [string, 'owner' | 'member' | 'viewer'][],
): Promise<WorkspaceRow> {
  const id = await insertWorkspace(sql, name, members);
  const [coven] = await sql<WorkspaceRow[]>`
    select id, name, slug,
      created_at as "createdAt", created_by as "createdBy",
      updated_at as "updatedAt", updated_by as "updatedBy",
      deleted_at as "deletedAt", deleted_by as "deletedBy"
    from workspaces where id = ${id}`;
  return coven;
}

describe('memberRoster', () => {
  it('lists every live member with their role, and not one who has been removed', async () => {
    const coven = await covenRow('Fixture Roster Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
      [C.id, 'viewer'],
    ]);
    await removeMember(asUser(A), coven.id, C.id);

    const roster = await memberRoster(asUser(A), coven);

    expect(roster.map(({ userId, role }) => [userId, role]).sort()).toEqual(
      [
        [A.id, 'owner'],
        [B.id, 'member'],
      ].sort(),
    );
  });

  it('refuses a viewer, who holds a seat but not member: read, and a stranger', async () => {
    const coven = await covenRow('Fixture Roster Refusal Coven', [
      [A.id, 'owner'],
      [C.id, 'viewer'],
    ]);

    await expect(memberRoster(asUser(C), coven)).rejects.toThrow(Forbidden);
    await expect(memberRoster(asUser(D), coven)).rejects.toThrow(Forbidden);
  });
});
