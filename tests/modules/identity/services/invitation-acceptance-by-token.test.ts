import { beforeEach, describe, expect, it } from 'vitest';
import { withAudit } from '@/db/repository';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden, NotFound } from '@/lib/errors';
import {
  acceptInvitation,
  invitationStanding,
  pauseAdminRoleChanges,
  resumeAdminRoleChanges,
} from '@/modules/identity';
import { A, E, asUser } from '../../../support/as-user';
import { asManualFix } from '../../../support/db/privileges';
import type postgres from 'postgres';
import {
  AS_GRANTEE,
  AS_PRIMARY,
  AS_STRANGER,
  GRANTEE,
  INVITED,
  PRIMARY,
  PRIMARY_EMAIL,
  STRANGER,
  TOKEN,
  sha256,
  setUpInvitationAcceptance,
} from '../../../support/db/invitation-acceptance';

// The one accept service, `acceptInvitation(session, token)`, with the site tier's branch and the workspace's. Holding the token names the invitation, and the session's verified address is what admits: a matching unverified account is sent to the email page, a different address refused.
// The three dead-link checks run first, for both tiers, one reason per link.
// Accepting a site-tier invitation is an admin grant declared `via: 'invitation'` with the invitation's note, so the trigger on `users` records it (claude-docs/auth/admin-users.md, "Inviting an admin").

let sql: postgres.Sql;
const { invite, invitation, roleOf, ledger } = setUpInvitationAcceptance((client) => {
  sql = client;
});

