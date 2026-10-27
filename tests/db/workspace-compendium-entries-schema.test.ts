import { beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from '../support/db/database';
import { insertCupboardEntry } from '../support/db/insert-cupboard-entry';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient } from '../support/fixtures/ingredient';
import { FIXTURE_USERS, WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';

// The table's two live uniques (CLAUDE.md rule 4): one presence per coven and
// compendium entry, and one label per coven, case folded. This file proves
// what each index is keyed on; the catalogue sweep in
// partial-unique-indexes.test.ts proves for every index alike that a soft
// delete frees the slot (M14.27).

const AUTHOR = FIXTURE_USERS.A.id;

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

let testwort: string;
let mockwort: string;

beforeAll(async () => {
  testwort = await insertIngredient(
    sql,
    makeIngredient({ name: 'Testwort', canonicalName: 'Fixtura entrica' }),
    AUTHOR,
  );
  mockwort = await insertIngredient(
    sql,
    makeIngredient({ name: 'Mockwort', canonicalName: 'Fixtura mockentrica' }),
    AUTHOR,
  );
});

/** What a write met: the unique that refused it, or `admitted`. */
const outcomeOf = (work: Promise<unknown>) =>
  work.then(
    () => 'admitted',
    (error: postgres.PostgresError) =>
      error.code === '23505' ? error.constraint_name : error.message,
  );

describe('workspace_compendium_entries', () => {
  it('holds an entry once per coven', async () => {
    const first = await insertCupboardEntry(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: testwort },
      AUTHOR,
    );
    const entry = { workspaceId: WORKSPACE_W_ID, ingredientId: testwort };

    // Precondition: the first row is live, so only the index can refuse the second.
    const [live] =
      await sql`select deleted_at from workspace_compendium_entries where id = ${first}`;
    expect(live.deleted_at).toBeNull();

    expect(await outcomeOf(insertCupboardEntry(sql, entry, AUTHOR))).toBe(
      'workspace_compendium_entries_workspace_ingredient_unique',
    );
    // Another coven holds the same entry freely.
    expect(
      await outcomeOf(insertCupboardEntry(sql, { ...entry, workspaceId: WORKSPACE_X_ID }, AUTHOR)),
    ).toBe('admitted');
  });

  it('holds a label once per coven whatever its case', async () => {
    await insertCupboardEntry(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: mockwort, label: 'Mockleaf' },
      AUTHOR,
    );
    const other = (label: string | null, workspaceId = WORKSPACE_W_ID) =>
      insertCupboardEntry(sql, { workspaceId, ingredientId: testwort, label }, AUTHOR);

    // A second entry in the coven, so a clash can only be the label's.
    await softDeleteLive(WORKSPACE_W_ID, testwort);
    expect(await outcomeOf(other('MOCKLEAF'))).toBe(
      'workspace_compendium_entries_workspace_label_unique',
    );

    // Two covens may share a label.
    await softDeleteLive(WORKSPACE_X_ID, testwort);
    expect(await outcomeOf(other('Mockleaf', WORKSPACE_X_ID))).toBe('admitted');

    // A null label reserves nothing.
    await softDeleteLive(WORKSPACE_W_ID, testwort);
    expect(await outcomeOf(other(null))).toBe('admitted');
    await softDeleteLive(WORKSPACE_W_ID, testwort);
    expect(await outcomeOf(other(null))).toBe('admitted');
  });
});

/** Frees a coven's slot for `ingredientId`, so the next insert meets the label index alone. */
async function softDeleteLive(workspaceId: string, ingredientId: string) {
  await sql`
    update workspace_compendium_entries set deleted_at = now(), deleted_by = ${AUTHOR}
    where workspace_id = ${workspaceId} and ingredient_id = ${ingredientId} and deleted_at is null`;
}
