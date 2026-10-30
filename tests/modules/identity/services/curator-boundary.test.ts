import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { invitationSender } from '@/lib/invitation-mail';
import type { Session } from '@/lib/session';
import type { Message, PageRequest } from '@/lib/types';
import {
  createInvitation,
  countPendingWorkspaceInvitations,
  listPendingWorkspaceInvitations,
  membershipsOf,
  revokeWorkspaceInvitation,
} from '@/modules/coven';
import {
  adminRoleChangePauseState,
  assertCurator,
  countPendingAdminInvitations,
  countPrivilegeChanges,
  countUsers,
  createAdminInvitation,
  grantWorkspaceCreation,
  listPendingAdminInvitations,
  listPrivilegeChanges,
  listUsers,
  pauseAdminRoleChanges,
  providersOf,
  resumeAdminRoleChanges,
  revokeAdminInvitation,
  revokeWorkspaceCreation,
  setUserRole,
  usersForAdmin,
} from '@/modules/identity';
import { A, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { asManualFix } from '../../../support/db/privileges';

// A curator curates the compendium and reaches nothing on the people page. Each row is called by direct id, as a forged request would call it, so the menu hiding People is not what refuses.
// Each refusal is proven against the same call succeeding for the caller it is meant for, and F is proven to pass the curation check, so a row stays green only while the people page's own guard refuses a curator
// (claude-docs/design-decisions/m11.20-curator-role.md).

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>(async () => {}));
vi.mock('@/lib/mail', () => ({ send }));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const DOMAIN = '@curator-boundary.test';
const PLAIN = '00000000-0000-0000-0000-0000000000e1';
const ORIGIN = 'http://localhost:8000';
const PAGE: PageRequest = { limit: 101, inverted: false };

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const sender = () => invitationSender(new Request(`${ORIGIN}/api/graphql`, { method: 'POST' }));

let adminInvitationId: string;
let covenInvitationId: string;

/** A pending invitation, inserted as the seed would; site tier unless a coven is named. */
async function invite(email: string, by: string, workspaceId: string | null): Promise<string> {
  const [row] = await sql`
    insert into invitations (email, token_hash, workspace_id, role, site_role, created_by, updated_by, expires_at)
    values (${email}, ${sha256(email)}, ${workspaceId}, ${workspaceId ? 'viewer' : null},
      ${workspaceId ? null : 'admin'}::user_role,
      ${by}, ${by}, now() + interval '7 days')
    returning id
  `;
  return row.id as string;
}

