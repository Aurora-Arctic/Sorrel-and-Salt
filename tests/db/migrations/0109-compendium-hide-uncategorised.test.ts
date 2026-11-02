import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { useTestDatabase } from '../../support/db/database';
import { insertIngredient } from '../../support/db/insert-ingredient';
import { fromRoot } from '../../support/paths';
import { A } from '../../support/as-user';
import { makeIngredient, makeVariant } from '../../support/fixtures';
import { WORKSPACE_W_ID } from '@/db/seed/standard';

// A migration test, retired once `0109` is in production's journal. `0109` hides each live compendium entry that names no category, on it or on any of its forms, as the seed does for a new entry.
// The test database is already migrated, so the statements run again over rows each case writes.

const FILE = fromRoot('src/db/migrations/0109_compendium-hide-uncategorised.sql');

const STATEMENTS = readFileSync(FILE, 'utf8')
  .split('--> statement-breakpoint')
  .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

const run = async () => {
  for (const statement of STATEMENTS) await sql.unsafe(statement);
};

async function entry(
  name: string,
  options: {
    categories?: string[];
    formCategories?: string[];
    workspaceId?: string | null;
    deleted?: boolean;
  } = {},
): Promise<string> {
  const id = await insertIngredient(
    sql,
    makeIngredient({
      name,
      canonicalName: name.toLowerCase(),
      nomenclature: 'botanical',
      workspaceId: options.workspaceId ?? null,
      categories: options.categories ?? [],
      variants: [makeVariant({ form: 'Testform', categories: options.formCategories ?? [] })],
    }),
    A.id,
  );
  if (options.deleted) {
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;
  }
  return id;
}

const stateOf = async (id: string) => {
  const [row] = await sql<{ shown: boolean; updated_by: string }[]>`
    select shown, updated_by from ingredients where id = ${id}`;
  return row;
};

describe('0109', () => {
  it('hides a live compendium entry that names no category anywhere, leaving its updated_by', async () => {
    const bare = await entry('Fixture Bareroot');

    await run();

    expect(await stateOf(bare)).toEqual({ shown: false, updated_by: A.id });
  });

  it('leaves shown an entry with a category on it, and one with a category only on a form', async () => {
    const onEntry = await entry('Fixture Entryroot', { categories: ['Protection'] });
    const onForm = await entry('Fixture Formroot', { formCategories: ['Protection'] });

    await run();

    expect(await stateOf(onEntry)).toEqual({ shown: true, updated_by: A.id });
    expect(await stateOf(onForm)).toEqual({ shown: true, updated_by: A.id });
  });

  it("leaves a coven's own entry and a removed compendium entry as they were", async () => {
    const coven = await entry('Fixture Covenroot', { workspaceId: WORKSPACE_W_ID });
    const removed = await entry('Fixture Goneroot', { deleted: true });

    await run();

    expect(await stateOf(coven)).toEqual({ shown: true, updated_by: A.id });
    expect((await stateOf(removed)).shown).toBe(true);
  });
});
