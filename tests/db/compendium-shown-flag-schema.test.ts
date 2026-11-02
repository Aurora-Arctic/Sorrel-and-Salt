import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { useTestDatabase } from '../support/db/database';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient } from '../support/fixtures/ingredient';
import { fromRoot } from '../support/paths';
import { FIXTURE_USERS } from '@/db/seed/standard';

// The `shown` column on `ingredients` and the index the public read will use. Nothing reads or writes the column yet; this file proves the catalogue holds it.

const AUTHOR = FIXTURE_USERS.A.id;
const MIGRATION = fromRoot('src/db/migrations/0108_compendium-shown-flag.sql');

let sql: postgres.Sql;
const catalogue = useTestDatabase((client) => (sql = client));

let testwort: string;

beforeAll(async () => {
  testwort = await insertIngredient(
    sql,
    makeIngredient({ name: 'Testwort', canonicalName: 'Fixtura shownica' }),
    AUTHOR,
  );
});

describe('ingredients.shown', () => {
  it('is a boolean, not null, defaulting to shown', async () => {
    const [column] = await sql`
      select data_type, is_nullable, column_default from information_schema.columns
      where table_name = 'ingredients' and column_name = 'shown'`;
    expect(column).toMatchObject({
      data_type: 'boolean',
      is_nullable: 'NO',
      column_default: 'true',
    });
  });

  it('reads as shown on a row written without naming it', async () => {
    const [row] = await sql`select shown from ingredients where id = ${testwort}`;
    expect(row.shown).toBe(true);
  });

  it('has a partial index on the live rows of a tier and flag', async () => {
    const index = await catalogue.indexRow('ingredients', 'ingredients_tier_shown');
    expect(index?.unique).toBe(false);
    expect(index?.predicate).toContain('deleted_at IS NULL');
    expect(index?.definition).toContain('(workspace_id, shown)');
  });

  // Last, since it drops the column: the file's database is its own clone.
  it('fills every row already there as shown when the migration runs over it', async () => {
    await sql.unsafe('drop index ingredients_tier_shown');
    await sql.unsafe('alter table ingredients drop column shown');
    const before = await sql`select count(*)::int as n from ingredients`;
    expect(before[0].n).toBeGreaterThan(0);

    for (const statement of readFileSync(MIGRATION, 'utf8').split('--> statement-breakpoint')) {
      if (statement.trim()) await sql.unsafe(statement);
    }

    const [counts] = await sql`
      select count(*)::int as total, count(*) filter (where shown)::int as shown from ingredients`;
    expect(counts.shown).toBe(counts.total);
    expect(counts.total).toBe(before[0].n);
  });
});
