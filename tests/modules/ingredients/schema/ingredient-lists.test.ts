import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { statementsOfMigrationContaining } from '../../../support/db/migrations';
import { makeIngredient } from '../../../support/fixtures';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';
import type { ColumnRow, ListedIngredientRow } from './types';

// Rule 10 over MB.134's lists: `planets`, `zodiac_signs` and `colors` added
// beside the single columns and filled from them (MB.135), then filled again
// from whatever the live deploy wrote to a single before MB.136 switched
// every reader and writer — claude-docs/db/identity-model.md, "The ingredient
// identity model".
const LISTS = { planet: 'planets', zodiac: 'zodiac_signs', color: 'colors' } as const;
type Single = keyof typeof LISTS;
const SINGLES = Object.keys(LISTS) as Single[];

const LIST_MIGRATION = 'ADD COLUMN "planets"';
const REFILL_MIGRATION = '"planets" IS DISTINCT FROM';

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
    select id, planet, zodiac, color, planets, zodiac_signs, colors, updated_at::text
    from ingredients order by id
  `;
}

/** The migration's `UPDATE`s, run here against rows the test has shaped. */
async function runFill(marker: string): Promise<void> {
  const fill = statementsOfMigrationContaining(marker).filter((statement) =>
    /^update\b/i.test(statement),
  );
  expect(fill).toHaveLength(SINGLES.length);
  for (const statement of fill) await sql.unsafe(statement);
}

/** The row without its `updated_at`, which any write moves. */
function withoutStamp(row: ListedIngredientRow): ListedIngredientRow {
  const { updated_at: _stamp, ...rest } = row;
  return rest as ListedIngredientRow;
}

/** Each row with every list as one entry of its single, or null with none. */
const derivedFromSingles = (rows: ListedIngredientRow[]) =>
  rows.map((row) => ({
    ...row,
    ...Object.fromEntries(
      SINGLES.map((single) => [
        LISTS[single],
        row[single] === null ? null : [row[single] as string],
      ]),
    ),
  }));

/**
 * The seed writes lists since MB.136; before it, it wrote one planet to
 * `planet`. Its rows are put back that way, singles holding each list's
 * first entry, and the lists as `lists` says — so a fill meets the rows a
 * deployed database held.
 */
async function singlesAsTheyWere(lists: 'empty' | 'filled'): Promise<void> {
  await sql`
    update ingredients
    set planet = planets[1], zodiac = zodiac_signs[1], color = colors[1]`;
  await sql.unsafe(
    lists === 'empty'
      ? 'update ingredients set planets = null, zodiac_signs = null, colors = null'
      : `update ingredients set
          planets = case when planet is null then null else array[planet] end,
          zodiac_signs = case when zodiac is null then null else array[zodiac] end,
          colors = case when color is null then null else array[color] end`,
  );
}

/** A W row through the shared inserter, its singles then set as the old deploy wrote them. */
async function addWithSingles(
  name: string,
  lists: Partial<Record<'planets' | 'zodiacSigns' | 'colors', string[]>>,
  singles: Record<Single, string | null>,
): Promise<string> {
  const id = await insertIngredient(
    sql,
    makeIngredient({
      workspaceId: WORKSPACE_W_ID,
      name,
      canonicalName: `Fixtura ${name}`,
      ...lists,
    }),
    FIXTURE_USERS.A.id,
  );
  await sql`update ingredients set ${sql(singles)} where id = ${id}`;
  return id;
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

  // Undeclared since MB.136, and dropped only by MB.137, once nothing deployed reads them.
  it('leave the single columns in the database as they were: nullable text', async () => {
    const columns = await columnsNamed(SINGLES);

    for (const single of SINGLES) {
      expect(columns[single]).toMatchObject({
        data_type: 'text',
        is_nullable: 'YES',
        column_default: null,
      });
    }
  });

  // The template is migrated before it is seeded, so a migration's own fill
  // is re-run here against rows shaped as a deployed database held them.
  it('fill each from its single column where one is set, and nowhere else (MB.135)', async () => {
    await singlesAsTheyWere('empty');
    // The standard seed states a planet and nothing else, so the other two
    // singles are set on a row of their own, and one row carries none.
    await addWithSingles('Testwort', {}, { planet: 'Mercury', zodiac: 'Gemini', color: 'Green' });
    await addWithSingles('Testwort (bare)', {}, { planet: null, zodiac: null, color: null });

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

    await runFill(LIST_MIGRATION);

    // The singles compared too: the fill reads them and writes nothing back.
    expect((await everyIngredient()).map(withoutStamp)).toEqual(
      derivedFromSingles(before).map(withoutStamp),
    );
  });

  // Between MB.135's migration and MB.136's deploy, the live code wrote the
  // singles alone: a new row, a changed value, a cleared one.
  it('fill again from every single the live deploy wrote after, touching no other row (MB.136)', async () => {
    await singlesAsTheyWere('filled');
    const added = await addWithSingles(
      'Added',
      {},
      { planet: 'Mars', zodiac: 'Aries', color: 'Red' },
    );
    const changed = await addWithSingles(
      'Changed',
      { planets: ['Saturn'], zodiacSigns: ['Capricorn'], colors: ['Black'] },
      { planet: 'Venus', zodiac: 'Libra', color: 'Pink' },
    );
    const cleared = await addWithSingles(
      'Cleared',
      { planets: ['Sun'], zodiacSigns: ['Leo'], colors: ['Gold'] },
      { planet: null, zodiac: null, color: null },
    );

    const before = await everyIngredient();
    const diverged = new Set([added, changed, cleared]);
    const agreeing = before.filter((row) => !diverged.has(row.id));
    // Why a row could be left wrong: each diverged one disagrees with its singles…
    const expected = derivedFromSingles(before);
    for (const id of diverged) {
      const index = before.findIndex((row) => row.id === id);
      expect(before[index]).not.toEqual(expected[index]);
    }
    // …and why one could be touched needlessly: the seeded rows agree, a planet among them.
    expect(agreeing.length).toBeGreaterThan(0);
    expect(agreeing.some((row) => row.planets !== null)).toBe(true);
    expect(derivedFromSingles(agreeing)).toEqual(agreeing);

    await runFill(REFILL_MIGRATION);

    const after = await everyIngredient();
    expect(after.map(withoutStamp)).toEqual(expected.map(withoutStamp));
    // A row already right is not rewritten, so its `updated_at` stands.
    const unchanged = after.filter((row) => !diverged.has(row.id));
    expect(unchanged).toEqual(agreeing);
  });
});
