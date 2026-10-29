import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { countCompendium, getIngredient, listCompendium } from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import {
  insertDeityLink,
  insertIngredient,
  insertVariant,
} from '../../../support/db/insert-ingredient';
import { insertReference, insertReferenceLink } from '../../../support/db/insert-reference';
import { type IngredientFixture, makeIngredient, makeVariant } from '../../../support/fixtures';
import type { PageRequest } from '@/lib/types';

// The compendium's two reads (claude-docs/db/compendium-read.md, "The compendium read"): the
// public list, which takes no session at all, and one entry by id, which a
// coven's member may also point at the coven's own row. The table is emptied
// per test, so every row a result could come from is one this file wrote.

// The list's two reads, the page and its count, wrapped so a test sees what
// each was asked for without changing what it answers.
const repository = vi.hoisted(() => ({
  findCompendiumPage: vi.fn(),
  findCompendiumCount: vi.fn(),
}));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  repository.findCompendiumPage.mockImplementation(actual.findCompendiumPage);
  repository.findCompendiumCount.mockImplementation(actual.findCompendiumCount);
  return { ...actual, ...repository };
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  repository.findCompendiumPage.mockClear();
  repository.findCompendiumCount.mockClear();
});

const seed = (name: string, workspaceId: string | null = null) =>
  insertIngredient(sql, makeIngredient({ name, nomenclature: 'none', workspaceId }), A.id);

const seedAs = (
  name: string,
  nomenclature: IngredientFixture['nomenclature'],
  workspaceId: string | null = null,
) => insertIngredient(sql, makeIngredient({ name, nomenclature, workspaceId }), A.id);

const PAGE: PageRequest = { limit: 26, inverted: false };

