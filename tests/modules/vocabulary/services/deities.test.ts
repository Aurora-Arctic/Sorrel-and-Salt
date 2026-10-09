import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { decodeCursor, resolvePage } from '@/lib/pagination';
import { deitySlug } from '@/lib/slugify';
import {
  countDeities,
  countDeityTraditions,
  createDeity,
  deleteDeity,
  getDeityBySlug,
  listDeities,
  listDeityTraditions,
  updateDeity,
} from '@/modules/vocabulary';
import type { DeityFilter } from '@/modules/vocabulary';
import type { DeityInput } from '@/modules/vocabulary/validation/deity';
import type { PageRequest } from '@/lib/types';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertDeityLink, insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';

// Story 18's deity half (MB.132): the curated deity vocabulary's writes, the
// site admin's alone, and the reads the admin page lists them by. A
// compendium entry's deities are picks (MB.167), so a deity a live entry
// links is held: its delete is refused, and its rename is carried onto the
// entry's link, in place. A coven's link is neither. The seeded vocabulary
// stays, so every deity a test writes is named `Fixture …`.

// The page finder wrapped, passing through to the real one, to see what the
// list hands it.
const repository = vi.hoisted(() => ({ findDeityPage: vi.fn() }));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  repository.findDeityPage.mockImplementation(actual.findDeityPage);
  return { ...actual, ...repository };
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

/** Seeded traditions by name, read once. */
let traditions: Map<string, string>;
beforeAll(async () => {
  const rows = await sql<{ id: string; name: string }[]>`
    select id, name from deity_traditions where deleted_at is null`;
  traditions = new Map(rows.map((row) => [row.name, row.id]));
});
const tradition = (name: string) => traditions.get(name) as string;

// Every row a test writes goes: the entries and their links, then the deities
// and traditions named for this file.
beforeEach(async () => {
  repository.findDeityPage.mockClear();
  await sql`truncate ingredients cascade`;
  await sql`delete from deities where name like 'Fixture%'`;
  await sql`delete from deity_traditions where name like 'Fixture %'`;
});

const admin = asUser(E);

// Between them every workspace role there is, and a coven that is not W: none
// of it is the site role, which is the one thing a vocabulary write turns on.
const NON_ADMINS = [
  ['an owner of a coven', A],
  ['a member of a coven', B],
  ['a viewer in a coven', C],
  ['a member of another coven', D],
] as const;

it('is testing sessions whose site role is `user`, beside an admin', () => {
  for (const [, user] of NON_ADMINS) expect(asUser(user).role).toBe('user');
  expect(admin.role).toBe('admin');
});

function input(overrides: Partial<DeityInput> = {}): DeityInput {
  return {
    name: 'Fixture Testra',
    description: 'A god this test made',
    traditionId: tradition('Greek'),
    ...overrides,
  };
}

