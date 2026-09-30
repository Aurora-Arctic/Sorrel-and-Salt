import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import {
  findCompendiumCount,
  findCompendiumEntryByIdentity,
  findCompendiumPage,
  findOneIngredient,
  type IngredientFilter,
} from '@/db/repository';
import { InvalidCursor } from '@/lib/errors';
import { decodeCursor, resolvePage } from '@/lib/pagination';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import type { ingredients } from '@/modules/ingredients/schema/ingredients';
import { type Membership, assertMembership } from '@/modules/coven';
import { A, B, D, asUser } from '../../support/as-user';
import { insertIngredient } from '../../support/db/insert-ingredient';
import { makeIngredient } from '../../support/fixtures';
import type { ConnectionArgs, Page, PageCount } from '@/lib/types';

// The compendium read's two finders (claude-docs/db.md, "The compendium
// read"): the public list under its filters, and one row by id in the
// compendium or a proof's coven. Every expected order comes from SQL, because
// the database collates `en_US.utf8` and JS does not.

type Row = typeof ingredients.$inferSelect;

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

async function add(
  name: string,
  overrides: Parameters<typeof makeIngredient>[0] = {},
): Promise<string> {
  return insertIngredient(sql, makeIngredient({ name, nomenclature: 'none', ...overrides }), A.id);
}

type Scored = { score: number | null };

function pageOf(filter: IngredientFilter, args: ConnectionArgs = {}): Promise<Page<Row, Scored>> {
  return resolvePage(args, (request) => findCompendiumPage(filter, request));
}

async function namesOf(filter: IngredientFilter): Promise<string[]> {
  const page = await pageOf(filter, { first: 100 });
  return page.edges.map((edge) => edge.node.name);
}

/** The compendium's live ids in the finder's order, from the database's own collation. */
async function expectedOrder(): Promise<string[]> {
  const rows = await sql<{ id: string }[]>`
    select id from ingredients where workspace_id is null and deleted_at is null order by name, id`;
  return rows.map((row) => row.id);
}

/** The count a connection reads for a page: from its first row, or from none on an empty one. */
function countFor(filter: IngredientFilter, page: Page<Row, Scored>): Promise<PageCount> {
  const start = page.pageInfo.startCursor;
  return findCompendiumCount(filter, start === null ? undefined : decodeCursor(start));
}

interface Walk {
  ids: string[];
  counts: PageCount[];
}