describe('acceptInvitation, on the site tier', () => {
  it('makes the verified holder of the address an admin who may create covens, recorded via the invitation with its note', async () => {
    const id = await invite();
    expect(await roleOf(GRANTEE)).toMatchObject({ role: 'user', can_create_workspace: false });
    expect(await invitationStanding(asUser(AS_GRANTEE), TOKEN)).toEqual({
      acceptable: true,
      tier: 'site',
      siteRole: 'admin',
    });

    const acceptance = await acceptInvitation(asUser(AS_GRANTEE), TOKEN);

    expect(acceptance).toMatchObject({ id, workspaceId: null, acceptedBy: GRANTEE });
    expect(await roleOf(GRANTEE)).toEqual({
      role: 'admin',
      can_create_workspace: true,
      updated_by: GRANTEE,
    });
    expect(await invitation()).toMatchObject({ accepted_by: GRANTEE, updated_by: GRANTEE });
    expect((await invitation()).accepted_at).toBeInstanceOf(Date);
    // Both privileges at one instant, the accepting session the actor.
    const rows = await ledger();
    expect(rows).toEqual([
      expect.objectContaining({
        user_id: GRANTEE,
        privilege: 'admin',
        change: 'grant',
        via: 'invitation',
        note: 'Curates the resins',
        created_by: GRANTEE,
      }),
      expect.objectContaining({
        user_id: GRANTEE,
        privilege: 'create_workspace',
        change: 'grant',
        via: 'invitation',
        created_by: GRANTEE,
      }),
    ]);
  });

  it('matches the address case-insensitively', async () => {
    await invite({ email: INVITED.toUpperCase() });

    await expect(acceptInvitation(asUser(AS_GRANTEE), TOKEN)).resolves.toMatchObject({
      acceptedAt: expect.any(Date),
    });
  });

  it('records no creation grant for a user who already holds the flag', async () => {
    await asManualFix(sql, async (tx) => {
      await tx`update users set can_create_workspace = true where id = ${GRANTEE}`;
    });
    await sql`truncate user_privilege_changes`;
    await invite({ note: null });

    await acceptInvitation(asUser(AS_GRANTEE), TOKEN);

    expect(await ledger()).toEqual([
      expect.objectContaining({ privilege: 'admin', via: 'invitation', note: null }),
    ]);
  });

  // An admin invitation sent to a curator's address makes them an
  // admin, a revoke of curator and a grant of admin at one instant.
  it('makes a curator an admin, recorded as a curator revoke and an admin grant via the invitation', async () => {
    await asManualFix(sql, async (tx) => {
      await tx`update users set role = 'curator', can_create_workspace = true where id = ${GRANTEE}`;
    });
    await sql`truncate user_privilege_changes`;
    await invite();

    await acceptInvitation(asUser({ id: GRANTEE, role: 'curator' }), TOKEN);

    expect(await roleOf(GRANTEE)).toMatchObject({ role: 'admin', can_create_workspace: true });
    const rows = await ledger();
    expect(
      rows.map(({ privilege, change, via, note }) => ({ privilege, change, via, note })),
    ).toEqual([
      { privilege: 'admin', change: 'grant', via: 'invitation', note: 'Curates the resins' },
      { privilege: 'curator', change: 'revoke', via: 'invitation', note: 'Curates the resins' },
    ]);
    expect(rows[0]?.created_at).toEqual(rows[1]?.created_at);
  });

  it('stamps the invitation for an account already an admin, granting and recording nothing', async () => {
    await invite({ email: PRIMARY_EMAIL });

    await expect(acceptInvitation(asUser(AS_PRIMARY), TOKEN)).resolves.toMatchObject({
      acceptedAt: expect.any(Date),
    });
    expect(await invitation()).toMatchObject({ accepted_by: PRIMARY });
    expect(await ledger()).toEqual([]);
  });

  // A site invitation grants the role it names.
  describe('to the curator role', () => {
    it('makes the verified holder of the address a curator who may create covens, recorded via the invitation with its note', async () => {
      expect(await roleOf(GRANTEE)).toMatchObject({ role: 'user', can_create_workspace: false });
      await invite({ siteRole: 'curator' });
      expect(await invitationStanding(asUser(AS_GRANTEE), TOKEN)).toEqual({
        acceptable: true,
        tier: 'site',
        siteRole: 'curator',
      });

      await acceptInvitation(asUser(AS_GRANTEE), TOKEN);

      expect(await roleOf(GRANTEE)).toEqual({
        role: 'curator',
        can_create_workspace: true,
        updated_by: GRANTEE,
      });
      expect(await invitation()).toMatchObject({ accepted_by: GRANTEE });
      expect(
        (await ledger()).map(({ user_id, privilege, change, via, note }) => ({
          user_id,
          privilege,
          change,
          via,
          note,
        })),
      ).toEqual([
        {
          user_id: GRANTEE,
          privilege: 'create_workspace',
          change: 'grant',
          via: 'invitation',
          note: 'Curates the resins',
        },
        {
          user_id: GRANTEE,
          privilege: 'curator',
          change: 'grant',
          via: 'invitation',
          note: 'Curates the resins',
        },
      ]);
    });

    // The service refuses to send these; one that predates a promotion still
    // reaches its link, and accepting it never lowers the role.
    it.each([
      ['a curator', 'curator'],
      ['an admin', 'admin'],
    ] as const)(
      'stamps it for an account already %s, lowering and recording nothing',
      async (_holder, held) => {
        await asManualFix(sql, async (tx) => {
          await tx`update users set role = ${held}, can_create_workspace = true where id = ${GRANTEE}`;
        });
        await sql`truncate user_privilege_changes`;
        await invite({ siteRole: 'curator' });

        await acceptInvitation(asUser({ id: GRANTEE, role: held }), TOKEN);

        expect(await roleOf(GRANTEE)).toMatchObject({ role: held });
        expect(await invitation()).toMatchObject({ accepted_by: GRANTEE });
        expect(await ledger()).toEqual([]);
      },
    );
  });
});

describe('who may accept', () => {
  // The same session, unverified and then verified: the address alone admits.
  it('points the matching account at the email page while its address is unverified', async () => {
    await sql`update users set email_verified = false where id = ${GRANTEE}`;
    await invite();

    expect(await invitationStanding(asUser(AS_GRANTEE), TOKEN)).toMatchObject({
      acceptable: false,
      reason: 'unverified',
    });
    await expect(acceptInvitation(asUser(AS_GRANTEE), TOKEN)).rejects.toThrow(Forbidden);
    expect(await roleOf(GRANTEE)).toMatchObject({ role: 'user' });
    expect((await invitation()).accepted_at).toBeNull();

    await sql`update users set email_verified = true where id = ${GRANTEE}`;
    await expect(acceptInvitation(asUser(AS_GRANTEE), TOKEN)).resolves.toMatchObject({
      acceptedAt: expect.any(Date),
    });
  });

  // The stranger is verified and holds the token, so only the address refuses.
  it('refuses a verified account at a different address, which the invited one then accepts', async () => {
    await invite();

    expect(await invitationStanding(asUser(AS_STRANGER), TOKEN)).toMatchObject({
      reason: 'different-address',
    });
    await expect(acceptInvitation(asUser(AS_STRANGER), TOKEN)).rejects.toThrow(Forbidden);
    expect(await roleOf(STRANGER)).toMatchObject({ role: 'user' });
    expect((await invitation()).accepted_at).toBeNull();

    await expect(acceptInvitation(asUser(AS_GRANTEE), TOKEN)).resolves.toMatchObject({
      acceptedAt: expect.any(Date),
    });
  });
});

