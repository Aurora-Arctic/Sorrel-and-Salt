import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import {
  findCompendiumCount,
  findCompendiumEntryByIdentity,
  findCompendiumPage,
  findIngredientSuggestions,
  findManyOfIngredients,
  findManyOfVariants,
  findOneIngredient,
  findReferencesOf,
  findSubstitutesIncludingSoftDeleted,
  findWorkspaceIngredientByIdentity,
  type CompendiumScore,
  type IngredientFilter,
  type IngredientRow,
  withAudit,
} from '@/db/repository';
import { InvalidCursor } from '@/lib/errors';
import { decodeCursor, resolvePage } from '@/lib/pagination';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { type Membership, assertMembership } from '@/modules/coven';
import { assertSiteAdmin } from '@/modules/identity';
import { ingredientCategories } from '@/modules/ingredients/schema/ingredient-categories';
import { ingredientVariants } from '@/modules/ingredients/schema/ingredient-variants';
import { A, B, D, E, asUser } from '../../support/as-user';
import {
  insertDeityLink,
  insertIngredient,
  insertVariant,
} from '../../support/db/insert-ingredient';
import { insertReference, insertVariantReferenceLink } from '../../support/db/insert-reference';
import { makeIngredient, makeVariant } from '../../support/fixtures';
import type { ConnectionArgs, Page, PageCount } from '@/lib/types';
import type { Walk } from './types';

// The compendium read's two finders (claude-docs/db/compendium-read.md, "The compendium
// read"): the public list under its filters, and one row by id in the
// compendium or a proof's coven. Every expected order comes from SQL, because
// the database collates `en_US.utf8` and JS does not.

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

