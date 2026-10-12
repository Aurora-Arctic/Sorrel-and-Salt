import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../support/db/database';
import { insertIngredient } from '../../support/db/insert-ingredient';
import { makeIngredient } from '../../support/fixtures';
import { fromRoot } from '../../support/paths';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';

// Rule 7 (claude-docs/testing/layer-ownership.md, "What a test may assert"):
// migration data tests, retired once `0062` is in production's journal. They
// re-run the migration's own guard against rows written here, rather than a
// copy of it; the tables' shape is the schema tests'. The fill's tests retired
// with MB.223, which dropped the `form` column the fill reads, so no migrated
// database can run it again.

/** `0062`'s statements, comment lines stripped, as the migrator splits them. */
const STATEMENTS = readFileSync(
  fromRoot('src/db/migrations/0062_ingredient-variants-fill.sql'),
  'utf8',
)
  .split('--> statement-breakpoint')
  .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

function statementStarting(prefix: string): string {
  const found = STATEMENTS.find((statement) => statement.startsWith(prefix));
  if (!found) throw new Error(`0062 has no statement starting ${prefix}`);
  return found;
}

const GUARD = statementStarting('DO $$');

const AUTHOR = FIXTURE_USERS.A.id;

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

/** A fresh ingredient under an invented formal name, written by A, with no variant. */
async function anIngredient(overrides: Parameters<typeof makeIngredient>[0] = {}) {
  const t = crypto.randomUUID().slice(0, 8);
  return insertIngredient(
    sql,
    makeIngredient({
      name: `Testwort ${t}`,
      canonicalName: `Fixtura testalis ${t}`,
      variants: [],
      ...overrides,
    }),
    AUTHOR,
  );
}

describe('0062: the guard', () => {
  beforeAll(async () => {
    // The database as the guard met it: the indexes it protects come after it.
    await sql`drop index ingredients_compendium_identity_key_unique`;
    await sql`drop index ingredients_workspace_identity_key_unique`;
  });

  it('passes a database holding one formal name once per tier, the same name in two tiers included', async () => {
    const t = crypto.randomUUID().slice(0, 8);
    await anIngredient({ canonicalName: `Fixtura bitieria ${t}` });
    await anIngredient({ workspaceId: WORKSPACE_W_ID, canonicalName: `Fixtura bitieria ${t}` });

    await expect(sql.unsafe(GUARD)).resolves.toBeDefined();
  });

  it('refuses two live entries of one formal name in a tier, naming the procedure, and passes once one is deleted', async () => {
    const t = crypto.randomUUID().slice(0, 8);
    await anIngredient({ canonicalName: `Fixtura duplex ${t}` });
    const second = await anIngredient({ canonicalName: `Fixtura duplex ${t}` });

    const error = await failureOf(sql.unsafe(GUARD));

    // P0001 is raise_exception: the guard's own refusal, not a constraint's.
    expect(error.code).toBe('P0001');
    expect(error.hint).toEqual(expect.stringContaining('Merging a group'));

    await sql`
      update ingredients set deleted_at = now(), deleted_by = ${AUTHOR} where id = ${second}
    `;
    await expect(sql.unsafe(GUARD)).resolves.toBeDefined();
  });
});