describe('listCompendium', () => {
  it('answers the compendium without a session', async () => {
    await seed('Fixture Public');
    await seed('Fixture Private', WORKSPACE_W_ID);

    const page = await listCompendium({}, PAGE);

    expect(page.map((entry) => entry.node.name)).toEqual(['Fixture Public']);
  });

  // One character is a trigram or two that half the compendium shares: no
  // filter and no ranking, rather than a page ordered by noise.
  it('treats a query shorter than two characters as absent', async () => {
    for (const query of ['m', '  m  ', 'ñ', 'n\u0303']) {
      await listCompendium({ query }, PAGE);
    }
    await listCompendium({ query: 'mu' }, PAGE);

    const queries = repository.findCompendiumPage.mock.calls.map(
      ([filter]) => (filter as { query?: string }).query,
    );
    expect(queries).toEqual([undefined, undefined, undefined, undefined, 'mu']);
  });

  // M5.5's to-do list of formal names to look up: the entries declared
  // `unknown`, with the search and the citing filter on top.
  it('narrows to one nomenclature, with the search and the to-do filter beside it', async () => {
    const book = await insertReference(sql, {}, E.id);
    await seedAs('Fixture Unsettled', 'unknown');
    const cited = await seedAs('Fixture Unsettled Cited', 'unknown');
    await insertReferenceLink(sql, cited, book, E.id);
    await seedAs('Fixture Nameless', 'none');
    await seedAs('Fixture Unsettled Here', 'unknown', WORKSPACE_W_ID);

    const names = async (filter: Parameters<typeof listCompendium>[0]) =>
      (await listCompendium(filter, PAGE)).map((entry) => entry.node.name).sort();

    // Why each narrowing below is the filter's: without it, all three list.
    expect(await names({})).toEqual([
      'Fixture Nameless',
      'Fixture Unsettled',
      'Fixture Unsettled Cited',
    ]);
    expect(await names({ nomenclature: 'unknown' })).toEqual([
      'Fixture Unsettled',
      'Fixture Unsettled Cited',
    ]);
    expect(await names({ nomenclature: 'none' })).toEqual(['Fixture Nameless']);
    expect(await names({ nomenclature: 'unknown', withoutReferences: true })).toEqual([
      'Fixture Unsettled',
    ]);
    expect(await names({ nomenclature: 'unknown', query: 'Cited' })).toEqual([
      'Fixture Unsettled Cited',
    ]);
    expect(await names({ nomenclature: 'botanical' })).toEqual([]);
  });

  // M12.30's to-do list of entries nobody can stock yet: no live variant.
  // Entries are seeded with no variant, the fixture's default one left off.
  const seedFormless = (name: string, workspaceId: string | null = null) =>
    insertIngredient(
      sql,
      makeIngredient({ name, nomenclature: 'none', workspaceId, variants: [] }),
      A.id,
    );

  it('narrows to the entries with no live form, with the search and the other to-do filter beside it', async () => {
    const book = await insertReference(sql, {}, E.id);
    await seedFormless('Fixture Formless');
    const cited = await seedFormless('Fixture Formless Cited');
    await insertReferenceLink(sql, cited, book, E.id);
    const withForm = await seedFormless('Fixture Formed');
    await insertVariant(sql, withForm, { form: 'Oil' }, A.id);
    const retired = await seedFormless('Fixture Retired Forms');
    const resin = await insertVariant(sql, retired, { form: 'Resin' }, A.id);
    await sql`update ingredient_variants set deleted_at = now(), deleted_by = ${A.id} where id = ${resin}`;
    await seedFormless('Fixture Formless Here', WORKSPACE_W_ID);
    // The preconditions: the retired entry does hold a variant row, and no live one.
    const [{ rows, live }] = await sql`
      select count(*)::int as rows, (count(*) filter (where deleted_at is null))::int as live
      from ingredient_variants where ingredient_id = ${retired}`;
    expect({ rows, live }).toEqual({ rows: 1, live: 0 });

    const names = async (filter: Parameters<typeof listCompendium>[0]) =>
      (await listCompendium(filter, PAGE)).map((entry) => entry.node.name).sort();

    // Why the narrowing below is the filter's: without it, the formed entry lists too.
    expect(await names({})).toEqual([
      'Fixture Formed',
      'Fixture Formless',
      'Fixture Formless Cited',
      'Fixture Retired Forms',
    ]);
    expect(await names({ withoutForms: true })).toEqual([
      'Fixture Formless',
      'Fixture Formless Cited',
      'Fixture Retired Forms',
    ]);
    expect(await names({ withoutForms: false })).toHaveLength(4);
    expect(await names({ withoutForms: true, query: 'Cited' })).toEqual(['Fixture Formless Cited']);
    expect(await names({ withoutForms: true, withoutReferences: true })).toEqual([
      'Fixture Formless',
      'Fixture Retired Forms',
    ]);
    expect((await countCompendium({ withoutForms: true }, undefined)).totalCount).toBe(3);
  });

  it('refuses a nomenclature it does not know, before any read', async () => {
    const attempt = listCompendium({ nomenclature: 'heraldic' as 'none' }, PAGE);

    await expect(attempt).rejects.toBeInstanceOf(ValidationError);
    await attempt.catch((error: ValidationError) => {
      expect(error.issues[0].path).toEqual(['nomenclature']);
    });
    expect(repository.findCompendiumPage).not.toHaveBeenCalled();
  });

  // A category id reaches a `uuid` comparison inside the keyset query, whose
  // one client text was the cursor: a malformed id must be refused here, or
  // it would come back as "Invalid cursor".
  it('refuses a category id that is not a uuid, before any read', async () => {
    const attempt = listCompendium({ categoryIds: ['not-a-uuid'] }, PAGE);

    await expect(attempt).rejects.toBeInstanceOf(ValidationError);
    await attempt.catch((error: ValidationError) => {
      expect(error.issues[0].path).toEqual(['categoryIds', 0]);
    });
    expect(repository.findCompendiumPage).not.toHaveBeenCalled();
  });

  // `all` is the default, so it parses to no setting and only `any`
  // reaches the read; a mode that is neither is refused rather than read as all.
  it('hands the read only categoryMode any, and refuses a mode that is neither', async () => {
    const categoryIds = ['3d6b0d1a-0000-4000-8000-000000000001'];
    await listCompendium({ categoryIds, categoryMode: 'any' }, PAGE);
    await listCompendium({ categoryIds, categoryMode: 'all' }, PAGE);
    await listCompendium({ categoryIds, categoryMode: null }, PAGE);

    expect(repository.findCompendiumPage.mock.calls.map(([filter]) => filter)).toEqual([
      { categoryIds, categoryMode: 'any' },
      { categoryIds },
      { categoryIds },
    ]);

    const attempt = listCompendium({ categoryIds, categoryMode: 'some' as 'any' }, PAGE);
    await expect(attempt).rejects.toBeInstanceOf(ValidationError);
    await attempt.catch((error: ValidationError) => {
      expect(error.issues[0].path).toEqual(['categoryMode']);
    });
    expect(repository.findCompendiumPage).toHaveBeenCalledTimes(3);
  });
});

