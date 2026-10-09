import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, ValidationError } from '@/lib/errors';
import type { Session } from '@/lib/session';
import {
  createCompendiumEntry,
  createWorkspaceIngredient,
  deitiesOf,
  updateCompendiumEntry,
  updateWorkspaceIngredient,
} from '@/modules/ingredients';
import type { DeityFields } from '@/modules/ingredients/validation/types';
import { A, B, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertDeityLink, insertIngredient } from '../../../support/db/insert-ingredient';
import { type IngredientFixture, type Overrides, makeIngredient } from '../../../support/fixtures';

// MB.167: an ingredient's deities, each the curated deity a member picked or a
// name typed, in the order entered (DESIGN.md §5, `ingredient_deities`),
// written in the ingredient's own transaction by either tier's service and
// read back through `deitiesOf`, the batch behind `Ingredient.deities`. The
// ingredients are emptied per test; a deity or tradition a test adds or
// retires is put back after it, since the vocabularies are the file's clone's.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let greekHecate: string;
let romanHecate: string;
let thor: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  greekHecate = await deityId('Hecate', 'Greek');
  romanHecate = await addDeity('Hecate', 'Roman');
  thor = await deityId('Thor', 'Norse');
});

afterEach(async () => {
  // The rows linking the test's deity go first, or the key refuses its delete.
  await sql`truncate ingredients cascade`;
  await sql`delete from deities where slug like 'test-%'`;
  for (const table of ['deities', 'deity_traditions']) {
    await sql`update ${sql(table)} set deleted_at = null, deleted_by = null where deleted_at is not null`;
  }
});

async function deityId(name: string, tradition: string): Promise<string> {
  const [row] = await sql`
    select deities.id from deities join deity_traditions on deity_traditions.id = tradition_id
    where deities.name = ${name} and deity_traditions.name = ${tradition}`;
  return row.id as string;
}

/** A second live deity sharing a seeded one's name, under another tradition. */
async function addDeity(name: string, tradition: string): Promise<string> {
  const [row] = await sql`
    insert into deities (name, slug, description, tradition_id, created_by, updated_by)
    select ${name}, ${`test-${name.toLowerCase()}-${tradition.toLowerCase()}`},
      'Written by the test.', id, ${A.id}, ${A.id}
    from deity_traditions where name = ${tradition}
    returning id`;
  return row.id as string;
}

async function retire(table: 'deities' | 'deity_traditions', id: string) {
  const rows = await sql`
    update ${sql(table)} set deleted_at = now(), deleted_by = ${E.id} where id = ${id}
    returning id`;
  expect(rows).toHaveLength(1);
}

/** A W-local stub: no formal name, and so `none`. */
const local = (overrides: Overrides<IngredientFixture> = {}) =>
  makeIngredient({ workspaceId: WORKSPACE_W_ID, nomenclature: 'none', ...overrides });

/** Seeds a row through the shared inserter, stamped by A — not through the code under test. */
const seed = (fixture: IngredientFixture) => insertIngredient(sql, fixture, A.id);

const picked = (id: string): DeityFields => ({ deityId: id });
const typed = (name: string): DeityFields => ({ name });

/** The whole stub as either service takes it, with these deities. */
const input = (name: string, deities: DeityFields[]) => ({
  name,
  nomenclature: 'none' as const,
  deities,
});

/** What the read answers for one ingredient, as name and linked id. */
async function readBack(session: Session | null, id: string, workspaceId: string | null) {
  const [answer] = await deitiesOf(session, [{ id, workspaceId }]);
  if (answer instanceof Error) throw answer;
  return answer.map((deity) => ({
    name: deity.name,
    deityId: deity.deity === null ? null : String(deity.deity.id),
  }));
}

/** Every deity row of the ingredient, tombstones included, in position order. */
function deityRows(ingredientId: string) {
  return sql`
    select id, deity_id, name, position, created_by, deleted_at, deleted_by, xmin::text as xmin
    from ingredient_deities where ingredient_id = ${ingredientId}
    order by deleted_at nulls first, position`;
}

const liveRows = async (ingredientId: string) =>
  (await deityRows(ingredientId)).filter((row) => row.deleted_at === null);

/** The issues a refused write carried, by path and message. */
async function refusal(write: Promise<unknown>) {
  const error = await write.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ValidationError);
  return (error as ValidationError).issues;
}