/** Seeds a deity directly under the named tradition, stamped by A — not through the code under test. */
async function seed(name: string, traditionName = 'Greek'): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    insert into deities (name, slug, description, tradition_id, created_by, updated_by)
    values (${name}, ${deitySlug(name, traditionName)}, 'Seeded by the test', ${tradition(traditionName)}, ${A.id}, ${A.id})
    returning id`;
  return row.id;
}

async function deityOf(id: string) {
  const [row] = await sql`select * from deities where id = ${id}`;
  return row;
}

async function linkOf(id: string) {
  const [row] = await sql`select * from ingredient_deities where id = ${id}`;
  return row;
}

const countNamed = async (name: string) => {
  const [row] = await sql`select count(*)::int as n from deities where name = ${name}`;
  return row.n as number;
};

/** A fresh compendium entry, or W's own ingredient, by its label alone. */
const entry = (name: string, overrides: Parameters<typeof makeIngredient>[0] = {}) =>
  insertIngredient(sql, makeIngredient({ name, nomenclature: 'none', ...overrides }), A.id);

/** A fresh entry linking the deity at its first place, and the link's id. */
async function picking(
  name: string,
  deityId: string,
  overrides: Parameters<typeof makeIngredient>[0] = {},
): Promise<{ entry: string; link: string }> {
  const id = await entry(name, overrides);
  return { entry: id, link: await insertDeityLink(sql, id, deityId, 0, A.id) };
}

/** An issue list, or the test fails because the write went through. */
async function issuesOf(attempt: Promise<unknown>) {
  const error = await attempt.then(
    () => expect.fail('the write was not refused'),
    (thrown: unknown) => thrown,
  );
  expect(error).toBeInstanceOf(ValidationError);
  return (error as ValidationError).issues;
}

describe('listDeities', () => {
  it('hands the page request to the finder unchanged and answers its page', async () => {
    const page: PageRequest = { limit: 26, inverted: false };

    const entries = await listDeities({}, page);

    expect(repository.findDeityPage).toHaveBeenCalledWith({}, page);
    // The seed's first page: the request's limit is the page plus one.
    expect(entries).toHaveLength(26);
    expect(entries[0].node).toMatchObject({
      name: expect.any(String),
      traditionId: expect.any(String),
    });
  });
});

// Which deities are curated — a live deity under a live tradition — and their
// order are the finder's (tests/db/repository/vocabularies.test.ts); the
// service's rule is that it counts what its own list pages.
describe('listDeities and countDeities under a filter', () => {
  /** Every curated deity the filter reaches, by name — the list's own order. */
  const listedUnder = async (filter: DeityFilter): Promise<string[]> => {
    const page = await resolvePage({ first: 100 }, (request) => listDeities(filter, request));
    return page.edges.map((edge) => edge.node.name);
  };

  it("counts the deities listDeities pages, and how many come before a page's first row", async () => {
    const first = await resolvePage({ first: 25 }, (page) => listDeities({}, page));
    const [{ cursor: startOfSecond }] = await listDeities(
      {},
      { after: decodeCursor(first.pageInfo.endCursor as string), limit: 1, inverted: false },
    );
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from deities d join deity_traditions t on t.id = d.tradition_id
      where d.deleted_at is null and t.deleted_at is null`;

    await expect(countDeities({}, undefined)).resolves.toEqual({
      totalCount: n,
      countBefore: null,
    });
    await expect(countDeities({}, startOfSecond)).resolves.toEqual({
      totalCount: n,
      countBefore: 25,
    });
  });

  it("narrows to a query, read trimmed, and to a tradition's deities", async () => {
    await seed('Fixture Ours', 'Greek');
    await seed('Fixture Theirs', 'Roman');
    // Why the other could have been listed: it is live, and the query matches it.
    expect(await listedUnder({ query: ' fixture ' })).toEqual(['Fixture Ours', 'Fixture Theirs']);

    expect(await listedUnder({ query: 'fixture', traditionId: tradition('Roman') })).toEqual([
      'Fixture Theirs',
    ]);
    await expect(
      countDeities({ query: 'fixture', traditionId: tradition('Roman') }, undefined),
    ).resolves.toEqual({ totalCount: 1, countBefore: null });
  });

  it('reads a blank query as no query', async () => {
    expect(await listedUnder({ query: '   ' })).toEqual(await listedUnder({}));
  });

  it('answers an empty page and a zero count for a tradition id that is not a uuid, reading nothing', async () => {
    await expect(
      listDeities({ traditionId: 'greek' }, { limit: 25, inverted: false }),
    ).resolves.toEqual([]);
    await expect(countDeities({ traditionId: 'greek' }, undefined)).resolves.toEqual({
      totalCount: 0,
      countBefore: null,
    });
    expect(repository.findDeityPage).not.toHaveBeenCalled();
  });
});

describe('listDeityTraditions', () => {
  it('pages the live traditions alphabetically by name, a deleted one left out', async () => {
    const [retired] = await sql<{ id: string }[]>`
      insert into deity_traditions (name, slug, description, created_by, updated_by, deleted_at, deleted_by)
      values ('Fixture Retired', 'fixture-retired', 'Retired', ${A.id}, ${A.id}, now(), ${E.id})
      returning id`;
    const expected = await sql<{ id: string }[]>`
      select id from deity_traditions where deleted_at is null order by name, id`;
    expect(expected.length).toBeGreaterThan(25);

    const page = await resolvePage({ first: 100 }, listDeityTraditions);

    const listed = page.edges.map((edge) => edge.node.id);
    expect(listed).toEqual(expected.map((row) => row.id));
    expect(listed).not.toContain(retired.id);
  });
});