function pageOf(
  filter: IngredientFilter,
  args: ConnectionArgs = {},
): Promise<Page<IngredientRow, CompendiumScore>> {
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
function countFor(
  filter: IngredientFilter,
  page: Page<IngredientRow, CompendiumScore>,
): Promise<PageCount> {
  const start = page.pageInfo.startCursor;
  return findCompendiumCount(filter, start === null ? undefined : decodeCursor(start));
}

/** Every page of `filter` at `size`, from the first, each with its count. */
async function walkForwards(filter: IngredientFilter, size: number): Promise<Walk> {
  const walk: Walk = { ids: [], counts: [] };
  let after: string | null = null;
  for (;;) {
    const page: Page<IngredientRow, CompendiumScore> = await pageOf(filter, { first: size, after });
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
    const page: Page<IngredientRow, CompendiumScore> = await pageOf(filter, args);
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
      // No forms: the search reaches a form too (MB.218), and the fixture's
      // default `Testform` would answer a `testoil` query below.
      await add('Fixture Mugwort', {
        nomenclature: 'botanical',
        canonicalName: 'Fixtura mugwortis',
        variants: [],
      });
      await add('Fixture Nettle', { folkNames: ['Fixture Stingweed'], variants: [] });
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

    // The search reaches an entry's forms (MB.218): a word in a variant's form
    // or description finds the entry, still one row however many forms match.
    describe('through a variant', () => {
      let mugwortId: string;

      beforeEach(async () => {
        [{ id: mugwortId }] = await sql<{ id: string }[]>`
          select id from ingredients where name = 'Fixture Mugwort'`;
      });

      it("matches a live variant's form", async () => {
        await insertVariant(sql, mugwortId, { form: 'Testoil' }, A.id);

        expect(await namesOf({ query: 'testoil' })).toEqual(['Fixture Mugwort']);
      });

      it("matches a word in a variant's description", async () => {
        await insertVariant(
          sql,
          mugwortId,
          { form: 'Testoil', description: 'Pressed from the quandleberry seed' },
          A.id,
        );

        expect(await namesOf({ query: 'quandleberry' })).toEqual(['Fixture Mugwort']);
      });

      it('answers one row, at its best score, for an entry two of whose variants match', async () => {
        await insertVariant(sql, mugwortId, { form: 'Testoil' }, A.id);
        await insertVariant(
          sql,
          mugwortId,
          { form: 'Resin', description: 'Testoil, thickened' },
          A.id,
        );
        // The precondition: each variant matches the query on its own, by its
        // form and by its description.
        const [scores] = await sql`
          select word_similarity('testoil', 'Testoil') as form,
                 word_similarity('testoil', 'Testoil, thickened') as description`;
        expect(scores).toEqual({ form: 1, description: 1 });

        const page = await pageOf({ query: 'testoil' }, { first: 100 });

        // The form's weight, 0.6, beats the description's, 0.2.
        expect(page.edges.map((edge) => [edge.node.name, edge.score])).toEqual([
          ['Fixture Mugwort', 0.6],
        ]);
      });

      it('matches nothing through a soft-deleted variant', async () => {
        const variantId = await insertVariant(sql, mugwortId, { form: 'Testoil' }, A.id);
        // The precondition: the live variant is found.
        expect(await namesOf({ query: 'testoil' })).toEqual(['Fixture Mugwort']);

        await sql`
          update ingredient_variants set deleted_at = now(), deleted_by = ${A.id}
          where id = ${variantId}`;

        expect(await namesOf({ query: 'testoil' })).toEqual([]);
      });
    });
  });

  describe('ranking', () => {
    const QUERY = 'mugwort';

    /**
     * The answer key, written independently of the finder: every live
     * compendium row's best weighted field — the label at 1, the formal name
     * at 0.9, a live folk name at 0.8, a live variant's form at 0.6 and its
     * description at 0.2 — counting a field only where its word similarity is
     * 0.5 or better, best first, then by where that field holds the query,
     * then by name and id. A field scores its word similarity, or 1 where it
     * holds the query verbatim, case and accents folded. Its position is the
     * character the verbatim query starts at, or 2147483647 where it holds
     * none, so a fuzzy hit follows every verbatim one at its score; an entry
     * takes the position of its best-scoring field, the earliest among equal
     * ones. The weights, the containment rule and the position rule are
     * restated here on purpose rather than imported, and each number is cast
     * to `real` as the finder's are, so a product rounds as the finder's does.
     */
    async function rankedOrder(
      query: string,
    ): Promise<{ id: string; score: number; position: number }[]> {
      const q = sql`unaccent_immutable(${query})`;
      const ws = (text: postgres.Fragment) =>
        sql`word_similarity(${q}, unaccent_immutable(${text}))`;
      const at = (text: postgres.Fragment) =>
        sql`position(lower(${q}) in lower(unaccent_immutable(${text})))`;
      const field = (text: postgres.Fragment, weight: number) =>
        sql`select case when ${ws(text)} >= 0.5
                     then greatest(${ws(text)}, case when ${at(text)} > 0 then 1::real end) * ${weight}::real
                   end as score,
                   case when ${at(text)} > 0 then ${at(text)} else 2147483647 end as position`;
      return sql<{ id: string; score: number; position: number }[]>`
        select i.id, best.score, best.position
        from ingredients i
        cross join lateral (
          select score, position from (
            ${field(sql`i.name`, 1)}
            union all ${field(sql`i.canonical_name`, 0.9)}
            union all ${field(sql`f.name`, 0.8)}
              from ingredient_folk_names f where f.ingredient_id = i.id and f.deleted_at is null
            union all ${field(sql`v.form`, 0.6)}
              from ingredient_variants v where v.ingredient_id = i.id and v.deleted_at is null
            union all ${field(sql`v.description`, 0.2)}
              from ingredient_variants v where v.ingredient_id = i.id and v.deleted_at is null
          ) fields
          where score is not null
          order by score desc, position
          limit 1
        ) best
        where i.workspace_id is null and i.deleted_at is null
        order by best.score desc, best.position, i.name, i.id`;
    }

    beforeEach(async () => {
      // Three rows sharing a label and a perfect score, so only the id orders them.
      for (const canonicalName of ['Fixtura una', 'Fixtura duo', 'Fixtura tres']) {
        await add('Fixture Mugwort', { nomenclature: 'botanical', canonicalName });
      }
      // Two longer labels holding the word whole, so the perfect-score tie is
      // five rows, wider than a page of four.
      await add('Fixture Mugwort Leaf');
      await add('Fixture Mugwort Root');
      await add('Fixture Mugwart');
      await add('Fixture Wormwood', { folkNames: ['Mugwort'] });
      await add('Fixture Mugroot');
      await add('Fixture Nettle');
    });

    it('pages best match first, ties by position, then name, then id', async () => {
      const expected = await rankedOrder(QUERY);
      // The preconditions: a tie on score and position across names — every
      // perfect label holds the word at 9, after `Fixture ` — a tie on all
      // three, and a weaker match below them, else the order proves nothing.
      const scores = expected.map((row) => row.score);
      const perfect = expected.filter((row) => row.score === 1);
      expect(perfect.length).toBeGreaterThanOrEqual(5);
      expect(new Set(perfect.map((row) => row.position))).toEqual(new Set([9]));
      expect(new Set(scores).size).toBeGreaterThan(1);

      const page = await pageOf({ query: QUERY }, { first: 100 });

      expect(page.edges.map((edge) => edge.node.id)).toEqual(expected.map((row) => row.id));
      expect(page.edges.map((edge) => edge.score)).toEqual(scores);
      expect(page.edges[0].node.name).not.toBe('Fixture Mugroot');
    });

    it('scores a folk-name match by the folk name', async () => {
      const page = await pageOf({ query: QUERY }, { first: 100 });

      // The folk name is the word whole, similarity 1, at the folk name's weight.
      const wormwood = page.edges.find((edge) => edge.node.name === 'Fixture Wormwood');
      expect(wormwood?.score).toBe(0.8);
    });

    it('walks across the ties forwards, neither losing nor repeating a row', async () => {
      const expected = (await rankedOrder(QUERY)).map((row) => row.id);

      const ids: string[] = [];
      let after: string | null = null;
      for (;;) {
        const page: Page<IngredientRow, CompendiumScore> = await pageOf(
          { query: QUERY },
          { first: 2, after },
        );
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
        const page: Page<IngredientRow, CompendiumScore> = await pageOf(
          { query: QUERY },
          { last: 2, before },
        );
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

    // A browse is keyed by one part and a search by three, so neither's cursor
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

  // Each field a search matches carries a weight (claude-docs/db/compendium-read.md,
  // "The compendium read"), so a word found in a label outranks the same word
  // found in a folk name, a form or a description.
  describe('weighted ranking', () => {
    const QUERY = 'quandle';

    beforeEach(async () => {
      await add('Fixture Quandle');
      await add('Fixture Kettlebrim', {
        nomenclature: 'botanical',
        canonicalName: 'Fixtura quandle',
      });
      await add('Fixture Wimble', { folkNames: ['Quandle'] });
      await add('Fixture Quandly');
      await add('Fixture Thrum', { variants: [makeVariant({ form: 'Quandle' })] });
      await add('Fixture Sprocket', {
        variants: [makeVariant({ description: 'Steeped with quandle' })],
      });
    });

    it('ranks the label above the formal name, the folk name, the form and the description', async () => {
      // The preconditions: the near-miss label matches, but neither as a whole
      // word nor holding the query, so its rank sits between the folk name's
      // and the form's; and the entry with the formal name does not match by
      // its label, so it is found by the formal name alone.
      const [similarity] = await sql<{ nearMiss: number; label: number }[]>`
        select word_similarity(${QUERY}, 'Fixture Quandly') as "nearMiss",
               word_similarity(${QUERY}, 'Fixture Kettlebrim') as label`;
      expect(similarity.nearMiss).toBeGreaterThan(0.6);
      expect(similarity.nearMiss).toBeLessThan(0.8);
      expect(similarity.label).toBeLessThan(0.5);

      expect(await namesOf({ query: QUERY })).toEqual([
        'Fixture Quandle',
        'Fixture Kettlebrim',
        'Fixture Wimble',
        'Fixture Quandly',
        'Fixture Thrum',
        'Fixture Sprocket',
      ]);
    });

    it('carries the weighted rank on each edge', async () => {
      const [{ nearMiss }] = await sql<{ nearMiss: number }[]>`
        select word_similarity(${QUERY}, 'Fixture Quandly') as "nearMiss"`;

      const page = await pageOf({ query: QUERY }, { first: 100 });

      expect(page.edges.map((edge) => [edge.node.name, edge.score])).toEqual([
        ['Fixture Quandle', 1],
        ['Fixture Kettlebrim', 0.9],
        ['Fixture Wimble', 0.8],
        ['Fixture Quandly', expect.closeTo(nearMiss, 5)],
        ['Fixture Thrum', 0.6],
        ['Fixture Sprocket', 0.2],
      ]);
    });

    // `word_similarity` scores the query against whole words, so a fragment
    // inside a longer word scores by the trigrams it shares, under the same
    // fragment standing as a word of its own in a lighter field.
    it('scores a field holding the query verbatim, case and accents folded, as a full hit', async () => {
      await add('Fixture Mockleaf', { folkNames: ['Sweet Brim'] });
      // The precondition: by word similarity alone, the label holding `brim`
      // mid-word scores under the folk name's whole word at its weight, so
      // without the containment rule the folk name would rank first.
      const [{ label }] = await sql<{ label: number }[]>`
        select word_similarity('brim', 'Fixture Kettlebrim') as label`;
      expect(label).toBeGreaterThanOrEqual(0.5);
      expect(label).toBeLessThan(0.8);

      for (const query of ['brim', 'BRÍM']) {
        const page = await pageOf({ query }, { first: 100 });

        expect(page.edges.map((edge) => [edge.node.name, edge.score])).toEqual([
          ['Fixture Kettlebrim', 1],
          ['Fixture Mockleaf', 0.8],
        ]);
      }
    });

    it('walks the weighted order across a cursor, neither losing nor repeating a row', async () => {
      const whole = (await pageOf({ query: QUERY }, { first: 100 })).edges.map(
        (edge) => edge.node.id,
      );
      // The precondition: the walk takes more than one step.
      expect(whole.length).toBeGreaterThan(2);

      const ids: string[] = [];
      let after: string | null = null;
      for (;;) {
        const page: Page<IngredientRow, CompendiumScore> = await pageOf(
          { query: QUERY },
          { first: 2, after },
        );
        ids.push(...page.edges.map((edge) => edge.node.id));
        if (!page.pageInfo.hasNextPage) break;
        after = page.pageInfo.endCursor;
      }

      expect(ids).toEqual(whole);
    });
  });

  // At equal score, the entry whose field holds the query earliest ranks
  // first (claude-docs/db/compendium-read.md, "The compendium read"): for
  // `wood`, Wood Ash before Sandalwood, rather than alphabetically.
  describe('position among equals', () => {
    const QUERY = 'brim';

    beforeEach(async () => {
      await add('Brimstone Fixture');
      await add('Zebrim Fixture');
      // A folk name holding the query at 1, under the label's 9: the entry
      // ranks by the label, the field that set its score.
      await add('Fixture Brim Tonic', { folkNames: ['Brim'] });
      await add('Fixture Kettlebrim');
    });

    it('ranks the field holding the query earliest first, by the field that set the score', async () => {
      // The preconditions: every label holds the query, so all four score a
      // full hit, at positions out of alphabetical order; and the folk name
      // holds it earlier than its own entry's label does.
      const positions = await sql<{ name: string; position: number }[]>`
        select name, strpos(lower(name), ${QUERY}) as position
        from unnest(array['Brimstone Fixture', 'Zebrim Fixture', 'Fixture Brim Tonic',
                          'Fixture Kettlebrim', 'Brim']) as name`;
      expect(positions.map((row) => row.position)).toEqual([1, 3, 9, 15, 1]);

      const page = await pageOf({ query: QUERY }, { first: 100 });

      expect(page.edges.map((edge) => [edge.node.name, edge.score])).toEqual([
        ['Brimstone Fixture', 1],
        ['Zebrim Fixture', 1],
        ['Fixture Brim Tonic', 1],
        ['Fixture Kettlebrim', 1],
      ]);
    });

    it('walks the position order across a cursor, neither losing nor repeating a row', async () => {
      const ids: string[] = [];
      const names: string[] = [];
      let after: string | null = null;
      let pages = 0;
      for (;;) {
        const page: Page<IngredientRow, CompendiumScore> = await pageOf(
          { query: QUERY },
          { first: 2, after },
        );
        pages += 1;
        ids.push(...page.edges.map((edge) => edge.node.id));
        names.push(...page.edges.map((edge) => edge.node.name));
        if (!page.pageInfo.hasNextPage) break;
        after = page.pageInfo.endCursor;
      }

      // The precondition: a page boundary falls inside the tie.
      expect(pages).toBeGreaterThan(1);
      expect(new Set(ids).size).toBe(ids.length);
      expect(names).toEqual([
        'Brimstone Fixture',
        'Zebrim Fixture',
        'Fixture Brim Tonic',
        'Fixture Kettlebrim',
      ]);
    });

    it('counts the rows before a page that starts inside the tie', async () => {
      const first = await pageOf({ query: QUERY }, { first: 2 });
      const second = await pageOf({ query: QUERY }, { first: 2, after: first.pageInfo.endCursor });

      expect(await countFor({ query: QUERY }, second)).toEqual({ totalCount: 4, countBefore: 2 });
    });

    // A fuzzy hit holds the query nowhere, so it follows every verbatim hit
    // at its score.
    it('ranks a fuzzy hit after a verbatim one of equal score', async () => {
      await add('Fixture Brin');
      await add('Fixture Thrum', { variants: [makeVariant({ form: 'Brim' })] });
      // The preconditions: the label is word-similar to the query without
      // holding it, at exactly the form's weight, so the two tie on score and
      // only the position can put the form first, against the alphabet.
      const [label] = await sql<{ similarity: number; position: number }[]>`
        select word_similarity(${QUERY}, 'Fixture Brin') as similarity,
               strpos(lower('Fixture Brin'), ${QUERY}) as position`;
      expect(label).toEqual({ similarity: 0.6, position: 0 });

      const page = await pageOf({ query: QUERY }, { first: 100 });
      const tied = page.edges.filter((edge) => edge.score === 0.6);

      expect(tied.map((edge) => edge.node.name)).toEqual(['Fixture Thrum', 'Fixture Brin']);
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

    // A form's pair names the ingredient too (MB.217), so the filter finds
    // an entry by a category one of its forms adds; the pairs are hard-deleted
    // and outlive a soft-deleted form, so only a live form's count.
    it('finds an entry by a category a live form adds, and not by one only a deleted form held', async () => {
      const live = await add('Fixture Live Form');
      await insertVariant(sql, live, { form: 'Fixture Oil', categories: ['Cleansing'] }, A.id);
      const dropped = await add('Fixture Dropped Form');
      const droppedForm = await insertVariant(
        sql,
        dropped,
        { form: 'Fixture Oil', categories: ['Cleansing'] },
        A.id,
      );
      await sql`
        update ingredient_variants set deleted_at = now(), deleted_by = ${A.id}
        where id = ${droppedForm}`;
      // Why the dropped form could have counted: its pair is still there.
      const [{ count }] = await sql`
        select count(*)::int as count from ingredient_categories
        where variant_id = ${droppedForm} and category_id = ${cleansing}`;
      expect(count).toBe(1);

      expect(await namesOf({ categoryIds: [cleansing] })).toEqual([
        'Fixture Both',
        'Fixture Live Form',
      ]);
    });
  });

  // The text, on any of an entry's live forms (MB.222): an entry with two
  // forms is found under either, and once.
  describe('form', () => {
    beforeEach(async () => {
      await add('Fixture Both', {
        variants: [makeVariant({ form: 'Fixture Herb' }), makeVariant({ form: 'Fixture Oil' })],
      });
      await add('Fixture Root', { variants: [makeVariant({ form: 'Fixture Root' })] });
      // Its oil dropped, its root kept.
      const dropped = await add('Fixture Dropped', {
        variants: [makeVariant({ form: 'Fixture Root' }), makeVariant({ form: 'Fixture Oil' })],
      });
      await sql`
        update ingredient_variants set deleted_at = now(), deleted_by = ${A.id}
        where ingredient_id = ${dropped} and form = 'Fixture Oil'`;
    });

    it('finds an entry under each of its live forms, folded on both sides, and not under a dropped one', async () => {
      // Why Fixture Dropped could have been found by its oil: the row is still there.
      const [{ count }] = await sql`
        select count(*)::int as count from ingredient_variants where form = 'Fixture Oil'`;
      expect(count).toBe(2);

      expect(await namesOf({ form: ' fixture HERB ' })).toEqual(['Fixture Both']);
      expect(await namesOf({ form: 'FIXTURE OIL' })).toEqual(['Fixture Both']);
      expect(await namesOf({ form: 'fixture root' })).toEqual(['Fixture Dropped', 'Fixture Root']);
    });

    it('combines with search, under either form', async () => {
      expect(await namesOf({ query: 'both', form: 'fixture herb' })).toEqual(['Fixture Both']);
      expect(await namesOf({ query: 'both', form: 'fixture oil' })).toEqual(['Fixture Both']);
      expect(await namesOf({ query: 'both', form: 'fixture root' })).toEqual([]);
    });

    // A search matching both of an entry's forms is still one row, so the
    // count reads what the page holds.
    it('counts what the page holds, alone and with a search', async () => {
      for (const filter of [
        { form: 'fixture oil' },
        { form: 'fixture root' },
        { query: 'fixture', form: 'fixture oil' },
        { query: 'fixture', form: 'fixture root' },
      ]) {
        const page = await pageOf(filter, { first: 100 });
        // Precondition: the page holds rows for the count to agree with.
        expect(page.edges.length, JSON.stringify(filter)).toBeGreaterThan(0);
        expect(await countFor(filter, page), JSON.stringify(filter)).toEqual({
          totalCount: page.edges.length,
          countBefore: 0,
        });
      }
    });
  });

  // The pick, not the text (MB.167), on any of an entry's forms (MB.220): what
  // a form's delete reads, so only the entries holding a live variant that
  // picked this row answer, not every entry spelling it.
  describe('formId', () => {
    let herb: string;
    let root: string;

    beforeAll(async () => {
      const rows = await sql`
        select id, name from ingredient_forms where name in ('Herb', 'Root') and deleted_at is null`;
      const byName = new Map(rows.map((row) => [row.name as string, row.id as string]));
      herb = byName.get('Herb') as string;
      root = byName.get('Root') as string;
    });

    beforeEach(async () => {
      const picked = (form: string, formId?: string) =>
        makeVariant(formId === undefined ? { form } : { form, formId });
      await add('Fixture Picked', { variants: [picked('Herb', herb)] });
      // Its first form picks the root; its second picked the herb.
      await add('Fixture Second', { variants: [picked('Root', root), picked('Herb', herb)] });
      await add('Fixture Typed', { variants: [picked('Herb')] });
      await add('Fixture Coven', { variants: [picked('Herb', herb)], workspaceId: WORKSPACE_W_ID });
      const gone = await add('Fixture Gone', { variants: [picked('Herb', herb)] });
      await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${gone}`;
      // Its root kept and its herb dropped.
      const dropped = await add('Fixture Dropped', { variants: [picked('Root', root)] });
      const herbOf = await insertVariant(sql, dropped, picked('Herb', herb), A.id);
      await sql`
        update ingredient_variants set deleted_at = now(), deleted_by = ${A.id} where id = ${herbOf}`;
    });

    it('lists the live compendium entries holding a live variant that picked the form, by name, and no other', async () => {
      // Why the others could have been listed: each holds a variant of the
      // form's text, all but one picking it.
      const [{ count }] = await sql`
        select count(distinct ingredient_id)::int as count from ingredient_variants
        where form = 'Herb' and form_id is not null`;
      expect(count).toBe(5);

      expect(await namesOf({ formId: herb })).toEqual(['Fixture Picked', 'Fixture Second']);
      await expect(findCompendiumCount({ formId: herb }, undefined)).resolves.toEqual({
        totalCount: 2,
        countBefore: null,
      });
    });

    // Each arm reads any of the entry's live forms: Fixture Second picked the
    // root on one and spells the herb on another; Fixture Dropped's herb is gone.
    it('combines with the form text', async () => {
      expect(await namesOf({ formId: root, form: 'herb' })).toEqual(['Fixture Second']);
      expect(await namesOf({ formId: root, form: 'root' })).toEqual([
        'Fixture Dropped',
        'Fixture Second',
      ]);
    });
  });

  // A deity is a pick too (MB.167): what a deity's delete reads (MB.132), so
  // only the entries holding a live link to this row answer, not every entry
  // spelling it, nor one that picked a namesake.
  describe('deityId', () => {
    let hecate: string;
    let hermes: string;

    beforeAll(async () => {
      const rows = await sql`
        select id, name from deities where name in ('Hecate', 'Hermes') and deleted_at is null`;
      const byName = new Map(rows.map((row) => [row.name as string, row.id as string]));
      hecate = byName.get('Hecate') as string;
      hermes = byName.get('Hermes') as string;
    });

    beforeEach(async () => {
      await insertDeityLink(sql, await add('Fixture Picked'), hecate, 0, A.id);
      const second = await add('Fixture Also Picked');
      await insertDeityLink(sql, second, hermes, 0, A.id);
      await insertDeityLink(sql, second, hecate, 1, A.id);
      await add('Fixture Typed', { deities: ['Hecate'] });
      await insertDeityLink(sql, await add('Fixture Hermes'), hermes, 0, A.id);
      const coven = await add('Fixture Coven', { workspaceId: WORKSPACE_W_ID });
      await insertDeityLink(sql, coven, hecate, 0, A.id);
      const gone = await add('Fixture Gone');
      await insertDeityLink(sql, gone, hecate, 0, A.id);
      await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${gone}`;
      const dropped = await add('Fixture Dropped');
      const link = await insertDeityLink(sql, dropped, hecate, 0, A.id);
      await sql`
        update ingredient_deities set deleted_at = now(), deleted_by = ${A.id} where id = ${link}`;
    });

    it('lists the live compendium entries holding a live link to the deity, by name, and no other', async () => {
      // Why the others could have been listed: each names Hecate, and four link her.
      const [{ count }] = await sql`
        select count(distinct ingredient_id)::int as count from ingredient_deities
        where name = 'Hecate'`;
      expect(count).toBe(6);

      expect(await namesOf({ deityId: hecate })).toEqual(['Fixture Also Picked', 'Fixture Picked']);
      await expect(findCompendiumCount({ deityId: hecate }, undefined)).resolves.toEqual({
        totalCount: 2,
        countBefore: null,
      });
      expect(await namesOf({ deityId: hermes })).toEqual(['Fixture Also Picked', 'Fixture Hermes']);
    });
  });

  // The lists hold spellings, not picks (MB.162): what a celestial body's or a sign's
  // delete and rename read (MB.95), matched entry by entry under the
  // suggestions' fold.
  describe('celestialBody and zodiacSign', () => {
    beforeEach(async () => {
      await add('Fixture Held', { celestialBodies: ['Venus', 'Mars'] });
      await add('Fixture Folded', { celestialBodies: [' mars '] });
      await add('Fixture Other', { celestialBodies: ['Venus'], zodiacSigns: ['Aries'] });
      await add('Fixture Coven', { celestialBodies: ['Mars'], workspaceId: WORKSPACE_W_ID });
      const gone = await add('Fixture Gone', { celestialBodies: ['Mars'] });
      await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${gone}`;
    });

    it('lists the live compendium entries whose list holds the value, folded, and no other', async () => {
      // Why the others could have been listed: each holds Mars in its celestial bodies.
      const [{ count }] = await sql`
        select count(*)::int as count from ingredients
        where exists (select 1 from unnest(celestial_bodies) as p(v) where lower(btrim(v)) = 'mars')`;
      expect(count).toBe(4);

      expect(await namesOf({ celestialBody: 'Mars' })).toEqual(['Fixture Folded', 'Fixture Held']);
      expect(await namesOf({ celestialBody: 'MARS ' })).toEqual(['Fixture Folded', 'Fixture Held']);
      await expect(findCompendiumCount({ celestialBody: 'Mars' }, undefined)).resolves.toEqual({
        totalCount: 2,
        countBefore: null,
      });
    });

    it('reads the list it names, a sign from the signs alone', async () => {
      expect(await namesOf({ zodiacSign: 'Aries' })).toEqual(['Fixture Other']);
      expect(await namesOf({ zodiacSign: 'Mars' })).toEqual([]);
      expect(await namesOf({ celestialBody: 'Aries' })).toEqual([]);
    });

    it('treats a blank value as no filter, as the form text does', async () => {
      expect(await namesOf({ celestialBody: ' ' })).toHaveLength(3);
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
        const page: Page<IngredientRow, CompendiumScore> = await pageOf({}, { first: 7, after });
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
      await add(`Fixture Nettle ${n}`, { variants: [makeVariant({ form: 'Fixture Root' })] });
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
        and exists (select 1 from ingredient_variants where ingredient_id = ingredients.id)
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
    await expectCountsToMatchTheWalk({ form: 'testform' }, 7);
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

  // The mechanism, once: the proofs AND a workspace row's coven onto the
  // read, and the compendium tier answers beside them. Who may hold which
  // proof, and the soft-delete filter of every reader built on this finder,
  // are the services' (tests/modules/ingredients/services/compendium.test.ts,
  // and the READS tables of compendium-entries and workspace-ingredients).
  it("answers a workspace row under its own coven's proof only, the compendium under any", async () => {
    // Why the refusals below could have passed wrongly: the row is there, and
    // the right proof reaches it.
    await expect(findOneIngredient([inW], localId)).resolves.toMatchObject({ id: localId });

    await expect(findOneIngredient([], localId)).resolves.toBeUndefined();
    await expect(findOneIngredient([inX], localId)).resolves.toBeUndefined();
    for (const proofs of [[], [inX]]) {
      await expect(findOneIngredient(proofs, compendiumId)).resolves.toMatchObject({
        id: compendiumId,
        workspaceId: null,
      });
    }
  });
});

// An ingredient's forms are its children (MB.216, MB.218): read through
// `findManyOfIngredients` under the parent's tier, never by a bare id, and
// reached by the search only where the parent is readable.
describe('a variant read under its ingredient', () => {
  let inW: Membership;
  let inX: Membership;
  let localId: string;
  let variantId: string;

  beforeAll(async () => {
    inW = await assertMembership(asUser(B), WORKSPACE_W_ID, { ingredient: ['read'] });
    inX = await assertMembership(asUser(D), WORKSPACE_X_ID, { ingredient: ['read'] });
  });

  beforeEach(async () => {
    localId = await add('Fixture Local', {
      workspaceId: WORKSPACE_W_ID,
      categories: ['Cleansing'],
      substitutes: ['Fixture Stand-in'],
    });
    variantId = await insertVariant(
      sql,
      localId,
      { form: 'Testoil', categories: ['Protection'], substitutes: ['Testbane'] },
      A.id,
    );
    const book = await insertReference(sql, { title: 'Fixture Oils' }, E.id);
    await insertVariantReferenceLink(sql, variantId, book, A.id);
  });

  /** What each of a variant's three child reads answers under `proofs`, by direct id. */
  const childrenOf = async (proofs: Membership[], id: string) => ({
    categories: (await findManyOfVariants(proofs, ingredientCategories, [id])).length,
    substitutes: (await findSubstitutesIncludingSoftDeleted(proofs, 'variant', [id])).map(
      ({ row }) => row.name,
    ),
    references: (await findReferencesOf(proofs, 'ingredientVariantId', [id])).map(
      ({ reference }) => reference.title,
    ),
  });
  const NONE = { categories: 0, substitutes: [], references: [] };

  const formsOf = async (proofs: Membership[], id: string) =>
    (await findManyOfIngredients(proofs, ingredientVariants, [id])).map((row) => row.form).sort();

  it("answers a coven's variants under its own coven's proof only, by direct id", async () => {
    // Why the refusals below could have passed wrongly: the variants are
    // there, and the right proof reaches them by this id.
    expect(await formsOf([inW], localId)).toEqual(['Testform', 'Testoil']);

    expect(await formsOf([], localId)).toEqual([]);
    expect(await formsOf([inX], localId)).toEqual([]);
  });

  it("answers a coven's variant's own rows under its own coven's proof only, by direct id", async () => {
    // Why the refusals below could have passed wrongly: the rows are there,
    // and the right proof reaches each by this id.
    expect(await childrenOf([inW], variantId)).toEqual({
      categories: 1,
      substitutes: ['Testbane'],
      references: ['Fixture Oils'],
    });

    expect(await childrenOf([], variantId)).toEqual(NONE);
    expect(await childrenOf([inX], variantId)).toEqual(NONE);
  });

  it("hides a soft-deleted variant's own rows, which stay for a restore", async () => {
    await sql`
      update ingredient_variants set deleted_at = now(), deleted_by = ${A.id} where id = ${variantId}`;

    expect(await childrenOf([inW], variantId)).toEqual(NONE);
  });

  // The union rule (MB.215): an ingredient's lists are its own rows, a form's
  // its additions, and no read answers the one for the other.
  it("keeps an ingredient's own rows and its variant's apart", async () => {
    const ownCategories = await findManyOfIngredients([inW], ingredientCategories, [localId]);
    const ownSubstitutes = await findSubstitutesIncludingSoftDeleted([inW], 'ingredient', [
      localId,
    ]);
    const formCategories = await findManyOfVariants([inW], ingredientCategories, [variantId]);

    expect(ownCategories.map((pair) => pair.variantId)).toEqual([null]);
    expect(ownSubstitutes.map(({ row }) => row.name)).toEqual(['Fixture Stand-in']);
    expect(formCategories.map((pair) => pair.variantId)).toEqual([variantId]);
  });

  it("offers a coven's entry by its variant's form to that coven's picker alone", async () => {
    const offered = async (membership: Membership) =>
      (
        await resolvePage({ first: 100 }, (request) =>
          findIngredientSuggestions(membership, 'testoil', request),
        )
      ).edges.map((edge) => edge.node.id);
    // The precondition: the coven's own picker finds it by that form.
    expect(await offered(inW)).toEqual([localId]);

    expect(await offered(inX)).toEqual([]);
  });
});

// The entry a colliding write names (MB.220): keyed on the formal name alone,
// or the label without one, whatever the form.
describe('findCompendiumEntryByIdentity', () => {
  let entryId: string;

  beforeEach(async () => {
    entryId = await add('Testwort', {
      canonicalName: 'Fixtura testalis',
      nomenclature: 'botanical',
      variants: [makeVariant({ form: 'Fixture Bark' })],
    });
  });

  it('finds the entry holding a formal name, folded as identity_key folds it, whatever the label', async () => {
    await expect(
      findCompendiumEntryByIdentity({ name: 'Another label', canonicalName: 'FIXTURA Testalis' }),
    ).resolves.toMatchObject({ id: entryId, name: 'Testwort' });
  });

  // DESIGN.md §5's one cross-namespace collision: a label with no formal name
  // keys the same as another entry's formal name.
  it('finds it by a label standing in for the formal name', async () => {
    await expect(
      findCompendiumEntryByIdentity({ name: 'Fixtura testalis', canonicalName: null }),
    ).resolves.toMatchObject({ id: entryId });
  });

  it('reads the compendium alone, and only its live rows', async () => {
    const identity = { name: 'Testleaf', canonicalName: null };
    // Why nothing could still be found: both rows hold the key, one in a coven
    // and one deleted, and a live compendium row holding it is found.
    const localId = await add('Testleaf', { workspaceId: WORKSPACE_W_ID, variants: [] });
    const deletedId = await add('Testleaf', { variants: [] });
    await expect(findCompendiumEntryByIdentity(identity)).resolves.toMatchObject({
      id: deletedId,
    });
    await sql`
      update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${deletedId}`;

    await expect(findCompendiumEntryByIdentity(identity)).resolves.toBeUndefined();
    const [local] = await sql`select identity_key from ingredients where id = ${localId}`;
    expect(local.identity_key).toBe('testleaf');
  });
});

// The coven's twin of the above, under the proof (MB.220).
describe('findWorkspaceIngredientByIdentity', () => {
  it("finds the proof's coven's live ingredient holding the formal name, and never another tier's", async () => {
    const identity = { name: 'Another label', canonicalName: 'Fixtura testalis' };
    const mine = await add('Testwort', {
      canonicalName: 'Fixtura testalis',
      nomenclature: 'botanical',
      workspaceId: WORKSPACE_W_ID,
    });
    // Why another row could have answered: the compendium and X each hold the formal name.
    await add('Testwort', { canonicalName: 'Fixtura testalis', nomenclature: 'botanical' });
    await add('Testwort', {
      canonicalName: 'Fixtura testalis',
      nomenclature: 'botanical',
      workspaceId: WORKSPACE_X_ID,
    });
    const inW = await assertMembership(asUser(B), WORKSPACE_W_ID, { ingredient: ['read'] });
    const inX = await assertMembership(asUser(D), WORKSPACE_X_ID, { ingredient: ['read'] });

    await expect(findWorkspaceIngredientByIdentity(inW, identity)).resolves.toMatchObject({
      id: mine,
    });
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${mine}`;
    await expect(findWorkspaceIngredientByIdentity(inW, identity)).resolves.toBeUndefined();
    await expect(findWorkspaceIngredientByIdentity(inX, identity)).resolves.toMatchObject({
      workspaceId: WORKSPACE_X_ID,
    });
  });
});

// A celestial body's or a sign's rename carried onto the compendium's lists (MB.95):
// each entry folding to the old spelling becomes the new one, in place, and
// nothing else in the list or the row moves — a celestial body or sign is no part of
// an entry's identity or slug.
describe('write.carryAstrologyRename', () => {
  const rowOf = async (id: string) => (await sql`select * from ingredients where id = ${id}`)[0];
  const rename = (field: 'celestialBodies' | 'zodiacSigns', from: string, to: string) =>
    withAudit(asUser(E), (write) =>
      write.carryAstrologyRename(assertSiteAdmin(asUser(E)), field, from, to),
    );

  it('rewrites each holding entry’s list in place, by the fold, stamped by the session', async () => {
    const held = await add('Testwort', { celestialBodies: ['Venus', 'Mars', 'Moon'] });
    const folded = await add('Testleaf', { celestialBodies: [' mars '], zodiacSigns: ['Mars'] });
    const before = await rowOf(held);

    const rows = await rename('celestialBodies', 'Mars', 'Ares');

    expect(rows.map((row) => row.id).sort()).toEqual([held, folded].sort());
    expect(await rowOf(held)).toMatchObject({
      celestial_bodies: ['Venus', 'Ares', 'Moon'],
      slug: before.slug,
      identity_key: before.identity_key,
      created_by: A.id,
      updated_by: E.id,
    });
    // The other list holds a "Mars" too, and is not the one renamed.
    expect(await rowOf(folded)).toMatchObject({
      celestial_bodies: ['Ares'],
      zodiac_signs: ['Mars'],
    });
  });

  // Why each could have been written: each holds the old spelling in the list renamed.
  it('leaves a coven’s ingredient and a deleted entry as they were', async () => {
    const coven = await add('Testwort', { celestialBodies: ['Mars'], workspaceId: WORKSPACE_W_ID });
    const gone = await add('Testgone', { celestialBodies: ['Mars'] });
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${gone}`;
    const kept = await add('Testleaf', { celestialBodies: ['Venus'] });
    const before = await Promise.all([coven, gone, kept].map(rowOf));
    expect(before.map((row) => row.celestial_bodies)).toEqual([['Mars'], ['Mars'], ['Venus']]);

    const rows = await rename('celestialBodies', 'Mars', 'Ares');

    expect(rows).toEqual([]);
    expect(await Promise.all([coven, gone, kept].map(rowOf))).toEqual(before);
  });

  it('renames a sign in the signs alone', async () => {
    const id = await add('Testwort', { celestialBodies: ['Aries'], zodiacSigns: ['Aries', 'Leo'] });

    await rename('zodiacSigns', 'Aries', 'The Ram');

    expect(await rowOf(id)).toMatchObject({
      celestial_bodies: ['Aries'],
      zodiac_signs: ['The Ram', 'Leo'],
    });
  });
});

describe('write.carryDeityRename', () => {
  const linkOf = async (id: string) =>
    (await sql`select * from ingredient_deities where id = ${id}`)[0];
  const rename = (deityId: string, name: string) =>
    withAudit(asUser(E), (write) =>
      write.carryDeityRename(assertSiteAdmin(asUser(E)), deityId, name),
    );
  let hecate: string;
  let hermes: string;

  beforeAll(async () => {
    const rows = await sql`
      select id, name from deities where name in ('Hecate', 'Hermes') and deleted_at is null`;
    const byName = new Map(rows.map((row) => [row.name as string, row.id as string]));
    hecate = byName.get('Hecate') as string;
    hermes = byName.get('Hermes') as string;
  });

  it('renames each live compendium link to the deity in place, stamped by the session', async () => {
    const one = await add('Testwort');
    await insertDeityLink(sql, one, hermes, 0, A.id);
    const picked = await insertDeityLink(sql, one, hecate, 1, A.id);
    const other = await insertDeityLink(sql, await add('Testleaf'), hecate, 0, A.id);
    const before = await linkOf(picked);

    const rows = await rename(hecate, 'Hekate');

    expect(rows.map((row) => row.id).sort()).toEqual([picked, other].sort());
    expect(await linkOf(picked)).toMatchObject({
      id: picked,
      name: 'Hekate',
      deity_id: hecate,
      position: before.position,
      created_by: A.id,
      updated_by: E.id,
      deleted_at: null,
    });
    expect((await linkOf(other)).name).toBe('Hekate');
  });

  // Why each could have been written: each names Hecate, and all but the typed one link her.
  it("leaves a coven's link, a deleted entry's, a dropped link, a typed name and another deity's as they were", async () => {
    const coven = await insertDeityLink(
      sql,
      await add('Testwort', { workspaceId: WORKSPACE_W_ID }),
      hecate,
      0,
      A.id,
    );
    const goneEntry = await add('Testgone');
    const gone = await insertDeityLink(sql, goneEntry, hecate, 0, A.id);
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${goneEntry}`;
    const dropped = await insertDeityLink(sql, await add('Testdrop'), hecate, 0, A.id);
    await sql`
      update ingredient_deities set deleted_at = now(), deleted_by = ${A.id} where id = ${dropped}`;
    await add('Testtyped', { deities: ['Hecate'] });
    const [typed] = await sql`select id from ingredient_deities where deity_id is null`;
    const others = await insertDeityLink(sql, await add('Testherm'), hermes, 0, A.id);
    const ids = [coven, gone, dropped, typed.id as string, others];
    const before = await Promise.all(ids.map(linkOf));
    expect(before.map((row) => row.name)).toEqual([
      'Hecate',
      'Hecate',
      'Hecate',
      'Hecate',
      'Hermes',
    ]);

    const rows = await rename(hecate, 'Hekate');

    expect(rows).toEqual([]);
    expect(await Promise.all(ids.map(linkOf))).toEqual(before);
  });
});

// A curated form's rename carried onto the compendium's variants picking it
// (M5.6a, MB.220): the text, in place, and nothing of the entry's address.
describe('write.carryFormRename', () => {
  const picked = (form: string, formId?: string) => [
    makeVariant(formId === undefined ? { form } : { form, formId }),
  ];
  const rowOf = async (id: string) => (await sql`select * from ingredients where id = ${id}`)[0];
  const variantOf = async (id: string) =>
    (await sql`select * from ingredient_variants where id = ${id}`)[0];
  const firstVariantOf = async (ingredientId: string) =>
    (await sql`select id from ingredient_variants where ingredient_id = ${ingredientId}`)[0]
      .id as string;
  const rename = (formId: string, form: string) =>
    withAudit(asUser(E), (write) =>
      write.carryFormRename(assertSiteAdmin(asUser(E)), formId, form),
    );
  let herb: string;
  let root: string;

  beforeAll(async () => {
    const rows = await sql`
      select id, name from ingredient_forms where name in ('Herb', 'Root') and deleted_at is null`;
    const byName = new Map(rows.map((row) => [row.name as string, row.id as string]));
    herb = byName.get('Herb') as string;
    root = byName.get('Root') as string;
  });

  it('renames every live compendium variant picking the form in place, stamped by the session', async () => {
    const one = await add('Testwort', { variants: picked('Herb', herb) });
    const two = await add('Testleaf', { variants: picked('Root', root) });
    const second = await insertVariant(sql, two, { form: 'Herb', formId: herb }, A.id);
    const first = await firstVariantOf(one);
    const before = await Promise.all([rowOf(one), rowOf(two)]);

    const rows = await rename(herb, 'Herba');

    expect(rows.map((row) => row.id).sort()).toEqual([first, second].sort());
    expect(await variantOf(second)).toMatchObject({
      form: 'Herba',
      form_id: herb,
      created_by: A.id,
      updated_by: E.id,
      deleted_at: null,
    });
    // A rename moves no entry's address, and writes no ingredient row.
    expect(await Promise.all([rowOf(one), rowOf(two)])).toEqual(before);
  });

  // Why each could have been written: each holds a variant spelling the form,
  // and all but the typed one and the other form's picked it.
  it("leaves a coven's variant, a deleted entry's, a dropped variant, a typed form and another form's pick as they were", async () => {
    const coven = await add('Testwort', {
      variants: picked('Herb', herb),
      workspaceId: WORKSPACE_W_ID,
    });
    const gone = await add('Testgone', { variants: picked('Herb', herb) });
    await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${gone}`;
    const dropping = await add('Testdrop', { variants: picked('Root', root) });
    const dropped = await insertVariant(sql, dropping, { form: 'Herb', formId: herb }, A.id);
    await sql`
      update ingredient_variants set deleted_at = now(), deleted_by = ${A.id} where id = ${dropped}`;
    const typed = await add('Testtyped', { variants: picked('Herb') });
    const other = await add('Testroot', { variants: picked('Root', root) });
    const variants = [
      await firstVariantOf(coven),
      await firstVariantOf(gone),
      dropped,
      await firstVariantOf(typed),
      await firstVariantOf(other),
    ];
    const before = await Promise.all([...variants.map(variantOf), rowOf(coven), rowOf(gone)]);
    expect(before.slice(0, 5).map((row) => row.form_id)).toEqual([herb, herb, herb, null, root]);

    const rows = await rename(herb, 'Herba');

    expect(rows).toEqual([]);
    expect(await Promise.all([...variants.map(variantOf), rowOf(coven), rowOf(gone)])).toEqual(
      before,
    );
  });
});
