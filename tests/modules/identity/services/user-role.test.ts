import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { Forbidden, NotFound } from '@/lib/errors';
import { PRIMARY_ADMIN_REFUSAL } from '@/lib/primary-admin';
import { BOOTSTRAP_USER_ID, DEMO_WORKSPACE_ID } from '@/db/bootstrap';
import { seedDemoCoven } from '@/db/seed/demo-coven';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { setUserRole } from '@/modules/identity';
import type { UserRole } from '@/lib/session';
import { A, B, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { asManualFix } from '../../../support/db/privileges';
import { makeIngredient } from '../../../support/fixtures/ingredient';
import type { PrivilegeChangeRow, RoleRow } from './types';

// An admin makes a user an admin, or stops one being one, from `/admin/users`, declared `via: 'admin'` so the trigger on `users` records each change in the privilege ledger.
// The primary admin, named by ADMIN_BOOTSTRAP_EMAIL when the check runs, cannot be revoked, and a count under a lock refuses leaving no admin at all (claude-docs/design-decisions/m2.9-granting-admin.md, "Granting" and "Revoking").

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
const CURATOR = '00000000-0000-0000-0000-0000000000d6';
const NOWHERE = '00000000-0000-0000-0000-0000000000d9';
const PRIMARY_EMAIL = `owner${DOMAIN}`;

/** Inserts a user on this file's domain; an admin or curator is declared as a `psql` fix declares one. */
async function insertUser(
  id: string,
  name: string,
  email: string,
  {
    role = 'user',
    canCreateWorkspace = role !== 'user',
    emailVerified = true,
    deleted = false,
  }: {
    role?: UserRole;
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
  await removeDemoCoven();
  // The ledger first, since its rows name the users deleted below; then E,
  // F, A and B back as the seed made them, as a `psql` fix would put them.
  await sql`truncate user_privilege_changes`;
  await asManualFix(sql, async (tx) => {
    // A case that acted as one of this file's users stamped the rows it changed with that user; the stamp would refuse the delete.
    // The trigger drops a write that changes the stamp alone unless the touch is declared.
    await tx`select set_config('app.touch_row', 'on', true)`;
    await tx`
      update users set updated_by = ${BOOTSTRAP_USER_ID}
      where updated_by in (select id from users where email like ${`%${DOMAIN}`}) and email not like ${`%${DOMAIN}`}`;
    await tx`
      update users set created_by = ${BOOTSTRAP_USER_ID}
      where created_by in (select id from users where email like ${`%${DOMAIN}`}) and email not like ${`%${DOMAIN}`}`;
    await tx`delete from users where email like ${`%${DOMAIN}`}`;
    await tx`update users set role = 'admin', can_create_workspace = true where id = ${E.id}`;
    await tx`update users set role = 'curator', can_create_workspace = true where id = ${F.id}`;
    await tx`update users set role = 'user', can_create_workspace = true where id in (${A.id}, ${B.id})`;
  });
  await insertUser(PLAIN, 'Plain Fixturewort', `plain${DOMAIN}`, { emailVerified: false });
  await insertUser(APPROVED, 'Approved Fixturewort', `approved${DOMAIN}`, {
    canCreateWorkspace: true,
  });
  await insertUser(DELETED, 'Lapsed Fixturewort', `lapsed${DOMAIN}`, { deleted: true });
  await sql`truncate user_privilege_changes`;
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await sql`drop trigger if exists refuse_demo_seat on workspace_members`;
  await sql`drop function if exists refuse_demo_seat()`;
});

/** Every case starts from no demo coven, whether or not the template holds one. */
async function removeDemoCoven(): Promise<void> {
  // The coven's contents reference its row, so they go first; the cascade also empties the tables that hang off them.
  await sql`truncate spell_workings, spells, inventory_items, workspace_compendium_entries, ingredients cascade`;
  await sql`delete from workspace_members where workspace_id = ${DEMO_WORKSPACE_ID}`;
  await sql`delete from workspaces where id = ${DEMO_WORKSPACE_ID}`;
}

/** The user's seat in the demo coven, live or not; `undefined` where there is no row. */
async function demoSeat(userId: string) {
  const [row] = await sql<{ role: string; deleted: boolean }[]>`
    select role::text, deleted_at is not null as deleted from workspace_members
    where workspace_id = ${DEMO_WORKSPACE_ID} and user_id = ${userId}
  `;
  return row;
}

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

  // Confirming who someone is is the granting admin's job.
  it('grants to a user whose email is unverified', async () => {
    const [{ email_verified }] = await sql`select email_verified from users where id = ${PLAIN}`;
    expect(email_verified).toBe(false);

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

  it('answers a soft-deleted or unknown user as NotFound', async () => {
    await expect(setUserRole(asUser(E), DELETED, 'user')).rejects.toThrow(NotFound);
    await expect(setUserRole(asUser(E), NOWHERE, 'user')).rejects.toThrow(NotFound);
  });
});

// The curator role is set on the same dialog, through the same service.
// Becoming a curator sets the creation flag in the same write, as becoming an admin does; a move between curator and admin is a revoke of one and a grant of the other.
describe('setUserRole and the curator role', () => {
  beforeEach(async () => {
    await insertUser(CURATOR, 'Curator Fixturewort', `curator${DOMAIN}`, { role: 'curator' });
    await insertUser(OTHER_ADMIN, 'Other Fixturewort', `other${DOMAIN}`, { role: 'admin' });
    await sql`truncate user_privilege_changes`;
  });

  it('makes a user without the flag a curator, the flag set in the same write, as two rows at one instant', async () => {
    expect(await roleOf(PLAIN)).toMatchObject({ role: 'user', can_create_workspace: false });

    const user = await setUserRole(asUser(E), PLAIN, 'curator', 'Keeps the deity list');

    expect(user).toMatchObject({ id: PLAIN, role: 'curator', canCreateWorkspace: true });
    expect(await roleOf(PLAIN)).toEqual({
      role: 'curator',
      can_create_workspace: true,
      updated_by: E.id,
    });
    const rows = await changes();
    expect(rows.map(({ created_at: _at, ...row }) => row)).toEqual([
      {
        user_id: PLAIN,
        privilege: 'create_workspace',
        change: 'grant',
        via: 'admin',
        note: 'Keeps the deity list',
        created_by: E.id,
      },
      {
        user_id: PLAIN,
        privilege: 'curator',
        change: 'grant',
        via: 'admin',
        note: 'Keeps the deity list',
        created_by: E.id,
      },
    ]);
    expect(rows[0]?.created_at).toEqual(rows[1]?.created_at);
  });

  it.each([
    [
      'a curator an admin',
      CURATOR,
      'admin' as const,
      [
        ['admin', 'grant'],
        ['curator', 'revoke'],
      ],
    ],
  ])('makes %s, the flag kept, recorded at one instant', async (_what, target, role, recorded) => {
    const user = await setUserRole(asUser(E), target, role);

    expect(user).toMatchObject({ role, canCreateWorkspace: true });
    expect(await roleOf(target)).toEqual({ role, can_create_workspace: true, updated_by: E.id });
    const rows = await changes();
    expect(rows.map(({ privilege, change }) => [privilege, change])).toEqual(recorded);
    expect(new Set(rows.map((row) => row.created_at.getTime())).size).toBe(1);
  });

  it.each([
    ['a user', PLAIN, 'user' as const],
    ['a curator', CURATOR, 'curator' as const],
    ['an admin', OTHER_ADMIN, 'admin' as const],
  ])('refuses giving %s the role they hold, writing nothing', async (_who, target, role) => {
    const before = await roleOf(target);
    expect(before.role).toBe(role);

    await expect(setUserRole(asUser(E), target, role)).rejects.toThrow(Forbidden);

    expect(await roleOf(target)).toEqual(before);
    expect(await changes()).toEqual([]);
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

  // Leaving admin for curator is a revoke of admin, so it is held to the same rule.
  it('refuses moving the primary admin to curator', async () => {
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', PRIMARY_EMAIL);

    await expect(setUserRole(asUser(E), PRIMARY, 'curator')).rejects.toThrow(PRIMARY_ADMIN_REFUSAL);
    expect(await roleOf(PRIMARY)).toMatchObject({ role: 'admin' });
    expect(await changes()).toEqual([]);

    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', `successor${DOMAIN}`);
    await expect(setUserRole(asUser(E), PRIMARY, 'curator')).resolves.toMatchObject({
      role: 'curator',
    });
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

  it('refuses moving the last live admin to curator', async () => {
    expect(await liveAdmins()).toEqual([E.id]);

    await expect(setUserRole(asUser(E), E.id, 'curator')).rejects.toThrow(Forbidden);
    expect(await liveAdmins()).toEqual([E.id]);
    expect(await changes()).toEqual([]);

    await insertUser(OTHER_ADMIN, 'Other Fixturewort', `other${DOMAIN}`, { role: 'admin' });
    await expect(setUserRole(asUser(E), E.id, 'curator')).resolves.toMatchObject({
      role: 'curator',
    });
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

// A site admin owns the demo coven, so they can keep its contents in order; the seat moves in the transaction that moves the role.
describe('setUserRole and the demo coven seat', () => {
  beforeEach(async () => {
    // Drizzle rewires the client it wraps, so the seed gets one of its own.
    const seedClient = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
    try {
      await seedDemoCoven(drizzle(seedClient));
    } finally {
      await seedClient.end();
    }
  });

  afterEach(removeDemoCoven);

  it('seats a new admin as owner, promoting the viewer seat they held', async () => {
    expect(await demoSeat(B.id)).toEqual({ role: 'viewer', deleted: false });

    await setUserRole(asUser(E), B.id, 'admin');

    expect(await demoSeat(B.id)).toEqual({ role: 'owner', deleted: false });
  });

  it('inserts the seat for an admin who has none', async () => {
    await sql`delete from workspace_members where workspace_id = ${DEMO_WORKSPACE_ID} and user_id = ${B.id}`;
    expect(await demoSeat(B.id)).toBeUndefined();

    await setUserRole(asUser(E), B.id, 'admin');

    expect(await demoSeat(B.id)).toEqual({ role: 'owner', deleted: false });
  });

  it('revives the seat of an admin who had left', async () => {
    await sql`
      update workspace_members set deleted_at = now(), deleted_by = ${B.id}
      where workspace_id = ${DEMO_WORKSPACE_ID} and user_id = ${B.id}
    `;
    expect(await demoSeat(B.id)).toEqual({ role: 'viewer', deleted: true });

    await setUserRole(asUser(E), B.id, 'admin');

    expect(await demoSeat(B.id)).toEqual({ role: 'owner', deleted: false });
  });

  it('returns the seat to a viewer when the admin is demoted', async () => {
    await setUserRole(asUser(E), B.id, 'admin');
    expect(await demoSeat(B.id)).toEqual({ role: 'owner', deleted: false });

    await setUserRole(asUser(E), B.id, 'user');

    expect(await demoSeat(B.id)).toEqual({ role: 'viewer', deleted: false });
  });

  it('seats no one when a user becomes a curator', async () => {
    await sql`delete from workspace_members where workspace_id = ${DEMO_WORKSPACE_ID} and user_id = ${PLAIN}`;

    await setUserRole(asUser(E), PLAIN, 'curator');

    expect(await roleOf(PLAIN)).toMatchObject({ role: 'curator' });
    expect(await demoSeat(PLAIN)).toBeUndefined();
  });

  it('writes the seat in the transaction that writes the role', async () => {
    await sql`delete from workspace_members where workspace_id = ${DEMO_WORKSPACE_ID} and user_id = ${PLAIN}`;
    // The role write would succeed on its own, so only a seat that cannot be written explains a role left unchanged.
    await sql.unsafe(`
      create function refuse_demo_seat() returns trigger language plpgsql as \$\$
      begin raise exception 'seat refused'; end \$\$;
      create trigger refuse_demo_seat before insert on workspace_members
        for each row execute function refuse_demo_seat();
    `);

    await expect(setUserRole(asUser(E), PLAIN, 'admin')).rejects.toThrow();

    expect(await roleOf(PLAIN)).toMatchObject({ role: 'user' });
    expect(await changes()).toEqual([]);
  });

  it('grants the role and seats no one where there is no demo coven', async () => {
    await removeDemoCoven();

    await setUserRole(asUser(E), B.id, 'admin');

    expect(await roleOf(B.id)).toMatchObject({ role: 'admin' });
    expect(await demoSeat(B.id)).toBeUndefined();
  });
});