// M11.22's facets (claude-docs/design-decisions/m11.22-search-facets.md): four
// lists, any value matching within one, and a toxic setting, the kinds ANDed.
// What each arm matches is the repository's test
// (tests/db/repository/ingredients.test.ts); this holds what the service parses.
describe('listCompendium, under the facets', () => {
  let hecate: string;
  let hermes: string;

  beforeEach(async () => {
    const rows = await sql`
      select id, name from deities where name in ('Hecate', 'Hermes') and deleted_at is null`;
    const byName = new Map(rows.map((row) => [row.name as string, row.id as string]));
    hecate = byName.get('Hecate') as string;
    hermes = byName.get('Hermes') as string;

    const add = (name: string, overrides: Partial<IngredientFixture> = {}) =>
      insertIngredient(sql, makeIngredient({ name, nomenclature: 'none', ...overrides }), A.id);
    const herbed = await add('Fixture Herbed', {
      variants: [makeVariant({ form: 'Fixture Herb' })],
      celestialBodies: ['Fixture Sun'],
      zodiacSigns: ['Fixture Ram'],
      elements: ['fire'],
    });
    await insertDeityLink(sql, herbed, hecate, 0, A.id);
    // Flagged toxic only on its form.
    await add('Fixture Oiled', {
      variants: [makeVariant({ form: 'Fixture Oil', toxic: true })],
      celestialBodies: ['Fixture Moon'],
      zodiacSigns: ['Fixture Bull'],
      elements: ['water'],
    });
    // Holds both of every pair below, and is flagged toxic itself.
    const both = await add('Fixture Both', {
      toxic: true,
      variants: [makeVariant({ form: 'Fixture Herb' }), makeVariant({ form: 'Fixture Oil' })],
      celestialBodies: ['Fixture Sun', 'Fixture Moon'],
      zodiacSigns: ['Fixture Ram', 'Fixture Bull'],
      elements: ['fire', 'water'],
    });
    await insertDeityLink(sql, both, hecate, 0, A.id);
    await insertDeityLink(sql, both, hermes, 1, A.id);
    // Its one flag is on a retired form, which counts for nothing.
    const retired = await add('Fixture Retired', {
      variants: [
        makeVariant({ form: 'Fixture Root' }),
        makeVariant({ form: 'Fixture Resin', toxic: true }),
      ],
    });
    await sql`
      update ingredient_variants set deleted_at = now(), deleted_by = ${A.id}
      where ingredient_id = ${retired} and form = 'Fixture Resin'`;
  });

  type Filter = Parameters<typeof listCompendium>[0];

  /** The labels the page lists under `filter`, checking the count agrees. */
  async function names(filter: Filter): Promise<string[]> {
    const listed = (await listCompendium(filter, PAGE)).map((entry) => entry.node.name).sort();
    const { totalCount } = await countCompendium(filter, undefined);
    expect(totalCount).toBe(listed.length);
    return listed;
  }

  it('hands the finder each list trimmed of blanks, and no filter for any, blank or empty', async () => {
    const everything = ['Fixture Both', 'Fixture Herbed', 'Fixture Oiled', 'Fixture Retired'];
    for (const filter of [
      { forms: [' ', ''] },
      { forms: [] },
      { celestialBodies: ['  '] },
      { zodiacSigns: [] },
      { deityIds: [] },
      { toxic: 'any' },
      { elements: [] },
      {
        forms: null,
        deityIds: null,
        zodiacSigns: null,
        celestialBodies: null,
        toxic: null,
        elements: null,
      },
    ] satisfies Filter[]) {
      expect(await names(filter)).toEqual(everything);
    }
    await listCompendium(
      { forms: [' Fixture Herb ', ' '], deityIds: [hecate], toxic: 'toxic' },
      PAGE,
    );

    const sent = repository.findCompendiumPage.mock.calls.map(([filter]) => filter);
    expect(sent[0]).toEqual({});
    expect(sent[sent.length - 1]).toEqual({
      forms: ['Fixture Herb'],
      deityIds: [hecate],
      toxic: 'toxic',
    });
  });

  it('refuses a deity id that is not a uuid, before any read', async () => {
    const attempt = listCompendium({ deityIds: [hecate, 'not-a-uuid'] }, PAGE);

    await expect(attempt).rejects.toBeInstanceOf(ValidationError);
    await attempt.catch((error: ValidationError) => {
      expect(error.issues[0].path).toEqual(['deityIds', 1]);
    });
    await expect(countCompendium({ deityIds: ['not-a-uuid'] }, undefined)).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(repository.findCompendiumPage).not.toHaveBeenCalled();
    expect(repository.findCompendiumCount).not.toHaveBeenCalled();
  });

  it('refuses a toxic setting it does not know, before any read', async () => {
    const attempt = listCompendium({ toxic: 'deadly' as 'toxic' }, PAGE);

    await expect(attempt).rejects.toBeInstanceOf(ValidationError);
    // An element the parser does not know is refused the same way, not matched.
    await expect(listCompendium({ elements: ['fixture'] as never }, PAGE)).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(repository.findCompendiumPage).not.toHaveBeenCalled();
  });
});

