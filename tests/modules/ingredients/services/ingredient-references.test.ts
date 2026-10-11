import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { ValidationError } from '@/lib/errors';
import { resolvePage } from '@/lib/pagination';
import type { Session } from '@/lib/session';
import {
  countCompendium,
  createCompendiumEntry,
  createReference,
  createWorkspaceIngredient,
  listCompendium,
  referencesOf,
  updateCompendiumEntry,
  updateWorkspaceIngredient,
} from '@/modules/ingredients';
import type { ReferenceLinkFields } from '@/modules/ingredients/validation/types';
import { A, B, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertReference, insertReferenceLink } from '../../../support/db/insert-reference';
import { type IngredientFixture, type Overrides, makeIngredient } from '../../../support/fixtures';

// MB.153: an ingredient's references, each a link to a reference with an
// optional locator, written in the ingredient's own transaction by either
// tier's service, held to the tier rule, and read back alphabetically by
// citation through `referencesOf`, the batch behind `Ingredient.references`
// (DESIGN.md §5, "References"). Both tables are emptied per test, so every row
// a result could come from is one this file wrote.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients, "references" cascade`;
});

/** A W-local stub: no formal name, and so `none`. */
const local = (overrides: Overrides<IngredientFixture> = {}) =>
  makeIngredient({ workspaceId: WORKSPACE_W_ID, nomenclature: 'none', ...overrides });

/** A compendium stub: no formal name, and so `none`. */
const entry = (overrides: Overrides<IngredientFixture> = {}) =>
  makeIngredient({ workspaceId: null, nomenclature: 'none', ...overrides });

/** Seeds an ingredient through the shared inserter, stamped by A — not through the code under test. */
const seed = (fixture: IngredientFixture) => insertIngredient(sql, fixture, A.id);

/** A compendium book, seeded raw, titled so its citation files where the test wants it. */
const compendiumBook = (title: string, authors: string | null = null) =>
  insertReference(sql, { title, authors }, E.id);

/** One of a coven's books, seeded raw. */
const covenBook = (workspaceId: string, title: string) =>
  insertReference(sql, { workspace_id: workspaceId, title }, A.id);

const cite = (referenceId: string, locator?: string): ReferenceLinkFields => ({
  referenceId,
  locator,
});

/** The whole stub as either service takes it, with these references. */
const input = (name: string, references: ReferenceLinkFields[]) => ({
  name,
  nomenclature: 'none' as const,
  references,
});

/** What the read answers for one ingredient: each citation, and its locator. */
async function readBack(session: Session | null, id: string, workspaceId: string | null) {
  const [answer] = await referencesOf(session, [{ id, workspaceId }]);
  if (answer instanceof Error) throw answer;
  return answer.map(({ reference, locator }) => ({ title: reference.title, locator }));
}

/** Every link row of the ingredient, tombstones included, oldest first. */
function linkRows(ingredientId: string) {
  return sql`
    select id, reference_id, locator, created_by, deleted_at, xmin::text as xmin
    from reference_links where ingredient_id = ${ingredientId}
    order by created_at, id`;
}

const liveLinks = async (ingredientId: string) =>
  (await linkRows(ingredientId)).filter((row) => row.deleted_at === null);

/** The issues a refused write carried, by path and message. */
async function refusal(write: Promise<unknown>) {
  const error = await write.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ValidationError);
  return (error as ValidationError).issues;
}

