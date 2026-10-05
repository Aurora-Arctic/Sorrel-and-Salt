import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { ValidationError } from '@/lib/errors';
import type { Session } from '@/lib/session';
import {
  createCompendiumEntry,
  createWorkspaceIngredient,
  deleteCompendiumEntry,
  deleteWorkspaceIngredient,
  getIngredient,
  getWorkspaceIngredient,
  substitutesOf,
  updateCompendiumEntry,
  updateWorkspaceIngredient,
} from '@/modules/ingredients';
import type { SubstituteFields } from '@/modules/ingredients/validation/types';
import { A, B, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient, insertSubstituteLink } from '../../../support/db/insert-ingredient';
import { type IngredientFixture, type Overrides, makeIngredient } from '../../../support/fixtures';

// MB.140: an ingredient's substitutes, each a link to another ingredient or a
// typed name (DESIGN.md §5, `ingredient_substitutes`), written in the
// ingredient's own transaction by either tier's service and read back through
// `substitutesOf`, the batch behind `Ingredient.substitutes`. The table is
// emptied per test, so every row a result could come from is one this file
// wrote.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

/** A W-local stub: no formal name, and so `none`. */
const local = (overrides: Overrides<IngredientFixture> = {}) =>
  makeIngredient({ workspaceId: WORKSPACE_W_ID, nomenclature: 'none', ...overrides });

/** A compendium stub: no formal name, and so `none`. */
const entry = (overrides: Overrides<IngredientFixture> = {}) =>
  makeIngredient({ workspaceId: null, nomenclature: 'none', ...overrides });

/** Seeds a row through the shared inserter, stamped by A — not through the code under test. */
const seed = (fixture: IngredientFixture) => insertIngredient(sql, fixture, A.id);

const link = (ingredientId: string): SubstituteFields => ({ ingredientId });
const typed = (name: string): SubstituteFields => ({ name });

/** The whole stub as either service takes it, with these substitutes. */
const input = (name: string, substitutes: SubstituteFields[]) => ({
  name,
  nomenclature: 'none' as const,
  substitutes,
});

/** What the read answers for one ingredient, as name and linked id. */
async function readBack(session: Session | null, id: string, workspaceId: string | null) {
  const [answer] = await substitutesOf(session, [{ id, workspaceId }]);
  if (answer instanceof Error) throw answer;
  return answer.map((substitute) => ({
    name: substitute.name,
    // Strictly null: an object of null columns would be a link to nothing.
    ingredientId: substitute.ingredient === null ? null : String(substitute.ingredient.id),
  }));
}

/** Every substitute row of the ingredient, tombstones included, oldest first. */
function substituteRows(ingredientId: string) {
  return sql`
    select id, substitute_id, name, created_by, deleted_at, deleted_by, xmin::text as xmin
    from ingredient_substitutes where ingredient_id = ${ingredientId}
    order by created_at, name nulls first`;
}

const liveRows = async (ingredientId: string) =>
  (await substituteRows(ingredientId)).filter((row) => row.deleted_at === null);

/** The issues a refused write carried, by path and message. */
async function refusal(write: Promise<unknown>) {
  const error = await write.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ValidationError);
  return (error as ValidationError).issues;
}