// "Page X of Y" on the group page: what the list pages, counted in its order.
describe('countDeityTraditions', () => {
  it('counts the groups listDeityTraditions pages, and how many come before a page’s first row', async () => {
    const first = await resolvePage({ first: 2 }, listDeityTraditions);
    const [{ cursor: startOfSecond }] = await listDeityTraditions({
      after: decodeCursor(first.pageInfo.endCursor as string),
      limit: 1,
      inverted: false,
    });
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from deity_traditions where deleted_at is null`;
    // The precondition: more than one page of two.
    expect(n).toBeGreaterThan(2);

    await expect(countDeityTraditions(undefined)).resolves.toEqual({
      totalCount: n,
      countBefore: null,
    });
    await expect(countDeityTraditions(startOfSecond)).resolves.toEqual({
      totalCount: n,
      countBefore: 2,
    });
  });
});

describe('getDeityBySlug', () => {
  it('answers the live deity holding the address', async () => {
    const id = await seed('Fixture Found');

    await expect(getDeityBySlug('fixture-found-greek')).resolves.toMatchObject({ id });
  });

  it('answers NotFound for a deleted one, and for an address nothing holds', async () => {
    const id = await seed('Fixture Gone');
    await sql`update deities set deleted_at = now(), deleted_by = ${E.id} where id = ${id}`;

    await expect(getDeityBySlug('fixture-gone-greek')).rejects.toThrow(NotFound);
    await expect(getDeityBySlug('no-such-deity')).rejects.toThrow(NotFound);
  });
});

describe('createDeity', () => {
  it('lets the site admin create one, its slug from the name and the tradition, stamped by them', async () => {
    const created = await createDeity(admin, input({ name: 'Fixture Made' }));

    expect(await deityOf(created.id)).toMatchObject({
      name: 'Fixture Made',
      slug: 'fixture-made-greek',
      description: 'A god this test made',
      tradition_id: tradition('Greek'),
      seed_key: null,
      created_by: E.id,
      updated_by: E.id,
      deleted_at: null,
    });
  });

  it.each(NON_ADMINS)('refuses %s, writing nothing', async (_who, user) => {
    await expect(createDeity(asUser(user), input())).rejects.toThrow(Forbidden);
    expect(await countNamed('Fixture Testra')).toBe(0);
  });

  it('refuses a non-admin before reading the input, so a bad one earns the same refusal', async () => {
    await expect(createDeity(asUser(A), input({ name: '   ' }))).rejects.toBeInstanceOf(Forbidden);
  });

  // MB.132, as M5.6a for forms: two live deities may share a name, told apart by the tradition.
  it('holds two deities of one name under two traditions', async () => {
    const greek = await createDeity(admin, input({ name: 'Fixture Hekate' }));
    const roman = await createDeity(
      admin,
      input({ name: 'Fixture Hekate', traditionId: tradition('Roman') }),
    );

    expect([greek.slug, roman.slug]).toEqual(['fixture-hekate-greek', 'fixture-hekate-roman']);
    expect(await countNamed('Fixture Hekate')).toBe(2);
  });

  it('refuses a name whose address a live deity in the tradition holds, on `name`, naming it', async () => {
    await seed('Fixture Testra', 'Greek');

    const issues = await issuesOf(createDeity(admin, input({ name: 'Fixture-Testra' })));

    expect(issues).toEqual([
      {
        path: ['name'],
        message:
          '"Fixture Testra" already has the address "fixture-testra-greek" — choose another name or tradition',
      },
    ]);
    expect(await countNamed('Fixture-Testra')).toBe(0);
  });

  it("takes a deleted deity's address", async () => {
    const deleted = await seed('Fixture Again');
    await sql`update deities set deleted_at = now(), deleted_by = ${E.id} where id = ${deleted}`;

    const created = await createDeity(admin, input({ name: 'Fixture Again' }));

    expect(created.slug).toBe('fixture-again-greek');
  });

  it('refuses a tradition that is retired, or that is not one, on `traditionId`', async () => {
    const [retired] = await sql<{ id: string }[]>`
      insert into deity_traditions (name, slug, description, created_by, updated_by, deleted_at, deleted_by)
      values ('Fixture Lapsed', 'fixture-lapsed', 'Lapsed', ${A.id}, ${A.id}, now(), ${E.id})
      returning id`;

    for (const traditionId of [retired.id, '99999999-9999-4999-8999-999999999999']) {
      const issues = await issuesOf(createDeity(admin, input({ traditionId })));
      expect(issues).toEqual([{ path: ['traditionId'], message: 'Choose a tradition' }]);
    }
    expect(await countNamed('Fixture Testra')).toBe(0);
  });
});

describe('updateDeity', () => {
  it('lets the site admin rewrite it, tradition included, the slug following both, created_by kept', async () => {
    const id = await seed('Fixture Old');

    await updateDeity(admin, id, {
      name: 'Fixture New',
      description: 'Rewritten',
      traditionId: tradition('Roman'),
    });

    expect(await deityOf(id)).toMatchObject({
      name: 'Fixture New',
      slug: 'fixture-new-roman',
      description: 'Rewritten',
      tradition_id: tradition('Roman'),
      created_by: A.id,
      updated_by: E.id,
    });
  });

  it("keeps a seeded row's seed key through a rename", async () => {
    const id = await seed('Fixture Seeded');
    await sql`update deities set seed_key = 'fixture-seeded' where id = ${id}`;

    await updateDeity(admin, id, input({ name: 'Fixture Renamed' }));

    expect(await deityOf(id)).toMatchObject({
      name: 'Fixture Renamed',
      seed_key: 'fixture-seeded',
    });
  });

  it.each(NON_ADMINS)('refuses %s and leaves the row as it was', async (_who, user) => {
    const id = await seed('Fixture Standing');
    const before = await deityOf(id);

    await expect(updateDeity(asUser(user), id, input())).rejects.toThrow(Forbidden);
    expect(await deityOf(id)).toEqual(before);
  });

  it("refuses a rename onto another deity's address, on `name`, leaving the row as it was", async () => {
    const id = await seed('Fixture Mine');
    await seed('Fixture Theirs');
    const before = await deityOf(id);

    const issues = await issuesOf(updateDeity(admin, id, input({ name: 'Fixture theirs' })));

    expect(issues).toEqual([
      {
        path: ['name'],
        message:
          '"Fixture Theirs" already has the address "fixture-theirs-greek" — choose another name or tradition',
      },
    ]);
    expect(await deityOf(id)).toEqual(before);
  });

  it('refuses a move into a tradition whose deity of the same name holds the address, on `name`', async () => {
    const id = await seed('Fixture Hekate', 'Greek');
    await seed('Fixture Hekate', 'Roman');
    const before = await deityOf(id);

    const issues = await issuesOf(
      updateDeity(admin, id, input({ name: 'Fixture Hekate', traditionId: tradition('Roman') })),
    );

    expect(issues).toEqual([
      {
        path: ['name'],
        message:
          '"Fixture Hekate" already has the address "fixture-hekate-roman" — choose another name or tradition',
      },
    ]);
    expect(await deityOf(id)).toEqual(before);
  });

  it('refuses a retired tradition on `traditionId`, leaving the row as it was', async () => {
    const id = await seed('Fixture Steady');
    const [retired] = await sql<{ id: string }[]>`
      insert into deity_traditions (name, slug, description, created_by, updated_by, deleted_at, deleted_by)
      values ('Fixture Lapsed', 'fixture-lapsed', 'Lapsed', ${A.id}, ${A.id}, now(), ${E.id})
      returning id`;
    const before = await deityOf(id);

    const issues = await issuesOf(updateDeity(admin, id, input({ traditionId: retired.id })));

    expect(issues).toEqual([{ path: ['traditionId'], message: 'Choose a tradition' }]);
    expect(await deityOf(id)).toEqual(before);
  });

  it('answers NotFound for a deleted deity, for an id that names nothing, and for one that is not a uuid', async () => {
    const id = await seed('Fixture Deleted');
    await sql`update deities set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;
    const before = await deityOf(id);

    await expect(updateDeity(admin, id, input())).rejects.toThrow(NotFound);
    await expect(
      updateDeity(admin, '99999999-9999-4999-8999-999999999999', input()),
    ).rejects.toThrow(NotFound);
    await expect(updateDeity(admin, 'not-a-uuid', input())).rejects.toThrow(NotFound);
    expect(await deityOf(id)).toEqual(before);
  });

  describe('a rename, while live compendium entries pick the deity', () => {
    it("rewrites each entry's link in place, in the same write, stamped by the admin", async () => {
      const id = await seed('Fixture Hekate');
      const first = await picking('Testwort', id);
      const second = await entry('Testleaf');
      await insertDeityLink(sql, second, await seed('Fixture Other'), 0, A.id);
      const later = await insertDeityLink(sql, second, id, 1, A.id);

      await updateDeity(admin, id, input({ name: 'Fixture Hecate' }));

      expect(await linkOf(first.link)).toMatchObject({
        name: 'Fixture Hecate',
        deity_id: id,
        position: 0,
        created_by: A.id,
        updated_by: E.id,
      });
      expect(await linkOf(later)).toMatchObject({ name: 'Fixture Hecate', position: 1 });
    });

    it('carries a change of case alone, and nothing when the name stays', async () => {
      const id = await seed('Fixture hekate');
      const { link } = await picking('Testwort', id);

      await updateDeity(admin, id, input({ name: 'Fixture hekate', description: 'Same name' }));
      expect(await linkOf(link)).toMatchObject({ name: 'Fixture hekate', updated_by: A.id });

      await updateDeity(admin, id, input({ name: 'Fixture Hekate' }));
      expect(await linkOf(link)).toMatchObject({ name: 'Fixture Hekate', updated_by: E.id });
    });

    // Why each could have been rewritten: each names the deity, and all but the typed one link it.
    it("leaves a soft-deleted entry's link, a dropped link, a typed name and a namesake's link with the old spelling", async () => {
      const id = await seed('Fixture Hekate');
      const namesake = await seed('Fixture Hekate', 'Roman');
      const gone = await picking('Testgone', id);
      await sql`update ingredients set deleted_at = now(), deleted_by = ${E.id} where id = ${gone.entry}`;
      const dropped = await picking('Testdrop', id);
      await sql`
        update ingredient_deities set deleted_at = now(), deleted_by = ${E.id}
        where id = ${dropped.link}`;
      await entry('Testtyped', { deities: ['Fixture Hekate'] });
      const [typed] = await sql<{ id: string }[]>`
        select id from ingredient_deities where deity_id is null`;
      const other = await picking('Testother', namesake);
      const links = [gone.link, dropped.link, typed.id, other.link];
      const before = await Promise.all(links.map(linkOf));
      expect(before.map((row) => row.name)).toEqual(Array(4).fill('Fixture Hekate'));

      await updateDeity(admin, id, input({ name: 'Fixture Hecate' }));

      expect(await Promise.all(links.map(linkOf))).toEqual(before);
    });

    it("never rewrites a coven's link, though it picked the deity", async () => {
      const id = await seed('Fixture Hekate');
      const coven = await picking('Testwort', id, { workspaceId: WORKSPACE_W_ID });
      const before = await linkOf(coven.link);
      // Why it could have been rewritten: W's ingredient links this very deity.
      expect(before).toMatchObject({ deity_id: id, name: 'Fixture Hekate' });

      await updateDeity(admin, id, input({ name: 'Fixture Hecate' }));

      expect(await linkOf(coven.link)).toEqual(before);
    });

    it('rolls the links back with the deity when the deity write is refused', async () => {
      const id = await seed('Fixture Hekate');
      await seed('Fixture Hecate');
      const { link } = await picking('Testwort', id);
      const before = await linkOf(link);

      await issuesOf(updateDeity(admin, id, input({ name: 'Fixture Hecate' })));

      expect(await linkOf(link)).toEqual(before);
    });
  });
});

