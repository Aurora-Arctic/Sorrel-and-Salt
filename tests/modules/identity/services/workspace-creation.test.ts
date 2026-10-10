import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, NotFound } from '@/lib/errors';
import { withAudit } from '@/db/repository';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { users } from '@/modules/identity/schema/users';
import { grantWorkspaceCreation, revokeWorkspaceCreation } from '@/modules/identity';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { asManualFix, refusalOf } from '../../../support/db/privileges';
import type { CreationChangeRow, CreationFlagRow } from './types';

// M5.8: an admin approves someone who has no invitation, or revokes the
// approval, by writing `canCreateWorkspace` on their row, declared `via:
// 'admin'` so the trigger on `users` records it in the privilege ledger
// (MB.195; claude-docs/auth/admin-users.md, "Approving workspace creation"). Refused at the service by direct call, so a non-admin is turned
// away whatever the page or the schema shows.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

// Invented accounts beside the cast, which the seed has already approved:
// one awaiting approval, and one soft-deleted while it was.
const PENDING = '00000000-0000-0000-0000-0000000000b1';
const DELETED = '00000000-0000-0000-0000-0000000000b2';
const NOWHERE = '00000000-0000-0000-0000-0000000000b9';

beforeEach(async () => {
  // A's flag is put back as a `psql` fix would, declaring itself; then the
  // ledger is emptied, before the users its rows name are deleted.
  await asManualFix(sql, async (tx) => {
    await tx`update users set can_create_workspace = true where id = ${A.id}`;
  });
  await sql`truncate user_privilege_changes`;
  await sql`delete from users where id in (${PENDING}, ${DELETED})`;
  await sql`
    insert into users (id, name, email, can_create_workspace, created_by, updated_by)
    values (${PENDING}, 'Pending Fixturewort', 'pending@creation.test', false, ${PENDING}, ${PENDING})
  `;
  await sql`
    insert into users (id, name, email, can_create_workspace, created_by, updated_by, deleted_at, deleted_by)
    values (${DELETED}, 'Lapsed Fixturewort', 'lapsed@creation.test', false, ${DELETED}, ${DELETED}, now(), ${DELETED})
  `;
});

/** The ledger's creation rows, oldest first, the enums cast to text. */
async function changes(): Promise<CreationChangeRow[]> {
  return sql<CreationChangeRow[]>`
    select user_id, change::text, via::text, created_by, updated_by
    from user_privilege_changes
    where privilege = 'create_workspace'
    order by created_at, id
  `;
}

async function flagOf(id: string): Promise<CreationFlagRow> {
  const [row] = await sql<CreationFlagRow[]>`
    select can_create_workspace, updated_by, updated_at from users where id = ${id}
  `;
  if (!row) throw new Error(`No users row ${id}`);
  return row;
}

describe('grantWorkspaceCreation', () => {
  it('lets a user awaiting approval create a coven, stamped as the admin who approved', async () => {
    const before = await flagOf(PENDING);
    expect(before).toMatchObject({ can_create_workspace: false, updated_by: PENDING });

    const user = await grantWorkspaceCreation(asUser(E), PENDING);

    expect(user).toMatchObject({ id: PENDING, canCreateWorkspace: true });
    const after = await flagOf(PENDING);
    expect(after).toMatchObject({ can_create_workspace: true, updated_by: E.id });
    expect(after.updated_at.getTime()).toBeGreaterThan(before.updated_at.getTime());
  });

  // The row's stamps go with its next update; the ledger's row does not.
  it('records the approval in the ledger as an admin’s act, naming the user and the admin', async () => {
    expect(await changes()).toEqual([]);

    await grantWorkspaceCreation(asUser(E), PENDING);

    expect(await changes()).toEqual([
      { user_id: PENDING, change: 'grant', via: 'admin', created_by: E.id, updated_by: E.id },
    ]);
  });

  // The service writes no ledger row: the same write without its declaration
  // is refused by the trigger, so the row above is the trigger's.
  it('is recorded by the trigger, which refuses the same write undeclared', async () => {
    const undeclared = withAudit(asUser(E), (write) =>
      write.updateById(users, PENDING, { canCreateWorkspace: true }),
    );

    expect(await refusalOf(undeclared)).toBe('a privilege change must declare its route');
    expect(await flagOf(PENDING)).toMatchObject({ can_create_workspace: false });
    expect(await changes()).toEqual([]);
  });

  // The guard is the only thing between these callers and the write: E's
  // same call on the same row succeeds, so a pass here is the role refusing.
  it.each([
    ['A, an owner who may create covens', A],
    ['B, a member', B],
    ['C, a viewer', C],
    ['D, a member elsewhere', D],
  ])('refuses %s as Forbidden by direct call, writing nothing', async (_who, user) => {
    expect(user.role).toBe('user');
    expect(await flagOf(PENDING)).toMatchObject({ can_create_workspace: false });

    await expect(grantWorkspaceCreation(asUser(user), PENDING)).rejects.toThrow(Forbidden);

    expect(await flagOf(PENDING)).toMatchObject({
      can_create_workspace: false,
      updated_by: PENDING,
    });
    await expect(grantWorkspaceCreation(asUser(E), PENDING)).resolves.toMatchObject({
      canCreateWorkspace: true,
    });
  });

  it('refuses a user who may already create a coven with a message, leaving their row alone', async () => {
    await grantWorkspaceCreation(asUser(E), PENDING);
    const granted = await flagOf(PENDING);

    const refusal = grantWorkspaceCreation(asUser(E), PENDING);

    await expect(refusal).rejects.toThrow(Forbidden);
    await expect(refusal).rejects.toThrow('Pending Fixturewort may already create a coven');
    expect(await flagOf(PENDING)).toEqual(granted);
    expect(await changes()).toHaveLength(1);
  });

  it('answers a soft-deleted user as NotFound, writing nothing', async () => {
    expect(await flagOf(DELETED)).toMatchObject({ can_create_workspace: false });

    await expect(grantWorkspaceCreation(asUser(E), DELETED)).rejects.toThrow(NotFound);

    expect(await flagOf(DELETED)).toMatchObject({
      can_create_workspace: false,
      updated_by: DELETED,
    });
  });

  it('answers an id naming no user as NotFound', async () => {
    await expect(grantWorkspaceCreation(asUser(E), NOWHERE)).rejects.toThrow(NotFound);
  });
});