describe('a save carrying substitutes', () => {
  it('writes links and typed names together, read back alphabetically by the name each shows', async () => {
    const mockleaf = await seed(entry({ name: 'Mockleaf' }));
    const alder = await seed(local({ name: 'Alder Testbark' }));

    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      input('Testwort', [typed('Zest Root'), link(mockleaf), typed('Bitter Fixture'), link(alder)]),
    );

    expect(await readBack(asUser(B), created.id, WORKSPACE_W_ID)).toEqual([
      { name: 'Alder Testbark', ingredientId: alder },
      { name: 'Bitter Fixture', ingredientId: null },
      { name: 'Mockleaf', ingredientId: mockleaf },
      { name: 'Zest Root', ingredientId: null },
    ]);
    expect(await liveRows(created.id)).toHaveLength(4);
  });

  it('writes them in the ingredient’s own transaction, stamped by the writer', async () => {
    const mockleaf = await seed(entry({ name: 'Mockleaf' }));

    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      input('Testwort', [link(mockleaf), typed('Zest Root')]),
    );

    const [row] = await sql`select xmin::text as xmin from ingredients where id = ${created.id}`;
    for (const substitute of await substituteRows(created.id)) {
      expect(substitute).toMatchObject({ xmin: row.xmin, created_by: B.id });
    }
  });

  // A link reads under its ingredient's label, so a relabel moves it.
  it('reads a link under its ingredient’s current label', async () => {
    const mockleaf = await seed(entry({ name: 'Mockleaf' }));
    const id = await seed(local({ substitutes: ['Fixture Root'] }));
    await insertSubstituteLink(sql, id, mockleaf, A.id);
    await sql`update ingredients set name = 'Aardvark Leaf' where id = ${mockleaf}`;

    expect(await readBack(asUser(B), id, WORKSPACE_W_ID)).toEqual([
      { name: 'Aardvark Leaf', ingredientId: mockleaf },
      { name: 'Fixture Root', ingredientId: null },
    ]);
  });

  it('lets an admin link one compendium entry from another', async () => {
    const mockleaf = await seed(entry({ name: 'Mockleaf' }));

    const created = await createCompendiumEntry(
      asUser(E),
      input('Testwort', [link(mockleaf), typed('Zest Root')]),
    );

    expect(await readBack(null, created.id, null)).toEqual([
      { name: 'Mockleaf', ingredientId: mockleaf },
      { name: 'Zest Root', ingredientId: null },
    ]);
  });
});

describe('a repeated substitute', () => {
  it.each([
    ['link', (id: string) => [link(id), typed('Zest Root'), link(id)]],
    ['name, in another case', () => [typed('Zest Root'), typed('Mock Root'), typed('zest ROOT')]],
  ])('is a field error pathed to the repeated %s, never the index’s 23505', async (_kind, list) => {
    const mockleaf = await seed(entry({ name: 'Mockleaf' }));

    const issues = await refusal(
      createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, input('Testwort', list(mockleaf))),
    );

    expect(issues).toEqual([expect.objectContaining({ path: ['substitutes', 2] })]);
    const [{ n }] = await sql`select count(*)::int as n from ingredients where name = 'Testwort'`;
    expect(n).toBe(0);
  });

  it('is refused on an update too, leaving the live list as it was', async () => {
    const id = await seed(local({ substitutes: ['Zest Root'] }));

    const issues = await refusal(
      updateWorkspaceIngredient(
        asUser(B),
        WORKSPACE_W_ID,
        id,
        input('Testwort', [typed('Zest Root'), typed('zest root')]),
      ),
    );

    expect(issues).toEqual([expect.objectContaining({ path: ['substitutes', 1] })]);
    expect((await liveRows(id)).map((row) => row.name)).toEqual(['Zest Root']);
  });
});