describe('a save carrying references', () => {
  it('carries existing references with locators and new ones together, read back by citation', async () => {
    const zeta = await compendiumBook('Zeta Herbal');
    const alder = await covenBook(WORKSPACE_W_ID, 'Alder Notes');
    // New in this save: written through the service an instant before, as the form does.
    const created = await createReference(asUser(B), WORKSPACE_W_ID, {
      kind: 'book',
      title: 'The Middle Herbal',
      published: '1990',
    });

    const ingredient = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      input('Testwort', [cite(zeta, 'p. 112'), cite(created.id), cite(alder, 'chap. 3')]),
    );

    // "The Middle Herbal" files under M, its article set aside.
    expect(await readBack(asUser(B), ingredient.id, WORKSPACE_W_ID)).toEqual([
      { title: 'Alder Notes', locator: 'chap. 3' },
      { title: 'The Middle Herbal', locator: null },
      { title: 'Zeta Herbal', locator: 'p. 112' },
    ]);
  });

  it('sorts by the whole citation, so the authors lead', async () => {
    const late = await compendiumBook('Aardvark Herbal', 'Zimmer, Fixtura');
    const early = await compendiumBook('Zebra Herbal', 'Abbot, Mock');

    const ingredient = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      input('Testwort', [cite(late), cite(early)]),
    );

    expect(await readBack(asUser(B), ingredient.id, WORKSPACE_W_ID)).toEqual([
      { title: 'Zebra Herbal', locator: null },
      { title: 'Aardvark Herbal', locator: null },
    ]);
  });

  it('writes them in the ingredient’s own transaction, stamped by the writer', async () => {
    const book = await compendiumBook('Fixture Herbal');

    const created = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      input('Testwort', [cite(book)]),
    );

    const [row] = await sql`select xmin::text as xmin from ingredients where id = ${created.id}`;
    expect(await linkRows(created.id)).toEqual([
      expect.objectContaining({ xmin: row.xmin, created_by: B.id, reference_id: book }),
    ]);
  });

  it('lets an admin cite compendium references from a compendium entry', async () => {
    const book = await compendiumBook('Fixture Herbal');

    const created = await createCompendiumEntry(
      asUser(E),
      input('Testwort', [cite(book, 's.v. Testwort')]),
    );

    expect(await readBack(null, created.id, null)).toEqual([
      { title: 'Fixture Herbal', locator: 's.v. Testwort' },
    ]);
  });

  it('saves with none, absent or empty', async () => {
    const created = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, {
      name: 'Testwort',
    });

    expect(await readBack(asUser(B), created.id, WORKSPACE_W_ID)).toEqual([]);
  });
});

describe('an update brings the references to the list sent', () => {
  it('writes nothing for a list that changes nothing', async () => {
    const book = await compendiumBook('Fixture Herbal');
    const id = await seed(local());
    await insertReferenceLink(sql, id, book, A.id, 'p. 112');
    const before = await linkRows(id);

    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      id,
      input('Testwort', [cite(book, 'p. 112')]),
    );

    expect(await linkRows(id)).toEqual(before);
  });

  it('keeps a reference still listed in its row, and writes the locator sent', async () => {
    const book = await compendiumBook('Fixture Herbal');
    const id = await seed(local());
    const link = await insertReferenceLink(sql, id, book, A.id, 'p. 112');

    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      id,
      input('Testwort', [cite(book, 'p. 40')]),
    );

    expect(await linkRows(id)).toEqual([
      expect.objectContaining({ id: link, locator: 'p. 40', deleted_at: null }),
    ]);
    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, input('Testwort', [cite(book)]));
    expect(await liveLinks(id)).toEqual([expect.objectContaining({ id: link, locator: null })]);
  });

  it('soft-deletes a reference dropped, and a new link for one cited again', async () => {
    const book = await compendiumBook('Fixture Herbal');
    const other = await compendiumBook('Another Herbal');
    const id = await seed(local());
    const dropped = await insertReferenceLink(sql, id, book, A.id);

    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      id,
      input('Testwort', [cite(other)]),
    );
    await updateWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      id,
      input('Testwort', [cite(other), cite(book)]),
    );

    const rows = await linkRows(id);
    expect(rows.find((row) => row.id === dropped)?.deleted_at).not.toBeNull();
    expect((await liveLinks(id)).map((row) => row.reference_id).sort()).toEqual(
      [book, other].sort(),
    );
    expect(await readBack(asUser(B), id, WORKSPACE_W_ID)).toHaveLength(2);
  });

  it('clears them all on an empty list', async () => {
    const book = await compendiumBook('Fixture Herbal');
    const id = await seed(local());
    await insertReferenceLink(sql, id, book, A.id);

    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, input('Testwort', []));

    expect(await liveLinks(id)).toEqual([]);
  });

  it('brings a compendium entry’s the same way', async () => {
    const book = await compendiumBook('Fixture Herbal');
    const other = await compendiumBook('Another Herbal');
    const id = await seed(entry());
    const kept = await insertReferenceLink(sql, id, book, A.id);

    await updateCompendiumEntry(
      asUser(E),
      id,
      input('Testwort', [cite(book), cite(other, 'p. 9')]),
    );

    expect(await readBack(null, id, null)).toEqual([
      { title: 'Another Herbal', locator: 'p. 9' },
      { title: 'Fixture Herbal', locator: null },
    ]);
    expect((await liveLinks(id)).find((row) => row.reference_id === book)?.id).toBe(kept);
  });
});