beforeEach(async () => {
  await sql`truncate invitations`;
  await sql`truncate admin_role_change_pauses`;
  await sql`truncate user_privilege_changes`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;
  await asManualFix(sql, async (tx) => {
    await tx`update users set role = 'admin', can_create_workspace = true where id = ${E.id}`;
    await tx`update users set role = 'curator', can_create_workspace = true where id = ${F.id}`;
    await tx`update users set can_create_workspace = true where id = ${A.id}`;
  });
  await sql`
    insert into users (id, name, email, email_verified, can_create_workspace, created_by, updated_by)
    values (${PLAIN}, 'Plain Fixturewort', ${`plain${DOMAIN}`}, true, false, ${PLAIN}, ${PLAIN})
  `;
  adminInvitationId = await invite(`pending${DOMAIN}`, E.id, null);
  covenInvitationId = await invite(`pending-coven${DOMAIN}`, A.id, WORKSPACE_W_ID);
  // E as the primary admin, so the pause and its resume answer E too.
  const [{ email }] = await sql`select email from users where id = ${E.id}`;
  vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', email as string);
  send.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

type Call = (session: Session) => Promise<unknown>;

// Every people-page service that throws. Each row's state is set above so
// E's call succeeds: PLAIN holds no role and no flag, A holds the flag, and
// one admin invitation is pending.
const PEOPLE_PAGE: [string, Call][] = [
  ['listUsers', (session) => listUsers(session, {}, PAGE)],
  ['countUsers', (session) => countUsers(session, {}, undefined)],
  ['setUserRole', (session) => setUserRole(session, PLAIN, 'curator')],
  ['grantWorkspaceCreation', (session) => grantWorkspaceCreation(session, PLAIN)],
  ['revokeWorkspaceCreation', (session) => revokeWorkspaceCreation(session, A.id)],
  ['adminRoleChangePauseState', (session) => adminRoleChangePauseState(session)],
  ['pauseAdminRoleChanges', (session) => pauseAdminRoleChanges(session)],
  ['resumeAdminRoleChanges', (session) => resumeAdminRoleChanges(session)],
  ['listPrivilegeChanges', (session) => listPrivilegeChanges(session, {}, PAGE)],
  ['countPrivilegeChanges', (session) => countPrivilegeChanges(session, {}, undefined)],
  [
    'createAdminInvitation',
    (session) => createAdminInvitation(session, `invited${DOMAIN}`, 'admin', undefined, sender()),
  ],
  ['revokeAdminInvitation', (session) => revokeAdminInvitation(session, adminInvitationId)],
  ['listPendingAdminInvitations', (session) => listPendingAdminInvitations(session, {}, PAGE)],
  [
    'countPendingAdminInvitations',
    (session) => countPendingAdminInvitations(session, {}, undefined),
  ],
];

// One user's details, read in batches that answer a refusal in the user's
// place rather than throwing.
const DETAILS: [string, (session: Session) => Promise<unknown[]>][] = [
  ['usersForAdmin', (session) => usersForAdmin(session, [A.id])],
  ['providersOf', (session) => providersOf(session, [A.id])],
  ['membershipsOf, the covens a user is in', (session) => membershipsOf(session, [A.id])],
];

// A coven's invitations are its owner's, and F holds no seat in W.
const COVEN_INVITATIONS: [string, Call][] = [
  [
    'createInvitation',
    (session) =>
      createInvitation(
        session,
        WORKSPACE_W_ID,
        { email: `invited-coven${DOMAIN}`, role: 'viewer' },
        sender(),
      ),
  ],
  [
    'listPendingWorkspaceInvitations',
    (session) => listPendingWorkspaceInvitations(session, WORKSPACE_W_ID, PAGE),
  ],
  [
    'countPendingWorkspaceInvitations',
    (session) => countPendingWorkspaceInvitations(session, WORKSPACE_W_ID, undefined),
  ],
  [
    'revokeWorkspaceInvitation',
    (session) => revokeWorkspaceInvitation(session, WORKSPACE_W_ID, covenInvitationId),
  ],
];

describe('a curator on the people page', () => {
  it('is a curator: F passes the curation check', () => {
    expect(F.role).toBe('curator');
    expect(assertCurator(asUser(F))).toMatchObject({ userId: F.id });
  });

  it.each(PEOPLE_PAGE)(
    '%s refuses a curator as Forbidden, and answers an admin',
    async (_service, call) => {
      expect(assertCurator(asUser(F))).toMatchObject({ userId: F.id });

      await expect(call(asUser(F))).rejects.toThrow(Forbidden);

      await expect(call(asUser(E))).resolves.toBeDefined();
    },
  );

  it.each(DETAILS)(
    '%s answers a curator Forbidden for another user, and an admin the user',
    async (_service, call) => {
      expect(assertCurator(asUser(F))).toMatchObject({ userId: F.id });

      const [refused] = await call(asUser(F));
      expect(refused).toBeInstanceOf(Forbidden);

      const [answered] = await call(asUser(E));
      expect(answered).not.toBeInstanceOf(Error);
      expect(answered).not.toBeNull();
    },
  );

  it.each(COVEN_INVITATIONS)(
    '%s refuses a curator as Forbidden, and answers the coven’s owner',
    async (_service, call) => {
      expect(assertCurator(asUser(F))).toMatchObject({ userId: F.id });

      await expect(call(asUser(F))).rejects.toThrow(Forbidden);

      await expect(call(asUser(A))).resolves.toBeDefined();
    },
  );

  it('writes nothing for a curator’s refused writes', async () => {
    const before = await sql`select id, role::text, can_create_workspace from users order by id`;

    for (const [, call] of [...PEOPLE_PAGE, ...COVEN_INVITATIONS]) {
      await call(asUser(F)).catch(() => undefined);
    }

    expect(await sql`select id, role::text, can_create_workspace from users order by id`).toEqual(
      before,
    );
    expect(await sql`select count(*)::int as count from user_privilege_changes`).toEqual([
      { count: 0 },
    ]);
    expect(await sql`select count(*)::int as count from admin_role_change_pauses`).toEqual([
      { count: 0 },
    ]);
    expect(
      await sql`select count(*)::int as count from invitations where revoked_at is not null`,
    ).toEqual([{ count: 0 }]);
    expect(await sql`select count(*)::int as count from invitations`).toEqual([{ count: 2 }]);
    expect(send).not.toHaveBeenCalled();
  });
});
