import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from '../../../support/db/database';
import { statementsOfMigrationContaining } from '../../../support/db/migrations';
import type { ColumnRow } from './types';

// Rule 10 over MB.134's lists: `planets`, `zodiac_signs` and `colors` added
// beside the single columns and filled from them (MB.135), every reader and
// writer switched (MB.136), and the singles dropped (MB.137) —
// claude-docs/db/identity-model.md, "The ingredient identity model".
const LISTS = ['planets', 'zodiac_signs', 'colors'];
const SINGLES = ['planet', 'zodiac', 'color'];

const DROP_MIGRATION = 'DROP COLUMN "planet"';

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

describe('the planet, zodiac sign and colour lists', () => {
  it('exist as nullable text[] with no default', async () => {
    const columns = await columnsNamed(LISTS);

    for (const list of LISTS) {
      expect(columns[list]).toMatchObject({
        data_type: 'ARRAY',
        udt_name: '_text',
        is_nullable: 'YES',
        column_default: null,
      });
    }
  });

  it('outlive the single columns they replaced, which MB.137 drops', async () => {
    expect(await columnsNamed(SINGLES)).toEqual({});
  });

  // No last fill: the MB.136 deploy writes the lists, so a single that
  // disagrees with its list could be either one's newer write, and a fill
  // would overwrite a member's edit (claude-docs/db/identity-model.md).
  it('lose no value to the drop, which writes nothing but the three drops', () => {
    expect(statementsOfMigrationContaining(DROP_MIGRATION)).toEqual(
      SINGLES.map((single) => `ALTER TABLE "ingredients" DROP COLUMN "${single}";`),
    );
  });
});
