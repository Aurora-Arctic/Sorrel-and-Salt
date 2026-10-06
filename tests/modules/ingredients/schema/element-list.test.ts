import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { statementsOfMigrationContaining } from '../../../support/db/migrations';
import { makeIngredient } from '../../../support/fixtures';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';
import type { ColumnRow, ListedIngredientRow } from './types';

// MB.158, the expand half of rule 10 for MB.157's list: `elements` beside the
// single `element` it replaces, filled from it. MB.159 switches every reader
// and writer; MB.160 drops the single (claude-docs/db/identity-model.md,
// "The ingredient identity model").
const LIST_MIGRATION = 'ADD COLUMN "elements"';

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
    select id, element, elements, deleted_at::text from ingredients order by id
  `;
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

  // Declared and written until MB.159, and dropped only by MB.160.
  it('leaves the single column as it was: a nullable ingredient_element', async () => {
    const { element } = await columnsNamed(['element']);

    expect(element).toMatchObject({
      data_type: 'USER-DEFINED',
      udt_name: 'ingredient_element',
      is_nullable: 'YES',
      column_default: null,
    });
  });

  // The template is migrated before it is seeded, so its lists are empty and
  // the migration's own fill is re-run here against the seeded rows — the
  // order every deployed database met it in.
  it('fills from the single column where one is set, and nowhere else', async () => {
    // A row with no element, and a soft-deleted one with: a spell still reads
    // an ingredient deleted after it went into the jar (M5.3).
    await insertIngredient(
      sql,
      makeIngredient({
        workspaceId: WORKSPACE_W_ID,
        name: 'Testwort (bare)',
        canonicalName: 'Fixtura nuda',
      }),
      FIXTURE_USERS.A.id,
    );
    const deleted = await insertIngredient(
      sql,
      makeIngredient({
        workspaceId: WORKSPACE_W_ID,
        name: 'Testwort (deleted)',
        canonicalName: 'Fixtura deleta',
        element: 'water',
      }),
      FIXTURE_USERS.A.id,
    );
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

    const fill = statementsOfMigrationContaining(LIST_MIGRATION).filter((statement) =>
      /^update\b/i.test(statement),
    );
    expect(fill).toHaveLength(1);
    await sql.unsafe(fill[0]);

    // The single compared too: the fill reads it and writes nothing back.
    expect(await everyIngredient()).toEqual(
      before.map((row) => ({
        ...row,
        elements: row.element === null ? null : [row.element],
      })),
    );
  });
});
