import { describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { asManualFix } from '../../../support/db/privileges';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { users } from '@/modules/identity/schema/users';

// Schema shape via Drizzle's introspection; the seeded rows are asserted in
// seeded-template.test.ts.
describe('users schema', () => {
  const { byName } = tableFacts(users);

  // The whole set, audit spread included: tests/db/audit-columns.test.ts reads
  // only the catalogue, so this is what catches the spread leaving the schema.
  it('has its own columns and the six audit ones, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      [
        'id',
        'name',
        'email',
        'email_verified',
        'image',
        'role',
        'can_create_workspace',
        'verification_sent_at',
        ...AUDIT_COLUMNS,
      ].sort(),
    );
  });
});

// The primary admin is whichever live row matches ADMIN_BOOTSTRAP_EMAIL
// case-insensitively, and `users_email_unique` is on the raw column. Better
// Auth lowercases every email it writes, but a row inserted by hand need not,
// so the database holds the addresses to lower case and two rows can never
// differ by case alone.
describe('users email case', () => {
  let sql: postgres.Sql;
  useTestDatabase((client) => {
    sql = client;
  });

  const insert = (email: string) => sql`
    insert into users (name, email, created_by, updated_by)
    values ('Fixture Person', ${email}, ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
  `;

  it('refuses a mixed-case row beside its lower-case twin, leaving one match', async () => {
    await insert('owner@case-check.test');

    const error = await failureOf(insert('Owner@Case-Check.test'));

    // 23514 is check_violation: the unique index alone would have let it in.
    expect(error.code).toBe('23514');
    expect(error.constraint_name).toBe('users_email_lower_case');
    const matches = await sql`
      select id from users
      where lower(email) = lower('OWNER@case-check.test') and deleted_at is null
    `;
    expect(matches).toHaveLength(1);
  });

  it('accepts a lower-case address, so the check is the case and not the insert', async () => {
    await expect(insert('someone@case-check.test')).resolves.toBeDefined();
  });

  // The invite gate (CLAUDE.md, Domain invariants): signing in earns an account
  // and nothing else, so a row that names neither is a user who may not create
  // a workspace.
  it('makes a new account a user who may not create a workspace', async () => {
    await insert('newcomer@case-check.test');

    const [row] = await sql`
      select role::text as role, can_create_workspace from users
      where email = 'newcomer@case-check.test'
    `;
    expect(row).toEqual({ role: 'user', can_create_workspace: false });
  });
});

// MB.177: the flag is what lets anyone create a workspace, admins included, so
// a CHECK holds every admin to it rather than the gate reading `role` beside
// it (claude-docs/design-decisions/mb.177-admins-hold-workspace-creation.md).
describe('users admin creation flag', () => {
  let sql: postgres.Sql;
  useTestDatabase((client) => {
    sql = client;
  });

  const CONSTRAINT = 'users_admin_can_create_workspace';

  // Each write here that grants a privilege declares itself, as a `psql` fix
  // must since MB.195's trigger; the CHECK refuses before the trigger runs.
  const insert = (email: string, role: 'user' | 'admin', canCreateWorkspace: boolean) =>
    sql.begin(async (tx) => {
      await tx`select set_config('app.privilege_route', 'manual', true)`;
      return tx<{ id: string }[]>`
        insert into users (name, email, role, can_create_workspace, created_by, updated_by)
        values ('Fixture Person', ${email}, ${role}, ${canCreateWorkspace},
                ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
        returning id
      `;
    });

  it('refuses an admin row without the flag', async () => {
    const error = await failureOf(insert('flagless-admin@admin-flag.test', 'admin', false));

    // 23514 is check_violation.
    expect(error.code).toBe('23514');
    expect(error.constraint_name).toBe(CONSTRAINT);
  });

  // Why the refusal is the check and not the insert: the same row with the
  // flag goes in, and a user needs no flag at all.
  it('accepts an admin holding the flag, and a user without it', async () => {
    await expect(insert('flagged-admin@admin-flag.test', 'admin', true)).resolves.toHaveLength(1);
    await expect(insert('flagless-user@admin-flag.test', 'user', false)).resolves.toHaveLength(1);
  });

  it('refuses making a user admin without the flag, and accepts both together', async () => {
    const [{ id }] = await insert('promoted@admin-flag.test', 'user', false);

    const error = await failureOf(sql`update users set role = 'admin' where id = ${id}`);

    expect(error.code).toBe('23514');
    expect(error.constraint_name).toBe(CONSTRAINT);
    await asManualFix(
      sql,
      (tx) => tx`update users set role = 'admin', can_create_workspace = true where id = ${id}`,
    );
    const [row] =
      await sql`select role::text as role, can_create_workspace from users where id = ${id}`;
    expect(row).toEqual({ role: 'admin', can_create_workspace: true });
  });
});
