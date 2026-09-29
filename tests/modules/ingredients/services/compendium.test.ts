import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import type { PageRequest } from '@/lib/pagination';
import { countCompendium, getIngredient, listCompendium } from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';

// The compendium's two reads (claude-docs/db.md, "The compendium read"): the
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

const PAGE: PageRequest = { limit: 26, inverted: false };

describe('listCompendium', () => {
  it('answers the compendium without a session', async () => {
    await seed('Fixture Public');
    await seed('Fixture Private', WORKSPACE_W_ID);

    const page = await listCompendium({}, PAGE);

    expect(page.map((entry) => entry.node.name)).toEqual(['Fixture Public']);
  });

  it('hands the finder a trimmed filter and the page as given', async () => {
    await listCompendium({ search: '  cat  ', categoryIds: [], form: '   ' }, PAGE);

    expect(repository.findCompendiumPage).toHaveBeenCalledWith(
      { search: 'cat', categoryIds: undefined, form: undefined },
      PAGE,
    );
  });

  // One character is a trigram or two that half the compendium shares: no
  // filter and no ranking, rather than a page ordered by noise.
  it('treats a term shorter than two characters as absent', async () => {
    for (const search of ['m', '  m  ', 'ñ', 'n\u0303']) {
      await listCompendium({ search }, PAGE);
    }
    await listCompendium({ search: 'mu' }, PAGE);

    const searches = repository.findCompendiumPage.mock.calls.map(
      ([filter]) => (filter as { search?: string }).search,
    );
    expect(searches).toEqual([undefined, undefined, undefined, undefined, 'mu']);
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

  // The count reads the rows the page does, so it is handed the filter the
  // page is: parsed the same way, one-character term and all.
  it('hands the finder the filter the page gets, and the start as given', async () => {
    const start = { key: ['Fixture Public'], id: '00000000-0000-4000-8000-000000000000' };
    const filter = { search: '  m  ', categoryIds: [], form: ' HERB ' };

    await listCompendium(filter, PAGE);
    await countCompendium(filter, start);

    expect(repository.findCompendiumCount).toHaveBeenCalledWith(
      repository.findCompendiumPage.mock.calls[0][0],
      start,
    );
    expect(repository.findCompendiumPage.mock.calls[0][0]).toEqual({
      search: undefined,
      categoryIds: undefined,
      form: 'HERB',
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

  it('answers NotFound for a soft-deleted entry', async () => {
    await sql`
      update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${compendiumId}`;

    await expect(getIngredient(null, compendiumId)).rejects.toBeInstanceOf(NotFound);
  });
});