describe('a save carrying deities', () => {
  it('writes picked and typed deities together, read back in the order sent', async () => {
    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      input('Testwort', [typed('Testara'), picked(thor), typed('Fixture of the Hedge')]),
    );

    expect(await readBack(asUser(B), created.id, WORKSPACE_W_ID)).toEqual([
      { name: 'Testara', deityId: null },
      { name: 'Thor', deityId: thor },
      { name: 'Fixture of the Hedge', deityId: null },
    ]);
    expect((await liveRows(created.id)).map((row) => row.position)).toEqual([0, 1, 2]);
  });

  // The confusion the link exists to end (MB.165): two curated rows, one name.
  it('reads Greek and Roman Hecate saved together back as two', async () => {
    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      input('Testwort', [picked(greekHecate), picked(romanHecate)]),
    );

    expect(await readBack(asUser(B), created.id, WORKSPACE_W_ID)).toEqual([
      { name: 'Hecate', deityId: greekHecate },
      { name: 'Hecate', deityId: romanHecate },
    ]);
  });

  it('writes them in the ingredient’s own transaction, stamped by the writer', async () => {
    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      input('Testwort', [picked(thor), typed('Testara')]),
    );

    const [row] = await sql`select xmin::text as xmin from ingredients where id = ${created.id}`;
    const rows = await deityRows(created.id);
    expect(rows).toHaveLength(2);
    for (const deity of rows) expect(deity).toMatchObject({ xmin: row.xmin, created_by: B.id });
  });

  // MB.165 records the name beside the link, in the curated row's spelling.
  it('writes a picked deity’s name in its curated spelling', async () => {
    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      input('Testwort', [picked(thor)]),
    );

    expect(await liveRows(created.id)).toEqual([
      expect.objectContaining({ deity_id: thor, name: 'Thor' }),
    ]);
  });

  it('takes a typed name beside a picked deity of that name', async () => {
    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      input('Testwort', [picked(greekHecate), typed('Hecate')]),
    );

    expect(await readBack(asUser(B), created.id, WORKSPACE_W_ID)).toEqual([
      { name: 'Hecate', deityId: greekHecate },
      { name: 'Hecate', deityId: null },
    ]);
  });

  it('writes a compendium entry’s picked deities the same way', async () => {
    const created = await createCompendiumEntry(
      asUser(E),
      input('Testwort', [picked(romanHecate), picked(thor)]),
    );

    expect(await readBack(null, created.id, null)).toEqual([
      { name: 'Hecate', deityId: romanHecate },
      { name: 'Thor', deityId: thor },
    ]);
  });
});

describe('a deity pick that names no curated deity', () => {
  const nothing = '00000000-0000-4000-8000-00000000dead';

  it.each([
    ['names no deity', () => nothing],
    ['names a retired deity', async () => (await retire('deities', thor), thor)],
    [
      'names a deity of a retired tradition',
      async () => (await retire('deity_traditions', await traditionOf(thor)), thor),
    ],
  ])(
    'is a field error pathed to it when it %s, never the foreign key’s 23503',
    async (_case, id) => {
      const deity = await id();

      const issues = await refusal(
        createWorkspaceIngredient(
          asUser(B),
          WORKSPACE_W_ID,
          input('Testwort', [typed('Testara'), picked(deity)]),
        ),
      );

      expect(issues).toEqual([expect.objectContaining({ path: ['deities', 1] })]);
      const [{ n }] = await sql`select count(*)::int as n from ingredients`;
      expect(n).toBe(0);
    },
  );

  it('is refused on an update too, leaving the live list as it was', async () => {
    const id = await seed(local({ deities: ['Testara'] }));

    const issues = await refusal(
      updateWorkspaceIngredient(
        asUser(B),
        WORKSPACE_W_ID,
        id,
        input('Testwort', [picked(nothing)]),
      ),
    );

    expect(issues).toEqual([expect.objectContaining({ path: ['deities', 0] })]);
    expect((await liveRows(id)).map((row) => row.name)).toEqual(['Testara']);
  });
});

async function traditionOf(deity: string): Promise<string> {
  const [row] = await sql`select tradition_id from deities where id = ${deity}`;
  return row.tradition_id as string;
}

