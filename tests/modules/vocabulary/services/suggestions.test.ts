import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { PLANETS } from '@/db/seed/astrology';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, InvalidCursor } from '@/lib/errors';
import { encodeCursor, resolvePage } from '@/lib/pagination';
import type { Session } from '@/lib/session';
import {
  type VocabularySuggestion,
  suggestPlanets,
  suggestZodiacSigns,
} from '@/modules/vocabulary';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { type IngredientFixture, type Overrides, makeIngredient } from '../../../support/fixtures';
import type { ConnectionArgs, Page } from '@/lib/types';
import type { Suggest } from './types';

// DESIGN.md §5, "The two readers are scoped differently": a member's autofill
// for `planet` or `zodiac` offers the curated vocabulary first, then the
// uncurated values in use in the compendium and the caller's own workspace.
// The vocabularies are the seed's, revived per test since some tests retire a
// row; `ingredients` is emptied per test, so every in-use value a result
// could carry is one this file wrote.

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  // The seed soft-deletes nothing, so every row live is the seeded state.
  await sql`update planets set deleted_at = null, deleted_by = null where deleted_at is not null`;
  await sql`update zodiac_signs set deleted_at = null, deleted_by = null where deleted_at is not null`;
});

/** A row of this file's: no formal name, so `none`; what matters is its planet or sign. */
function addIngredient(entry: Overrides<IngredientFixture>): Promise<string> {
  return insertIngredient(sql, makeIngredient({ nomenclature: 'none', ...entry }), A.id);
}

async function similarity(a: string, b: string): Promise<number> {
  const [row] = await sql`select similarity(${a}, ${b}) as score`;
  return Number(row.score);
}

async function wordSimilarity(query: string, text: string): Promise<number> {
  const [row] = await sql`select word_similarity(${query}, ${text}) as score`;
  return Number(row.score);
}

async function descriptionOf(planet: string): Promise<string> {
  const [row] = await sql`select description from planets where name = ${planet}`;
  return row.description as string;
}

function pageOf(
  suggest: Suggest,
  session: Session,
  query: string,
  args: ConnectionArgs = {},
  workspaceId = WORKSPACE_W_ID,
): Promise<Page<VocabularySuggestion>> {
  return resolvePage(args, (request) => suggest(session, workspaceId, query, request));
}

/** Every suggestion in one page — the lists here are far shorter than the maximum. */
async function all(
  suggest: Suggest,
  session: Session,
  query: string,
  workspaceId = WORKSPACE_W_ID,
): Promise<VocabularySuggestion[]> {
  const page = await pageOf(suggest, session, query, { first: 100 }, workspaceId);
  expect(page.pageInfo.hasNextPage).toBe(false);
  return page.edges.map((edge) => edge.node);
}

const valuesOf = (suggestions: VocabularySuggestion[]) => suggestions.map((s) => s.value);

/** The seed's planet names in the order the list carries them: case-folded, alphabetical. */
const CURATED_PLANETS = PLANETS.map((planet) => planet.name).sort((a, b) =>
  a.toLowerCase() < b.toLowerCase() ? -1 : 1,
);