// DESIGN.md §5: a row cites only what its readers may read. Each refusal names
// a reference that exists, and that the right writer may cite.
describe('the tier rule', () => {
  it('refuses a compendium entry a coven’s reference, by direct id, beside the entry', async () => {
    const book = await compendiumBook('Fixture Herbal');
    const wBook = await covenBook(WORKSPACE_W_ID, 'W Notes');
    // The precondition: the reference exists, and W's own ingredient cites it.
    const wIngredient = await createWorkspaceIngredient(
      asUser(B),
      WORKSPACE_W_ID,
      input('Mockleaf', [cite(wBook)]),
    );
    expect(await readBack(asUser(B), wIngredient.id, WORKSPACE_W_ID)).toEqual([
      { title: 'W Notes', locator: null },
    ]);

    const issues = await refusal(
      createCompendiumEntry(asUser(E), input('Testwort', [cite(book), cite(wBook)])),
    );

    expect(issues).toEqual([{ path: ['references', 1], message: expect.any(String) }]);
    const [{ count }] =
      await sql`select count(*)::int as count from ingredients where workspace_id is null`;
    expect(count).toBe(0);
  });

  it('refuses it on an update too, leaving the entry as it was', async () => {
    const wBook = await covenBook(WORKSPACE_W_ID, 'W Notes');
    const id = await seed(entry());

    const issues = await refusal(
      updateCompendiumEntry(asUser(E), id, input('Testwort', [cite(wBook)])),
    );

    expect(issues.map((issue) => issue.path)).toEqual([['references', 0]]);
    expect(await linkRows(id)).toEqual([]);
  });

  it('refuses a coven’s ingredient another coven’s reference, by direct id, beside the entry', async () => {
    const xBook = await covenBook(WORKSPACE_X_ID, 'X Notes');
    // The precondition: the reference exists, and X's own member cites it.
    const xIngredient = await createWorkspaceIngredient(
      asUser(D),
      WORKSPACE_X_ID,
      input('Mockleaf', [cite(xBook)]),
    );
    expect(await readBack(asUser(D), xIngredient.id, WORKSPACE_X_ID)).toHaveLength(1);

    const issues = await refusal(
      createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, input('Testwort', [cite(xBook)])),
    );
    // Refused exactly as an id naming no reference is, so the refusal tells
    // W nothing about what X holds.
    const missing = await refusal(
      createWorkspaceIngredient(
        asUser(B),
        WORKSPACE_W_ID,
        input('Testwort', [cite('99999999-9999-4999-8999-999999999999')]),
      ),
    );
    expect(issues).toEqual([{ path: ['references', 0], message: expect.any(String) }]);
    expect(issues).toEqual(missing);

    const id = await seed(local());
    const onUpdate = await refusal(
      updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, input('Testwort', [cite(xBook)])),
    );
    expect(onUpdate.map((issue) => issue.path)).toEqual([['references', 0]]);
    expect(await linkRows(id)).toEqual([]);
  });

  it('refuses an id naming no reference, and a soft-deleted one, as another coven’s is', async () => {
    const gone = await compendiumBook('Retracted Herbal');
    await sql`update "references" set deleted_at = now(), deleted_by = ${E.id} where id = ${gone}`;

    const issues = await refusal(
      createWorkspaceIngredient(
        asUser(B),
        WORKSPACE_W_ID,
        input('Testwort', [cite('99999999-9999-4999-8999-999999999999'), cite(gone)]),
      ),
    );

    expect(issues.map((issue) => issue.path)).toEqual([
      ['references', 0],
      ['references', 1],
    ]);
  });

  it('reads nothing for a link the rule forbids, written past the service', async () => {
    const wBook = await covenBook(WORKSPACE_W_ID, 'W Notes');
    const xBook = await covenBook(WORKSPACE_X_ID, 'X Notes');
    const compendiumEntry = await seed(entry());
    const wIngredient = await seed(local());
    await insertReferenceLink(sql, compendiumEntry, wBook, A.id);
    await insertReferenceLink(sql, wIngredient, xBook, A.id);

    expect(await readBack(null, compendiumEntry, null)).toEqual([]);
    expect(await readBack(asUser(B), wIngredient, WORKSPACE_W_ID)).toEqual([]);
  });
});

