import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from '../../../support/db/database';
import { statementsOfMigrationContaining } from '../../../support/db/migrations';
import type { ColumnRow } from './types';

// MB.157's list, by rule 10's three steps: MB.158 added `elements` beside the
// single `element` and filled it, MB.159 switched every reader and writer and
// filled it again, and MB.160 drops the single, filling nothing
// (claude-docs/db/identity-model.md, "The ingredient identity model").
const DROP_MIGRATION = 'DROP COLUMN "element"';

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

async function columnsNamed(names: string[]): Promise<Record<string, ColumnRow>> {
  const rows = await sql<ColumnRow[]>`
    select column_name, data_type, udt_name, is_nullable, column_default
    from information_schema.columns
    where table_name = 'ingredients' and column_name in ${sql(names)}
  `;
  return Object.fromEntries(rows.map((row) => [row.column_name, row]));
}

describe('the element list', () => {
  it('exists as a nullable ingredient_element[] with no default', async () => {
    const { elements } = await columnsNamed(['elements']);

    expect(elements).toMatchObject({
      data_type: 'ARRAY',
      udt_name: '_ingredient_element',
      is_nullable: 'YES',
      column_default: null,
    });
  });

  // 0034's and 0035's fill tests went with the column, which their UPDATEs read.
  it('has replaced the single column, whose type it keeps', async () => {
    expect(await columnsNamed(['element'])).toEqual({});

    const [type] = await sql`select 1 from pg_type where typname = 'ingredient_element'`;
    expect(type).toBeDefined();
  });

  // No last fill: MB.159's refill copied everything written before it ran,
  // and a list edited since is newer than the single, which nothing rewrote
  // after. Only the old deploy's writes during MB.159's rollout are given up.
  it('drops the single without writing a list', () => {
    expect(statementsOfMigrationContaining(DROP_MIGRATION)).toEqual([
      'ALTER TABLE "ingredients" DROP COLUMN "element";',
    ]);
  });
});
