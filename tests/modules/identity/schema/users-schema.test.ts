import { describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { statementsOfMigrationContaining } from '../../../support/db/migrations';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { users } from '@/modules/identity/schema/users';

// Schema shape via Drizzle's introspection; the seeded rows are asserted in
// seeded-template.test.ts.
describe('users schema', () => {
  const { byName, indexes } = tableFacts(users);

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

  it('has DESIGN.md §5 columns: id, name, email, image, role, canCreateWorkspace', () => {
    expect(byName.name).toBeDefined();
    expect(byName.name.notNull).toBe(true);
    expect(byName.image).toBeDefined();
    expect(byName.image.notNull).toBe(false);
  });

  it('defaults role to user and rejects anything outside user|admin', () => {
    expect(byName.role.notNull).toBe(true);
    expect(byName.role.default).toBe('user');
    expect(byName.role.enumValues).toEqual(['user', 'admin']);
  });

  it('defaults canCreateWorkspace to false', () => {
    expect(byName.can_create_workspace.notNull).toBe(true);
    expect(byName.can_create_workspace.default).toBe(false);
  });

  // Set whenever a verification mail goes out, so a second within the minute
  // can be refused; null until the first (claude-docs/auth/admin-bootstrap.md, "The email page").
  it("has a nullable verification_sent_at, the last verification mail's clock (MB.54)", () => {
    expect(byName.verification_sent_at).toBeDefined();
    expect(byName.verification_sent_at.notNull).toBe(false);
    expect(byName.verification_sent_at.default).toBeUndefined();
  });

  it('makes the email index partial on deleted_at IS NULL, not a plain unique constraint (CLAUDE.md rule 4)', () => {
    const emailIndex = indexes.find((i) =>
      i.config.columns.some((c) => 'name' in c && c.name === 'email'),
    );
    expect(emailIndex).toBeDefined();
    expect(emailIndex?.config.unique).toBe(true);
    expect(emailIndex?.config.where).toBeDefined();
  });
});

// The provisional-account sweep runs on every OAuth callback and almost always
// finds nothing, so its predicate has an index that holds only unverified rows
// (claude-docs/auth/admin-bootstrap.md, "Provisional accounts").
describe('users provisional-account index', () => {
  const catalogue = useTestDatabase(() => {});

  it('indexes updated_at over unverified rows only', async () => {
    const index = await catalogue.indexRow('users', 'users_provisional_updated_at_idx');

    expect(index?.unique).toBe(false);
    expect(index?.definition).toMatch(/USING btree \(updated_at\)/);
    expect(index?.predicate).toBe('(email_verified = false)');
  });

  // The cap from sign-up is the sweep's other half, ORed with the window.
  it('indexes created_at over unverified rows only', async () => {
    const index = await catalogue.indexRow('users', 'users_provisional_created_at_idx');

    expect(index?.unique).toBe(false);
    expect(index?.definition).toMatch(/USING btree \(created_at\)/);
    expect(index?.predicate).toBe('(email_verified = false)');
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

  const insert = (email: string, role: 'user' | 'admin', canCreateWorkspace: boolean) => sql<
    { id: string }[]
  >`
    insert into users (name, email, role, can_create_workspace, created_by, updated_by)
    values ('Fixture Person', ${email}, ${role}, ${canCreateWorkspace},
            ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
    returning id
  `;

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
    await sql`update users set role = 'admin', can_create_workspace = true where id = ${id}`;
    const [row] =
      await sql`select role::text as role, can_create_workspace from users where id = ${id}`;
    expect(row).toEqual({ role: 'admin', can_create_workspace: true });
  });

  // The migration's own SQL re-runs against rows a database deployed before it
  // could hold: the constraint dropped first, as it was not there then.
  it('backfills every admin, soft-deleted included, stamped as that admin, before the check', async () => {
    await sql.unsafe(`alter table users drop constraint ${CONSTRAINT}`);
    const liveAdmin = '00000000-0000-0000-0000-0000000000fa';
    const deletedAdmin = '00000000-0000-0000-0000-0000000000fb';
    const user = '00000000-0000-0000-0000-0000000000fc';
    await sql`
      insert into users (id, name, email, role, can_create_workspace, created_by, updated_by, deleted_at, deleted_by)
      values
        (${liveAdmin}, 'Live Admin', 'live@admin-flag.test', 'admin', false,
         ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID}, null, null),
        (${deletedAdmin}, 'Lapsed Admin', 'lapsed@admin-flag.test', 'admin', false,
         ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID}, now(), ${BOOTSTRAP_USER_ID}),
        (${user}, 'Plain User', 'plain@admin-flag.test', 'user', false,
         ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID}, null, null)
    `;

    const statements = statementsOfMigrationContaining(`ADD CONSTRAINT "${CONSTRAINT}"`);
    // The backfill, then the check it makes room for.
    expect(statements).toHaveLength(2);
    for (const statement of statements) await sql.unsafe(statement);

    const rows = await sql`
      select id, can_create_workspace, updated_by from users
      where id in (${liveAdmin}, ${deletedAdmin}, ${user}) order by id
    `;
    expect(rows).toEqual([
      { id: liveAdmin, can_create_workspace: true, updated_by: liveAdmin },
      { id: deletedAdmin, can_create_workspace: true, updated_by: deletedAdmin },
      { id: user, can_create_workspace: false, updated_by: BOOTSTRAP_USER_ID },
    ]);
    const [constraint] = await sql`
      select convalidated from pg_constraint
      where conrelid = 'users'::regclass and conname = ${CONSTRAINT}
    `;
    expect(constraint).toEqual({ convalidated: true });
  });
});
