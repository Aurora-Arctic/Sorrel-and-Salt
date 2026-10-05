import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { statementsOfMigrationContaining } from '../../../support/db/migrations';
import { makeIngredient } from '../../../support/fixtures';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';
import type { ColumnRow, ListedIngredientRow } from './types';

// MB.135, the expand half of rule 10: `planets`, `zodiac_signs` and `colors`
// beside the single columns they replace, filled from them —
// claude-docs/db/identity-model.md, "The ingredient identity model".
const LISTS = { planet: 'planets', zodiac: 'zodiac_signs', color: 'colors' } as const;
type Single = keyof typeof LISTS;
const SINGLES = Object.keys(LISTS) as Single[];

const LIST_MIGRATION = 'ADD COLUMN "planets"';

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

async function everyIngredient(): Promise<ListedIngredientRow[]> {
  return sql<ListedIngredientRow[]>`
    select id, planet, zodiac, color, planets, zodiac_signs, colors
    from ingredients order by id
  `;
}

describe('the planet, zodiac sign and colour lists', () => {
  it('exist as nullable text[] with no default', async () => {
    const columns = await columnsNamed(Object.values(LISTS));

    for (const list of Object.values(LISTS)) {
      expect(columns[list]).toMatchObject({
        data_type: 'ARRAY',
        udt_name: '_text',
        is_nullable: 'YES',
        column_default: null,
      });
    }
  });

  it('leave the single columns as they were: nullable text', async () => {
    const columns = await columnsNamed(SINGLES);

    for (const single of SINGLES) {
      expect(columns[single]).toMatchObject({
        data_type: 'text',
        is_nullable: 'YES',
        column_default: null,
      });
    }
  });

  // The template is migrated before it is seeded, so its lists are empty and
  // the migration's own fill is re-run here against the seeded rows — the
  // order every deployed database met it in.
  it('fill each from its single column where one is set, and nowhere else', async () => {
    // The standard seed states a planet and nothing else, so the other two
    // singles are set on a row of their own, and one row carries none.
    await insertIngredient(
      sql,
      makeIngredient({
        workspaceId: WORKSPACE_W_ID,
        planet: 'Mercury',
        zodiac: 'Gemini',
        color: 'Green',
      }),
      FIXTURE_USERS.A.id,
    );
    await insertIngredient(
      sql,
      makeIngredient({
        workspaceId: WORKSPACE_W_ID,
        name: 'Testwort (bare)',
        canonicalName: 'Fixtura nuda',
      }),
      FIXTURE_USERS.A.id,
    );

    const before = await everyIngredient();
    // Each case is present, so no assertion below holds over an empty set…
    for (const single of SINGLES) {
      expect(before.filter((row) => row[single] !== null).length).toBeGreaterThan(0);
    }
    expect(before.filter((row) => SINGLES.every((s) => row[s] === null)).length).toBeGreaterThan(0);
    // …and nothing has filled a list yet, so what fills them is the migration.
    for (const list of Object.values(LISTS)) {
      expect(before.filter((row) => row[list] !== null)).toEqual([]);
    }

    const fill = statementsOfMigrationContaining(LIST_MIGRATION).filter((statement) =>
      /^update\b/i.test(statement),
    );
    expect(fill).toHaveLength(SINGLES.length);
    for (const statement of fill) {
      await sql.unsafe(statement);
    }

    const after = await everyIngredient();
    const expected = before.map((row) => ({
      ...row,
      ...Object.fromEntries(
        SINGLES.map((single) => [LISTS[single], row[single] === null ? null : [row[single]]]),
      ),
    }));
    // The singles compared too: the fill reads them and writes nothing back.
    expect(after).toEqual(expected);
  });
});
