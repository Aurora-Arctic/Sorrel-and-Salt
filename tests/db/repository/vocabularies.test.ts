import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import {
  findAstrologyValueCount,
  findAstrologyValues,
  findDeityCount,
  findDeityPage,
  findIngredientFormValueCount,
  findIngredientFormValues,
} from '@/db/repository';
import { planets, zodiacSigns } from '@/modules/vocabulary/schema/astrology';
import { decodeCursor, resolvePage } from '@/lib/pagination';
import { A } from '../../support/as-user';
import type { ConnectionArgs, Page } from '@/lib/types';
import type { DeityFilter, IngredientFormValueRow } from '@/modules/vocabulary';

// The curated form vocabulary as `ingredientFormValues` pages it: every live
// form whose group is live too, in (name, id) order — the same "curated"
// `findVocabularySuggestions` means (claude-docs/db/compendium-read.md, "The compendium read").

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

// The seed is shared by every test in this file, so each undoes its own tombstones.
afterEach(async () => {
  await sql`update ingredient_forms set deleted_at = null, deleted_by = null`;
  await sql`update ingredient_form_groups set deleted_at = null, deleted_by = null`;
});

function pageOf(args: ConnectionArgs = {}): Promise<Page<IngredientFormValueRow>> {
  return resolvePage(args, (request) => findIngredientFormValues({}, request));
}

/** Follows `endCursor` to the end, collecting ids and page sizes. */
async function walk(first?: number): Promise<{ ids: string[]; sizes: number[] }> {
  const ids: string[] = [];
  const sizes: number[] = [];
  let after: string | null = null;
  for (;;) {
    const page: Page<IngredientFormValueRow> = await pageOf({ first, after });
    ids.push(...page.edges.map((edge) => edge.node.id));
    sizes.push(page.edges.length);
    if (!page.pageInfo.hasNextPage) return { ids, sizes };
    after = page.pageInfo.endCursor;
  }
}

/** The curated forms in the finder's order, from the database's own collation. */
async function expectedOrder(): Promise<string[]> {
  const rows = await sql<{ id: string }[]>`
    select f.id from ingredient_forms f
    where f.deleted_at is null
      and exists (
        select 1 from ingredient_form_groups g where g.id = f.group_id and g.deleted_at is null)
    order by f.name, f.id`;
  return rows.map((row) => row.id);
}

describe('findIngredientFormValues', () => {
  it('walks every curated form once, in (name, id) order, at the default page size', async () => {
    const expected = await expectedOrder();
    // The precondition: the seed's 78 forms, more than three pages.
    expect(expected).toHaveLength(78);

    const { ids, sizes } = await walk();

    expect(ids).toEqual(expected);
    expect(sizes).toEqual([25, 25, 25, 3]);
  });

  it('omits a soft-deleted form', async () => {
    const [herb] = await sql`select id from ingredient_forms where slug = 'herb-botanical'`;
    await sql`
      update ingredient_forms set deleted_at = now(), deleted_by = ${A.id} where id = ${herb.id}`;

    const { ids } = await walk(100);

    expect(ids).toHaveLength(77);
    expect(ids).not.toContain(herb.id);
  });

  it('omits every form of a soft-deleted group, since a form is curated only while its group is', async () => {
    const [curio] = await sql`select id from ingredient_form_groups where slug = 'curio'`;
    const [{ count }] = await sql`
      select count(*)::int as count from ingredient_forms where group_id = ${curio.id}`;
    // The precondition: the group holds forms that would otherwise be listed.
    expect(count).toBeGreaterThan(0);
    await sql`
      update ingredient_form_groups set deleted_at = now(), deleted_by = ${A.id}
      where id = ${curio.id}`;

    const { ids } = await walk(100);

    expect(ids).toHaveLength(78 - count);
    expect(ids).toEqual(await expectedOrder());
  });
});

describe('findIngredientFormValueCount', () => {
  it('counts what the pages hold, and how many come before a page’s first row', async () => {
    const [herb] = await sql`select id from ingredient_forms where name = 'Herb'`;
    const [curio] = await sql`select id from ingredient_form_groups where name = 'Curio'`;
    const [{ count: underCurio }] = await sql`
      select count(*)::int as count from ingredient_forms where group_id = ${curio.id}`;
    await sql`
      update ingredient_forms set deleted_at = now(), deleted_by = ${A.id} where id = ${herb.id}`;
    await sql`
      update ingredient_form_groups set deleted_at = now(), deleted_by = ${A.id}
      where id = ${curio.id}`;
    const expected = await expectedOrder();
    // The precondition: a deleted form and a retired group's forms the count must leave out.
    expect(underCurio).toBeGreaterThan(0);
    expect(expected).toHaveLength(78 - 1 - underCurio);

    const first = await pageOf({ first: 25 });
    const second = await pageOf({ first: 25, after: first.pageInfo.endCursor });

    await expect(findIngredientFormValueCount({}, undefined)).resolves.toEqual({
      totalCount: expected.length,
      countBefore: null,
    });
    await expect(
      findIngredientFormValueCount({}, decodeCursor(second.pageInfo.startCursor as string)),
    ).resolves.toEqual({ totalCount: expected.length, countBefore: 25 });
  });
});