describe('deleteDeity', () => {
  it('lets the site admin soft-delete one no entry picked, keeping the row', async () => {
    const id = await seed('Fixture Unused');

    await deleteDeity(admin, id);

    const row = await deityOf(id);
    expect(row).toMatchObject({ deleted_by: E.id, created_by: A.id });
    expect(row.deleted_at).toBeInstanceOf(Date);
  });

  it.each(NON_ADMINS)('refuses %s and leaves the row as it was', async (_who, user) => {
    const id = await seed('Fixture Standing');
    const before = await deityOf(id);

    await expect(deleteDeity(asUser(user), id)).rejects.toThrow(Forbidden);
    expect(await deityOf(id)).toEqual(before);
  });

  it('answers NotFound for a deity already deleted, for an id that names nothing, and for one that is not a uuid', async () => {
    const id = await seed('Fixture Twice');
    await sql`update deities set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;
    const before = await deityOf(id);

    await expect(deleteDeity(admin, id)).rejects.toThrow(NotFound);
    await expect(deleteDeity(admin, '99999999-9999-4999-8999-999999999999')).rejects.toThrow(
      NotFound,
    );
    await expect(deleteDeity(admin, 'not-a-uuid')).rejects.toThrow(NotFound);
    expect(await deityOf(id)).toEqual(before);
  });

  describe('while a live compendium entry picks it', () => {
    it('refuses, naming the entries, and the deity stays live', async () => {
      const id = await seed('Fixture Held');
      await picking('Testwort', id);
      await picking('Testcap', id);

      const attempt = deleteDeity(admin, id);

      await expect(attempt).rejects.toThrow(Forbidden);
      await expect(attempt).rejects.toThrow(
        '"Fixture Held" is among the deities of 2 compendium entries — Testcap (herb) and Testwort (herb). Take it off their deities first.',
      );
      expect((await deityOf(id)).deleted_at).toBeNull();
    });

    it('names the first three and counts the rest', async () => {
      const id = await seed('Fixture Crowded');
      for (const name of ['Testa', 'Testb', 'Testc', 'Testd', 'Teste']) await picking(name, id);

      await expect(deleteDeity(admin, id)).rejects.toThrow(
        '"Fixture Crowded" is among the deities of 5 compendium entries — Testa (herb), Testb (herb), Testc (herb) and 2 more. Take it off their deities first.',
      );
    });

    it('says "its" of a single entry', async () => {
      const id = await seed('Fixture Single');
      await picking('Testwort', id);

      await expect(deleteDeity(admin, id)).rejects.toThrow(
        '"Fixture Single" is among the deities of 1 compendium entry — Testwort (herb). Take it off its deities first.',
      );
    });

    it('passes once no live entry holds it', async () => {
      const id = await seed('Fixture Freed');
      const { link } = await picking('Testwort', id);
      await expect(deleteDeity(admin, id)).rejects.toThrow(Forbidden);
      await sql`
        update ingredient_deities set deleted_at = now(), deleted_by = ${E.id} where id = ${link}`;

      await deleteDeity(admin, id);

      expect((await deityOf(id)).deleted_at).toBeInstanceOf(Date);
    });
  });

  // MB.167: the pick holds a deity, so of two live deities called "Hecate"
  // only the one an entry picked is held.
  it('deletes the same-named deity that no entry picked', async () => {
    const picked = await seed('Fixture Hekate', 'Greek');
    const unpicked = await seed('Fixture Hekate', 'Roman');
    await picking('Testwort', picked);
    // Why it could have been held: an entry links its namesake, which is held.
    await expect(deleteDeity(admin, picked)).rejects.toThrow(Forbidden);

    await deleteDeity(admin, unpicked);

    expect((await deityOf(unpicked)).deleted_at).toBeInstanceOf(Date);
    expect((await deityOf(picked)).deleted_at).toBeNull();
  });

  it('is not held by an entry that only types it, nor by a deleted entry that picked it', async () => {
    const id = await seed('Fixture Lapsed');
    await entry('Testwort', { deities: ['Fixture Lapsed'] });
    const gone = await picking('Testleaf', id);
    await sql`update ingredients set deleted_at = now(), deleted_by = ${E.id} where id = ${gone.entry}`;
    // Why it could have been held: the deleted entry's link is still live.
    expect(await linkOf(gone.link)).toMatchObject({ deity_id: id, deleted_at: null });

    await deleteDeity(admin, id);

    expect((await deityOf(id)).deleted_at).toBeInstanceOf(Date);
  });

  it("is not held by a coven's ingredient that picked it, which keeps its link", async () => {
    const id = await seed('Fixture Coven');
    const coven = await picking('Testwort', id, { workspaceId: WORKSPACE_W_ID });
    const before = await linkOf(coven.link);
    // Why it could have been held: W's ingredient links this very deity.
    expect(before).toMatchObject({ deity_id: id });

    await deleteDeity(admin, id);

    expect((await deityOf(id)).deleted_at).toBeInstanceOf(Date);
    expect(await linkOf(coven.link)).toEqual(before);
  });
});
