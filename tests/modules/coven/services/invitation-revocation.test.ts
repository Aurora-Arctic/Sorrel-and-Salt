import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import {
  countPendingWorkspaceInvitations,
  listPendingWorkspaceInvitations,
  removeMember,
  revokeWorkspaceInvitation,
  updateMemberRole,
} from '@/modules/coven';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';
import type { CovenInvitationStateRow } from './types';

// M7.6: an owner withdraws a pending invitation and reads the pending list.
// Both check `member: invite`, which only owners hold; `member: read` is the
// roll's, and members hold it. The row is stamped and kept. An accepted
// invitation is a member to remove, so it is refused in words that say so
// (claude-docs/db/invitations.md).

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const DOMAIN = '@coven-invitation-revocation.test';
const FIRST_PAGE = { limit: 26, inverted: false };

/** A coven of A (owner), B (member) and C (viewer), through the raw client (MB.101). */
async function insertCoven(name: string): Promise<string> {
  const [row] = await sql`
    insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name })), created_by: A.id, updated_by: A.id })}
    returning id`;
  for (const [userId, role] of [
    [A.id, 'owner'],
    [B.id, 'member'],
    [C.id, 'viewer'],
  ]) {
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${row.id}, ${userId}, ${role}, ${A.id}, ${A.id})`;
  }
  return row.id as string;
}

type State = 'pending' | 'accepted' | 'revoked' | 'expired' | 'declined';

/** An invitation into `workspaceId` in the given state, created by `by`. */
async function insertInvitation(
  workspaceId: string,
  label: string,
  state: State = 'pending',
  by: string = A.id,
  ageHours = 0,
): Promise<string> {
  const [row] = await sql`
    insert into invitations (email, token_hash, workspace_id, role, created_by, updated_by, created_at,
      expires_at, accepted_at, accepted_by, revoked_at, declined_at)
    values (${`${label}${DOMAIN}`}, ${`hash-${label}-${workspaceId}`}, ${workspaceId}, 'member', ${by}, ${by},
      now() - ${ageHours} * interval '1 hour',
      ${state === 'expired' ? sql`now() - interval '1 second'` : sql`now() + interval '7 days'`},
      ${state === 'accepted' ? sql`now()` : null}, ${state === 'accepted' ? D.id : null},
      ${state === 'revoked' ? sql`now()` : null}, ${state === 'declined' ? sql`now()` : null})
    returning id`;
  return row.id as string;
}

const stateOf = async (id: string) =>
  (
    await sql<CovenInvitationStateRow[]>`
      select id, accepted_at, revoked_at, updated_by from invitations where id = ${id}`
  )[0];

const declinedAtOf = async (id: string) =>
  (await sql`select declined_at from invitations where id = ${id}`)[0]?.declined_at as Date | null;

let coven: string;
beforeEach(async () => {
  await sql`truncate invitations`;
  coven = await insertCoven(`Fixture Coven ${Math.random().toString(36).slice(2)}`);
});

describe('revokeWorkspaceInvitation', () => {
  it('stamps revoked_at as the owner and keeps the row', async () => {
    const id = await insertInvitation(coven, 'pending');
    expect((await stateOf(id))?.revoked_at).toBeNull();

    const row = await revokeWorkspaceInvitation(asUser(A), coven, id);

    expect(row.id).toBe(id);
    expect(await stateOf(id)).toMatchObject({
      revoked_at: expect.any(Date),
      accepted_at: null,
      updated_by: A.id,
    });
  });

  it('refuses an accepted invitation with a ValidationError on id, leaving it accepted', async () => {
    const id = await insertInvitation(coven, 'accepted', 'accepted');

    const error = await revokeWorkspaceInvitation(asUser(A), coven, id).catch((e) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.issues[0].path).toEqual(['id']);
    expect(await stateOf(id)).toMatchObject({ revoked_at: null, accepted_at: expect.any(Date) });
  });

  it('answers a missing id, a malformed one, a revoked one and a lapsed one as not found', async () => {
    const revoked = await insertInvitation(coven, 'revoked', 'revoked');
    const expired = await insertInvitation(coven, 'expired', 'expired');

    for (const id of ['00000000-0000-4000-8000-000000000000', 'not-an-id', revoked, expired]) {
      await expect(revokeWorkspaceInvitation(asUser(A), coven, id)).rejects.toThrow(NotFound);
    }
  });

  it('refuses everyone but an owner, by direct id, while the invitation is there and pending', async () => {
    const id = await insertInvitation(coven, 'guarded');
    // Why each could have revoked it: it exists, pending, in this coven.
    expect(await stateOf(id)).toMatchObject({ revoked_at: null, accepted_at: null });

    for (const who of [B, C, D, E]) {
      await expect(revokeWorkspaceInvitation(asUser(who), coven, id)).rejects.toThrow(Forbidden);
    }
    expect((await stateOf(id))?.revoked_at).toBeNull();
  });

  it("does not reach another coven's invitation through one's own coven", async () => {
    const other = await insertCoven(`Fixture Coven Other ${Math.random().toString(36).slice(2)}`);
    const id = await insertInvitation(other, 'elsewhere');

    await expect(revokeWorkspaceInvitation(asUser(A), coven, id)).rejects.toThrow(NotFound);
    expect((await stateOf(id))?.revoked_at).toBeNull();
  });
});

// M10.34: a declined invitation is the invitee's answer, not a lapse. It stays on
// the owner's list, whatever its expiry, until the owner removes it, and Remove
// is the revoke.
describe('a declined invitation (M10.34)', () => {
  it('is listed and counted for the owner beside a pending one, and carries when it was declined', async () => {
    const pending = await insertInvitation(coven, 'pending', 'pending', A.id, 2);
    const declined = await insertInvitation(coven, 'declined', 'declined', A.id, 1);
    // Why it is the decline that keeps a row listed: a lapsed one is not.
    await insertInvitation(coven, 'lapsed', 'expired');

    const page = await listPendingWorkspaceInvitations(asUser(A), coven, FIRST_PAGE);

    expect(page.map(({ node }) => node.id)).toEqual([declined, pending]);
    expect(page[0]!.node.declinedAt).toBeInstanceOf(Date);
    expect(page[1]!.node.declinedAt).toBeNull();
    expect(await countPendingWorkspaceInvitations(asUser(A), coven, undefined)).toMatchObject({
      totalCount: 2,
    });
  });

  it('stays listed past its expiry, until the owner revokes it', async () => {
    const id = await insertInvitation(coven, 'declined', 'declined');
    await sql`update invitations set expires_at = now() - interval '1 day' where id = ${id}`;

    const before = await listPendingWorkspaceInvitations(asUser(A), coven, FIRST_PAGE);
    expect(before.map(({ node }) => node.id)).toEqual([id]);

    await revokeWorkspaceInvitation(asUser(A), coven, id);

    expect(await listPendingWorkspaceInvitations(asUser(A), coven, FIRST_PAGE)).toEqual([]);
    expect(await countPendingWorkspaceInvitations(asUser(A), coven, undefined)).toMatchObject({
      totalCount: 0,
    });
  });

  it('is removed by the owner’s revoke, which stamps revoked and keeps the decline', async () => {
    const id = await insertInvitation(coven, 'declined', 'declined');
    expect((await stateOf(id))?.revoked_at).toBeNull();

    const row = await revokeWorkspaceInvitation(asUser(A), coven, id);

    expect(row.id).toBe(id);
    expect(await stateOf(id)).toMatchObject({
      revoked_at: expect.any(Date),
      accepted_at: null,
      updated_by: A.id,
    });
    expect(await declinedAtOf(id)).toBeInstanceOf(Date);
    expect(await listPendingWorkspaceInvitations(asUser(A), coven, FIRST_PAGE)).toEqual([]);
  });

  it('is not reached through another coven', async () => {
    const other = await insertCoven(`Fixture Coven Other ${Math.random().toString(36).slice(2)}`);
    const id = await insertInvitation(other, 'declined', 'declined');

    await expect(revokeWorkspaceInvitation(asUser(A), coven, id)).rejects.toThrow(NotFound);
    expect((await stateOf(id))?.revoked_at).toBeNull();
    expect(await listPendingWorkspaceInvitations(asUser(A), coven, FIRST_PAGE)).toEqual([]);
  });

  it('answers a second removal as not found', async () => {
    const id = await insertInvitation(coven, 'declined', 'declined');
    await revokeWorkspaceInvitation(asUser(A), coven, id);

    await expect(revokeWorkspaceInvitation(asUser(A), coven, id)).rejects.toThrow(NotFound);
  });
});

describe('listPendingWorkspaceInvitations and countPendingWorkspaceInvitations', () => {
  it('give an owner the pending invitations newest first, and their count', async () => {
    const oldest = await insertInvitation(coven, 'oldest', 'pending', A.id, 3);
    const newest = await insertInvitation(coven, 'newest', 'pending', A.id, 1);
    const middle = await insertInvitation(coven, 'middle', 'pending', A.id, 2);
    await insertInvitation(coven, 'gone', 'revoked');
    await insertInvitation(coven, 'joined', 'accepted');
    await insertInvitation(coven, 'lapsed', 'expired');
    await insertInvitation(
      await insertCoven(`Fixture Coven Other ${Math.random().toString(36).slice(2)}`),
      'elsewhere',
    );

    const page = await listPendingWorkspaceInvitations(asUser(A), coven, FIRST_PAGE);

    expect(page.map(({ node }) => node.id)).toEqual([newest, middle, oldest]);
    expect(await countPendingWorkspaceInvitations(asUser(A), coven, undefined)).toMatchObject({
      totalCount: 3,
    });
    expect(await countPendingWorkspaceInvitations(asUser(A), coven, page[1]!.cursor)).toMatchObject(
      { totalCount: 3, countBefore: 1 },
    );
  });

  it('refuse a member, a viewer, another coven’s member and a site admin by direct workspace id', async () => {
    await insertInvitation(coven, 'private');
    // Why B could have read it: B holds `member: read` here, and the row is pending.
    expect(
      (
        await sql`select 1 from workspace_members where workspace_id = ${coven} and user_id = ${B.id} and role = 'member'`
      ).length,
    ).toBe(1);

    for (const who of [B, C, D, E]) {
      await expect(listPendingWorkspaceInvitations(asUser(who), coven, FIRST_PAGE)).rejects.toThrow(
        Forbidden,
      );
      await expect(countPendingWorkspaceInvitations(asUser(who), coven, undefined)).rejects.toThrow(
        Forbidden,
      );
    }
  });
});

describe('an invitation outlives its inviter', () => {
  it('stays pending, listed and revocable, after the inviter is demoted', async () => {
    await updateMemberRole(asUser(A), coven, B.id, 'owner');
    const id = await insertInvitation(coven, 'by-b', 'pending', B.id);
    await updateMemberRole(asUser(A), coven, B.id, 'member');

    const page = await listPendingWorkspaceInvitations(asUser(A), coven, FIRST_PAGE);
    expect(page.map(({ node }) => node.id)).toEqual([id]);
    await revokeWorkspaceInvitation(asUser(A), coven, id);
    expect((await stateOf(id))?.revoked_at).toEqual(expect.any(Date));
  });

  it('stays pending, listed and revocable, after the inviter is removed', async () => {
    await updateMemberRole(asUser(A), coven, B.id, 'owner');
    const id = await insertInvitation(coven, 'by-b', 'pending', B.id);
    await removeMember(asUser(A), coven, B.id);
    // Why it could have lapsed with B: B is gone from the roll, and the row names B.
    await expect(listPendingWorkspaceInvitations(asUser(B), coven, FIRST_PAGE)).rejects.toThrow(
      Forbidden,
    );

    const page = await listPendingWorkspaceInvitations(asUser(A), coven, FIRST_PAGE);
    expect(page.map(({ node }) => node.id)).toEqual([id]);
    await revokeWorkspaceInvitation(asUser(A), coven, id);
    expect((await stateOf(id))?.revoked_at).toEqual(expect.any(Date));
  });
});
