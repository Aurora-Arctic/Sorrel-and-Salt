import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden, ValidationError } from '@/lib/errors';
import type { Session } from '@/lib/session';
import {
  categoriesOf,
  createCompendiumEntry,
  createWorkspaceIngredient,
  updateCompendiumEntry,
  updateWorkspaceIngredient,
} from '@/modules/ingredients';
import { A, B, C, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { type IngredientFixture, type Overrides, makeIngredient } from '../../../support/fixtures';

// MB.125: the categories an ingredient is filed under, written by either
// tier's service in the ingredient's own transaction (story 30). The join
// table is hard-deleted (MB.34), so a pair dropped leaves no row and a pair
// kept keeps the stamps of whoever added it. The ingredients are emptied per
// test; a category a test retires is put back after it, since the
// vocabularies are the file's clone's.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let protection: string;
let cleansing: string;
let love: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  protection = await categoryId('Protection');
  cleansing = await categoryId('Cleansing');
  love = await categoryId('Love');
});

afterEach(async () => {
  await sql`update categories set deleted_at = null, deleted_by = null where deleted_at is not null`;
});

async function categoryId(name: string): Promise<string> {
  const [row] = await sql`select id from categories where name = ${name} and deleted_at is null`;
  if (!row) throw new Error(`The standard seed carries no category named ${name}`);
  return row.id as string;
}

/** A W-local stub: no formal name, and so `none`. */
const local = (overrides: Overrides<IngredientFixture> = {}) =>
  makeIngredient({ workspaceId: WORKSPACE_W_ID, nomenclature: 'none', ...overrides });

/** A compendium stub: no formal name, and so `none`. */
const entry = (overrides: Overrides<IngredientFixture> = {}) =>
  makeIngredient({ workspaceId: null, nomenclature: 'none', ...overrides });

/** Seeds an ingredient through the shared inserter, stamped by A — not through the code under test. */
const seed = (fixture: IngredientFixture) => insertIngredient(sql, fixture, A.id);

/** The whole stub as either service takes it, filed under these categories. */
const input = (categoryIds: string[]) => ({
  name: 'Testwort',
  nomenclature: 'none' as const,
  categoryIds,
});

/** Every pair the ingredient holds, with its stamps and the transaction that wrote it. */
function pairRows(ingredientId: string) {
  return sql`
    select category_id, created_by, created_at, updated_by, xmin::text as xmin
    from ingredient_categories where ingredient_id = ${ingredientId}
    order by category_id`;
}

const categoryIdsOf = async (ingredientId: string) =>
  (await pairRows(ingredientId)).map((row) => row.category_id as string).sort();

/** What the read answers for one ingredient: each category's name. */
async function readBack(session: Session | null, id: string, workspaceId: string | null) {
  const [answer] = await categoriesOf(session, [{ id, workspaceId }]);
  if (answer instanceof Error) throw answer;
  return answer.map((category) => category.name);
}

/** The issues a refused write carried, by path and message. */
async function refusal(write: Promise<unknown>) {
  const error = await write.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ValidationError);
  return (error as ValidationError).issues;
}

describe('a save carrying categories', () => {
  it('writes one pair per id, stamped by the writer, in the ingredient’s own transaction', async () => {
    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      input([protection, cleansing]),
    );

    const [row] = await sql`select xmin::text as xmin from ingredients where id = ${created.id}`;
    const pairs = await pairRows(created.id);
    expect(pairs.map((pair) => pair.category_id).sort()).toEqual([protection, cleansing].sort());
    for (const pair of pairs) {
      expect(pair).toMatchObject({ created_by: B.id, updated_by: B.id, xmin: row.xmin });
    }
    expect(await readBack(asUser(B), created.id, WORKSPACE_W_ID)).toEqual([
      'Cleansing',
      'Protection',
    ]);
  });

  it('writes a repeated id once', async () => {
    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      input([protection, cleansing, protection]),
    );

    expect(await categoryIdsOf(created.id)).toEqual([protection, cleansing].sort());
  });

  it('saves with none, absent or empty', async () => {
    const absent = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, {
      name: 'Testwort',
    });
    const empty = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, {
      name: 'Mockleaf',
      categoryIds: [],
    });

    expect(await categoryIdsOf(absent.id)).toEqual([]);
    expect(await categoryIdsOf(empty.id)).toEqual([]);
  });

  // The pair insert is made to fail after every check has passed, so what is
  // proved is the transaction, not a refusal made before it opened.
  it('leaves no ingredient behind when the category write fails', async () => {
    await sql`
      create or replace function mb125_refuse_pair() returns trigger language plpgsql as $$
      begin raise exception 'refused by the test'; end $$`;
    await sql`
      create trigger mb125_refuse_pair before insert on ingredient_categories
      for each row execute function mb125_refuse_pair()`;
    try {
      const error = await createWorkspaceIngredient(
        asUser(B),
        WORKSPACE_W_ID,
        input([protection]),
      ).catch((caught: unknown) => caught);
      // Drizzle wraps the driver's error, keeping it as the cause.
      expect((error as { cause?: unknown }).cause).toMatchObject({
        message: 'refused by the test',
      });
    } finally {
      await sql`drop trigger if exists mb125_refuse_pair on ingredient_categories`;
      await sql`drop function if exists mb125_refuse_pair`;
    }

    expect(await sql`select id from ingredients`).toEqual([]);
    // The precondition: without the trigger the same save writes both.
    const saved = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, input([protection]));
    expect(await categoryIdsOf(saved.id)).toEqual([protection]);
  });

  it('lets an admin file a compendium entry', async () => {
    const created = await createCompendiumEntry(asUser(E), input([love]));

    expect(await pairRows(created.id)).toEqual([
      expect.objectContaining({ category_id: love, created_by: E.id }),
    ]);
    expect(await readBack(null, created.id, null)).toEqual(['Love']);
  });
});

