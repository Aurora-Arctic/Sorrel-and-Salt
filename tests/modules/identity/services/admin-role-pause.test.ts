import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { Forbidden } from '@/lib/errors';
import { ADMIN_CHANGES_PAUSED_REFUSAL as PAUSED_REFUSAL } from '@/lib/primary-admin';
import {
  adminRoleChangePauseState,
  pauseAdminRoleChanges,
  resumeAdminRoleChanges,
  setUserRole,
} from '@/modules/identity';
import { A, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { asManualFix } from '../../../support/db/privileges';
import type { PauseRow } from './types';

// MB.63: the primary admin switches admin grants and revokes off for every
// other admin while a rogue one is dealt with, and back on. Only the primary
// admin may flip it, and only the primary admin is exempt from it
// (claude-docs/design-decisions/m2.9-granting-admin.md, "Granting";
// claude-docs/auth/admin-users.md, "Pausing admin changes").

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const DOMAIN = '@admin-role-pause.test';
const PRIMARY = '00000000-0000-0000-0000-0000000000a1';
const OTHER_ADMIN = '00000000-0000-0000-0000-0000000000a2';
const GRANTEE = '00000000-0000-0000-0000-0000000000a3';
const PRIMARY_EMAIL = `primary${DOMAIN}`;
const AS_PRIMARY = { id: PRIMARY, role: 'admin' as const };

async function insertUser(id: string, local: string, role: 'user' | 'admin'): Promise<void> {
  await asManualFix(sql, async (tx) => {
    await tx`
      insert into users (id, name, email, email_verified, role, can_create_workspace, created_by, updated_by)
      values (${id}, 'Fixture Person', ${`${local}${DOMAIN}`}, true, ${role}, ${role === 'admin'}, ${id}, ${id})
    `;
  });
}

beforeEach(async () => {
  await sql`truncate admin_role_change_pauses`;
  await sql`truncate user_privilege_changes`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;
  await asManualFix(sql, async (tx) => {
    await tx`update users set role = 'admin', can_create_workspace = true where id = ${E.id}`;
  });
  await insertUser(PRIMARY, 'primary', 'admin');
  await insertUser(OTHER_ADMIN, 'other', 'admin');
  await insertUser(GRANTEE, 'grantee', 'user');
  await sql`truncate user_privilege_changes`;
  vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', PRIMARY_EMAIL);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function pauses(): Promise<PauseRow[]> {
  return sql<PauseRow[]>`
    select created_by, updated_by, ended_by, ended_at is not null as ended
    from admin_role_change_pauses order by created_at
  `;
}

async function ledgerCount(): Promise<number> {
  const [{ count }] = await sql`select count(*)::int as count from user_privilege_changes`;
  return count as number;
}

async function roleOf(id: string): Promise<string> {
  const [row] = await sql`select role::text from users where id = ${id}`;
  return row.role as string;
}

describe('pauseAdminRoleChanges and resumeAdminRoleChanges', () => {
  it('lets the primary admin pause, stamped as it, and resume, stamping the end', async () => {
    expect(await adminRoleChangePauseState(asUser(AS_PRIMARY))).toEqual({
      paused: false,
      canToggle: true,
    });

    expect(await pauseAdminRoleChanges(asUser(AS_PRIMARY))).toBe(true);
    expect(await pauses()).toEqual([
      { created_by: PRIMARY, updated_by: PRIMARY, ended_by: null, ended: false },
    ]);
    expect(await adminRoleChangePauseState(asUser(E))).toEqual({ paused: true, canToggle: false });

    expect(await resumeAdminRoleChanges(asUser(AS_PRIMARY))).toBe(false);
    expect(await pauses()).toEqual([
      { created_by: PRIMARY, updated_by: PRIMARY, ended_by: PRIMARY, ended: true },
    ]);
  });

  // A double click answers the state rather than failing: the writer opens
  // at most one pause and ends only an open one.
  it('answers a second pause or resume with the state, opening or ending nothing more', async () => {
    await pauseAdminRoleChanges(asUser(AS_PRIMARY));
    expect(await pauseAdminRoleChanges(asUser(AS_PRIMARY))).toBe(true);
    expect(await pauses()).toHaveLength(1);

    await resumeAdminRoleChanges(asUser(AS_PRIMARY));
    expect(await resumeAdminRoleChanges(asUser(AS_PRIMARY))).toBe(false);
    expect(await pauses()).toHaveLength(1);
  });

  // E is a live admin who may grant, as the last line proves, so the refusal
  // is the primary admin's alone.
  it('refuses a non-primary admin as Forbidden, writing nothing', async () => {
    await expect(pauseAdminRoleChanges(asUser(E))).rejects.toThrow(Forbidden);
    await pauseAdminRoleChanges(asUser(AS_PRIMARY));
    await expect(resumeAdminRoleChanges(asUser(E))).rejects.toThrow(Forbidden);

    expect(await pauses()).toEqual([
      { created_by: PRIMARY, updated_by: PRIMARY, ended_by: null, ended: false },
    ]);
    await resumeAdminRoleChanges(asUser(AS_PRIMARY));
    await expect(setUserRole(asUser(E), GRANTEE, 'admin')).resolves.toMatchObject({
      role: 'admin',
    });
  });

  it('refuses every caller while the variable names no one', async () => {
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', `nobody${DOMAIN}`);

    await expect(pauseAdminRoleChanges(asUser(AS_PRIMARY))).rejects.toThrow(Forbidden);
    expect(await pauses()).toEqual([]);
  });

  // The site role is read first, so one non-admin stands for every one: A
  // owns a coven, which no workspace role turns into a site role.
  it('refuses a non-admin as Forbidden by direct call', async () => {
    expect(A.role).toBe('user');

    await expect(pauseAdminRoleChanges(asUser(A))).rejects.toThrow(Forbidden);
    await expect(resumeAdminRoleChanges(asUser(A))).rejects.toThrow(Forbidden);
    await expect(adminRoleChangePauseState(asUser(A))).rejects.toThrow(Forbidden);
    expect(await pauses()).toEqual([]);
  });

  // The stamps come from the session: the services take no other argument.
  it('takes no actor but the session', () => {
    expect(pauseAdminRoleChanges).toHaveLength(1);
    expect(resumeAdminRoleChanges).toHaveLength(1);
  });
});

describe('setUserRole while admin changes are paused', () => {
  beforeEach(async () => {
    await pauseAdminRoleChanges(asUser(AS_PRIMARY));
  });

  it.each([
    ['a grant', GRANTEE, 'admin' as const],
    ['a revoke', OTHER_ADMIN, 'user' as const],
  ])(
    'refuses %s by another admin, naming nobody, and records nothing',
    async (_what, target, role) => {
      const before = await roleOf(target);

      const refusal = setUserRole(asUser(E), target, role);

      await expect(refusal).rejects.toThrow(Forbidden);
      await expect(refusal).rejects.toThrow(PAUSED_REFUSAL);
      expect(await roleOf(target)).toBe(before);
      expect(await ledgerCount()).toBe(0);

      // The same call succeeds once resumed, so it was the pause.
      await resumeAdminRoleChanges(asUser(AS_PRIMARY));
      await expect(setUserRole(asUser(E), target, role)).resolves.toMatchObject({ role });
    },
  );

  it('lets the primary admin grant and revoke, each recorded as usual', async () => {
    await setUserRole(asUser(AS_PRIMARY), GRANTEE, 'admin');
    await setUserRole(asUser(AS_PRIMARY), OTHER_ADMIN, 'user');

    expect(await roleOf(GRANTEE)).toBe('admin');
    expect(await roleOf(OTHER_ADMIN)).toBe('user');
    const rows = await sql`
      select user_id, privilege::text, change::text, via::text, created_by
      from user_privilege_changes where privilege = 'admin' order by created_at
    `;
    expect(rows).toEqual([
      { user_id: GRANTEE, privilege: 'admin', change: 'grant', via: 'admin', created_by: PRIMARY },
      {
        user_id: OTHER_ADMIN,
        privilege: 'admin',
        change: 'revoke',
        via: 'admin',
        created_by: PRIMARY,
      },
    ]);
  });
});
