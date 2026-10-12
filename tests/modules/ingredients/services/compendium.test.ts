import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { countCompendium, getIngredient, listCompendium } from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertReference, insertReferenceLink } from '../../../support/db/insert-reference';
import { type IngredientFixture, makeIngredient } from '../../../support/fixtures';
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

  it('refuses a category id that is not a uuid, before any read', async () => {
    await expect(
      countCompendium({ categoryIds: ['not-a-uuid'] }, undefined),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repository.findCompendiumCount).not.toHaveBeenCalled();
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