describe('a link that cannot be used', () => {
  it.each([
    ['already accepted', { accepted: true }, 'accepted'],
    ['revoked', { revoked: true }, 'revoked'],
    ['expired', { expired: true }, 'expired'],
  ] as const)(
    'rejects one %s, with a reason of its own, granting nothing',
    async (_what, state, reason) => {
      await invite(state);

      expect(await invitationStanding(asUser(AS_GRANTEE), TOKEN)).toMatchObject({
        acceptable: false,
        reason,
      });
      await expect(acceptInvitation(asUser(AS_GRANTEE), TOKEN)).rejects.toThrow(Forbidden);
      expect(await roleOf(GRANTEE)).toMatchObject({ role: 'user' });
      expect(await ledger()).toEqual([]);
    },
  );

  // An act beats the clock, and acceptance beats a revoke: one reason, always the same.
  it.each([
    ['expired and revoked', 'revoked', { expired: true, revoked: true }],
    ['expired and accepted', 'accepted', { expired: true, accepted: true }],
  ] as const)('reports one %s as %s', async (_what, reason, state) => {
    await invite(state);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect(await invitationStanding(asUser(AS_GRANTEE), TOKEN)).toMatchObject({ reason });
      await expect(acceptInvitation(asUser(AS_GRANTEE), TOKEN)).rejects.toThrow(Forbidden);
    }
  });

  it('rejects a second use as already accepted', async () => {
    await invite();
    await acceptInvitation(asUser(AS_GRANTEE), TOKEN);

    expect(await invitationStanding(asUser(AS_GRANTEE), TOKEN)).toMatchObject({
      reason: 'accepted',
    });
    await expect(acceptInvitation(asUser(AS_GRANTEE), TOKEN)).rejects.toThrow(Forbidden);
  });

  it('answers NotFound for a token naming none, and for the stored hash passed as a token', async () => {
    await invite();

    await expect(acceptInvitation(asUser(AS_GRANTEE), 'no-such-token')).rejects.toThrow(NotFound);
    await expect(acceptInvitation(asUser(AS_GRANTEE), sha256(TOKEN))).rejects.toThrow(NotFound);
    expect((await invitation()).accepted_at).toBeNull();
  });

  describe('a coven’s invitation', () => {
    const memberRows = (userId: string) =>
      sql`select role::text, joined_at, deleted_at, invited_by from workspace_members
        where workspace_id = ${WORKSPACE_W_ID} and user_id = ${userId}`;

    it('seats the person at the invited role, stamps the invitation and answers the coven’s slug', async () => {
      await invite({ workspaceId: WORKSPACE_W_ID, role: 'viewer', createdBy: A.id });
      const [{ slug, name }] =
        await sql`select slug, name from workspaces where id = ${WORKSPACE_W_ID}`;

      expect(await invitationStanding(asUser(AS_GRANTEE), TOKEN)).toEqual({
        acceptable: true,
        tier: 'workspace',
        slug,
        name,
      });
      expect(await memberRows(GRANTEE)).toHaveLength(0);

      await acceptInvitation(asUser(AS_GRANTEE), TOKEN);

      expect(await memberRows(GRANTEE)).toMatchObject([{ role: 'viewer', deleted_at: null }]);
      const stamped = await invitation();
      expect(stamped.accepted_by).toBe(GRANTEE);
      expect(stamped.accepted_at).not.toBeNull();
    });

    // The same checks as the site tier's, before the tier branch: the
    // reader is not a member, so no message may name the coven.
    it.each([['revoked', { revoked: true }, 'revoked']] as const)(
      'rejects one %s as %s, seating no one and naming no coven',
      async (_what, state, reason) => {
        await invite({ workspaceId: WORKSPACE_W_ID, role: 'member', createdBy: A.id, ...state });
        const [{ name }] = await sql`select name from workspaces where id = ${WORKSPACE_W_ID}`;

        const standing = await invitationStanding(asUser(AS_GRANTEE), TOKEN);

        expect(standing).toMatchObject({ acceptable: false, reason });
        expect(JSON.stringify(standing)).not.toContain(name as string);
        const error = await acceptInvitation(asUser(AS_GRANTEE), TOKEN).catch((e: unknown) => e);
        expect(error).toBeInstanceOf(Forbidden);
        expect((error as Error).message).not.toContain(name as string);
        expect(await memberRows(GRANTEE)).toHaveLength(0);
        expect((await roleOf(GRANTEE)).can_create_workspace).toBe(false);
      },
    );

    it('grants the creation flag, as one invitation-declared ledger row, for a viewer too', async () => {
      await invite({ workspaceId: WORKSPACE_W_ID, role: 'viewer', createdBy: A.id });
      expect((await roleOf(GRANTEE)).can_create_workspace).toBe(false);

      await acceptInvitation(asUser(AS_GRANTEE), TOKEN);

      expect(await roleOf(GRANTEE)).toMatchObject({ role: 'user', can_create_workspace: true });
      expect(await ledger()).toMatchObject([
        {
          user_id: GRANTEE,
          privilege: 'create_workspace',
          change: 'grant',
          via: 'invitation',
          created_by: GRANTEE,
        },
      ]);
    });

    it('records nothing when the person already holds the flag', async () => {
      await asManualFix(sql, async (tx) => {
        await tx`update users set can_create_workspace = true where id = ${GRANTEE}`;
      });
      await sql`truncate user_privilege_changes`;
      await invite({ workspaceId: WORKSPACE_W_ID, role: 'member', createdBy: A.id });

      await acceptInvitation(asUser(AS_GRANTEE), TOKEN);

      expect(await ledger()).toHaveLength(0);
    });

    it('revives a removed member’s row at the invited role, restarting joinedAt, with no second row', async () => {
      await sql`
        insert into workspace_members (workspace_id, user_id, role, joined_at, deleted_at, deleted_by, created_by, updated_by)
        values (${WORKSPACE_W_ID}, ${GRANTEE}, 'owner', '2020-01-01', now(), ${A.id}, ${A.id}, ${A.id})
      `;
      await invite({ workspaceId: WORKSPACE_W_ID, role: 'viewer', createdBy: A.id });

      await acceptInvitation(asUser(AS_GRANTEE), TOKEN);

      const rows = await memberRows(GRANTEE);
      expect(rows).toHaveLength(1);
      expect(rows[0].role).toBe('viewer');
      expect(rows[0].deleted_at).toBeNull();
      expect(new Date(rows[0].joined_at).getFullYear()).toBeGreaterThan(2020);
    });

    it('stamps the invitation for a live member and changes no membership row', async () => {
      await sql`
        insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
        values (${WORKSPACE_W_ID}, ${GRANTEE}, 'owner', ${A.id}, ${A.id})
      `;
      await invite({ workspaceId: WORKSPACE_W_ID, role: 'viewer', createdBy: A.id });
      const before = await memberRows(GRANTEE);

      const stamped = await acceptInvitation(asUser(AS_GRANTEE), TOKEN);

      expect(stamped.acceptedBy).toBe(GRANTEE);
      expect(await memberRows(GRANTEE)).toEqual(before);
      expect(before[0].role).toBe('owner');
    });

    it('records the invitation’s sender on a fresh membership', async () => {
      await invite({ workspaceId: WORKSPACE_W_ID, role: 'member', createdBy: A.id });
      expect(await memberRows(GRANTEE)).toHaveLength(0);

      await acceptInvitation(asUser(AS_GRANTEE), TOKEN);

      expect((await memberRows(GRANTEE))[0].invited_by).toBe(A.id);
    });

    it('overwrites a revived row’s inviter with the latest sender', async () => {
      await sql`
        insert into workspace_members (workspace_id, user_id, role, deleted_at, deleted_by, invited_by, created_by, updated_by)
        values (${WORKSPACE_W_ID}, ${GRANTEE}, 'member', now(), ${A.id}, ${A.id}, ${A.id}, ${A.id})
      `;
      // The precondition: the removed row names A, so a changed value is the revival’s doing.
      expect((await memberRows(GRANTEE))[0].invited_by).toBe(A.id);
      await invite({ workspaceId: WORKSPACE_W_ID, role: 'viewer', createdBy: PRIMARY });

      await acceptInvitation(asUser(AS_GRANTEE), TOKEN);

      const rows = await memberRows(GRANTEE);
      expect(rows).toHaveLength(1);
      expect(rows[0].invited_by).toBe(PRIMARY);
    });

    it('refuses an unverified matching account and a different verified one, so the match admits', async () => {
      await invite({ workspaceId: WORKSPACE_W_ID, role: 'member', createdBy: A.id });
      await sql`update users set email_verified = false where id = ${GRANTEE}`;
      expect(await invitationStanding(asUser(AS_GRANTEE), TOKEN)).toMatchObject({
        reason: 'unverified',
      });
      await expect(acceptInvitation(asUser(AS_GRANTEE), TOKEN)).rejects.toThrow(Forbidden);

      expect(await invitationStanding(asUser(AS_STRANGER), TOKEN)).toMatchObject({
        reason: 'different-address',
      });
      await expect(acceptInvitation(asUser(AS_STRANGER), TOKEN)).rejects.toThrow(Forbidden);
      expect(await memberRows(GRANTEE)).toHaveLength(0);
      expect((await invitation()).accepted_at).toBeNull();
    });

    it('refuses a deleted coven’s invitation as closed at the standing, and the write backs it up', async () => {
      await invite({ workspaceId: WORKSPACE_W_ID, role: 'member', createdBy: A.id });
      // Why it could have succeeded: the link is unexpired, unrevoked,
      // unaccepted and for the signed-in address, so it is acceptable until
      // the coven is deleted, and only that accounts for the refusal below.
      expect(await invitationStanding(asUser(AS_GRANTEE), TOKEN)).toMatchObject({
        acceptable: true,
        tier: 'workspace',
      });
      await sql`update workspaces set deleted_at = now(), deleted_by = ${A.id} where id = ${WORKSPACE_W_ID}`;

      expect(await invitationStanding(asUser(AS_GRANTEE), TOKEN)).toMatchObject({
        acceptable: false,
        reason: 'closed',
      });
      await expect(acceptInvitation(asUser(AS_GRANTEE), TOKEN)).rejects.toThrow(Forbidden);
      expect((await invitation()).accepted_at).toBeNull();
      expect(await memberRows(GRANTEE)).toHaveLength(0);

      // The backstop: the repository's own write, past a standing that passed.
      await expect(
        withAudit(asUser(AS_GRANTEE), (write) => write.acceptInvitation(TOKEN)),
      ).resolves.toEqual([]);
    });

    it('reports a link in two states as the earlier one: accepted before closed', async () => {
      await invite({
        workspaceId: WORKSPACE_W_ID,
        role: 'member',
        createdBy: A.id,
        accepted: true,
      });
      await sql`update workspaces set deleted_at = now(), deleted_by = ${A.id} where id = ${WORKSPACE_W_ID}`;

      expect(await invitationStanding(asUser(AS_GRANTEE), TOKEN)).toMatchObject({
        reason: 'accepted',
      });
    });

    it('tells another address nothing of the deleted coven', async () => {
      await invite({ workspaceId: WORKSPACE_W_ID, role: 'member', createdBy: A.id });
      await sql`update workspaces set deleted_at = now(), deleted_by = ${A.id} where id = ${WORKSPACE_W_ID}`;

      expect(await invitationStanding(asUser(AS_STRANGER), TOKEN)).toMatchObject({
        reason: 'different-address',
      });
    });
  });
});