/** Every page of `filter` at `size`, from the first, each with its count. */
async function walkForwards(filter: IngredientFilter, size: number): Promise<Walk> {
  const walk: Walk = { ids: [], counts: [] };
  let after: string | null = null;
  for (;;) {
    const page: Page<Row, Scored> = await pageOf(filter, { first: size, after });
    walk.ids.push(...page.edges.map((edge) => edge.node.id));
    walk.counts.push(await countFor(filter, page));
    if (!page.pageInfo.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }
  return walk;
}

/**
 * Every page of `filter` at `size`, from the last, which asks for the
 * remainder as the pager's Last does, so each page lines up with the one the
 * forward walk reaches. Counts come back in page order.
 */
async function walkBackwards(filter: IngredientFilter, size: number): Promise<Walk> {
  const { totalCount } = await findCompendiumCount(filter, undefined);
  const walk: Walk = { ids: [], counts: [] };
  let args: ConnectionArgs = { last: totalCount % size || size };
  for (;;) {
    const page: Page<Row, Scored> = await pageOf(filter, args);
    walk.ids.unshift(...page.edges.map((edge) => edge.node.id));
    walk.counts.unshift(await countFor(filter, page));
    if (!page.pageInfo.hasPreviousPage) break;
    args = { last: size, before: page.pageInfo.startCursor };
  }
  return walk;
}

/** `(n − 1) × size` for each of `pages` pages. */
const starts = (pages: number, size: number) =>
  Array.from({ length: pages }, (_, index) => index * size);

async function softDeleteFolkName(name: string): Promise<void> {
  await sql`
    update ingredient_folk_names set deleted_at = now(), deleted_by = ${A.id} where name = ${name}`;
}

describe('findCompendiumPage', () => {
  it('lists the compendium alone, in (name, id) order', async () => {
    await add('Fixture Nettle');
    await add('Fixture Mugwort');
    await add('Fixture Yarrow');
    await add('Fixture Wroot', { workspaceId: WORKSPACE_W_ID });
    // The precondition: a workspace row exists to be left out.
    const [{ count }] = await sql`
      select count(*)::int as count from ingredients where workspace_id is not null`;
    expect(count).toBe(1);

    const page = await pageOf({});

    expect(page.edges.map((edge) => edge.node.id)).toEqual(await expectedOrder());
    expect(page.edges.map((edge) => edge.node.name)).not.toContain('Fixture Wroot');
    expect(page.edges).toHaveLength(3);
  });

  describe('search', () => {
    beforeEach(async () => {
      await add('Fixture Mugwort', {
        nomenclature: 'botanical',
        canonicalName: 'Fixtura mugwortis',
      });
      await add('Fixture Nettle', { folkNames: ['Fixture Stingweed'] });
    });

    it('matches the display name, case-insensitively', async () => {
      expect(await namesOf({ query: 'MUGW' })).toEqual(['Fixture Mugwort']);
    });

    it('matches a prefix as it is typed', async () => {
      expect(await namesOf({ query: 'mu' })).toEqual(['Fixture Mugwort']);
    });

    it('forgives a typo the default word threshold would miss', async () => {
      // Why 0.5 decides it: the typo scores exactly 0.5 against the word, below
      // pg_trgm's own 0.6.
      const [{ score }] = await sql`select word_similarity('mugwrot', 'Mugwort') as score`;
      expect(score).toBe(0.5);

      expect(await namesOf({ query: 'mugwrot' })).toEqual(['Fixture Mugwort']);
    });

    it('matches across punctuation', async () => {
      await add("Fixture Devil's Lace");

      expect(await namesOf({ query: 'devils lace' })).toEqual(["Fixture Devil's Lace"]);
    });

    it('leaves out a row sharing no word with the query', async () => {
      expect(await namesOf({ query: 'stingweed' })).not.toContain('Fixture Mugwort');
    });

    it('matches the formal name', async () => {
      expect(await namesOf({ query: 'mugwortis' })).toEqual(['Fixture Mugwort']);
    });

    it('matches a live folk name and not a soft-deleted one', async () => {
      expect(await namesOf({ query: 'stingweed' })).toEqual(['Fixture Nettle']);

      await softDeleteFolkName('Fixture Stingweed');

      expect(await namesOf({ query: 'stingweed' })).toEqual([]);
    });

    it('folds accents both ways', async () => {
      await add('Fixture Uña');
      await add('Fixture Una Root');

      expect((await namesOf({ query: 'una' })).sort()).toEqual(['Fixture Una Root', 'Fixture Uña']);
      expect((await namesOf({ query: 'uña' })).sort()).toEqual(['Fixture Una Root', 'Fixture Uña']);
    });

    // A query with no letters or digits has no trigrams, so it matches nothing
    // rather than everything.
    it('matches nothing for a query of punctuation alone', async () => {
      await add('Fixture 100% Pure');

      expect(await namesOf({ query: '%' })).toEqual([]);
    });

    it('is no filter when blank', async () => {
      expect(await namesOf({ query: '   ' })).toHaveLength(2);
    });

    // The service treats a one-character query as absent; the finder itself
    // does not second-guess what it is handed.
    it('still matches, and ranks, a one-character query', async () => {
      const page = await pageOf({ query: 'm' }, { first: 100 });

      expect(page.edges.map((edge) => edge.node.name)).toContain('Fixture Mugwort');
      expect(page.edges.every((edge) => edge.score !== null)).toBe(true);
    });
  });

  describe('ranking', () => {
    const QUERY = 'mugwort';

    /**
     * The answer key, written independently of the finder: every live
     * compendium row's best word similarity across the label, the formal name
     * and its live folk names, at 0.5 or better, best first, then by name and id.
     */
    async function rankedOrder(query: string): Promise<{ id: string; score: number }[]> {
      return sql<{ id: string; score: number }[]>`
        select id, score from (
          select i.id, i.name, greatest(
            word_similarity(unaccent_immutable(${query}), unaccent_immutable(i.name)),
            word_similarity(unaccent_immutable(${query}), unaccent_immutable(i.canonical_name)),
            (select max(word_similarity(unaccent_immutable(${query}), unaccent_immutable(f.name)))
             from ingredient_folk_names f where f.ingredient_id = i.id and f.deleted_at is null)
          ) as score
          from ingredients i where i.workspace_id is null and i.deleted_at is null
        ) scored
        where score >= 0.5
        order by score desc, name, id`;
    }

    beforeEach(async () => {
      // Three rows sharing a label and a perfect score, so only the id orders them.
      for (const canonicalName of ['Fixtura una', 'Fixtura duo', 'Fixtura tres']) {
        await add('Fixture Mugwort', { nomenclature: 'botanical', canonicalName });
      }
      await add('Fixture Mugwort Leaf');
      await add('Fixture Mugwart');
      await add('Fixture Wormwood', { folkNames: ['Mugwort'] });
      await add('Fixture Mugroot');
      await add('Fixture Nettle');
    });

    it('pages best match first, ties by name then id', async () => {
      const expected = await rankedOrder(QUERY);
      // The preconditions: a tie on score across names, a tie on score and
      // name, and a weaker match below them — else the order proves nothing.
      const scores = expected.map((row) => row.score);
      expect(scores.filter((score) => score === 1).length).toBeGreaterThanOrEqual(5);
      expect(new Set(scores).size).toBeGreaterThan(1);

      const page = await pageOf({ query: QUERY }, { first: 100 });

      expect(page.edges.map((edge) => edge.node.id)).toEqual(expected.map((row) => row.id));
      expect(page.edges.map((edge) => edge.score)).toEqual(scores);
      expect(page.edges[0].node.name).not.toBe('Fixture Mugroot');
    });

    it('scores a folk-name match by the folk name', async () => {
      const page = await pageOf({ query: QUERY }, { first: 100 });

      const wormwood = page.edges.find((edge) => edge.node.name === 'Fixture Wormwood');
      expect(wormwood?.score).toBe(1);
    });

    it('walks across the ties forwards, neither losing nor repeating a row', async () => {
      const expected = (await rankedOrder(QUERY)).map((row) => row.id);

      const ids: string[] = [];
      let after: string | null = null;
      for (;;) {
        const page: Page<Row, Scored> = await pageOf({ query: QUERY }, { first: 2, after });
        ids.push(...page.edges.map((edge) => edge.node.id));
        if (!page.pageInfo.hasNextPage) break;
        after = page.pageInfo.endCursor;
      }

      expect(ids).toEqual(expected);
    });

    it('walks across the ties backwards, mirroring the forward walk', async () => {
      const expected = (await rankedOrder(QUERY)).map((row) => row.id);

      const ids: string[] = [];
      let before: string | null = null;
      for (;;) {
        const page: Page<Row, Scored> = await pageOf({ query: QUERY }, { last: 2, before });
        ids.unshift(...page.edges.map((edge) => edge.node.id));
        if (!page.pageInfo.hasPreviousPage) break;
        before = page.pageInfo.startCursor;
      }

      expect(ids).toEqual(expected);
    });

    it('places page n at (n − 1) × size, walked either way across the ties', async () => {
      const expected = await rankedOrder(QUERY);
      // The preconditions: the perfect-score tie is wider than a page, so a
      // boundary falls inside it, and the last page is short, so the backward
      // walk's first step is the remainder rather than a whole page.
      const size = 4;
      const tied = expected.filter((row) => row.score === 1).length;
      expect(tied).toBeGreaterThan(size);
      expect(expected.length % size).not.toBe(0);
      const pages = Math.ceil(expected.length / size);

      const forwards = await walkForwards({ query: QUERY }, size);
      const backwards = await walkBackwards({ query: QUERY }, size);

      for (const walk of [forwards, backwards]) {
        expect(walk.ids).toEqual(expected.map((row) => row.id));
        expect(walk.counts.map((count) => count.countBefore)).toEqual(starts(pages, size));
        expect(walk.counts.every((count) => count.totalCount === expected.length)).toBe(true);
      }
    });

    it('carries no score on an unranked page', async () => {
      const page = await pageOf({}, { first: 100 });

      expect(page.edges).not.toHaveLength(0);
      expect(page.edges.every((edge) => edge.score === null)).toBe(true);
    });

    // A browse is keyed by one part and a search by two, so neither's cursor
    // names a position in the other.
    it("refuses a browse's cursor on a search, and a search's on a browse", async () => {
      const browse = await pageOf({}, { first: 1 });
      const search = await pageOf({ query: QUERY }, { first: 1 });

      await expect(pageOf({ query: QUERY }, { after: browse.pageInfo.endCursor })).rejects.toThrow(
        InvalidCursor,
      );
      await expect(pageOf({}, { after: search.pageInfo.endCursor })).rejects.toThrow(InvalidCursor);
    });
  });

  describe('categoryIds', () => {
    let protection: string;
    let cleansing: string;

    beforeAll(async () => {
      const rows = await sql`
        select id, name from categories
        where name in ('Protection', 'Cleansing') and deleted_at is null`;
      const byName = new Map(rows.map((row) => [row.name as string, row.id as string]));
      protection = byName.get('Protection') as string;
      cleansing = byName.get('Cleansing') as string;
    });

    beforeEach(async () => {
      await add('Fixture Both', { categories: ['Protection', 'Cleansing'] });
      await add('Fixture One', { categories: ['Protection'] });
      await add('Fixture None');
    });

    it('requires every listed category (AND)', async () => {
      expect(await namesOf({ categoryIds: [protection, cleansing] })).toEqual(['Fixture Both']);
    });

    it('matches any row carrying a single category', async () => {
      expect(await namesOf({ categoryIds: [protection] })).toEqual(['Fixture Both', 'Fixture One']);
    });

    it('is no filter when empty', async () => {
      expect(await namesOf({ categoryIds: [] })).toHaveLength(3);
    });
  });

  describe('form', () => {
    beforeEach(async () => {
      await add('Fixture Herb', { form: 'herb' });
      await add('Fixture Root', { form: 'root' });
    });

    it('matches the form folded, as canonical_key folds it', async () => {
      expect(await namesOf({ form: ' HERB ' })).toEqual(['Fixture Herb']);
    });

    it('combines with search', async () => {
      expect(await namesOf({ query: 'fixture', form: 'root' })).toEqual(['Fixture Root']);
    });
  });

  describe('paging', () => {
    it('walks every live row once, in order, and never a soft-deleted one', async () => {
      for (let n = 1; n <= 30; n += 1) {
        await add(`Fixture Leaf ${String(n).padStart(2, '0')}`);
      }
      const gone = await add('Fixture Leaf 31');
      await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${gone}`;
      const expected = await expectedOrder();
      expect(expected).toHaveLength(30);

      const ids: string[] = [];
      const sizes: number[] = [];
      let after: string | null = null;
      for (;;) {
        const page: Page<Row, Scored> = await pageOf({}, { first: 7, after });
        ids.push(...page.edges.map((edge) => edge.node.id));
        sizes.push(page.edges.length);
        if (!page.pageInfo.hasNextPage) break;
        after = page.pageInfo.endCursor;
      }

      expect(ids).toEqual(expected);
      expect(sizes).toEqual([7, 7, 7, 7, 2]);
      expect(ids).not.toContain(gone);
    });
  });
});

describe('findCompendiumCount', () => {
  const SIZE = 3;
  let protection: string;
  let excluded: string[];

  beforeAll(async () => {
    const [row] = await sql`
      select id from categories where name = 'Protection' and deleted_at is null`;
    protection = row.id as string;
  });

  // Seven herbs that `mugwrot` finds at 0.5 — every other one filed under
  // Protection — and five roots it does not; then a soft-deleted and a
  // coven's row that every filter below would otherwise count.
  beforeEach(async () => {
    for (let n = 1; n <= 7; n += 1) {
      await add(`Fixture Mugwort ${n}`, { categories: n % 2 === 1 ? ['Protection'] : [] });
    }
    for (let n = 1; n <= 5; n += 1) {
      await add(`Fixture Nettle ${n}`, { form: 'root' });
    }
    const gone = await add('Fixture Mugwort 8', { categories: ['Protection'] });
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${gone}`;
    const coven = await add('Fixture Mugwort 9', {
      categories: ['Protection'],
      workspaceId: WORKSPACE_W_ID,
    });
    excluded = [gone, coven];
  });

  /** Walks `filter`'s pages and holds every page's count to what the walk collected. */
  async function expectCountsToMatchTheWalk(filter: IngredientFilter, rows: number): Promise<void> {
    const walk = await walkForwards(filter, SIZE);

    // The precondition: more than one page, so a count is checked against
    // rows it did not read itself.
    expect(walk.ids).toHaveLength(rows);
    expect(walk.counts.length).toBeGreaterThan(1);
    expect(walk.counts.map((count) => count.totalCount)).toEqual(walk.counts.map(() => rows));
    expect(walk.counts.map((count) => count.countBefore)).toEqual(starts(walk.counts.length, SIZE));
    for (const id of excluded) expect(walk.ids).not.toContain(id);
  }

  it('is reading a table holding a soft-deleted and a coven row beside the compendium', async () => {
    const [{ count }] = await sql`
      select count(*)::int as count from ingredients
      where id in ${sql(excluded)}
        and form = 'herb'
        and exists (select 1 from ingredient_categories where ingredient_id = ingredients.id)`;
    expect(count).toBe(2);
  });

  it('counts the whole compendium, unfiltered', async () => {
    await expectCountsToMatchTheWalk({}, 12);
  });

  it('counts by category', async () => {
    await expectCountsToMatchTheWalk({ categoryIds: [protection] }, 4);
  });

  it('counts by form', async () => {
    await expectCountsToMatchTheWalk({ form: 'herb' }, 7);
  });

  // Read at pg_trgm's own 0.6, the count would find none of these rows while
  // the pages hold all seven.
  it('counts a search at the page’s threshold, 0.5, not the server’s 0.6', async () => {
    const page = await pageOf({ query: 'mugwrot' }, { first: 100 });
    const scores = page.edges.map((edge) => edge.score as number);
    expect(scores).toHaveLength(7);
    expect(scores.every((score) => score >= 0.5 && score < 0.6)).toBe(true);

    await expectCountsToMatchTheWalk({ query: 'mugwrot' }, 7);
  });

  it('places an empty page nowhere, and still counts the list', async () => {
    const last = await pageOf({}, { last: 1 });
    const past = await pageOf({}, { after: last.pageInfo.endCursor });
    expect(past.edges).toEqual([]);

    expect(await countFor({}, past)).toEqual({ totalCount: 12, countBefore: null });
    expect(await findCompendiumCount({ query: 'stingweed' }, undefined)).toEqual({
      totalCount: 0,
      countBefore: null,
    });
  });
});

describe('findOneIngredient', () => {
  let compendiumId: string;
  let localId: string;
  let inW: Membership;
  let inX: Membership;

  beforeAll(async () => {
    inW = await assertMembership(asUser(B), WORKSPACE_W_ID, { ingredient: ['read'] });
    inX = await assertMembership(asUser(D), WORKSPACE_X_ID, { ingredient: ['read'] });
  });

  beforeEach(async () => {
    compendiumId = await add('Fixture Compendial');
    localId = await add('Fixture Local', { workspaceId: WORKSPACE_W_ID });
  });

  it('answers a compendium row with no proof at all', async () => {
    await expect(findOneIngredient([], compendiumId)).resolves.toMatchObject({
      id: compendiumId,
      workspaceId: null,
    });
  });

  it("answers a workspace row under its own coven's proof only", async () => {
    // Why the refusals below could have passed wrongly: the row is there, and
    // the right proof reaches it.
    await expect(findOneIngredient([inW], localId)).resolves.toMatchObject({ id: localId });

    await expect(findOneIngredient([], localId)).resolves.toBeUndefined();
    await expect(findOneIngredient([inX], localId)).resolves.toBeUndefined();
  });

  it('answers the compendium under any proof', async () => {
    await expect(findOneIngredient([inX], compendiumId)).resolves.toMatchObject({
      id: compendiumId,
    });
  });

  it('answers nothing for a soft-deleted row, proof or not', async () => {
    await sql`
      update ingredients set deleted_at = now(), deleted_by = ${A.id}
      where id in (${compendiumId}, ${localId})`;

    await expect(findOneIngredient([], compendiumId)).resolves.toBeUndefined();
    await expect(findOneIngredient([inW], localId)).resolves.toBeUndefined();
  });
});

// What a colliding compendium write is refused with names this row, so the
// finder must read the key `ingredients_compendium_identity_unique` holds,
// folded as the generated column folds it.
describe('findCompendiumEntryByIdentity', () => {
  let entryId: string;

  beforeEach(async () => {
    entryId = await add('Testwort', {
      canonicalName: 'Fixtura testalis',
      nomenclature: 'botanical',
      form: 'root bark',
    });
  });

  it('finds the entry holding a formal name and form, folded as canonical_key folds them', async () => {
    await expect(
      findCompendiumEntryByIdentity({
        name: 'Another label',
        canonicalName: 'FIXTURA Testalis',
        form: '  Root Bark ',
      }),
    ).resolves.toMatchObject({ id: entryId, name: 'Testwort' });
  });

  // DESIGN.md §5's one cross-namespace collision: a label with no formal name
  // keys the same as another entry's formal name.
  it('finds it by a label standing in for the formal name', async () => {
    await expect(
      findCompendiumEntryByIdentity({
        name: 'Fixtura testalis',
        canonicalName: null,
        form: 'root bark',
      }),
    ).resolves.toMatchObject({ id: entryId });
  });

  it('tells a form apart from no form', async () => {
    await expect(
      findCompendiumEntryByIdentity({ name: 'Testwort', canonicalName: 'Fixtura testalis' }),
    ).resolves.toBeUndefined();
  });

  it('reads the compendium alone, and only its live rows', async () => {
    const identity = { name: 'Testleaf', canonicalName: null, form: null };
    // Why nothing could still be found: both rows hold the key, one in a coven
    // and one deleted, and a live compendium row holding it is found.
    const localId = await add('Testleaf', { workspaceId: WORKSPACE_W_ID, form: null });
    const deletedId = await add('Testleaf', { form: null });
    await expect(findCompendiumEntryByIdentity(identity)).resolves.toMatchObject({
      id: deletedId,
    });
    await sql`
      update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${deletedId}`;

    await expect(findCompendiumEntryByIdentity(identity)).resolves.toBeUndefined();
    const [local] = await sql`select canonical_key from ingredients where id = ${localId}`;
    expect(local.canonical_key).toBe('testleaf');
  });
});