// One repeat proves the service parses its input before the index can
// answer; the pick repeated and the name repeated are each the validation
// test's (tests/modules/ingredients/validation/ingredient.test.ts).
describe('a repeated deity', () => {
  it('is a field error pathed to the repeated typed name, in another case, never the index’s 23505', async () => {
    const issues = await refusal(
      createWorkspaceIngredient(
        asUser(B),
        WORKSPACE_W_ID,
        input('Testwort', [typed('Testara'), picked(thor), typed(' tESTARA')]),
      ),
    );

    expect(issues).toEqual([expect.objectContaining({ path: ['deities', 2] })]);
  });
});

describe('a save of an ingredient’s deities', () => {
  it('keeps the ones still listed, tombstones the dropped, and adds the new', async () => {
    const id = await seed(local({ deities: ['Kept Testara', 'Dropped Testara'] }));
    const keptLink = await insertDeityLink(sql, id, thor, 2, A.id);
    const droppedLink = await insertDeityLink(sql, id, greekHecate, 3, A.id);
    const [keptName] = (await deityRows(id)).filter((row) => row.name === 'Kept Testara');

    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      id,
      input('Testwort', [typed('Kept Testara'), picked(thor), typed('Added Testara')]),
    );

    const rows = await deityRows(id);
    const byId = (rowId: string) => rows.find((row) => row.id === rowId);
    // Kept, not re-created: the same rows, still A's.
    expect(byId(keptName.id)).toMatchObject({ created_by: A.id, deleted_at: null, position: 0 });
    expect(byId(keptLink)).toMatchObject({ created_by: A.id, deleted_at: null, position: 1 });
    expect(byId(droppedLink)).toMatchObject({ deleted_by: B.id });
    expect(rows.find((row) => row.name === 'Dropped Testara')).toMatchObject({ deleted_by: B.id });
    expect(rows.find((row) => row.name === 'Added Testara')).toMatchObject({
      created_by: B.id,
      deleted_at: null,
      position: 2,
    });
  });

  // `ingredient_deities_position_unique` is checked per row, so a swap
  // written in place would collide with itself (MB.165).
  it('reorders in place: each row kept, the new order written, no tombstone and no 23505', async () => {
    const id = await seed(local({ deities: ['First Testara', 'Second Testara'] }));
    await insertDeityLink(sql, id, thor, 2, A.id);
    const before = await liveRows(id);

    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      id,
      input('Testwort', [picked(thor), typed('Second Testara'), typed('First Testara')]),
    );

    const after = await deityRows(id);
    expect(after.every((row) => row.deleted_at === null)).toBe(true);
    expect(after.map((row) => [row.id, row.position])).toEqual([
      [before[2].id, 0],
      [before[1].id, 1],
      [before[0].id, 2],
    ]);
    expect(await readBack(asUser(B), id, WORKSPACE_W_ID)).toEqual([
      { name: 'Thor', deityId: thor },
      { name: 'Second Testara', deityId: null },
      { name: 'First Testara', deityId: null },
    ]);
  });

  it('writes nothing when nothing changes', async () => {
    const id = await seed(local({ deities: ['Testara'] }));
    await insertDeityLink(sql, id, thor, 1, A.id);
    const before = await deityRows(id);

    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      id,
      input('Testwort', [typed('Testara'), picked(thor)]),
    );

    // The same rows, each untouched since the seed wrote it.
    expect(await deityRows(id)).toEqual(before);
  });

  // Compared as written, as substitutes are; the dropped row goes first, so
  // the re-cased name clears the case-folded unique index.
  it('takes a change of case as a new name', async () => {
    const id = await seed(local({ deities: ['testara'] }));

    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      id,
      input('Testwort', [typed('Testara')]),
    );

    expect((await liveRows(id)).map((row) => [row.name, row.position])).toEqual([['Testara', 0]]);
  });

  it('clears them all with an empty list', async () => {
    const id = await seed(local({ deities: ['Testara', 'Fixture of the Hedge'] }));

    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, input('Testwort', []));

    expect(await liveRows(id)).toEqual([]);
  });

  it('rolls them back with the ingredient when the ingredient write fails', async () => {
    await seed(local({ name: 'Taken Wort' }));
    const id = await seed(local({ deities: ['Kept Testara'] }));

    await expect(
      updateWorkspaceIngredient(
        asUser(B),
        WORKSPACE_W_ID,
        id,
        input('taken wort', [typed('Added Testara')]),
      ),
    ).rejects.toThrow();

    expect((await liveRows(id)).map((row) => row.name)).toEqual(['Kept Testara']);
  });

  // A curated row renamed since the pick: the next save writes the spelling
  // the row has now, in place.
  it('refreshes a kept pick’s name to its curated row’s spelling', async () => {
    const id = await seed(local());
    const link = await insertDeityLink(sql, id, thor, 0, A.id);
    await sql`update ingredient_deities set name = 'Thunor' where id = ${link}`;

    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      id,
      input('Testwort', [picked(thor)]),
    );

    expect(await liveRows(id)).toEqual([expect.objectContaining({ id: link, name: 'Thor' })]);
  });

  it('replaces a compendium entry’s the same way', async () => {
    const id = await seed(makeIngredient({ workspaceId: null, nomenclature: 'none' }));
    await insertDeityLink(sql, id, greekHecate, 0, A.id);

    await updateCompendiumEntry(
      asUser(E),
      id,
      input('Testwort', [picked(thor), picked(greekHecate)]),
    );

    expect(await readBack(null, id, null)).toEqual([
      { name: 'Thor', deityId: thor },
      { name: 'Hecate', deityId: greekHecate },
    ]);
  });
});

