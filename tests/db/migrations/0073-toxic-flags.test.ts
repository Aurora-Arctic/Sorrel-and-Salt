import { existsSync, readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from '../../support/db/database';
import { fromRoot } from '../../support/paths';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';

// Rule 7 (claude-docs/testing/layer-ownership.md, "What a test may assert"):
// a migration data test, retired once `0073` is in production's journal. The
// migrated database already holds the two columns, so each case first takes
// them back off, writes an ingredient and its form as the deploy before
// M11.21 writes them, then runs `0073` whole: a row written before the
// migration reads as not toxic after it.

const FILE = fromRoot('src/db/migrations/0073_toxic-flags.sql');

/** `0073`'s statements, comment lines stripped, as the migrator splits them. */
const STATEMENTS = existsSync(FILE)
  ? readFileSync(FILE, 'utf8')
      .split('--> statement-breakpoint')
      .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
      .filter(Boolean)
  : [];

const AUTHOR = FIXTURE_USERS.A.id;

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

// The database as `0073` meets it: `0072`'s, with neither column.
beforeEach(async () => {
  await sql.unsafe(`
    ALTER TABLE ingredients DROP COLUMN toxic;
    ALTER TABLE ingredient_variants DROP COLUMN toxic;
  `);
});

/** An ingredient in each tier with one form, written with no flag. */
async function rowsBefore(): Promise<string[]> {
  const stamps = { created_by: AUTHOR, updated_by: AUTHOR };
  const ids: string[] = [];
  for (const workspaceId of [null, WORKSPACE_W_ID]) {
    const t = crypto.randomUUID().slice(0, 8);
    const [row] = await sql`
      insert into ingredients ${sql({
        workspace_id: workspaceId,
        name: `Testwort ${t}`,
        slug: `testwort-${t}`,
        nomenclature: 'none',
        ...stamps,
      })}
      returning id`;
    await sql`insert into ingredient_variants ${sql({
      ingredient_id: row.id as string,
      form: 'Testform',
      ...stamps,
    })}`;
    ids.push(row.id as string);
  }
  return ids;
}

describe('migration 0073, the toxic flags', () => {
  it('reads every ingredient and form written before it as not toxic', async () => {
    const ids = await rowsBefore();

    expect(STATEMENTS.length).toBeGreaterThan(0);
    for (const statement of STATEMENTS) await sql.unsafe(statement);

    const ingredients = await sql`select toxic from ingredients where id = any(${ids})`;
    const forms =
      await sql`select toxic from ingredient_variants where ingredient_id = any(${ids})`;
    expect(ingredients.map((row) => row.toxic)).toEqual([false, false]);
    expect(forms.map((row) => row.toxic)).toEqual([false, false]);
  });
});
