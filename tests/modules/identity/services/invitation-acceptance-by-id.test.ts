import { beforeEach, describe, expect, it } from 'vitest';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden, NotFound } from '@/lib/errors';
import { acceptInvitation, acceptInvitationById, invitationStanding } from '@/modules/identity';
import { A, asUser } from '../../../support/as-user';
import type postgres from 'postgres';
import type { InvitationFixture } from './types';
import {
  AS_GRANTEE,
  AS_STRANGER,
  GRANTEE,
  STRANGER,
  TOKEN,
  setUpInvitationAcceptance,
} from '../../../support/db/invitation-acceptance';

// The landing's accept, by the id `/coven` lists. The same checks and acceptance as the token's, over a read that is the session's own.
// Each refusal sits beside the call that succeeds once its refusing fact is gone, so the fact is what refused.

let sql: postgres.Sql;
const { invite, roleOf, ledger } = setUpInvitationAcceptance((client) => {
  sql = client;
});

describe('acceptInvitationById (M10.32)', () => {
  // The deleted-coven test below deletes the coven; each test starts with it live.
  beforeEach(async () => {
    await sql`update workspaces set deleted_at = null, deleted_by = null where id = ${WORKSPACE_W_ID}`;
  });

  const memberRows = (userId: string) =>
    sql`select role::text, deleted_at, invited_by from workspace_members
      where workspace_id = ${WORKSPACE_W_ID} and user_id = ${userId}`;
  const stateOf = async (id: string) =>
    (await sql`select accepted_at, accepted_by from invitations where id = ${id}`)[0]!;
  const inviteToW = (fixture: InvitationFixture = {}) =>
    invite({ workspaceId: WORKSPACE_W_ID, role: 'member', createdBy: A.id, ...fixture });

  it('seats the verified holder at the invited role, stamps the invitation and records the sender and the grant', async () => {
    const id = await inviteToW({ role: 'viewer' });
    expect(await memberRows(GRANTEE)).toHaveLength(0);
    expect((await roleOf(GRANTEE)).can_create_workspace).toBe(false);
    expect((await stateOf(id)).accepted_at).toBeNull();

    const accepted = await acceptInvitationById(asUser(AS_GRANTEE), id);

    expect(accepted).toMatchObject({ id, workspaceId: WORKSPACE_W_ID, acceptedBy: GRANTEE });
    expect(await memberRows(GRANTEE)).toMatchObject([
      { role: 'viewer', deleted_at: null, invited_by: A.id },
    ]);
    expect(await stateOf(id)).toMatchObject({ accepted_by: GRANTEE });
    expect(await roleOf(GRANTEE)).toMatchObject({ can_create_workspace: true });
    expect(await ledger()).toMatchObject([
      { user_id: GRANTEE, privilege: 'create_workspace', via: 'invitation', created_by: GRANTEE },
    ]);
  });

  it('answers NotFound to an account the invitation was not sent to, which leaves it pending for the one it was', async () => {
    const id = await inviteToW();
    // Why the stranger could have accepted it: verified, signed in, and the id is right.
    expect(await roleOf(STRANGER)).toMatchObject({ role: 'user' });
    expect((await stateOf(id)).accepted_at).toBeNull();

    await expect(acceptInvitationById(asUser(AS_STRANGER), id)).rejects.toThrow(NotFound);

    expect((await stateOf(id)).accepted_at).toBeNull();
    expect(await memberRows(STRANGER)).toHaveLength(0);
    await expect(acceptInvitationById(asUser(AS_GRANTEE), id)).resolves.toMatchObject({ id });
  });

  // A sibling pending invitation stands in for "the same account, once the
  // dead fact is gone": it is accepted by id while the dead one is refused.
  it.each([['revoked', { revoked: true }]] as const)(
    'answers Forbidden to one %s, seating no one',
    async (_what, state) => {
      const dead = await inviteToW({ token: 'fixture-token-dead', ...state });
      const pending = await inviteToW({ token: 'fixture-token-pending' });

      await expect(acceptInvitationById(asUser(AS_GRANTEE), dead)).rejects.toThrow(Forbidden);
      expect(await memberRows(GRANTEE)).toHaveLength(0);
      expect((await roleOf(GRANTEE)).can_create_workspace).toBe(false);

      await expect(acceptInvitationById(asUser(AS_GRANTEE), pending)).resolves.toMatchObject({
        id: pending,
      });
      expect(await memberRows(GRANTEE)).toHaveLength(1);
    },
  );

  it('answers Forbidden to a second use of the same id', async () => {
    const id = await inviteToW();
    await acceptInvitationById(asUser(AS_GRANTEE), id);

    await expect(acceptInvitationById(asUser(AS_GRANTEE), id)).rejects.toThrow(Forbidden);
  });

  it('answers NotFound for a deleted coven’s invitation, and accepts while the coven is live', async () => {
    const id = await inviteToW();
    await sql`update workspaces set deleted_at = now(), deleted_by = ${A.id} where id = ${WORKSPACE_W_ID}`;
    try {
      await expect(acceptInvitationById(asUser(AS_GRANTEE), id)).rejects.toThrow(NotFound);
      expect((await stateOf(id)).accepted_at).toBeNull();
    } finally {
      await sql`update workspaces set deleted_at = null, deleted_by = null where id = ${WORKSPACE_W_ID}`;
    }

    await expect(acceptInvitationById(asUser(AS_GRANTEE), id)).resolves.toMatchObject({ id });
  });

  it('answers NotFound for an admin invitation’s id, granting and recording nothing, and its link then accepts', async () => {
    const id = await invite();
    // Why the id could have admitted: pending, to this verified address, and a site tier a link accepts.
    expect(await invitationStanding(asUser(AS_GRANTEE), TOKEN)).toEqual({
      acceptable: true,
      tier: 'site',
      siteRole: 'admin',
    });

    await expect(acceptInvitationById(asUser(AS_GRANTEE), id)).rejects.toThrow(NotFound);

    expect(await roleOf(GRANTEE)).toMatchObject({ role: 'user', can_create_workspace: false });
    expect(await ledger()).toEqual([]);
    expect((await stateOf(id)).accepted_at).toBeNull();

    await acceptInvitation(asUser(AS_GRANTEE), TOKEN);
    expect(await roleOf(GRANTEE)).toMatchObject({ role: 'admin' });
  });

  it('answers NotFound for a malformed or an unknown id, without a database error', async () => {
    await inviteToW();

    for (const id of ['not-a-uuid', '', '00000000-0000-4000-8000-000000000000']) {
      await expect(acceptInvitationById(asUser(AS_GRANTEE), id)).rejects.toThrow(NotFound);
    }
  });
});
