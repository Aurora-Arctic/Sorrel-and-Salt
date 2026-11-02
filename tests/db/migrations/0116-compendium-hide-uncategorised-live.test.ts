import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { useTestDatabase } from '../../support/db/database';
import { insertIngredient } from '../../support/db/insert-ingredient';
import { fromRoot } from '../../support/paths';
import { A } from '../../support/as-user';
import { makeIngredient, makeVariant } from '../../support/fixtures';
import { WORKSPACE_W_ID } from '@/db/seed/standard';

// A migration test, retired once `0116` is in production's journal. `0116` hides each live, shown compendium entry with no
// live category: a pair counts only where its category and that category's group are live, filed on the entry or on a live form.
// The test database is already migrated, so the statements run again over rows each case writes.

const FILE = fromRoot('src/db/migrations/0116_compendium-hide-uncategorised-live.sql');

const STATEMENTS = readFileSync(FILE, 'utf8')
  .split('--> statement-breakpoint')
  .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

// Invented categories in two invented groups. A test soft-deletes one category, or the second group, after filing an entry under it,
// since the shared inserter files only under a live category.
beforeAll(async () => {
  const stamps = { created_by: A.id, updated_by: A.id };
  const group = (name: string) => ({
    name,
    slug: name.toLowerCase().replace(' ', '-'),
    description: 'Invented',
    color_dark: '#5d8ab1',
    color_light: '#23201a',
    ...stamps,
  });
  const [live, second] = await sql`
    insert into category_groups ${sql([group('Hide Live'), group('Hide Gone')])} returning id`;
  const category = (name: string, groupId: string) => ({
    name,
    slug: name.toLowerCase().replace(' ', '-'),
    description: 'Invented',
    group_id: groupId,
    ...stamps,
  });
  await sql`
    insert into categories ${sql([
      category('Hide Kept', live.id),
      category('Hide Retired', live.id),
      category('Hide Orphan', second.id),
    ])}`;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

const run = async () => {
  for (const statement of STATEMENTS) await sql.unsafe(statement);
};

async function entry(
  name: string,
  options: { categories?: string[]; formCategories?: string[]; workspaceId?: string | null } = {},
): Promise<string> {
  return insertIngredient(
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
}

const shown = async (id: string) => {
  const [row] = await sql<{ shown: boolean }[]>`select shown from ingredients where id = ${id}`;
  return row.shown;
};

const pairs = async (id: string) => {
  const [{ count }] = await sql<{ count: number }[]>`
    select count(*)::int as count from ingredient_categories where ingredient_id = ${id}`;
  return count;
};

describe('0116', () => {
  it('hides a live compendium entry with no category, leaving its updated_by', async () => {
    const bare = await entry('Fixture Bareroot');
    expect(await shown(bare)).toBe(true);

    await run();

    const [row] = await sql`select shown, updated_by from ingredients where id = ${bare}`;
    // A curator's stamp must survive: the seed reads any stamp but its own as a person's edit.
    expect(row).toEqual({ shown: false, updated_by: A.id });
  });

  it('leaves shown an entry with a live category of its own, and one whose only category is on a live form', async () => {
    const onEntry = await entry('Fixture Entryroot', { categories: ['Hide Kept'] });
    const onForm = await entry('Fixture Formroot', { formCategories: ['Hide Kept'] });

    await run();

    expect(await shown(onEntry)).toBe(true);
    expect(await shown(onForm)).toBe(true);
  });

  it("leaves a coven's own entry with no category shown", async () => {
    const coven = await entry('Fixture Covenroot', { workspaceId: WORKSPACE_W_ID });
    expect(await pairs(coven)).toBe(0);

    await run();

    expect(await shown(coven)).toBe(true);
  });

  it('hides an entry whose only category sits on a soft-deleted form', async () => {
    const id = await entry('Fixture Ashroot', { formCategories: ['Hide Kept'] });
    await sql`update ingredient_variants set deleted_at = now(), deleted_by = ${A.id} where ingredient_id = ${id}`;
    // Why it could have stayed shown: the pair table is hard-deleted, so the deleted form's pair is still stored.
    expect(await pairs(id)).toBe(1);

    await run();

    expect(await shown(id)).toBe(false);
  });

  it('hides an entry whose only category is soft-deleted, and one whose only category is in a soft-deleted group', async () => {
    const retired = await entry('Fixture Retiredroot', { categories: ['Hide Retired'] });
    const orphan = await entry('Fixture Orphanroot', { formCategories: ['Hide Orphan'] });
    await sql`update categories set deleted_at = now(), deleted_by = ${A.id} where name = 'Hide Retired'`;
    await sql`update category_groups set deleted_at = now(), deleted_by = ${A.id} where name = 'Hide Gone'`;
    // Why either could have stayed shown: each still has its pair stored.
    expect(await pairs(retired)).toBe(1);
    expect(await pairs(orphan)).toBe(1);

    await run();

    expect(await shown(retired)).toBe(false);
    expect(await shown(orphan)).toBe(false);
  });

  it('changes nothing when run a second time', async () => {
    const bare = await entry('Fixture Bareroot');
    const kept = await entry('Fixture Entryroot', { categories: ['Hide Kept'] });
    await run();
    const before = await sql`select id, shown, updated_by, updated_at from ingredients order by id`;

    await run();

    expect(
      await sql`select id, shown, updated_by, updated_at from ingredients order by id`,
    ).toEqual(before);
    expect([await shown(bare), await shown(kept)]).toEqual([false, true]);
  });
});
