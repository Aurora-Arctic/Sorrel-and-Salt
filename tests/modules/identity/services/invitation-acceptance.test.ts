import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { withAudit } from '@/db/repository';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden, NotFound } from '@/lib/errors';
import {
  acceptInvitation,
  acceptInvitationById,
  declineInvitationById,
  invitationStanding,
  pauseAdminRoleChanges,
  resumeAdminRoleChanges,
} from '@/modules/identity';
import { users } from '@/modules/identity/schema/users';
import { A, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { asManualFix, refusalOf } from '../../../support/db/privileges';
import type { InvitationFixture, InvitationStateRow, PrivilegeChangeRow, RoleRow } from './types';

// MB.70: the one accept service, `acceptInvitation(session, token)`, with the
// site tier's branch; M7.5 adds the workspace's. Holding the token names the
// invitation, and the session's verified address is what admits: a matching
// unverified account is sent to the email page, a different address refused.
// The three dead-link checks run first, for both tiers, one reason per link.
// Accepting a site-tier invitation is an admin grant declared
// `via: 'invitation'` with the invitation's note, so the trigger on `users`
// records it (claude-docs/auth/admin-users.md, "Inviting an admin").

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const DOMAIN = '@invitation-acceptance.test';
const PRIMARY = '00000000-0000-0000-0000-0000000000c1';
const GRANTEE = '00000000-0000-0000-0000-0000000000c2';
const STRANGER = '00000000-0000-0000-0000-0000000000c3';
const PRIMARY_EMAIL = `primary${DOMAIN}`;
const INVITED = `grantee${DOMAIN}`;
const AS_PRIMARY = { id: PRIMARY, role: 'admin' as const };
const AS_GRANTEE = { id: GRANTEE, role: 'user' as const };
const AS_STRANGER = { id: STRANGER, role: 'user' as const };
const TOKEN = 'fixture-token-cccccccccccccccccccccccccccccccc';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

async function insertUser(
  id: string,
  email: string,
  role: 'user' | 'curator' | 'admin',
  verified = true,
) {
  await asManualFix(sql, async (tx) => {
    await tx`
      insert into users (id, name, email, email_verified, role, can_create_workspace, created_by, updated_by)
      values (${id}, 'Fixture Person', ${email}, ${verified}, ${role}, ${role !== 'user'}, ${id}, ${id})
    `;
  });
}

/** A site-tier invitation unless a workspace is named, pending unless a stamp is given. */
async function invite(fixture: InvitationFixture = {}): Promise<string> {
  const {
    email = INVITED,
    token = TOKEN,
    createdBy = E.id,
    note = 'Curates the resins',
    workspaceId = null,
    role = null,
    siteRole = workspaceId ? null : 'admin',
    expired = false,
    revoked = false,
    accepted = false,
  } = fixture;
  const [row] = await sql`
    insert into invitations (email, token_hash, note, workspace_id, role, site_role, created_by,
      updated_by, expires_at, revoked_at, accepted_at, accepted_by)
    values (${email}, ${sha256(token)}, ${note}, ${workspaceId}, ${role}, ${siteRole}, ${createdBy}, ${createdBy},
      ${expired ? sql`now() - interval '1 second'` : sql`now() + interval '7 days'`},
      ${revoked ? sql`now()` : null}, ${accepted ? sql`now()` : null}, ${accepted ? STRANGER : null})
    returning id
  `;
  return row.id as string;
}

async function invitation(): Promise<InvitationStateRow> {
  const [row] = await sql<InvitationStateRow[]>`
    select id, workspace_id, role::text, email, token_hash, note, accepted_at, accepted_by,
      revoked_at, expires_at, created_by, updated_by
    from invitations
  `;
  return row;
}

async function roleOf(id: string): Promise<RoleRow> {
  const [row] = await sql<RoleRow[]>`
    select role::text, can_create_workspace, updated_by from users where id = ${id}
  `;
  return row;
}

async function ledger(): Promise<PrivilegeChangeRow[]> {
  return sql<PrivilegeChangeRow[]>`
    select user_id, privilege::text, change::text, via::text, note, created_by, created_at
    from user_privilege_changes order by privilege
  `;
}

beforeEach(async () => {
  await sql`truncate invitations`;
  await sql`truncate admin_role_change_pauses`;
  await sql`truncate user_privilege_changes`;
  await sql`delete from workspace_members where user_id in (${GRANTEE}, ${STRANGER})`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;
  await asManualFix(sql, async (tx) => {
    await tx`update users set role = 'admin', can_create_workspace = true where id = ${E.id}`;
  });
  await insertUser(PRIMARY, PRIMARY_EMAIL, 'admin');
  await insertUser(GRANTEE, INVITED, 'user');
  await insertUser(STRANGER, `stranger${DOMAIN}`, 'user');
  await sql`truncate user_privilege_changes`;
  vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', PRIMARY_EMAIL);
});

afterEach(() => {
  vi.unstubAllEnvs();
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

  // The same write the service makes, undeclared: the trigger is what makes
  // the declaration necessary, not the service's habit.
  it('is a write the trigger refuses undeclared', async () => {
    const message = await refusalOf(
      withAudit(asUser(AS_GRANTEE), (write) =>
        write.updateById(users, GRANTEE, { role: 'admin', canCreateWorkspace: true }),
      ),
    );

    expect(message).toBe('a privilege change must declare its route');
    expect(await roleOf(GRANTEE)).toMatchObject({ role: 'user' });
  });

  // M11.20: an admin invitation sent to a curator's address makes them an
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

  // M11.20: a site invitation grants the role it names.
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

  describe('a coven’s invitation (M7.5)', () => {
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

    // The same checks as the site tier's, before the tier branch (MB.70): the
    // reader is not a member, so no message may name the coven (story 7).
    it.each([
      ['already accepted', { accepted: true }, 'accepted'],
      ['revoked', { revoked: true }, 'revoked'],
      ['expired', { expired: true }, 'expired'],
      ['expired and revoked', { expired: true, revoked: true }, 'revoked'],
    ] as const)(
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

    it('re-grants the flag to a person an admin revoked', async () => {
      // The revoke leaves it false and nothing marks it as revoked, so an
      // invitation vouches again (M5.8's recorded default).
      await asManualFix(sql, async (tx) => {
        await tx`update users set can_create_workspace = true where id = ${GRANTEE}`;
        await tx`update users set can_create_workspace = false where id = ${GRANTEE}`;
      });
      await invite({ workspaceId: WORKSPACE_W_ID, role: 'member', createdBy: A.id });

      await acceptInvitation(asUser(AS_GRANTEE), TOKEN);

      expect((await roleOf(GRANTEE)).can_create_workspace).toBe(true);
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

    it('leaves the inviter alone when the person is already seated', async () => {
      await sql`
        insert into workspace_members (workspace_id, user_id, role, invited_by, created_by, updated_by)
        values (${WORKSPACE_W_ID}, ${GRANTEE}, 'member', ${A.id}, ${A.id}, ${A.id})
      `;
      await invite({ workspaceId: WORKSPACE_W_ID, role: 'viewer', createdBy: PRIMARY });
      const before = await memberRows(GRANTEE);
      expect(before[0].invited_by).toBe(A.id);

      await acceptInvitation(asUser(AS_GRANTEE), TOKEN);

      expect(await memberRows(GRANTEE)).toEqual(before);
    });

    it('leaves a coven creator’s inviter empty', async () => {
      const [creator] = await sql`
        select invited_by from workspace_members
        where workspace_id = ${WORKSPACE_W_ID} and user_id = ${A.id}`;
      expect(creator.invited_by).toBeNull();
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

    it('names no coven in any refusal', async () => {
      await invite({ workspaceId: WORKSPACE_W_ID, role: 'member', createdBy: A.id });
      const [workspace] = await sql`select name from workspaces where id = ${WORKSPACE_W_ID}`;

      const standing = await invitationStanding(asUser(AS_STRANGER), TOKEN);
      expect(standing).toMatchObject({ acceptable: false });
      expect(JSON.stringify(standing)).not.toContain(workspace.name);
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

    it('cannot be made to seat an owner: the table refuses the role, and a tampered token finds nothing', async () => {
      await expect(
        invite({ workspaceId: WORKSPACE_W_ID, role: 'owner' as never, createdBy: A.id }),
      ).rejects.toThrow();
      await invite({ workspaceId: WORKSPACE_W_ID, role: 'member', createdBy: A.id });

      await expect(acceptInvitation(asUser(AS_GRANTEE), `${TOKEN}x`)).rejects.toThrow(NotFound);
      expect(await memberRows(GRANTEE)).toHaveLength(0);
    });
  });

  // The dead-link checks come before the tier, so they hold for a coven's too.
  it('rejects a revoked coven’s invitation as revoked, before its tier is read', async () => {
    await invite({ workspaceId: WORKSPACE_W_ID, role: 'member', createdBy: A.id, revoked: true });

    expect(await invitationStanding(asUser(AS_GRANTEE), TOKEN)).toMatchObject({
      reason: 'revoked',
    });
    await expect(acceptInvitation(asUser(AS_GRANTEE), TOKEN)).rejects.toThrow(Forbidden);
  });
});

describe('while admin changes are paused', () => {
  beforeEach(async () => {
    await pauseAdminRoleChanges(asUser(AS_PRIMARY));
  });

  // The pause holds every site role an invitation grants, the curator's too (M11.20).
  it.each(['admin', 'curator'] as const)(
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

// M10.32: the landing's accept, by the id `/coven` lists. The same checks and
// the same acceptance as the token's, over a read that is the session's own:
// each refusal sits beside the call that succeeds once its refusing fact is
// gone, so the fact is what refused.
describe('acceptInvitationById (M10.32)', () => {
  // An earlier test in this file deletes the coven and leaves it so.
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

  it('revives a removed member’s row, and leaves a live seat as it is', async () => {
    await sql`
      insert into workspace_members (workspace_id, user_id, role, deleted_at, deleted_by, created_by, updated_by)
      values (${WORKSPACE_W_ID}, ${GRANTEE}, 'owner', now(), ${A.id}, ${A.id}, ${A.id})
    `;
    const id = await inviteToW({ role: 'viewer' });

    await acceptInvitationById(asUser(AS_GRANTEE), id);

    expect(await memberRows(GRANTEE)).toMatchObject([{ role: 'viewer', deleted_at: null }]);

    const other = await inviteToW({ token: 'fixture-token-second', role: 'member' });
    const before = await memberRows(GRANTEE);
    await acceptInvitationById(asUser(AS_GRANTEE), other);
    expect(await memberRows(GRANTEE)).toEqual(before);
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

  it('answers NotFound to an unverified holder of the address, and accepts once it is verified', async () => {
    const id = await inviteToW();
    await sql`update users set email_verified = false where id = ${GRANTEE}`;

    await expect(acceptInvitationById(asUser(AS_GRANTEE), id)).rejects.toThrow(NotFound);
    expect((await stateOf(id)).accepted_at).toBeNull();

    await sql`update users set email_verified = true where id = ${GRANTEE}`;
    await expect(acceptInvitationById(asUser(AS_GRANTEE), id)).resolves.toMatchObject({ id });
  });

  // A sibling pending invitation stands in for "the same account, once the
  // dead fact is gone": it is accepted by id while the dead one is refused.
  it.each([
    ['already accepted', { accepted: true }],
    ['revoked', { revoked: true }],
    ['expired', { expired: true }],
  ] as const)('answers Forbidden to one %s, seating no one', async (_what, state) => {
    const dead = await inviteToW({ token: 'fixture-token-dead', ...state });
    const pending = await inviteToW({ token: 'fixture-token-pending' });

    await expect(acceptInvitationById(asUser(AS_GRANTEE), dead)).rejects.toThrow(Forbidden);
    expect(await memberRows(GRANTEE)).toHaveLength(0);
    expect((await roleOf(GRANTEE)).can_create_workspace).toBe(false);

    await expect(acceptInvitationById(asUser(AS_GRANTEE), pending)).resolves.toMatchObject({
      id: pending,
    });
    expect(await memberRows(GRANTEE)).toHaveLength(1);
  });

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

  it('answers NotFound for a deleted invitation row', async () => {
    const id = await inviteToW();
    await sql`update invitations set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;

    await expect(acceptInvitationById(asUser(AS_GRANTEE), id)).rejects.toThrow(NotFound);

    await sql`update invitations set deleted_at = null, deleted_by = null where id = ${id}`;
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

  it('names no coven in any refusal', async () => {
    const [{ name }] = await sql`select name from workspaces where id = ${WORKSPACE_W_ID}`;
    const sent = await inviteToW();
    const dead = await inviteToW({ token: 'fixture-token-dead', revoked: true });

    const strangers = await acceptInvitationById(asUser(AS_STRANGER), sent).catch(
      (e: unknown) => e,
    );
    const revoked = await acceptInvitationById(asUser(AS_GRANTEE), dead).catch((e: unknown) => e);

    expect(strangers).toBeInstanceOf(NotFound);
    expect(revoked).toBeInstanceOf(Forbidden);
    expect((strangers as Error).message).not.toContain(name as string);
    expect((revoked as Error).message).not.toContain(name as string);
  });
});

// M10.34: the account page's Decline. The same checks as the accept by id,
// over the session's own read, so each refusal sits beside the call that
// succeeds once its refusing fact is gone. A decline seats no one and grants
// nothing; it kills the invitation, which its link and both accepts then refuse.
describe('declineInvitationById (M10.34)', () => {
  beforeEach(async () => {
    await sql`update workspaces set deleted_at = null, deleted_by = null where id = ${WORKSPACE_W_ID}`;
  });

  const memberRows = (userId: string) =>
    sql`select role::text from workspace_members
      where workspace_id = ${WORKSPACE_W_ID} and user_id = ${userId}`;
  const stateOf = async (id: string) =>
    (await sql`select accepted_at, declined_at, revoked_at from invitations where id = ${id}`)[0]!;
  const inviteToW = (fixture: InvitationFixture = {}) =>
    invite({ workspaceId: WORKSPACE_W_ID, role: 'member', createdBy: A.id, ...fixture });
  const decline = (id: string) => sql`update invitations set declined_at = now() where id = ${id}`;

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

  it('answers NotFound to an unverified holder of the address, and declines once it is verified', async () => {
    const id = await inviteToW();
    await sql`update users set email_verified = false where id = ${GRANTEE}`;

    await expect(declineInvitationById(asUser(AS_GRANTEE), id)).rejects.toThrow(NotFound);
    expect((await stateOf(id)).declined_at).toBeNull();

    await sql`update users set email_verified = true where id = ${GRANTEE}`;
    await expect(declineInvitationById(asUser(AS_GRANTEE), id)).resolves.toMatchObject({ id });
  });

  it('answers NotFound for an admin invitation’s id, stamping nothing, and its link then accepts', async () => {
    const id = await invite();
    // Why the id could have been declined: pending, to this verified address, and a link accepts it.
    expect(await invitationStanding(asUser(AS_GRANTEE), TOKEN)).toEqual({
      acceptable: true,
      tier: 'site',
      siteRole: 'admin',
    });

    await expect(declineInvitationById(asUser(AS_GRANTEE), id)).rejects.toThrow(NotFound);

    expect((await stateOf(id)).declined_at).toBeNull();
    await acceptInvitation(asUser(AS_GRANTEE), TOKEN);
    expect(await roleOf(GRANTEE)).toMatchObject({ role: 'admin' });
  });

  it('answers NotFound for a deleted coven’s invitation, and declines while the coven is live', async () => {
    const id = await inviteToW();
    await sql`update workspaces set deleted_at = now(), deleted_by = ${A.id} where id = ${WORKSPACE_W_ID}`;
    try {
      await expect(declineInvitationById(asUser(AS_GRANTEE), id)).rejects.toThrow(NotFound);
      expect((await stateOf(id)).declined_at).toBeNull();
    } finally {
      await sql`update workspaces set deleted_at = null, deleted_by = null where id = ${WORKSPACE_W_ID}`;
    }

    await expect(declineInvitationById(asUser(AS_GRANTEE), id)).resolves.toMatchObject({ id });
  });

  it('answers NotFound for a deleted invitation row, and declines once it is restored', async () => {
    const id = await inviteToW();
    await sql`update invitations set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;

    await expect(declineInvitationById(asUser(AS_GRANTEE), id)).rejects.toThrow(NotFound);
    expect((await stateOf(id)).declined_at).toBeNull();

    await sql`update invitations set deleted_at = null, deleted_by = null where id = ${id}`;
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
  it.each([
    ['already accepted', { accepted: true }],
    ['revoked', { revoked: true }],
    ['expired', { expired: true }],
  ] as const)('answers Forbidden to one %s, stamping nothing', async (_what, state) => {
    const dead = await inviteToW({ token: 'fixture-token-dead', ...state });
    const pending = await inviteToW({ token: 'fixture-token-pending' });

    await expect(declineInvitationById(asUser(AS_GRANTEE), dead)).rejects.toThrow(Forbidden);
    expect((await stateOf(dead)).declined_at).toBeNull();

    await expect(declineInvitationById(asUser(AS_GRANTEE), pending)).resolves.toMatchObject({
      id: pending,
    });
  });

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

    it('is the same dead row once declined by SQL, which is what the accept refuses', async () => {
      const id = await inviteToW();
      await decline(id);

      await expect(acceptInvitationById(asUser(AS_GRANTEE), id)).rejects.toThrow(Forbidden);

      await sql`update invitations set declined_at = null where id = ${id}`;
      await expect(acceptInvitationById(asUser(AS_GRANTEE), id)).resolves.toMatchObject({ id });
    });
  });
});