describe('an update replaces the set', () => {
  it('keeps a pair still listed untouched, drops one left out, and stamps one added by the editor', async () => {
    const id = await seed(local({ categories: ['Protection', 'Cleansing'] }));
    const [kept] = await sql`
      select created_by, created_at, updated_by, xmin::text as xmin from ingredient_categories
      where ingredient_id = ${id} and category_id = ${protection}`;
    // The precondition: the pair kept was written by A, so B's stamps would show.
    expect(kept.created_by).toBe(A.id);

    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, input([protection, love]));

    const pairs = await pairRows(id);
    expect(pairs.map((pair) => pair.category_id).sort()).toEqual([protection, love].sort());
    expect(pairs.find((pair) => pair.category_id === protection)).toEqual({
      category_id: protection,
      ...kept,
    });
    expect(pairs.find((pair) => pair.category_id === love)).toMatchObject({
      created_by: B.id,
      updated_by: B.id,
    });
    expect(await sql`select 1 from ingredient_categories where category_id = ${cleansing}`).toEqual(
      [],
    );
  });

  it('writes nothing to a set that does not change', async () => {
    const id = await seed(local({ categories: ['Protection'] }));
    const before = await pairRows(id);

    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, input([protection]));

    expect(await pairRows(id)).toEqual(before);
  });

  it('clears them all on an empty list', async () => {
    const id = await seed(local({ categories: ['Protection', 'Cleansing'] }));

    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, input([]));

    expect(await categoryIdsOf(id)).toEqual([]);
  });

  it('can add back a pair it dropped', async () => {
    const id = await seed(local({ categories: ['Protection'] }));

    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, input([]));
    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, input([protection]));

    expect(await pairRows(id)).toEqual([
      expect.objectContaining({ category_id: protection, created_by: B.id }),
    ]);
  });

  // The read shows no retired category, so the form never sends one back; a
  // save leaving its pair alone keeps it for a restore, as a reference link is.
  it('leaves a pair whose category is retired in place', async () => {
    const id = await seed(local({ categories: ['Protection', 'Love'] }));
    await sql`update categories set deleted_at = now(), deleted_by = ${E.id} where id = ${love}`;
    // The precondition: the read no longer shows it, so a save would not list it.
    expect(await readBack(asUser(B), id, WORKSPACE_W_ID)).toEqual(['Protection']);

    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, input([cleansing]));

    expect(await categoryIdsOf(id)).toEqual([cleansing, love].sort());
  });

  it('brings a compendium entry’s the same way', async () => {
    const id = await seed(entry({ categories: ['Protection', 'Cleansing'] }));

    await updateCompendiumEntry(asUser(E), id, input([cleansing, love]));

    expect(await categoryIdsOf(id)).toEqual([cleansing, love].sort());
    expect(await readBack(null, id, null)).toEqual(['Cleansing', 'Love']);
  });
});

describe('an id naming no live category', () => {
  const UNKNOWN = '00000000-0000-4000-8000-0000000000c9';

  it('is refused beside its entry, and the ingredient is not written', async () => {
    const issues = await refusal(
      createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, input([protection, UNKNOWN])),
    );

    expect(issues).toEqual([{ path: ['categoryIds', 1], message: expect.any(String) }]);
    expect(await sql`select id from ingredients`).toEqual([]);
  });

  it('is refused when the category is soft-deleted', async () => {
    const id = await seed(local());
    // The precondition: the category is a real row, and pickable while live.
    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, input([love]));
    await sql`update categories set deleted_at = now(), deleted_by = ${E.id} where id = ${love}`;

    const issues = await refusal(
      updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, input([cleansing, love])),
    );

    expect(issues).toEqual([{ path: ['categoryIds', 1], message: expect.any(String) }]);
    expect(await categoryIdsOf(id)).toEqual([love]);
  });

  it('is refused for a compendium entry too', async () => {
    const issues = await refusal(createCompendiumEntry(asUser(E), input([UNKNOWN])));

    expect(issues).toEqual([{ path: ['categoryIds', 0], message: expect.any(String) }]);
  });
});

describe('who may file an ingredient', () => {
  it('refuses a viewer, as for any workspace write', async () => {
    const id = await seed(local({ categories: ['Protection'] }));
    // The precondition: the same write by a member succeeds.
    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, input([protection, love]));

    await expect(
      updateWorkspaceIngredient(asUser(C), WORKSPACE_W_ID, id, input([cleansing])),
    ).rejects.toThrow(Forbidden);
    await expect(
      createWorkspaceIngredient(asUser(C), WORKSPACE_W_ID, input([cleansing])),
    ).rejects.toThrow(Forbidden);
    expect(await categoryIdsOf(id)).toEqual([protection, love].sort());
  });

  it('files a compendium entry only under the site admin’s proof', async () => {
    const id = await seed(entry({ categories: ['Protection'] }));
    // The precondition: the same write by the admin succeeds.
    await updateCompendiumEntry(asUser(E), id, input([protection, love]));

    await expect(updateCompendiumEntry(asUser(A), id, input([cleansing]))).rejects.toThrow(
      Forbidden,
    );
    await expect(createCompendiumEntry(asUser(B), input([cleansing]))).rejects.toThrow(Forbidden);
    expect(await categoryIdsOf(id)).toEqual([protection, love].sort());
  });
});
