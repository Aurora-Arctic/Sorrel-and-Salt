import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, NotFound } from '@/lib/errors';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import {
  grantWorkspaceCreation,
  pauseAdminRoleChanges,
  resumeAdminRoleChanges,
  revokeWorkspaceCreation,
} from '@/modules/identity';
import { A, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { asManualFix } from '../../../support/db/privileges';
import type { CreationChangeRow, CreationFlagRow } from './types';

// An admin approves someone who has no invitation, or revokes the approval, by writing `canCreateWorkspace` on their row, declared `via: 'admin'` so the trigger on `users` records it (claude-docs/auth/admin-users.md, "Approving workspace creation").
// A non-admin's refusal is curator-boundary.test.ts's, once for every people-page service.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

// Invented accounts beside the cast, which the seed has already approved:
// one awaiting approval, and one soft-deleted while it was.
const PENDING = '00000000-0000-0000-0000-0000000000b1';
const DELETED = '00000000-0000-0000-0000-0000000000b2';

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

  it('refuses a user who may already create a coven, leaving their row alone', async () => {
    await grantWorkspaceCreation(asUser(E), PENDING);
    const granted = await flagOf(PENDING);

    const refusal = grantWorkspaceCreation(asUser(E), PENDING);

    await expect(refusal).rejects.toThrow(Forbidden);
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
});

// The confirmation's optional reason, as a grant of admin takes one: the
// trigger copies it onto the ledger row, a blank one as none.
describe('the reason an approval or a revoke gives', () => {
  const notes = () => sql`
    select change::text, via::text, note, created_by from user_privilege_changes
    where user_id = ${PENDING} order by created_at, id
  `;

  it('is kept as the ledger row’s note, trimmed, by the admin’s act, and a blank one as none', async () => {
    expect(await notes()).toEqual([]);

    await grantWorkspaceCreation(asUser(E), PENDING, '  Runs the Tuesday circle ');
    await revokeWorkspaceCreation(asUser(E), PENDING, '   ');

    expect(await notes()).toEqual([
      { change: 'grant', via: 'admin', note: 'Runs the Tuesday circle', created_by: E.id },
      { change: 'revoke', via: 'admin', note: null, created_by: E.id },
    ]);
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

  // The CHECK would refuse the write; the service says why first.
  it("refuses an admin's flag as Forbidden, before the CHECK would", async () => {
    expect(await flagOf(E.id)).toMatchObject({ can_create_workspace: true });
    expect(E.role).toBe('admin');

    const refusal = revokeWorkspaceCreation(asUser(E), E.id);

    await expect(refusal).rejects.toThrow(Forbidden);
    expect(await flagOf(E.id)).toMatchObject({ can_create_workspace: true });
    expect(await changes()).toEqual([]);
  });

  it('refuses a user who may not create a coven, writing nothing', async () => {
    const before = await flagOf(PENDING);

    const refusal = revokeWorkspaceCreation(asUser(E), PENDING);

    await expect(refusal).rejects.toThrow(Forbidden);
    expect(await flagOf(PENDING)).toEqual(before);
    expect(await changes()).toEqual([]);
  });
});

// While the primary admin has paused admin
// changes, approving and revoking coven creation are paused too, for every
// admin but the primary one.
describe('approving and revoking while admin changes are paused', () => {
  const PRIMARY = '00000000-0000-0000-0000-0000000000b3';
  const PRIMARY_EMAIL = 'primary@creation-pause.test';
  const AS_PRIMARY = { id: PRIMARY, role: 'admin' as const };

  beforeEach(async () => {
    await sql`truncate admin_role_change_pauses`;
    await sql`delete from users where id = ${PRIMARY}`;
    await asManualFix(sql, async (tx) => {
      await tx`
        insert into users (id, name, email, email_verified, role, can_create_workspace, created_by, updated_by)
        values (${PRIMARY}, 'Primary Fixturewort', ${PRIMARY_EMAIL}, true, 'admin', true, ${PRIMARY}, ${PRIMARY})
      `;
    });
    await sql`truncate user_privilege_changes`;
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', PRIMARY_EMAIL);
    await pauseAdminRoleChanges(asUser(AS_PRIMARY));
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await sql`truncate admin_role_change_pauses`;
  });

  // E is a live admin, not the primary one; the same calls succeed once
  // resumed, so it is the pause that refuses.
  it('refuses another admin approving or revoking, writing no ledger row', async () => {
    expect(E.role).toBe('admin');

    await expect(grantWorkspaceCreation(asUser(E), PENDING)).rejects.toThrow(Forbidden);
    await expect(revokeWorkspaceCreation(asUser(E), A.id)).rejects.toThrow(Forbidden);
    expect(await flagOf(PENDING)).toMatchObject({ can_create_workspace: false });
    expect(await flagOf(A.id)).toMatchObject({ can_create_workspace: true });
    expect(await changes()).toEqual([]);

    await resumeAdminRoleChanges(asUser(AS_PRIMARY));
    await expect(grantWorkspaceCreation(asUser(E), PENDING)).resolves.toMatchObject({
      canCreateWorkspace: true,
    });
    await expect(revokeWorkspaceCreation(asUser(E), A.id)).resolves.toMatchObject({
      canCreateWorkspace: false,
    });
  });

  it('lets the primary admin approve and revoke, each recorded as usual', async () => {
    await grantWorkspaceCreation(asUser(AS_PRIMARY), PENDING);
    await revokeWorkspaceCreation(asUser(AS_PRIMARY), PENDING);

    expect((await changes()).map(({ change, created_by }) => [change, created_by])).toEqual([
      ['grant', PRIMARY],
      ['revoke', PRIMARY],
    ]);
  });
});
