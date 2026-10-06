import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { statementsOfMigrationContaining } from '../../../support/db/migrations';
import { type IngredientFixture, makeIngredient } from '../../../support/fixtures';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';
import type { ColumnRow, ListedIngredientRow } from './types';

// Rule 10 over MB.157's list: `elements` added beside the single `element`
// and filled from it (MB.158), then filled again from whatever the live
// deploy wrote to the single before MB.159 switched every reader and writer;
// MB.160 drops the single (claude-docs/db/identity-model.md, "The ingredient
// identity model").
const LIST_MIGRATION = 'ADD COLUMN "elements"';
const REFILL_MIGRATION = '"elements" IS DISTINCT FROM';

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
    select id, element, elements, deleted_at::text, updated_at::text
    from ingredients order by id
  `;
}

/** The migration's one `UPDATE`, run here against rows the test has shaped. */
async function runFill(marker: string): Promise<void> {
  const fill = statementsOfMigrationContaining(marker).filter((statement) =>
    /^update\b/i.test(statement),
  );
  expect(fill).toHaveLength(1);
  await sql.unsafe(fill[0]);
}

/** The row without its `updated_at`, which any write moves. */
function withoutStamp(row: ListedIngredientRow): ListedIngredientRow {
  const { updated_at: _stamp, ...rest } = row;
  return rest as ListedIngredientRow;
}

/** Each row with its list as one entry of its single, or null with none. */
const derivedFromSingle = (rows: ListedIngredientRow[]) =>
  rows.map((row) => ({ ...row, elements: row.element === null ? null : [row.element as string] }));

/**
 * The seed writes lists since MB.159; before it, it wrote one element to
 * `element`. Its rows are put back that way, the single holding each list's
 * first entry, and the list as `list` says — so a fill meets the rows a
 * deployed database held.
 */
async function singleAsItWas(list: 'empty' | 'filled'): Promise<void> {
  await sql`update ingredients set element = elements[1]`;
  await sql.unsafe(
    list === 'empty'
      ? 'update ingredients set elements = null'
      : 'update ingredients set elements = case when element is null then null else array[element] end',
  );
}

/**
 * A W row through the shared inserter, its single then set through raw SQL as
 * the old deploy wrote it — the schema no longer declares the column.
 */
async function addWithSingle(
  name: string,
  elements: IngredientFixture['elements'],
  element: string | null,
): Promise<string> {
  const id = await insertIngredient(
    sql,
    makeIngredient({
      workspaceId: WORKSPACE_W_ID,
      name,
      canonicalName: `Fixtura ${name}`,
      elements,
    }),
    FIXTURE_USERS.A.id,
  );
  await sql`update ingredients set element = ${element} where id = ${id}`;
  return id;
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

  // Undeclared since MB.159, and dropped only by MB.160.
  it('leaves the single column in the database as it was: a nullable ingredient_element', async () => {
    const { element } = await columnsNamed(['element']);

    expect(element).toMatchObject({
      data_type: 'USER-DEFINED',
      udt_name: 'ingredient_element',
      is_nullable: 'YES',
      column_default: null,
    });
  });

  // The template is migrated before it is seeded, so the migrations' own
  // fills are re-run here against the seeded rows — the order every deployed
  // database met them in.
  it('fills from the single column where one is set, and nowhere else (MB.158)', async () => {
    await singleAsItWas('empty');
    // A row with no element, and a soft-deleted one with: a spell still reads
    // an ingredient deleted after it went into the jar (M5.3).
    await addWithSingle('Testwort (bare)', null, null);
    const deleted = await addWithSingle('Testwort (deleted)', null, 'water');
    await sql`
      update ingredients set deleted_at = now(), deleted_by = ${FIXTURE_USERS.A.id}
      where id = ${deleted}`;

    const before = await everyIngredient();
    // Each case is present, so no assertion below holds over an empty set:
    // the seeded rows carry elements, the added ones the two edges…
    expect(before.filter((row) => row.element !== null).length).toBeGreaterThan(1);
    expect(before.filter((row) => row.element === null).length).toBeGreaterThan(0);
    expect(before.find((row) => row.id === deleted)?.deleted_at).not.toBeNull();
    // …and nothing has filled a list yet, so what fills them is the migration.
    expect(before.filter((row) => row.elements !== null)).toEqual([]);

    await runFill(LIST_MIGRATION);

    // The single compared too: the fill reads it and writes nothing back.
    expect((await everyIngredient()).map(withoutStamp)).toEqual(
      derivedFromSingle(before).map(withoutStamp),
    );
  });

  // Between MB.158's migration and MB.159's deploy, the live code wrote the
  // single alone: a new row, a changed value, a cleared one.
  it('fills again from every single the live deploy wrote after, touching no other row (MB.159)', async () => {
    await singleAsItWas('filled');
    const added = await addWithSingle('Added', null, 'fire');
    const changed = await addWithSingle('Changed', ['earth'], 'air');
    const cleared = await addWithSingle('Cleared', ['water'], null);

    const before = await everyIngredient();
    const diverged = new Set([added, changed, cleared]);
    const agreeing = before.filter((row) => !diverged.has(row.id));
    // Why a row could be left wrong: each diverged one disagrees with its single…
    const expected = derivedFromSingle(before);
    for (const id of diverged) {
      const index = before.findIndex((row) => row.id === id);
      expect(before[index]).not.toEqual(expected[index]);
    }
    // …and why one could be touched needlessly: the seeded rows agree, a list among them.
    expect(agreeing.length).toBeGreaterThan(0);
    expect(agreeing.some((row) => row.elements !== null)).toBe(true);
    expect(derivedFromSingle(agreeing)).toEqual(agreeing);

    await runFill(REFILL_MIGRATION);

    const after = await everyIngredient();
    expect(after.map(withoutStamp)).toEqual(expected.map(withoutStamp));
    // A row already right is not rewritten, so its `updated_at` stands.
    expect(after.filter((row) => !diverged.has(row.id))).toEqual(agreeing);
  });
});