describe('suggestPlanets', () => {
  describe('the two buckets', () => {
    it('offers curated matches first and in-use uncurated values second, each saying which', async () => {
      await addIngredient({
        name: 'Dark Moon Salt',
        workspaceId: WORKSPACE_W_ID,
        planet: 'Dark Moon',
      });

      const suggestions = await all(suggestPlanets, asUser(B), 'moon');

      expect(suggestions[0]).toMatchObject({ value: 'Moon', curated: true });
      expect(suggestions[suggestions.length - 1]).toEqual({
        value: 'Dark Moon',
        description: null,
        curated: false,
      });
      expect(suggestions.filter((s) => !s.curated)).toHaveLength(1);
    });

    // DESIGN.md §5: a description is search surface, and Lilith's says Black
    // Moon. A name match still ranks ahead of it.
    it('matches a description, ranked after every name match', async () => {
      // Why Lilith could only have come from its description.
      expect(await similarity('black moon', 'Lilith')).toBe(0);
      expect(await wordSimilarity('black moon', await descriptionOf('Lilith'))).toBe(1);

      const suggestions = await all(suggestPlanets, asUser(B), 'black moon');

      expect(valuesOf(suggestions)).toEqual(['Moon', 'Lilith']);
      expect(suggestions[1]).toMatchObject({
        curated: true,
        description: expect.stringContaining('Black Moon'),
      });
    });

    it('completes a typed prefix, which plain similarity would not', async () => {
      // Why `%` alone could not have offered it: three letters of seven fall below 0.4.
      expect(await similarity('mer', 'Mercury')).toBeLessThan(0.4);

      expect(valuesOf(await all(suggestPlanets, asUser(B), 'mer'))).toContain('Mercury');
    });

    it('orders each bucket by name, case-folded', async () => {
      await addIngredient({ name: 'Sedna Water', workspaceId: WORKSPACE_W_ID, planet: 'sedna' });
      await addIngredient({ name: 'Eris Salt', planet: 'Eris' });

      const suggestions = await all(suggestPlanets, asUser(B), '');

      expect(valuesOf(suggestions)).toEqual([...CURATED_PLANETS, 'Eris', 'sedna']);
    });
  });

  describe('what counts as in use', () => {
    it('folds case and surrounding whitespace, so Moon and moon are one value', async () => {
      // With the curated row gone, the in-use spellings are the uncurated bucket's.
      await sql`update planets set deleted_at = now(), deleted_by = ${A.id} where name = 'Moon'`;
      await addIngredient({ name: 'Mugwort', planet: 'Moon' });
      await addIngredient({ name: 'Moon Water', workspaceId: WORKSPACE_W_ID, planet: 'moon' });
      await addIngredient({ name: 'Selenite', workspaceId: WORKSPACE_W_ID, planet: ' Moon ' });

      const suggestions = await all(suggestPlanets, asUser(B), 'moon');

      expect(suggestions.filter((s) => s.value.toLowerCase() === 'moon')).toEqual([
        // The spelling most entries use, trimmed.
        { value: 'Moon', description: null, curated: false },
      ]);
    });

    it('never offers a value twice when it is curated and in use', async () => {
      await addIngredient({ name: 'Mugwort', planet: 'Moon' });
      await addIngredient({ name: 'Moon Water', workspaceId: WORKSPACE_W_ID, planet: 'moon' });

      const suggestions = await all(suggestPlanets, asUser(B), 'moon');

      expect(suggestions.filter((s) => s.value.toLowerCase() === 'moon')).toEqual([
        expect.objectContaining({ value: 'Moon', curated: true }),
      ]);
    });

    it('drops a soft-deleted curated row, whose in-use spelling then reads as uncurated', async () => {
      await addIngredient({ name: 'Mugwort', planet: 'Moon' });
      expect(await all(suggestPlanets, asUser(B), 'black moon')).toMatchObject([
        { value: 'Moon', curated: true },
        { value: 'Lilith', curated: true },
      ]);

      await sql`update planets set deleted_at = now(), deleted_by = ${A.id} where name in ('Moon', 'Lilith')`;

      expect(await all(suggestPlanets, asUser(B), 'black moon')).toEqual([
        { value: 'Moon', description: null, curated: false },
      ]);
    });

    it('drops a soft-deleted ingredient’s value', async () => {
      const id = await addIngredient({
        name: 'Eris Salt',
        workspaceId: WORKSPACE_W_ID,
        planet: 'Eris',
      });
      expect(valuesOf(await all(suggestPlanets, asUser(B), 'eris'))).toEqual(['Eris']);

      await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;

      expect(await all(suggestPlanets, asUser(B), 'eris')).toEqual([]);
    });

    it('reads nothing into an entry with no planet', async () => {
      await addIngredient({ name: 'Graveyard Dirt', workspaceId: WORKSPACE_W_ID, planet: null });
      await addIngredient({ name: 'Black Salt', workspaceId: WORKSPACE_W_ID, planet: '  ' });

      const suggestions = await all(suggestPlanets, asUser(B), '');

      expect(suggestions.filter((s) => !s.curated)).toEqual([]);
    });
  });

  // DESIGN.md §5: the autofill reads the compendium and the caller's own
  // workspace, never another one — the suggested strings themselves, not
  // only who holds them.
  describe('scope', () => {
    beforeEach(async () => {
      await addIngredient({ name: 'Eris Salt', planet: 'Eris' });
      await addIngredient({ name: 'Sedna Water', workspaceId: WORKSPACE_W_ID, planet: 'Sedna' });
      await addIngredient({ name: 'Vulcan Ash', workspaceId: WORKSPACE_X_ID, planet: 'Vulcan' });
    });

    it('spans the compendium and the current workspace', async () => {
      const uncurated = (await all(suggestPlanets, asUser(B), '')).filter((s) => !s.curated);

      expect(valuesOf(uncurated)).toEqual(['Eris', 'Sedna']);
    });

    it('never offers a value in use only in another workspace', async () => {
      // Why it could have come back: X holds it, and X's own member is offered it.
      const [held] = await sql`
        select planet from ingredients where workspace_id = ${WORKSPACE_X_ID} and deleted_at is null`;
      expect(held.planet).toBe('Vulcan');
      expect(valuesOf(await all(suggestPlanets, asUser(D), 'vulcan', WORKSPACE_X_ID))).toEqual([
        'Vulcan',
      ]);

      expect(await all(suggestPlanets, asUser(B), 'vulcan')).toEqual([]);
      expect(valuesOf(await all(suggestPlanets, asUser(B), ''))).not.toContain('Vulcan');
    });
  });

  describe('the thresholds', () => {
    // `venis` clears pg_trgm's 0.3 default for `%`, so only an explicitly set
    // similarity threshold excludes it; its word similarity sits under 0.6.
    it('is 0.4 for similarity, not the database default of 0.3', async () => {
      const [row] = await sql`select ${'Venus'} % ${'venis'} as matched`;
      expect(row.matched).toBe(true);
      expect(await similarity('Venus', 'venis')).toBeLessThan(0.4);
      expect(await wordSimilarity('venis', 'Venus')).toBe(0.5);

      expect(await all(suggestPlanets, asUser(B), 'venis')).toEqual([]);
    });
  });

  describe('the query', () => {
    it('treats whitespace as no query, and offers the whole vocabulary', async () => {
      expect(valuesOf(await all(suggestPlanets, asUser(B), '   '))).toEqual(CURATED_PLANETS);
    });

    it('offers nothing for a query matching nothing', async () => {
      expect(await all(suggestPlanets, asUser(B), 'xqzv')).toEqual([]);
    });
  });

  // CLAUDE.md rule 8: one connection over both buckets, walked by cursor.
  describe('pagination', () => {
    beforeEach(async () => {
      await addIngredient({ name: 'Eris Salt', planet: 'Eris' });
      await addIngredient({ name: 'Sedna Water', workspaceId: WORKSPACE_W_ID, planet: 'Sedna' });
    });

    it('walks every suggestion once, in order, across the bucket boundary', async () => {
      const expected = [...CURATED_PLANETS, 'Eris', 'Sedna'];
      const seen: string[] = [];
      const sizes: number[] = [];
      let after: string | null = null;
      for (;;) {
        const page: Page<VocabularySuggestion> = await pageOf(suggestPlanets, asUser(B), '', {
          first: 5,
          after,
        });
        seen.push(...valuesOf(page.edges.map((edge) => edge.node)));
        sizes.push(page.edges.length);
        if (!page.pageInfo.hasNextPage) break;
        after = page.pageInfo.endCursor;
      }

      expect(seen).toEqual(expected);
      expect(sizes).toEqual([5, 5, 5, 5, 1]);
    });

    it('walks backwards too', async () => {
      const last = await pageOf(suggestPlanets, asUser(B), '', { last: 3 });

      expect(valuesOf(last.edges.map((edge) => edge.node))).toEqual(['Vesta', 'Eris', 'Sedna']);
      expect(last.pageInfo.hasPreviousPage).toBe(true);
      expect(last.pageInfo.hasNextPage).toBe(false);
    });

    it('walks backwards from a cursor, across the bucket boundary', async () => {
      const last = await pageOf(suggestPlanets, asUser(B), '', { last: 2 });
      expect(valuesOf(last.edges.map((edge) => edge.node))).toEqual(['Eris', 'Sedna']);

      const before = await pageOf(suggestPlanets, asUser(B), '', {
        last: 2,
        before: last.pageInfo.startCursor,
      });

      expect(valuesOf(before.edges.map((edge) => edge.node))).toEqual(['Venus', 'Vesta']);
    });

    // A cursor names a tier and a fold; one naming neither, or a tier there is
    // not, is refused, never read as the start of the list.
    it('refuses a cursor that names no position in this list', async () => {
      for (const key of [['moon'], ['9', 'moon'], ['', 'moon'], ['moon', 'moon', 'moon']]) {
        const forged = encodeCursor({ key, id: 'moon' });

        await expect(
          pageOf(suggestPlanets, asUser(B), '', { after: forged }),
          key.join(','),
        ).rejects.toThrow(InvalidCursor);
      }
    });
  });

  describe('authorization', () => {
    beforeEach(async () => {
      await addIngredient({ name: 'Sedna Water', workspaceId: WORKSPACE_W_ID, planet: 'Sedna' });
    });

    // It reveals nothing a reader of the workspace could not already list.
    it('answers anyone who may read the workspace’s ingredients, a viewer included', async () => {
      expect(valuesOf(await all(suggestPlanets, asUser(C), 'sedna'))).toEqual(['Sedna']);
      expect(valuesOf(await all(suggestPlanets, asUser(A), 'sedna'))).toEqual(['Sedna']);
    });

    it('refuses a member of another workspace asking about this one', async () => {
      // Why it could have succeeded: D is a member, just not here.
      await expect(all(suggestPlanets, asUser(D), 'sedna', WORKSPACE_X_ID)).resolves.toEqual([]);

      await expect(all(suggestPlanets, asUser(D), 'sedna')).rejects.toThrow(Forbidden);
    });

    it('refuses a site admin, who belongs to no workspace', async () => {
      await expect(all(suggestPlanets, asUser(E), 'sedna')).rejects.toThrow(Forbidden);
    });

    it('refuses before answering a blank query', async () => {
      await expect(all(suggestPlanets, asUser(D), '')).rejects.toThrow(Forbidden);
    });
  });
});

