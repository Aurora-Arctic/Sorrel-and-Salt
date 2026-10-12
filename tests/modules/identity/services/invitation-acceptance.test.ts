import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { withAudit } from '@/db/repository';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden, NotFound } from '@/lib/errors';
import {
  acceptInvitation,
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

async function insertUser(id: string, email: string, role: 'user' | 'admin', verified = true) {
  await asManualFix(sql, async (tx) => {
    await tx`
      insert into users (id, name, email, email_verified, role, can_create_workspace, created_by, updated_by)
      values (${id}, 'Fixture Person', ${email}, ${verified}, ${role}, ${role === 'admin'}, ${id}, ${id})
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
    expired = false,
    revoked = false,
    accepted = false,
  } = fixture;
  const [row] = await sql`
    insert into invitations (email, token_hash, note, workspace_id, role, created_by, updated_by,
      expires_at, revoked_at, accepted_at, accepted_by)
    values (${email}, ${sha256(token)}, ${note}, ${workspaceId}, ${role}, ${createdBy}, ${createdBy},
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

  it('stamps the invitation for an account already an admin, granting and recording nothing', async () => {
    await invite({ email: PRIMARY_EMAIL });

    await expect(acceptInvitation(asUser(AS_PRIMARY), TOKEN)).resolves.toMatchObject({
      acceptedAt: expect.any(Date),
    });
    expect(await invitation()).toMatchObject({ accepted_by: PRIMARY });
    expect(await ledger()).toEqual([]);
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
      sql`select role::text, joined_at, deleted_at from workspace_members
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

    it('refuses a deleted coven’s invitation at the standing, and the write backs it up', async () => {
      await invite({ workspaceId: WORKSPACE_W_ID, role: 'member', createdBy: A.id });
      await sql`update workspaces set deleted_at = now(), deleted_by = ${A.id} where id = ${WORKSPACE_W_ID}`;

      expect(await invitationStanding(asUser(AS_GRANTEE), TOKEN)).toMatchObject({
        acceptable: false,
        reason: 'invalid',
      });
      await expect(acceptInvitation(asUser(AS_GRANTEE), TOKEN)).rejects.toThrow(NotFound);
      expect((await invitation()).accepted_at).toBeNull();
      expect(await memberRows(GRANTEE)).toHaveLength(0);

      // The backstop: the repository's own write, past a standing that passed.
      await expect(
        withAudit(asUser(AS_GRANTEE), (write) => write.acceptInvitation(TOKEN)),
      ).resolves.toEqual([]);
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

  it('refuses another admin’s invitation, naming nobody, and accepts it once resumed', async () => {
    await invite({ createdBy: E.id });

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
  });

  // The primary admin is exempt from the pause, and its invitation with it.
  it('accepts the primary admin’s invitation', async () => {
    await invite({ createdBy: PRIMARY });

    await expect(acceptInvitation(asUser(AS_GRANTEE), TOKEN)).resolves.toMatchObject({
      acceptedAt: expect.any(Date),
    });
    expect(await roleOf(GRANTEE)).toMatchObject({ role: 'admin' });
  });
});
