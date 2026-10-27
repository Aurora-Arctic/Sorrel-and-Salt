import { describe, expect, it } from 'vitest';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden, NotFound } from '@/lib/errors';
import {
  acceptInvitation,
  acceptInvitationById,
  declineInvitationById,
  invitationStanding,
} from '@/modules/identity';
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

// M10.34: the account page's Decline. The same checks as the accept by id,
// over the session's own read, so each refusal sits beside the call that
// succeeds once its refusing fact is gone. A decline seats no one and grants
// nothing; it kills the invitation, which its link and both accepts then refuse.

let sql: postgres.Sql;
const { invite, roleOf, ledger } = setUpInvitationAcceptance((client) => {
  sql = client;
});

describe('declineInvitationById (M10.34)', () => {
  const memberRows = (userId: string) =>
    sql`select role::text from workspace_members
      where workspace_id = ${WORKSPACE_W_ID} and user_id = ${userId}`;
  const stateOf = async (id: string) =>
    (await sql`select accepted_at, declined_at, revoked_at from invitations where id = ${id}`)[0]!;
  const inviteToW = (fixture: InvitationFixture = {}) =>
    invite({ workspaceId: WORKSPACE_W_ID, role: 'member', createdBy: A.id, ...fixture });

  it('stamps the invitation declined, seating no one and granting no creation flag', async () => {
    const id = await inviteToW();
    expect((await stateOf(id)).declined_at).toBeNull();

    const declined = await declineInvitationById(asUser(AS_GRANTEE), id);

    expect(declined).toMatchObject({ id, workspaceId: WORKSPACE_W_ID, acceptedAt: null });
    expect(declined.declinedAt).toBeInstanceOf(Date);
    expect(declined.updatedBy).toBe(GRANTEE);
    expect(await stateOf(id)).toMatchObject({ accepted_at: null, revoked_at: null });
    expect((await stateOf(id)).declined_at).toBeInstanceOf(Date);
    expect(await memberRows(GRANTEE)).toHaveLength(0);
    expect((await roleOf(GRANTEE)).can_create_workspace).toBe(false);
    expect(await ledger()).toEqual([]);
  });

  it('answers NotFound to an account the invitation was not sent to, which leaves it pending for the one it was', async () => {
    const id = await inviteToW();
    // Why the stranger could have declined it: verified, signed in, and the id is right.
    expect(await roleOf(STRANGER)).toMatchObject({ role: 'user' });
    expect((await stateOf(id)).declined_at).toBeNull();

    await expect(declineInvitationById(asUser(AS_STRANGER), id)).rejects.toThrow(NotFound);

    expect((await stateOf(id)).declined_at).toBeNull();
    await expect(declineInvitationById(asUser(AS_GRANTEE), id)).resolves.toMatchObject({ id });
  });

  it('answers NotFound for a malformed or an unknown id, without a database error', async () => {
    await inviteToW();

    for (const id of ['not-a-uuid', '', '00000000-0000-4000-8000-000000000000']) {
      await expect(declineInvitationById(asUser(AS_GRANTEE), id)).rejects.toThrow(NotFound);
    }
  });

  // A sibling pending invitation stands in for "the same account, once the
  // dead fact is gone": it is declined while the dead one is refused.
  it.each([['revoked', { revoked: true }]] as const)(
    'answers Forbidden to one %s, stamping nothing',
    async (_what, state) => {
      const dead = await inviteToW({ token: 'fixture-token-dead', ...state });
      const pending = await inviteToW({ token: 'fixture-token-pending' });

      await expect(declineInvitationById(asUser(AS_GRANTEE), dead)).rejects.toThrow(Forbidden);
      expect((await stateOf(dead)).declined_at).toBeNull();

      await expect(declineInvitationById(asUser(AS_GRANTEE), pending)).resolves.toMatchObject({
        id: pending,
      });
    },
  );

  it('answers Forbidden to a second decline of the same id, which keeps the first stamp', async () => {
    const id = await inviteToW();
    const first = await declineInvitationById(asUser(AS_GRANTEE), id);
    const stamped = (await stateOf(id)).declined_at as Date;

    await expect(declineInvitationById(asUser(AS_GRANTEE), id)).rejects.toThrow(Forbidden);

    expect(stamped.getTime()).toBe(first.declinedAt?.getTime());
    expect((await stateOf(id)).declined_at).toEqual(stamped);
  });

  describe('a declined invitation', () => {
    it('reports its link declined, whatever else is true of it', async () => {
      const id = await inviteToW();
      expect(await invitationStanding(asUser(AS_GRANTEE), TOKEN)).toMatchObject({
        acceptable: true,
        tier: 'workspace',
      });

      await declineInvitationById(asUser(AS_GRANTEE), id);

      expect(await invitationStanding(asUser(AS_GRANTEE), TOKEN)).toMatchObject({
        acceptable: false,
        reason: 'declined',
      });
      // The invitee's answer beats the owner's Remove that may follow it, and the clock.
      await sql`update invitations set revoked_at = now(), expires_at = now() - interval '1 day' where id = ${id}`;
      expect(await invitationStanding(asUser(AS_GRANTEE), TOKEN)).toMatchObject({
        reason: 'declined',
      });
    });

    it('refuses the accept by link and the accept by id with Forbidden, seating no one', async () => {
      const id = await inviteToW();
      const sibling = await inviteToW({ token: 'fixture-token-sibling' });
      await declineInvitationById(asUser(AS_GRANTEE), id);

      await expect(acceptInvitation(asUser(AS_GRANTEE), TOKEN)).rejects.toThrow(Forbidden);
      await expect(acceptInvitationById(asUser(AS_GRANTEE), id)).rejects.toThrow(Forbidden);

      expect(await memberRows(GRANTEE)).toHaveLength(0);
      expect((await roleOf(GRANTEE)).can_create_workspace).toBe(false);
      expect((await stateOf(id)).accepted_at).toBeNull();
      // Why they could have accepted: the same account takes a pending sibling by id.
      await expect(acceptInvitationById(asUser(AS_GRANTEE), sibling)).resolves.toMatchObject({
        id: sibling,
      });
    });
  });
});
