import { expect, type Page } from '@playwright/test';
import postgres from 'postgres';
import type { UserRole } from '@/lib/session';
import { slugify } from '@/lib/slugify';
import { e2eDatabaseUrl } from '../database';
import { signInAs } from '../session';

// Setup for the accounts and members stories, written straight to this worker's slot database as the gate
// specs write theirs (coven.spec.ts), so it bypasses the code under test. Kept beside the two specs that
// share it, not in tests/e2e/, which holds the harness every spec uses.

type CovenRole = 'owner' | 'member' | 'viewer';

/** A raw client on this worker's slot database, closed after `fn`. */
export async function withSql<T>(fn: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    return await fn(sql);
  } finally {
    await sql.end();
  }
}

/**
 * A verified user signed in on `page`, renamed from `signInAs`'s shared "Fixture Person" so the members table
 * can tell rows apart, holding the right to create a coven when `canCreate` says so (a curator or admin
 * already does, by the database's own check).
 */
export async function makeUser(
  page: Page,
  email: string,
  name: string,
  { role = 'user', canCreate = false }: { role?: UserRole; canCreate?: boolean } = {},
): Promise<string> {
  const { userId } = await signInAs(page, email, ['discord'], role);
  await withSql((sql) =>
    sql.begin(async (tx) => {
      // A grant made by hand declares its route, as signInAs's insert does:
      // the privilege trigger refuses an undeclared change to the right.
      await tx`select set_config('app.privilege_route', 'manual', true)`;
      await tx`update users set name = ${name} where id = ${userId}`;
      if (canCreate) await tx`update users set can_create_workspace = true where id = ${userId}`;
    }),
  );
  return userId;
}

/** A coven holding these seats, stamped as made by its first. */
export async function makeCoven(
  name: string,
  seats: readonly (readonly [string, CovenRole])[],
): Promise<{ id: string; slug: string }> {
  const slug = slugify(name);
  const maker = seats[0][0];
  return withSql(async (sql) => {
    const [coven] = await sql`
      insert into workspaces (name, slug, created_by, updated_by)
      values (${name}, ${slug}, ${maker}, ${maker})
      returning id`;
    for (const [userId, role] of seats) {
      await sql`
        insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
        values (${coven.id}, ${userId}, ${role}, ${maker}, ${maker})`;
    }
    return { id: coven.id as string, slug };
  });
}

/** The coven's live seats as the database holds them, role by user id. */
export async function seatsOf(covenId: string): Promise<Record<string, CovenRole>> {
  return withSql(async (sql) => {
    const rows = await sql`
      select user_id, role::text from workspace_members
      where workspace_id = ${covenId} and deleted_at is null`;
    return Object.fromEntries(rows.map((row) => [row.user_id, row.role]));
  });
}

/**
 * The roll as the members page draws it: each row's role by the member's name. The role word is the only
 * rendering of the role (layer-ownership.md rule 2's exception); the name is matched against the given
 * names, since the current user's cell also carries a "You" mark. Wrap in `expect.poll`: it does not wait.
 */
async function rollOf(page: Page, names: readonly string[]): Promise<Record<string, string>> {
  const table = page.getByRole('table', { name: 'Members' });
  const rows = await table.getByRole('row').all();
  // The Role column found by its heading, since an owner's table has the
  // Email column before it.
  const headings = await table.getByRole('columnheader').allInnerTexts();
  const role = headings.findIndex((heading) => heading.trim() === 'Role');
  const roll: Record<string, string> = {};
  // The first row is the column headings.
  for (const row of rows.slice(1)) {
    const cells = row.getByRole('cell');
    const text = (await cells.nth(0).innerText()).trim();
    const name = names.find((each) => text.startsWith(each)) ?? text;
    roll[name] = (await cells.nth(role).innerText()).trim().split(/\s/)[0];
  }
  return roll;
}

/** Waits for the members table, then for the roll to read `expected`. */
export async function expectRoll(
  page: Page,
  expected: Record<string, string>,
  names: readonly string[],
): Promise<void> {
  await expect(page.getByRole('table', { name: 'Members' })).toBeVisible();
  await expect.poll(() => rollOf(page, names)).toEqual(expected);
}
