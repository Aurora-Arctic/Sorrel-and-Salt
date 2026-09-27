import { describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { tableFacts } from '../../../support/db/table-metadata';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { users } from '@/modules/identity/schema/users';

// Schema shape via Drizzle's introspection; the seeded rows are asserted in
// seeded-template.test.ts.
describe('users schema', () => {
  const { byName, indexes } = tableFacts(users);

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
// (claude-docs/auth.md, "Provisional accounts").
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
