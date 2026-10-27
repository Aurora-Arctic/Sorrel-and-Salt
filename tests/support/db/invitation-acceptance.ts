import { createHash } from 'node:crypto';
import { afterEach, beforeEach, vi } from 'vitest';
import type postgres from 'postgres';
import { E } from '../as-user';
import { asManualFix } from './privileges';
import { useTestDatabase } from './database';
import type {
  InvitationFixture,
  InvitationStateRow,
  PrivilegeChangeRow,
  RoleRow,
} from '../../modules/identity/services/types';

// The setup the three entry points share, accepting by token, accepting by id
// and declining (invitation-acceptance-by-token, -by-id and invitation-decline):
// the cast of invented accounts, the invitation inserter, and the reads of what
// a call left. Each file keeps its own `sql`, handed back through `onClient`,
// for its own queries.

export const DOMAIN = '@invitation-acceptance.test';
export const PRIMARY = '00000000-0000-0000-0000-0000000000c1';
export const GRANTEE = '00000000-0000-0000-0000-0000000000c2';
export const STRANGER = '00000000-0000-0000-0000-0000000000c3';
export const PRIMARY_EMAIL = `primary${DOMAIN}`;
export const INVITED = `grantee${DOMAIN}`;
export const AS_PRIMARY = { id: PRIMARY, role: 'admin' as const };
export const AS_GRANTEE = { id: GRANTEE, role: 'user' as const };
export const AS_STRANGER = { id: STRANGER, role: 'user' as const };
export const TOKEN = 'fixture-token-cccccccccccccccccccccccccccccccc';

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export function setUpInvitationAcceptance(onClient: (client: postgres.Sql) => void) {
  let sql!: postgres.Sql;
  useTestDatabase((client) => {
    sql = client;
    onClient(client);
  });

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

  return { invite, invitation, roleOf, ledger };
}