// DESIGN.md §5, "Nothing deletes a reference in v1": should one be deleted,
// its links stay, it leaves every bibliography, and a restore returns it.
describe('a soft-deleted reference', () => {
  it('leaves the bibliography, its link untouched by a save, and returns on a restore', async () => {
    const book = await compendiumBook('Fixture Herbal');
    const gone = await compendiumBook('Retracted Herbal');
    const id = await seed(local());
    await insertReferenceLink(sql, id, book, A.id);
    const hidden = await insertReferenceLink(sql, id, gone, A.id, 'p. 7');
    await sql`update "references" set deleted_at = now(), deleted_by = ${E.id} where id = ${gone}`;

    expect(await readBack(asUser(B), id, WORKSPACE_W_ID)).toEqual([
      { title: 'Fixture Herbal', locator: null },
    ]);
    // The form sends back what it was shown, which leaves the hidden one out.
    await updateWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, id, input('Testwort', [cite(book)]));
    expect((await liveLinks(id)).map((row) => row.id)).toContain(hidden);

    await sql`update "references" set deleted_at = null, deleted_by = null where id = ${gone}`;
    expect(await readBack(asUser(B), id, WORKSPACE_W_ID)).toEqual([
      { title: 'Fixture Herbal', locator: null },
      { title: 'Retracted Herbal', locator: 'p. 7' },
    ]);
  });
});

// M5.5's to-do list: the compendium's live entries with no reference shown.
describe('the compendium without references', () => {
  async function names(filter: { withoutReferences?: boolean }) {
    const page = await resolvePage({ first: 50 }, (request) => listCompendium(filter, request));
    return page.edges.map((edge) => edge.node.name).sort();
  }

  it('lists exactly the live compendium entries citing no live reference', async () => {
    const book = await compendiumBook('Fixture Herbal');
    const gone = await compendiumBook('Retracted Herbal');
    await sql`update "references" set deleted_at = now(), deleted_by = ${E.id} where id = ${gone}`;
    const wBook = await covenBook(WORKSPACE_W_ID, 'W Notes');

    const cited = await seed(entry({ name: 'Cited' }));
    await insertReferenceLink(sql, cited, book, A.id);
    await seed(entry({ name: 'Uncited' }));
    const unlinked = await seed(entry({ name: 'Unlinked' }));
    const link = await insertReferenceLink(sql, unlinked, book, A.id);
    await sql`update reference_links set deleted_at = now(), deleted_by = ${A.id} where id = ${link}`;
    const retracted = await seed(entry({ name: 'Retracted' }));
    await insertReferenceLink(sql, retracted, gone, A.id);
    const misfiled = await seed(entry({ name: 'Misfiled' }));
    await insertReferenceLink(sql, misfiled, wBook, A.id);
    const deleted = await seed(entry({ name: 'Deleted' }));
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${deleted}`;
    await seed(local({ name: 'Coven Own' }));

    expect(await names({ withoutReferences: true })).toEqual([
      'Misfiled',
      'Retracted',
      'Uncited',
      'Unlinked',
    ]);
    // Why the list above is the filter's: without it, the cited entry lists too.
    expect(await names({})).toEqual(['Cited', 'Misfiled', 'Retracted', 'Uncited', 'Unlinked']);
    expect(await names({ withoutReferences: false })).toHaveLength(5);
    expect((await countCompendium({ withoutReferences: true }, undefined)).totalCount).toBe(4);
  });
});