// The planets and the signs as `planets` and `zodiacSigns` page them (MB.95):
// every live row, in (name, id) order — one tier, so nothing else decides
// what is curated — narrowed by a name fragment read literally.
describe('findAstrologyValues', () => {
  afterEach(async () => {
    await sql`delete from planets where name like 'Fixture%'`;
    await sql`update planets set deleted_at = null, deleted_by = null`;
  });

  /** The live rows of `table` in the finder's order, from the database's own collation. */
  async function expectedAstrology(table: 'planets' | 'zodiac_signs'): Promise<string[]> {
    const rows = await sql<{ id: string }[]>`
      select id from ${sql(table)} where deleted_at is null order by name, id`;
    return rows.map((row) => row.id);
  }

  async function idsOf(
    vocabulary: typeof planets | typeof zodiacSigns,
    query?: string,
  ): Promise<string[]> {
    const page = await resolvePage({ first: 100 }, (request) =>
      findAstrologyValues(vocabulary, { query }, request),
    );
    return page.edges.map((edge) => edge.node.id);
  }

  it('lists every live planet and every live sign, each table alone, in (name, id) order', async () => {
    const [expectedPlanets, expectedSigns] = await Promise.all([
      expectedAstrology('planets'),
      expectedAstrology('zodiac_signs'),
    ]);
    // The precondition: the seed's nineteen bodies and thirteen signs, Ophiuchus among them.
    expect(expectedPlanets).toHaveLength(19);
    expect(expectedSigns).toHaveLength(13);

    expect(await idsOf(planets)).toEqual(expectedPlanets);
    expect(await idsOf(zodiacSigns)).toEqual(expectedSigns);
  });

  it('omits a soft-deleted planet', async () => {
    const [mars] = await sql`select id from planets where slug = 'mars'`;
    await sql`update planets set deleted_at = now(), deleted_by = ${A.id} where id = ${mars.id}`;

    const ids = await idsOf(planets);

    expect(ids).toHaveLength(18);
    expect(ids).not.toContain(mars.id);
  });

  it('narrows by a name fragment, case-insensitively, reading % and _ literally', async () => {
    await sql`
      insert into planets (name, slug, description, created_by, updated_by)
      values ('Fixture 100%', 'fixture-100', 'A test body', ${A.id}, ${A.id})`;
    const names = async (query: string) => {
      const page = await resolvePage({ first: 100 }, (request) =>
        findAstrologyValues(planets, { query }, request),
      );
      return page.edges.map((edge) => edge.node.name);
    };

    expect(await names('NODE')).toEqual(['North Node', 'South Node']);
    expect(await names('%')).toEqual(['Fixture 100%']);
    expect(await names('_')).toEqual([]);
  });
});

describe('findAstrologyValueCount', () => {
  afterEach(async () => {
    await sql`update zodiac_signs set deleted_at = null, deleted_by = null`;
  });

  it('counts what the pages hold under the filter, and how many come before a page’s first row', async () => {
    const [leo] = await sql`select id from zodiac_signs where slug = 'leo'`;
    await sql`update zodiac_signs set deleted_at = now(), deleted_by = ${A.id} where id = ${leo.id}`;
    const first = await resolvePage({ first: 5 }, (request) =>
      findAstrologyValues(zodiacSigns, {}, request),
    );
    const second = await resolvePage({ first: 5, after: first.pageInfo.endCursor }, (request) =>
      findAstrologyValues(zodiacSigns, {}, request),
    );

    await expect(findAstrologyValueCount(zodiacSigns, {}, undefined)).resolves.toEqual({
      totalCount: 12,
      countBefore: null,
    });
    await expect(
      findAstrologyValueCount(zodiacSigns, {}, decodeCursor(second.pageInfo.startCursor as string)),
    ).resolves.toEqual({ totalCount: 12, countBefore: 5 });
    await expect(findAstrologyValueCount(zodiacSigns, { query: 'ar' }, undefined)).resolves.toEqual(
      { totalCount: 3, countBefore: null },
    );
  });
});