describe('countCompendium', () => {
  it('counts the compendium without a session', async () => {
    await seed('Fixture Public');
    await seed('Fixture Private', WORKSPACE_W_ID);

    await expect(countCompendium({}, undefined)).resolves.toEqual({
      totalCount: 1,
      countBefore: null,
    });
  });

  it('counts what a nomenclature narrows to', async () => {
    await seedAs('Fixture Unsettled', 'unknown');
    await seedAs('Fixture Nameless', 'none');
    await seedAs('Fixture Unsettled Here', 'unknown', WORKSPACE_W_ID);

    await expect(countCompendium({}, undefined)).resolves.toMatchObject({ totalCount: 2 });
    await expect(countCompendium({ nomenclature: 'unknown' }, undefined)).resolves.toEqual({
      totalCount: 1,
      countBefore: null,
    });
  });
});

describe('getIngredient', () => {
  let compendiumId: string;
  let localId: string;

  beforeEach(async () => {
    compendiumId = await seed('Fixture Compendial');
    localId = await seed('Fixture Local', WORKSPACE_W_ID);
  });

  it('answers a compendium entry to anyone, signed out included', async () => {
    for (const session of [null, asUser(D), asUser(E)]) {
      await expect(getIngredient(session, compendiumId)).resolves.toMatchObject({
        id: compendiumId,
      });
    }
  });

  it("answers a coven's own entry to its members, viewers included", async () => {
    for (const member of [A, B, C]) {
      await expect(getIngredient(asUser(member), localId, WORKSPACE_W_ID)).resolves.toMatchObject({
        id: localId,
        workspaceId: WORKSPACE_W_ID,
      });
    }
  });

  it('answers a compendium entry under a coven as well', async () => {
    await expect(getIngredient(asUser(B), compendiumId, WORKSPACE_W_ID)).resolves.toMatchObject({
      id: compendiumId,
    });
  });

  describe("refuses a coven's entry to everyone else", () => {
    // Why every refusal below could have passed wrongly: the row is there,
    // and its coven's member reaches it by this id.
    beforeEach(async () => {
      await expect(getIngredient(asUser(B), localId, WORKSPACE_W_ID)).resolves.toMatchObject({
        id: localId,
      });
    });

    it('as NotFound without a coven, whoever asks — its existence is private', async () => {
      await expect(getIngredient(null, localId)).rejects.toBeInstanceOf(NotFound);
      await expect(getIngredient(asUser(B), localId)).rejects.toBeInstanceOf(NotFound);
      await expect(getIngredient(asUser(E), localId)).rejects.toBeInstanceOf(NotFound);
    });

    it('as Forbidden when the caller is not in the coven named', async () => {
      await expect(getIngredient(null, localId, WORKSPACE_W_ID)).rejects.toBeInstanceOf(Forbidden);
      await expect(getIngredient(asUser(D), localId, WORKSPACE_W_ID)).rejects.toBeInstanceOf(
        Forbidden,
      );
      await expect(getIngredient(asUser(E), localId, WORKSPACE_W_ID)).rejects.toBeInstanceOf(
        Forbidden,
      );
    });

    it("as NotFound under another coven's valid proof", async () => {
      await expect(getIngredient(asUser(D), localId, WORKSPACE_X_ID)).rejects.toBeInstanceOf(
        NotFound,
      );
    });
  });

  it('answers NotFound for an id that names nothing, and for one that is not a uuid', async () => {
    await expect(
      getIngredient(null, '99999999-9999-9999-9999-999999999999'),
    ).rejects.toBeInstanceOf(NotFound);
    await expect(getIngredient(null, 'not-a-uuid')).rejects.toBeInstanceOf(NotFound);
  });
});
