import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { findCompendiumPage, findOneIngredient, type IngredientFilter } from '@/db/repository';
import { InvalidCursor } from '@/lib/errors';
import { type ConnectionArgs, type Page, resolvePage } from '@/lib/pagination';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import type { ingredients } from '@/modules/ingredients/schema/ingredients';
import { type Membership, assertMembership } from '@/modules/coven';
import { A, B, D, asUser } from '../../support/as-user';
import { insertIngredient } from '../../support/db/insert-ingredient';
import { makeIngredient } from '../../support/fixtures';

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
      expect(await namesOf({ search: 'MUGW' })).toEqual(['Fixture Mugwort']);
    });

    it('matches a prefix as it is typed', async () => {
      expect(await namesOf({ search: 'mu' })).toEqual(['Fixture Mugwort']);
    });

    it('forgives a typo the default word threshold would miss', async () => {
      // Why 0.5 decides it: the typo scores exactly 0.5 against the word, below
      // pg_trgm's own 0.6.
      const [{ score }] = await sql`select word_similarity('mugwrot', 'Mugwort') as score`;
      expect(score).toBe(0.5);

      expect(await namesOf({ search: 'mugwrot' })).toEqual(['Fixture Mugwort']);
    });

    it('matches across punctuation', async () => {
      await add("Fixture Devil's Lace");

      expect(await namesOf({ search: 'devils lace' })).toEqual(["Fixture Devil's Lace"]);
    });

    it('leaves out a row sharing no word with the term', async () => {
      expect(await namesOf({ search: 'stingweed' })).not.toContain('Fixture Mugwort');
    });

    it('matches the formal name', async () => {
      expect(await namesOf({ search: 'mugwortis' })).toEqual(['Fixture Mugwort']);
    });

    it('matches a live folk name and not a soft-deleted one', async () => {
      expect(await namesOf({ search: 'stingweed' })).toEqual(['Fixture Nettle']);

      await softDeleteFolkName('Fixture Stingweed');

      expect(await namesOf({ search: 'stingweed' })).toEqual([]);
    });

    it('folds accents both ways', async () => {
      await add('Fixture Uña');
      await add('Fixture Una Root');

      expect((await namesOf({ search: 'una' })).sort()).toEqual([
        'Fixture Una Root',
        'Fixture Uña',
      ]);
      expect((await namesOf({ search: 'uña' })).sort()).toEqual([
        'Fixture Una Root',
        'Fixture Uña',
      ]);
    });

    // A term with no letters or digits has no trigrams, so it matches nothing
    // rather than everything.
    it('matches nothing for a term of punctuation alone', async () => {
      await add('Fixture 100% Pure');

      expect(await namesOf({ search: '%' })).toEqual([]);
    });

    it('is no filter when blank', async () => {
      expect(await namesOf({ search: '   ' })).toHaveLength(2);
    });

    // The service treats a one-character term as absent; the finder itself
    // does not second-guess what it is handed.
    it('still matches, and ranks, a one-character term', async () => {
      const page = await pageOf({ search: 'm' }, { first: 100 });

      expect(page.edges.map((edge) => edge.node.name)).toContain('Fixture Mugwort');
      expect(page.edges.every((edge) => edge.score !== null)).toBe(true);
    });
  });

  describe('ranking', () => {
    const TERM = 'mugwort';

    /**
     * The answer key, written independently of the finder: every live
     * compendium row's best word similarity across the label, the formal name
     * and its live folk names, at 0.5 or better, best first, then by name and id.
     */
    async function rankedOrder(term: string): Promise<{ id: string; score: number }[]> {
      return sql<{ id: string; score: number }[]>`
        select id, score from (
          select i.id, i.name, greatest(
            word_similarity(unaccent_immutable(${term}), unaccent_immutable(i.name)),
            word_similarity(unaccent_immutable(${term}), unaccent_immutable(i.canonical_name)),
            (select max(word_similarity(unaccent_immutable(${term}), unaccent_immutable(f.name)))
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
      const expected = await rankedOrder(TERM);
      // The preconditions: a tie on score across names, a tie on score and
      // name, and a weaker match below them — else the order proves nothing.
      const scores = expected.map((row) => row.score);
      expect(scores.filter((score) => score === 1).length).toBeGreaterThanOrEqual(5);
      expect(new Set(scores).size).toBeGreaterThan(1);

      const page = await pageOf({ search: TERM }, { first: 100 });

      expect(page.edges.map((edge) => edge.node.id)).toEqual(expected.map((row) => row.id));
      expect(page.edges.map((edge) => edge.score)).toEqual(scores);
      expect(page.edges[0].node.name).not.toBe('Fixture Mugroot');
    });

    it('scores a folk-name match by the folk name', async () => {
      const page = await pageOf({ search: TERM }, { first: 100 });

      const wormwood = page.edges.find((edge) => edge.node.name === 'Fixture Wormwood');
      expect(wormwood?.score).toBe(1);
    });

    it('walks across the ties forwards, neither losing nor repeating a row', async () => {
      const expected = (await rankedOrder(TERM)).map((row) => row.id);

      const ids: string[] = [];
      let after: string | null = null;
      for (;;) {
        const page: Page<Row, Scored> = await pageOf({ search: TERM }, { first: 2, after });
        ids.push(...page.edges.map((edge) => edge.node.id));
        if (!page.pageInfo.hasNextPage) break;
        after = page.pageInfo.endCursor;
      }

      expect(ids).toEqual(expected);
    });

    it('walks across the ties backwards, mirroring the forward walk', async () => {
      const expected = (await rankedOrder(TERM)).map((row) => row.id);

      const ids: string[] = [];
      let before: string | null = null;
      for (;;) {
        const page: Page<Row, Scored> = await pageOf({ search: TERM }, { last: 2, before });
        ids.unshift(...page.edges.map((edge) => edge.node.id));
        if (!page.pageInfo.hasPreviousPage) break;
        before = page.pageInfo.startCursor;
      }

      expect(ids).toEqual(expected);
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
      const search = await pageOf({ search: TERM }, { first: 1 });

      await expect(pageOf({ search: TERM }, { after: browse.pageInfo.endCursor })).rejects.toThrow(
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
      expect(await namesOf({ search: 'fixture', form: 'root' })).toEqual(['Fixture Root']);
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
