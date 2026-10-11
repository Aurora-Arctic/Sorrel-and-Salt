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

  // Until M7.5 adds the workspace branch: refused as an invalid link, joining
  // nothing and naming no coven, though the address matches and is verified.
  it('refuses a coven’s invitation as an invalid link, naming no coven', async () => {
    await invite({ email: A.email, workspaceId: WORKSPACE_W_ID, role: 'member', createdBy: A.id });
    await sql`update users set email_verified = true where id = ${A.id}`;
    const [workspace] = await sql`select name from workspaces where id = ${WORKSPACE_W_ID}`;

    const standing = await invitationStanding(asUser(A), TOKEN);
    expect(standing).toMatchObject({ acceptable: false, reason: 'invalid' });
    await expect(acceptInvitation(asUser(A), TOKEN)).rejects.toThrow(NotFound);
    expect(JSON.stringify(standing)).not.toContain(workspace.name);
    expect((await invitation()).accepted_at).toBeNull();
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