describe('while admin changes are paused', () => {
  beforeEach(async () => {
    await pauseAdminRoleChanges(asUser(AS_PRIMARY));
  });

  // The pause holds every site role an invitation grants, the curator's too.
  it.each(['admin'] as const)(
    'refuses another admin’s invitation to %s, naming nobody, and accepts it once resumed',
    async (siteRole) => {
      await invite({ createdBy: E.id, siteRole });

      expect(await invitationStanding(asUser(AS_GRANTEE), TOKEN)).toMatchObject({
        reason: 'paused',
      });
      await expect(acceptInvitation(asUser(AS_GRANTEE), TOKEN)).rejects.toThrow(Forbidden);
      expect(await roleOf(GRANTEE)).toMatchObject({ role: 'user' });
      expect((await invitation()).accepted_at).toBeNull();

      await resumeAdminRoleChanges(asUser(AS_PRIMARY));
      await expect(acceptInvitation(asUser(AS_GRANTEE), TOKEN)).resolves.toMatchObject({
        acceptedAt: expect.any(Date),
      });
      expect(await roleOf(GRANTEE)).toMatchObject({ role: siteRole });
    },
  );

  // The primary admin is exempt from the pause, and its invitation with it.
  it('accepts the primary admin’s invitation', async () => {
    await invite({ createdBy: PRIMARY });

    await expect(acceptInvitation(asUser(AS_GRANTEE), TOKEN)).resolves.toMatchObject({
      acceptedAt: expect.any(Date),
    });
    expect(await roleOf(GRANTEE)).toMatchObject({ role: 'admin' });
  });
});
