import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, NotFound } from '@/lib/errors';
import { PRIMARY_ADMIN_REFUSAL } from '@/lib/primary-admin';
import { withAudit } from '@/db/repository';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { users } from '@/modules/identity/schema/users';
import { setUserRole } from '@/modules/identity';
import { A, B, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { asManualFix, refusalOf } from '../../../support/db/privileges';
import { makeIngredient } from '../../../support/fixtures/ingredient';
import type { PrivilegeChangeRow, RoleRow } from './types';

// MB.59: an admin makes a user an admin, or stops one being one, from
// `/admin/users`, declared `via: 'admin'` so the trigger on `users` records
// each change in the privilege ledger (MB.195). The primary admin, named by
// ADMIN_BOOTSTRAP_EMAIL when the check runs, cannot be revoked, and a count
// under a lock refuses leaving no admin at all
// (claude-docs/design-decisions/m2.9-granting-admin.md, "Granting" and "Revoking").

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const DOMAIN = '@user-role.test';
// Invented accounts beside the cast: one who may not create a coven and has
// not verified their address, one who may, a second admin, the address the
// variable names, and one soft-deleted.
const PLAIN = '00000000-0000-0000-0000-0000000000d1';
const APPROVED = '00000000-0000-0000-0000-0000000000d2';
const OTHER_ADMIN = '00000000-0000-0000-0000-0000000000d3';
const PRIMARY = '00000000-0000-0000-0000-0000000000d4';
const DELETED = '00000000-0000-0000-0000-0000000000d5';
const NOWHERE = '00000000-0000-0000-0000-0000000000d9';
const PRIMARY_EMAIL = `owner${DOMAIN}`;

/** Inserts a user on this file's domain; an admin is declared as a `psql` fix declares one. */
async function insertUser(
  id: string,
  name: string,
  email: string,
  {
    role = 'user',
    canCreateWorkspace = role === 'admin',
    emailVerified = true,
    deleted = false,
  }: {
    role?: 'user' | 'admin';
    canCreateWorkspace?: boolean;
    emailVerified?: boolean;
    deleted?: boolean;
  } = {},
): Promise<void> {
  await asManualFix(sql, async (tx) => {
    await tx`
      insert into users (id, name, email, email_verified, role, can_create_workspace, created_by, updated_by, deleted_at, deleted_by)
      values (${id}, ${name}, ${email}, ${emailVerified}, ${role}, ${canCreateWorkspace}, ${id}, ${id},
        ${deleted ? new Date() : null}, ${deleted ? id : null})
    `;
  });
}

beforeEach(async () => {
  // The ledger first, since its rows name the users deleted below; then E,
  // A and B back as the seed made them, as a `psql` fix would put them.
  await sql`truncate user_privilege_changes`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;
  await asManualFix(sql, async (tx) => {
    await tx`update users set role = 'admin', can_create_workspace = true where id = ${E.id}`;
    await tx`update users set role = 'user', can_create_workspace = true where id in (${A.id}, ${B.id})`;
  });
  await insertUser(PLAIN, 'Plain Fixturewort', `plain${DOMAIN}`, { emailVerified: false });
  await insertUser(APPROVED, 'Approved Fixturewort', `approved${DOMAIN}`, {
    canCreateWorkspace: true,
  });
  await insertUser(DELETED, 'Lapsed Fixturewort', `lapsed${DOMAIN}`, { deleted: true });
  await sql`truncate user_privilege_changes`;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/** The ledger, oldest first, the enums cast to text. */
async function changes(): Promise<PrivilegeChangeRow[]> {
  return sql<PrivilegeChangeRow[]>`
    select user_id, privilege::text, change::text, via::text, note, created_by, created_at
    from user_privilege_changes
    order by created_at, privilege, id
  `;
}

async function roleOf(id: string): Promise<RoleRow> {
  const [row] = await sql<RoleRow[]>`
    select role::text, can_create_workspace, updated_by from users where id = ${id}
  `;
  if (!row) throw new Error(`No users row ${id}`);
  return row;
}

async function liveAdmins(): Promise<string[]> {
  const rows = await sql<{ id: string }[]>`
    select id from users where role = 'admin' and deleted_at is null order by id
  `;
  return rows.map((row) => row.id);
}

describe('setUserRole, granting', () => {
  it('makes a user an admin, setting the creation flag in the same write, stamped as the admin', async () => {
    expect(await roleOf(PLAIN)).toEqual({
      role: 'user',
      can_create_workspace: false,
      updated_by: PLAIN,
    });

    const user = await setUserRole(asUser(E), PLAIN, 'admin');

    expect(user).toMatchObject({ id: PLAIN, role: 'admin', canCreateWorkspace: true });
    expect(await roleOf(PLAIN)).toEqual({
      role: 'admin',
      can_create_workspace: true,
      updated_by: E.id,
    });
  });

  it('records a grant to a user without the flag as two rows at one instant, by the admin, with the reason', async () => {
    await setUserRole(asUser(E), PLAIN, 'admin', 'Curates the deity list');

    const rows = await changes();
    expect(rows.map(({ created_at: _at, ...row }) => row)).toEqual([
      {
        user_id: PLAIN,
        privilege: 'admin',
        change: 'grant',
        via: 'admin',
        note: 'Curates the deity list',
        created_by: E.id,
      },
      {
        user_id: PLAIN,
        privilege: 'create_workspace',
        change: 'grant',
        via: 'admin',
        note: 'Curates the deity list',
        created_by: E.id,
      },
    ]);
    expect(rows[0]?.created_at).toEqual(rows[1]?.created_at);
  });

  it('records a grant to a user who holds the flag as the admin row alone, a blank reason as none', async () => {
    expect(await roleOf(APPROVED)).toMatchObject({ can_create_workspace: true });

    await setUserRole(asUser(E), APPROVED, 'admin', '  ');

    expect((await changes()).map(({ created_at: _at, ...row }) => row)).toEqual([
      {
        user_id: APPROVED,
        privilege: 'admin',
        change: 'grant',
        via: 'admin',
        note: null,
        created_by: E.id,
      },
    ]);
  });

  // Confirming who someone is is the granting admin's job (M2.9).
  it('grants to a user whose email is unverified', async () => {
    const [{ email_verified }] = await sql`select email_verified from users where id = ${PLAIN}`;
    expect(email_verified).toBe(false);

    await expect(setUserRole(asUser(E), PLAIN, 'admin')).resolves.toMatchObject({
      role: 'admin',
    });
  });

  // The service writes no ledger row: the same write undeclared is refused,
  // so the rows above are the trigger's.
  it('is recorded by the trigger, which refuses the same write undeclared', async () => {
    const undeclared = withAudit(asUser(E), (write) =>
      write.updateById(users, PLAIN, { role: 'admin', canCreateWorkspace: true }),
    );

    expect(await refusalOf(undeclared)).toBe('a privilege change must declare its route');
    expect(await roleOf(PLAIN)).toMatchObject({ role: 'user' });
    expect(await changes()).toEqual([]);
  });

  it('refuses an existing admin, writing no ledger row', async () => {
    await expect(setUserRole(asUser(E), E.id, 'admin')).rejects.toThrow(Forbidden);
    expect(await changes()).toEqual([]);
  });

  // The check reads the site role alone, so one non-admin stands for every
  // one: A owns a coven and may create more. E's same call on the same row
  // succeeds, so a pass here is the role refusing.
  it('refuses a non-admin as Forbidden by direct call, writing nothing', async () => {
    expect(A.role).toBe('user');

    await expect(setUserRole(asUser(A), PLAIN, 'admin')).rejects.toThrow(Forbidden);

    expect(await roleOf(PLAIN)).toMatchObject({ role: 'user', updated_by: PLAIN });
    expect(await changes()).toEqual([]);
    await expect(setUserRole(asUser(E), PLAIN, 'admin')).resolves.toMatchObject({
      role: 'admin',
    });
  });

  it('answers a soft-deleted or unknown user as NotFound, writing nothing', async () => {
    await expect(setUserRole(asUser(E), DELETED, 'admin')).rejects.toThrow(NotFound);
    await expect(setUserRole(asUser(E), NOWHERE, 'admin')).rejects.toThrow(NotFound);

    expect(await roleOf(DELETED)).toMatchObject({ role: 'user', updated_by: DELETED });
    expect(await changes()).toEqual([]);
  });
});

describe('setUserRole, revoking', () => {
  beforeEach(async () => {
    await insertUser(OTHER_ADMIN, 'Other Fixturewort', `other${DOMAIN}`, { role: 'admin' });
    await sql`truncate user_privilege_changes`;
  });

  it('stops an admin being one, recorded as one revoke row with the reason, the flag left', async () => {
    const user = await setUserRole(asUser(E), OTHER_ADMIN, 'user', 'Stepped back');

    expect(user).toMatchObject({ id: OTHER_ADMIN, role: 'user', canCreateWorkspace: true });
    expect(await roleOf(OTHER_ADMIN)).toEqual({
      role: 'user',
      can_create_workspace: true,
      updated_by: E.id,
    });
    expect((await changes()).map(({ created_at: _at, ...row }) => row)).toEqual([
      {
        user_id: OTHER_ADMIN,
        privilege: 'admin',
        change: 'revoke',
        via: 'admin',
        note: 'Stepped back',
        created_by: E.id,
      },
    ]);
  });

  // A owns W and wrote an ingredient there: being made an admin and unmade leaves both.
  it('leaves memberships and the created_by of what the admin wrote untouched', async () => {
    const ingredientId = await insertIngredient(
      sql,
      makeIngredient({ workspaceId: WORKSPACE_W_ID }),
      A.id,
    );
    const owned = () => sql`
      select workspace_id, role::text from workspace_members
      where user_id = ${A.id} and deleted_at is null and workspace_id = ${WORKSPACE_W_ID}
    `;
    const written = () => sql`select created_by from ingredients where id = ${ingredientId}`;
    expect(await owned()).toEqual([{ workspace_id: WORKSPACE_W_ID, role: 'owner' }]);
    expect(await written()).toEqual([{ created_by: A.id }]);

    await setUserRole(asUser(E), A.id, 'admin');
    await setUserRole(asUser(E), A.id, 'user');

    expect(await roleOf(A.id)).toMatchObject({ role: 'user', can_create_workspace: true });
    expect(await owned()).toEqual([{ workspace_id: WORKSPACE_W_ID, role: 'owner' }]);
    expect(await written()).toEqual([{ created_by: A.id }]);
  });

  it('lets an admin revoke themselves while another admin remains', async () => {
    await expect(setUserRole(asUser(E), E.id, 'user')).resolves.toMatchObject({ role: 'user' });

    expect(await liveAdmins()).toEqual([OTHER_ADMIN]);
  });

  it('refuses a user who is not an admin, writing no ledger row', async () => {
    await expect(setUserRole(asUser(E), PLAIN, 'user')).rejects.toThrow(Forbidden);
    expect(await roleOf(PLAIN)).toMatchObject({ role: 'user', updated_by: PLAIN });
    expect(await changes()).toEqual([]);
  });

  // One non-admin, as for the grant; E's same call succeeds below.
  it('refuses a non-admin as Forbidden by direct call, writing nothing', async () => {
    expect(B.role).toBe('user');

    await expect(setUserRole(asUser(B), OTHER_ADMIN, 'user')).rejects.toThrow(Forbidden);

    expect(await roleOf(OTHER_ADMIN)).toMatchObject({ role: 'admin' });
    expect(await changes()).toEqual([]);
    await expect(setUserRole(asUser(E), OTHER_ADMIN, 'user')).resolves.toMatchObject({
      role: 'user',
    });
  });

  it('answers a soft-deleted or unknown user as NotFound', async () => {
    await expect(setUserRole(asUser(E), DELETED, 'user')).rejects.toThrow(NotFound);
    await expect(setUserRole(asUser(E), NOWHERE, 'user')).rejects.toThrow(NotFound);
  });
});

describe('setUserRole and the primary admin', () => {
  beforeEach(async () => {
    await insertUser(PRIMARY, 'Owner Fixturewort', PRIMARY_EMAIL, { role: 'admin' });
    await sql`truncate user_privilege_changes`;
  });

  // The target is a live admin, two others besides: with the variable naming
  // someone else the same revoke succeeds below, so the refusal is the
  // variable's.
  it.each([
    ['another admin', E],
    ['the primary admin itself', { id: PRIMARY, role: 'admin' as const }],
  ])('refuses revoking the primary admin for %s', async (_who, caller) => {
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', 'Owner@User-Role.test');
    expect(await liveAdmins()).toEqual([E.id, PRIMARY].sort());

    const refusal = setUserRole(asUser(caller), PRIMARY, 'user');

    await expect(refusal).rejects.toThrow(Forbidden);
    await expect(refusal).rejects.toThrow(PRIMARY_ADMIN_REFUSAL);
    expect(await roleOf(PRIMARY)).toMatchObject({ role: 'admin' });
    expect(await changes()).toEqual([]);
  });

  it('can revoke the previous primary admin once the variable names someone else', async () => {
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', PRIMARY_EMAIL);
    await expect(setUserRole(asUser(E), PRIMARY, 'user')).rejects.toThrow(PRIMARY_ADMIN_REFUSAL);

    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', `successor${DOMAIN}`);

    // Still an admin until someone revokes them: the change demotes nobody.
    expect(await roleOf(PRIMARY)).toMatchObject({ role: 'admin' });
    await expect(setUserRole(asUser(E), PRIMARY, 'user')).resolves.toMatchObject({
      role: 'user',
    });
  });
});

// The count is a fallback: with the primary admin in place it is never
// reached, so these run with the variable naming nobody who has an account.
describe('setUserRole and the last admin', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', `nobody${DOMAIN}`);
  });

  it('refuses revoking the last live admin as Forbidden', async () => {
    expect(await liveAdmins()).toEqual([E.id]);

    await expect(setUserRole(asUser(E), E.id, 'user')).rejects.toThrow(Forbidden);
    expect(await liveAdmins()).toEqual([E.id]);
    expect(await changes()).toEqual([]);

    // With a second admin the same call succeeds, so it was the count.
    await insertUser(OTHER_ADMIN, 'Other Fixturewort', `other${DOMAIN}`, { role: 'admin' });
    await expect(setUserRole(asUser(E), E.id, 'user')).resolves.toMatchObject({ role: 'user' });
  });

  it('leaves exactly one admin when the only two revoke each other at once', async () => {
    await insertUser(OTHER_ADMIN, 'Other Fixturewort', `other${DOMAIN}`, { role: 'admin' });
    await sql`truncate user_privilege_changes`;
    expect(await liveAdmins()).toEqual([E.id, OTHER_ADMIN].sort());

    // Two real transactions, each on its own pooled connection, neither
    // awaited before the other starts.
    const outcomes = await Promise.allSettled([
      setUserRole(asUser(E), OTHER_ADMIN, 'user'),
      setUserRole(asUser({ id: OTHER_ADMIN, role: 'admin' }), E.id, 'user'),
    ]);

    expect(outcomes.map((outcome) => outcome.status).sort()).toEqual(['fulfilled', 'rejected']);
    const refused = outcomes.find((outcome) => outcome.status === 'rejected');
    expect(refused?.reason).toBeInstanceOf(Forbidden);
    expect(await liveAdmins()).toHaveLength(1);
    expect(await changes()).toHaveLength(1);
  });
});