describe('what a substitute may link', () => {
  let elsewhere: string;
  let ours: string;
  let compendium: string;

  beforeEach(async () => {
    elsewhere = await seed(local({ name: 'Xenoleaf', workspaceId: WORKSPACE_X_ID }));
    ours = await seed(local({ name: 'Alder Testbark' }));
    compendium = await seed(entry({ name: 'Mockleaf' }));
  });

  it('lets a coven’s ingredient link the compendium and its own coven', async () => {
    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      input('Testwort', [link(compendium), link(ours)]),
    );

    expect((await liveRows(created.id)).map((row) => row.substitute_id).sort()).toEqual(
      [compendium, ours].sort(),
    );
  });

  it('refuses a coven’s ingredient linking another coven’s, by direct id', async () => {
    // Why it could have succeeded: the id names a live ingredient, which its
    // own coven reads.
    await expect(
      getWorkspaceIngredient(asUser(D), WORKSPACE_X_ID, elsewhere),
    ).resolves.toMatchObject({ id: elsewhere });

    const issues = await refusal(
      createWorkspaceIngredient(
        asUser(B),
        WORKSPACE_W_ID,
        input('Testwort', [link(compendium), link(elsewhere)]),
      ),
    );

    expect(issues).toEqual([expect.objectContaining({ path: ['substitutes', 1] })]);
    const [{ n }] = await sql`select count(*)::int as n from ingredient_substitutes`;
    expect(n).toBe(0);
  });

  it('refuses it on an update the same way, writing nothing', async () => {
    const id = await seed(local({ name: 'Testwort', substitutes: ['Zest Root'] }));

    const issues = await refusal(
      updateWorkspaceIngredient(
        asUser(B),
        WORKSPACE_W_ID,
        id,
        input('Testwort', [link(elsewhere)]),
      ),
    );

    expect(issues).toEqual([expect.objectContaining({ path: ['substitutes', 0] })]);
    expect((await liveRows(id)).map((row) => row.name)).toEqual(['Zest Root']);
  });

  it('refuses a compendium entry linking a coven’s ingredient, by direct id', async () => {
    // Why it could have succeeded: the id names a live ingredient, which W reads.
    await expect(getWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, ours)).resolves.toMatchObject({
      id: ours,
    });

    const issues = await refusal(
      createCompendiumEntry(asUser(E), input('Testwort', [link(compendium), link(ours)])),
    );

    expect(issues).toEqual([expect.objectContaining({ path: ['substitutes', 1] })]);
  });

  it('refuses an id that names no ingredient, as it refuses another coven’s', async () => {
    const nothing = '00000000-0000-4000-8000-00000000dead';

    // In turn, not in parallel: a write left open by a failed assertion would
    // hold its locks into the next test's truncate.
    const missing = await refusal(
      createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, input('Testwort', [link(nothing)])),
    );
    const foreign = await refusal(
      createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, input('Testbane', [link(elsewhere)])),
    );

    // Existence elsewhere is private, so the two refusals read alike.
    expect(missing).toEqual(foreign);
  });

  it('refuses an ingredient linking itself, pathed to the entry', async () => {
    const id = await seed(local({ name: 'Testwort' }));

    const issues = await refusal(
      updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, input('Testwort', [link(id)])),
    );

    expect(issues).toEqual([expect.objectContaining({ path: ['substitutes', 0] })]);
  });

  // The read ANDs the rule, so a row written past the service shows nothing.
  it('reads nothing for a link the rule forbids, written past the service', async () => {
    const id = await seed(local({ name: 'Testwort', substitutes: ['Zest Root'] }));
    await insertSubstituteLink(sql, id, elsewhere, A.id);
    const entryId = await seed(entry({ name: 'Testbane', substitutes: ['Zest Root'] }));
    await insertSubstituteLink(sql, entryId, ours, A.id);
    // Precondition: both rows are live.
    expect(await liveRows(id)).toHaveLength(2);
    expect(await liveRows(entryId)).toHaveLength(2);

    expect(await readBack(asUser(B), id, WORKSPACE_W_ID)).toEqual([
      { name: 'Zest Root', ingredientId: null },
    ]);
    expect(await readBack(asUser(B), entryId, null)).toEqual([
      { name: 'Zest Root', ingredientId: null },
    ]);
  });
});