// The same service over the other table. Two tables rather than a `kind`
// column, so a sign cannot be offered for `planet` (claude-docs/db/astrology-vocabularies.md, "The
// astrology vocabularies") — asserted rather than assumed.
describe('suggestZodiacSigns', () => {
  it('offers a sign by its description, and never as a planet', async () => {
    // Why Ophiuchus could only have come from its description.
    expect(await similarity('serpent', 'Ophiuchus')).toBe(0);

    expect(await all(suggestZodiacSigns, asUser(B), 'serpent')).toEqual([
      expect.objectContaining({ value: 'Ophiuchus', curated: true }),
    ]);
    expect(await all(suggestPlanets, asUser(B), 'serpent')).toEqual([]);
  });

  it('reads the zodiac column, not the planet column, for what is in use', async () => {
    await addIngredient({
      name: 'Cetus Salt',
      workspaceId: WORKSPACE_W_ID,
      planet: 'Cetus',
      zodiac: 'Eris',
    });

    expect(valuesOf(await all(suggestZodiacSigns, asUser(B), 'eris'))).toEqual(['Eris']);
    expect(valuesOf(await all(suggestZodiacSigns, asUser(B), 'cetus'))).toEqual([]);
    expect(valuesOf(await all(suggestPlanets, asUser(B), 'cetus'))).toEqual(['Cetus']);
  });

  it('refuses a non-member', async () => {
    await expect(all(suggestZodiacSigns, asUser(D), 'serpent')).rejects.toThrow(Forbidden);
  });
});
