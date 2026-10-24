import { existsSync, readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from '../../support/db/database';
import { fromRoot } from '../../support/paths';

// Rule 7 (claude-docs/testing/layer-ownership.md, "What a test may assert"):
// a migration test, retired once `0072` is in production's journal. The
// regression: `0072` added `fl_oz_us` and then named it in the CHECK, and
// Postgres refuses a new enum value inside the transaction that adds it
// (55P04). drizzle-kit runs every pending migration in one transaction, so it
// failed on every database built before it, while a fresh one, which creates
// the type in that same transaction, passed. Each case puts back the type and
// the CHECK `0071` left, then runs `0072` whole in one transaction.

const FILE = fromRoot('src/db/migrations/0072_fluid-ounces.sql');

/** `0072`'s statements, comment lines stripped, as the migrator splits them. */
const STATEMENTS = existsSync(FILE)
  ? readFileSync(FILE, 'utf8')
      .split('--> statement-breakpoint')
      .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
      .filter(Boolean)
  : [];

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

// The type as `0013` made it, committed before `0072` runs, as on a database
// that has been migrated before. The `spell_ingredients` view (0083) reads
// `unit`, and Postgres refuses to change the type of a column a view reads,
// so the view is dropped first and made again after.
beforeEach(async () => {
  await sql.unsafe(`
    DROP VIEW spell_ingredients;
    ALTER TABLE inventory_items DROP CONSTRAINT inventory_items_unit_matches_dimension;
    ALTER TABLE inventory_items ALTER COLUMN unit TYPE text;
    ALTER TABLE spell_steps ALTER COLUMN unit TYPE text;
    DROP TYPE inventory_unit;
    CREATE TYPE inventory_unit AS ENUM('mg', 'g', 'kg', 'oz', 'lb', 'ml', 'l', 'tsp', 'tbsp',
      'fl_oz', 'cup', 'piece', 'drop', 'pinch');
    ALTER TABLE inventory_items ALTER COLUMN unit TYPE inventory_unit
      USING (CASE WHEN unit LIKE 'fl_oz%' THEN 'fl_oz' ELSE unit END)::inventory_unit;
    ALTER TABLE spell_steps ALTER COLUMN unit TYPE inventory_unit
      USING (CASE WHEN unit LIKE 'fl_oz%' THEN 'fl_oz' ELSE unit END)::inventory_unit;
    ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_unit_matches_dimension CHECK (
      (unit is null) = (unit_dimension is null) and (unit is null or
      ((unit_dimension = 'weight' and unit in ('mg', 'g', 'kg', 'oz', 'lb')) or
       (unit_dimension = 'volume' and unit in ('ml', 'l', 'tsp', 'tbsp', 'fl_oz', 'cup')) or
       (unit_dimension = 'count' and unit in ('piece', 'drop', 'pinch')))));
    CREATE VIEW spell_ingredients AS SELECT * FROM spell_steps;
  `);
});

describe('0072 on a database migrated before it', () => {
  it('applies in one transaction, as drizzle-kit runs it, and leaves both fluid ounces', async () => {
    const [before] = await sql`select enum_range(null::inventory_unit)::text[] as units`;
    expect(before.units).toContain('fl_oz');
    expect(before.units).not.toContain('fl_oz_us');
    expect(STATEMENTS.length).toBeGreaterThan(0);

    await sql.begin(async (tx) => {
      for (const statement of STATEMENTS) await tx.unsafe(statement);
    });

    const [after] = await sql`select enum_range(null::inventory_unit)::text[] as units`;
    expect(after.units).toEqual(expect.arrayContaining(['fl_oz_uk', 'fl_oz_us']));
    expect(after.units).not.toContain('fl_oz');
  });
});