// The deity vocabulary as the admin's deities page lists it (MB.132): every
// live deity under a live tradition — the same "curated" the autofill means —
// by its tradition's name, then its own, so a page reads each deity under its
// tradition, narrowed by a name fragment and a tradition.
describe('findDeityPage and findDeityCount', () => {
  afterEach(async () => {
    await sql`delete from deities where name like 'Fixture%'`;
    await sql`update deities set deleted_at = null, deleted_by = null`;
    await sql`update deity_traditions set deleted_at = null, deleted_by = null`;
  });

  /** The curated deities in the finder's order, from the database's own collation. */
  async function expectedDeities(): Promise<string[]> {
    const rows = await sql<{ id: string }[]>`
      select d.id from deities d join deity_traditions t on t.id = d.tradition_id
      where d.deleted_at is null and t.deleted_at is null
      order by t.name, d.name, d.id`;
    return rows.map((row) => row.id);
  }

  async function idsOf(filter: DeityFilter = {}, first = 100): Promise<string[]> {
    const ids: string[] = [];
    let after: string | null = null;
    for (;;) {
      const page: Page<{ id: string }> = await resolvePage({ first, after }, (request) =>
        findDeityPage(filter, request),
      );
      ids.push(...page.edges.map((edge) => edge.node.id));
      if (!page.pageInfo.hasNextPage) return ids;
      after = page.pageInfo.endCursor;
    }
  }

  const traditionId = async (name: string) =>
    (await sql`select id from deity_traditions where name = ${name}`)[0].id as string;

  it('walks every curated deity once, by tradition then name, at the maximum page size', async () => {
    const expected = await expectedDeities();
    // The precondition: the seed's 216 deities, more than two pages of 100.
    expect(expected).toHaveLength(216);

    expect(await idsOf()).toEqual(expected);
  });

  it('omits a soft-deleted deity, and every deity of a soft-deleted tradition', async () => {
    const [hecate] = await sql`select id from deities where name = 'Hecate'`;
    const roman = await traditionId('Roman');
    const [{ count: underRoman }] = await sql`
      select count(*)::int as count from deities where tradition_id = ${roman}`;
    // The precondition: the tradition holds deities that would otherwise be listed.
    expect(underRoman).toBeGreaterThan(0);
    await sql`update deities set deleted_at = now(), deleted_by = ${A.id} where id = ${hecate.id}`;
    await sql`
      update deity_traditions set deleted_at = now(), deleted_by = ${A.id} where id = ${roman}`;

    const ids = await idsOf();

    expect(ids).toHaveLength(216 - 1 - underRoman);
    expect(ids).toEqual(await expectedDeities());
    await expect(findDeityCount({}, undefined)).resolves.toEqual({
      totalCount: ids.length,
      countBefore: null,
    });
  });

  it('narrows by a name fragment read literally, and by a tradition, alone and together', async () => {
    const greek = await traditionId('Greek');
    await sql`
      insert into deities (name, slug, description, tradition_id, created_by, updated_by)
      values ('Fixture 100% Herm', 'fixture-100-herm', 'A test god', ${greek}, ${A.id}, ${A.id})`;
    const names = async (filter: DeityFilter) => {
      const page = await resolvePage({ first: 100 }, (request) => findDeityPage(filter, request));
      return page.edges.map((edge) => edge.node.name);
    };
    const [{ count: greeks }] = await sql`
      select count(*)::int as count from deities
      where tradition_id = ${greek} and deleted_at is null`;

    expect(await names({ query: '100%' })).toEqual(['Fixture 100% Herm']);
    expect(await names({ query: '_' })).toEqual([]);
    expect(await names({ query: 'HERM', traditionId: greek })).toEqual([
      'Fixture 100% Herm',
      'Hermes',
    ]);
    expect(await names({ traditionId: greek })).toHaveLength(greeks);
    await expect(findDeityCount({ traditionId: greek }, undefined)).resolves.toEqual({
      totalCount: greeks,
      countBefore: null,
    });
  });

  it('counts how many come before a page’s first row, in the pages’ order', async () => {
    const first = await resolvePage({ first: 25 }, (request) => findDeityPage({}, request));
    const second = await resolvePage({ first: 25, after: first.pageInfo.endCursor }, (request) =>
      findDeityPage({}, request),
    );

    await expect(
      findDeityCount({}, decodeCursor(second.pageInfo.startCursor as string)),
    ).resolves.toEqual({ totalCount: 216, countBefore: 25 });
  });
});
