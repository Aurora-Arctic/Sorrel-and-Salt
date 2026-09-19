import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import postgres from 'postgres';
import { MIGRATIONS_DIR } from '../support/paths';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { CATEGORIES } from '@/db/seed/categories';
import { FORMS } from '@/db/seed/forms';
import {
  COMPENDIUM_INGREDIENTS,
  FIXTURE_USERS,
  WORKSPACE_W_ID,
  WORKSPACE_X_ID,
} from '@/db/seed/standard';

// M1.27 — every `db` worker's clone starts as the migrated schema plus the
// `standard` scenario, and it starts that way for *every test file*, not once
// per run: tests/support/db-setup.ts re-clones the worker's database from
// the seeded template before each file. So this file makes no schema and
// seeds nothing — what it asserts is the baseline every other file under
// tests/db/ may assume.
//
// Why the template is populated at test-run setup rather than baked into the
// Postgres image:
// claude-docs/design-decisions/m1.27-template-at-setup-not-in-image.md.

let sql: ReturnType<typeof postgres>;

async function countOf(table: string, where = ''): Promise<number> {
  const [{ count }] = await sql.unsafe<{ count: string }[]>(
    `select count(*) from "${table}" ${where}`,
  );
  return Number(count);
}

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});

afterAll(async () => {
  await sql.end();
});

describe('the seeded template every db worker clones', () => {
  it('was cloned from a template globalSetup made, named in the provided context', async () => {
    const template = inject('templateDatabase');
    const rows = await sql`select datname from pg_database where datname = ${template}`;
    expect(rows).toHaveLength(1);
  });

  it('carries the migration journal, with every migration applied', async () => {
    const journal = JSON.parse(readFileSync(join(MIGRATIONS_DIR, 'meta/_journal.json'), 'utf8'));
    const [{ count }] = await sql<{ count: string }[]>`
      select count(*) from drizzle.__drizzle_migrations
    `;
    // Both the journal and its table, so a migration generated but not applied
    // — a stale template — is a failing test rather than a confusing one.
    expect(Number(count)).toBe(journal.entries.length);
    expect(Number(count)).toBeGreaterThan(0);
  });

  it('holds the five fixture users and the bootstrap user, and no one else', async () => {
    const rows = await sql<{ id: string }[]>`select id from users order by id`;
    const expected = [BOOTSTRAP_USER_ID, ...Object.values(FIXTURE_USERS).map((u) => u.id)].sort();
    expect(rows.map((r) => r.id)).toEqual(expected);
  });

  it('holds workspaces W and X', async () => {
    const rows = await sql<{ id: string }[]>`select id from workspaces order by id`;
    expect(rows.map((r) => r.id)).toEqual([WORKSPACE_W_ID, WORKSPACE_X_ID].sort());
  });

  it('holds the full category and form vocabularies', async () => {
    expect(await countOf('categories')).toBe(CATEGORIES.length);
    expect(await countOf('ingredient_forms')).toBe(FORMS.length);
  });

  it('holds the standard compendium and no workspace ingredients', async () => {
    expect(await countOf('ingredients', 'where workspace_id is null')).toBe(
      COMPENDIUM_INGREDIENTS.length,
    );
    expect(await countOf('ingredients', 'where workspace_id is not null')).toBe(0);
  });
});