describe('a save of an ingredient’s substitutes', () => {
  it('keeps the ones still listed, tombstones the dropped, and adds the new', async () => {
    const mockleaf = await seed(entry({ name: 'Mockleaf' }));
    const alder = await seed(local({ name: 'Alder Testbark' }));
    const id = await seed(local({ substitutes: ['Kept Root', 'Dropped Root'] }));
    const keptLink = await insertSubstituteLink(sql, id, mockleaf, A.id);
    const droppedLink = await insertSubstituteLink(sql, id, alder, A.id);
    const [keptName] = (await substituteRows(id)).filter((row) => row.name === 'Kept Root');

    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      id,
      input('Testwort', [typed('Kept Root'), link(mockleaf), typed('Added Root')]),
    );

    const rows = await substituteRows(id);
    const byId = (rowId: string) => rows.find((row) => row.id === rowId);
    // Kept, not re-created: the same rows, still A's.
    expect(byId(keptName.id)).toMatchObject({ created_by: A.id, deleted_at: null });
    expect(byId(keptLink)).toMatchObject({ created_by: A.id, deleted_at: null });
    expect(byId(droppedLink)).toMatchObject({ deleted_by: B.id });
    expect(rows.find((row) => row.name === 'Dropped Root')).toMatchObject({ deleted_by: B.id });
    expect(rows.find((row) => row.name === 'Added Root')).toMatchObject({
      created_by: B.id,
      deleted_at: null,
    });
  });

  it('writes nothing when nothing changes', async () => {
    const mockleaf = await seed(entry({ name: 'Mockleaf' }));
    const id = await seed(local({ substitutes: ['Zest Root'] }));
    await insertSubstituteLink(sql, id, mockleaf, A.id);
    const before = await substituteRows(id);

    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      id,
      input('Testwort', [link(mockleaf), typed('Zest Root')]),
    );

    // The same rows, each untouched since the seed wrote it.
    expect(await substituteRows(id)).toEqual(before);
  });

  // Compared as written, as folk names are; the dropped row goes first, so
  // the re-cased name clears the case-folded unique index.
  it('takes a change of case as a new name', async () => {
    const id = await seed(local({ substitutes: ['zest root'] }));

    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      id,
      input('Testwort', [typed('Zest Root')]),
    );

    expect((await liveRows(id)).map((row) => row.name)).toEqual(['Zest Root']);
  });

  it('clears them all with an empty list', async () => {
    const id = await seed(local({ substitutes: ['Zest Root', 'Mock Root'] }));

    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, input('Testwort', []));

    expect(await liveRows(id)).toEqual([]);
  });

  it('rolls them back with the ingredient when the ingredient write fails', async () => {
    await seed(local({ name: 'Taken Wort' }));
    const id = await seed(local({ substitutes: ['Kept Root'] }));

    await expect(
      updateWorkspaceIngredient(
        asUser(B),
        WORKSPACE_W_ID,
        id,
        input('taken wort', [typed('Added Root')]),
      ),
    ).rejects.toThrow();

    expect((await liveRows(id)).map((row) => row.name)).toEqual(['Kept Root']);
  });

  it('replaces a compendium entry’s the same way', async () => {
    const mockleaf = await seed(entry({ name: 'Mockleaf' }));
    const id = await seed(entry({ substitutes: ['Dropped Root'] }));

    await updateCompendiumEntry(asUser(E), id, input('Testwort', [link(mockleaf)]));

    expect(await readBack(null, id, null)).toEqual([{ name: 'Mockleaf', ingredientId: mockleaf }]);
  });
});

// MB.138's deletion rule: a link to a deleted ingredient is kept, and shown
// by its last name with nothing to follow.
describe('a substitute whose linked ingredient is deleted', () => {
  let linked: string;
  let id: string;

  beforeEach(async () => {
    linked = await seed(local({ name: 'Alder Testbark' }));
    id = await seed(local({ name: 'Testwort', substitutes: ['Zest Root'] }));
    await insertSubstituteLink(sql, id, linked, A.id);
    // Precondition: the link reads as a link while its ingredient lives.
    expect(await readBack(asUser(B), id, WORKSPACE_W_ID)).toEqual([
      { name: 'Alder Testbark', ingredientId: linked },
      { name: 'Zest Root', ingredientId: null },
    ]);
    await deleteWorkspaceIngredient(asUser(A), WORKSPACE_W_ID, linked);
  });

  it('reads as its ingredient’s last name, with no ingredient', async () => {
    expect(await readBack(asUser(B), id, WORKSPACE_W_ID)).toEqual([
      { name: 'Alder Testbark', ingredientId: null },
      { name: 'Zest Root', ingredientId: null },
    ]);
  });

  it('survives a save of its parent that lists it', async () => {
    const [before] = (await liveRows(id)).filter((row) => row.substitute_id === linked);

    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      id,
      input('Testwort', [link(linked), typed('Zest Root')]),
    );

    const [after] = (await liveRows(id)).filter((row) => row.substitute_id === linked);
    expect(after).toEqual(before);
  });

  it('cannot be linked anew', async () => {
    const issues = await refusal(
      createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, input('Testbane', [link(linked)])),
    );

    expect(issues).toEqual([expect.objectContaining({ path: ['substitutes', 0] })]);
  });

  it('reads the same way for a deleted compendium entry', async () => {
    const mockleaf = await seed(entry({ name: 'Mockleaf' }));
    const entryId = await seed(entry({ name: 'Testbane' }));
    await insertSubstituteLink(sql, entryId, mockleaf, A.id);

    await deleteCompendiumEntry(asUser(E), mockleaf);

    // Precondition: the entry itself is gone from every read.
    await expect(getIngredient(null, mockleaf)).rejects.toThrow();
    expect(await readBack(null, entryId, null)).toEqual([{ name: 'Mockleaf', ingredientId: null }]);
  });
});