// MB.165's deletion rule, kept as MB.138 keeps a substitute's (MB.167): an
// admin's delete reaches no coven's rows, so a pick whose deity is retired
// stays, and reads as the name it was saved under.
describe('a picked deity since retired', () => {
  let id: string;
  let link: string;

  beforeEach(async () => {
    id = await seed(local({ deities: ['Testara'] }));
    link = await insertDeityLink(sql, id, thor, 1, A.id);
    // Precondition: the pick reads as a pick while its deity is curated.
    expect(await readBack(asUser(B), id, WORKSPACE_W_ID)).toEqual([
      { name: 'Testara', deityId: null },
      { name: 'Thor', deityId: thor },
    ]);
  });

  it.each([
    ['the deity', () => retire('deities', thor)],
    ['its tradition', async () => retire('deity_traditions', await traditionOf(thor))],
  ])('reads as its name, with no deity, once %s is retired', async (_case, retiring) => {
    await retiring();

    expect(await readBack(asUser(B), id, WORKSPACE_W_ID)).toEqual([
      { name: 'Testara', deityId: null },
      { name: 'Thor', deityId: null },
    ]);
    expect(await liveRows(id)).toEqual([
      expect.anything(),
      expect.objectContaining({ id: link, deity_id: thor }),
    ]);
  });

  // What the form sends back, having read it as a typed name.
  it('keeps its row and its link through a save sending back the name it reads as', async () => {
    await retire('deities', thor);
    const before = await deityRows(id);

    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      id,
      input('Testwort', [typed('Testara'), typed('Thor')]),
    );

    expect(await deityRows(id)).toEqual(before);
  });

  it('keeps it through a save sending back its id', async () => {
    await retire('deities', thor);
    const before = await deityRows(id);

    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      id,
      input('Testwort', [typed('Testara'), picked(thor)]),
    );

    expect(await deityRows(id)).toEqual(before);
  });

  it('cannot be picked anew', async () => {
    await retire('deities', thor);

    const issues = await refusal(
      createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, input('Testbane', [picked(thor)])),
    );

    expect(issues).toEqual([expect.objectContaining({ path: ['deities', 0] })]);
  });
});

describe('who reads an ingredient’s deities', () => {
  it('refuses a reader outside the coven, by direct id, as Forbidden', async () => {
    const id = await seed(local({ deities: ['Testara'] }));
    // Why it could have succeeded: the coven's own member reads it.
    expect(await readBack(asUser(B), id, WORKSPACE_W_ID)).toEqual([
      { name: 'Testara', deityId: null },
    ]);

    const [answer] = await deitiesOf(asUser(D), [{ id, workspaceId: WORKSPACE_W_ID }]);

    expect(answer).toBeInstanceOf(Forbidden);
  });

  // The key's tier is not the scope: the read takes it from the proofs.
  it('reads nothing for a coven’s ingredient keyed as the compendium’s', async () => {
    const id = await seed(local({ workspaceId: WORKSPACE_X_ID, deities: ['Testara'] }));

    expect(await readBack(null, id, null)).toEqual([]);
  });
});