describe('revokeWorkspaceCreation', () => {
  it('stops a user creating covens, stamped as the admin and recorded in the ledger', async () => {
    await grantWorkspaceCreation(asUser(E), PENDING);
    expect(await flagOf(PENDING)).toMatchObject({ can_create_workspace: true });

    const user = await revokeWorkspaceCreation(asUser(E), PENDING);

    expect(user).toMatchObject({ id: PENDING, canCreateWorkspace: false });
    expect(await flagOf(PENDING)).toMatchObject({ can_create_workspace: false, updated_by: E.id });
    expect(
      (await changes()).map(({ user_id, change, via, created_by }) => [
        user_id,
        change,
        via,
        created_by,
      ]),
    ).toEqual([
      [PENDING, 'grant', 'admin', E.id],
      [PENDING, 'revoke', 'admin', E.id],
    ]);
  });

  // The flag governs creating, not keeping: A owns W, and still does.
  it('leaves the covens a user already owns, and their ownership, untouched', async () => {
    const owned = () => sql`
      select w.id, w.deleted_at, m.role from workspaces w
      join workspace_members m on m.workspace_id = w.id
      where m.user_id = ${A.id} and m.deleted_at is null and w.id = ${WORKSPACE_W_ID}
    `;
    expect(await owned()).toEqual([{ id: WORKSPACE_W_ID, deleted_at: null, role: 'owner' }]);
    expect(await flagOf(A.id)).toMatchObject({ can_create_workspace: true });

    await revokeWorkspaceCreation(asUser(E), A.id);

    expect(await flagOf(A.id)).toMatchObject({ can_create_workspace: false });
    expect(await owned()).toEqual([{ id: WORKSPACE_W_ID, deleted_at: null, role: 'owner' }]);
  });

  // E's same call on the same row succeeds, so a pass here is the role refusing.
  it.each([
    ['A, an owner', A],
    ['B, a member', B],
    ['C, a viewer', C],
    ['D, a member elsewhere', D],
  ])('refuses %s as Forbidden by direct call, writing nothing', async (_who, user) => {
    expect(user.role).toBe('user');
    expect(await flagOf(A.id)).toMatchObject({ can_create_workspace: true });

    await expect(revokeWorkspaceCreation(asUser(user), A.id)).rejects.toThrow(Forbidden);

    expect(await flagOf(A.id)).toMatchObject({ can_create_workspace: true });
    expect(await changes()).toEqual([]);
    await expect(revokeWorkspaceCreation(asUser(E), A.id)).resolves.toMatchObject({
      canCreateWorkspace: false,
    });
  });

  // MB.177's CHECK would refuse the write; the service says why first.
  it("refuses an admin's flag with an explaining Forbidden, before the CHECK would", async () => {
    expect(await flagOf(E.id)).toMatchObject({ can_create_workspace: true });
    expect(E.role).toBe('admin');

    const refusal = revokeWorkspaceCreation(asUser(E), E.id);

    await expect(refusal).rejects.toThrow(Forbidden);
    await expect(refusal).rejects.toThrow(
      `${E.name} is an admin, and every admin may create a coven. Revoke their admin role first.`,
    );
    expect(await flagOf(E.id)).toMatchObject({ can_create_workspace: true });
    expect(await changes()).toEqual([]);
  });

  it('refuses a user who may not create a coven with a message, writing nothing', async () => {
    const before = await flagOf(PENDING);

    const refusal = revokeWorkspaceCreation(asUser(E), PENDING);

    await expect(refusal).rejects.toThrow(Forbidden);
    await expect(refusal).rejects.toThrow(
      'Pending Fixturewort cannot create a coven, so there is nothing to revoke',
    );
    expect(await flagOf(PENDING)).toEqual(before);
    expect(await changes()).toEqual([]);
  });

  it('answers a soft-deleted or unknown user as NotFound, writing nothing', async () => {
    await asManualFix(sql, async (tx) => {
      await tx`update users set can_create_workspace = true where id = ${DELETED}`;
    });
    await sql`truncate user_privilege_changes`;

    await expect(revokeWorkspaceCreation(asUser(E), DELETED)).rejects.toThrow(NotFound);
    await expect(revokeWorkspaceCreation(asUser(E), NOWHERE)).rejects.toThrow(NotFound);

    expect(await flagOf(DELETED)).toMatchObject({ can_create_workspace: true });
    expect(await changes()).toEqual([]);
  });
});
