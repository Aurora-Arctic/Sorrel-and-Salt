import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { findPossibleDuplicates } from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { type IngredientFixture, type Overrides, makeIngredient } from '../../../support/fixtures';
import type { PageRequest } from '@/lib/types';

// DESIGN.md §5, "Fuzzy duplicate warning": near-misses on the display name,
// the formal name or any folk name, from the compendium and the caller's own
// workspace, each carrying its formal name. The table is emptied per test, so
// every row a result could come from is one this file wrote.

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

/** A row of this file's: no formal name, and so `none`, unless one is stated. */
function addIngredient(entry: Overrides<IngredientFixture>): Promise<string> {
  const nomenclature = entry.canonicalName ? 'botanical' : 'none';
  return insertIngredient(sql, makeIngredient({ nomenclature, ...entry }), A.id);
}

async function similarity(a: string, b: string): Promise<number> {
  const [row] = await sql`select similarity(${a}, ${b}) as score`;
  return Number(row.score);
}

/** Room for every row a test here writes, so one page is the whole answer. */
const PAGE: PageRequest = { limit: 26, inverted: false };

/** The rows of the lookup's first page; a null workspace is the compendium form's. */
const duplicatesOf = async (
  user: typeof A | typeof E,
  name: string,
  workspaceId: string | null = WORKSPACE_W_ID,
) =>
  (await findPossibleDuplicates(asUser(user), workspaceId, name, PAGE)).map((entry) => entry.node);

const namesFor = async (user: typeof A | typeof E, name: string, workspaceId = WORKSPACE_W_ID) =>
  (await duplicatesOf(user, name, workspaceId)).map((row) => row.name);

describe('findPossibleDuplicates', () => {
  describe('the threshold', () => {
    it('returns a near-miss above it', async () => {
      await addIngredient({ name: 'Mugwort', canonicalName: 'Artemisia vulgaris' });

      expect(await namesFor(B, 'Mugwart')).toEqual(['Mugwort']);
    });

    it('returns nothing for a name below it', async () => {
      await addIngredient({ name: 'Wormwood', canonicalName: 'Artemisia absinthium' });

      expect(await namesFor(B, 'Mugwart')).toEqual([]);
    });

    // 0.31 clears pg_trgm's 0.3 default and not DESIGN.md's 0.4, so this row
    // is the one only an explicitly set threshold excludes.
    it('is 0.4, not the database default of 0.3', async () => {
      await addIngredient({ name: 'Mugwort Leaf' });

      // Why the lookup could have returned it: at the default it is a match.
      const [row] = await sql`select ${'Mugwort Leaf'} % ${'Mugwart'} as matched`;
      expect(row.matched).toBe(true);
      expect(await similarity('Mugwort Leaf', 'Mugwart')).toBeLessThan(0.4);

      expect(await namesFor(B, 'Mugwart')).toEqual([]);
    });
  });

  describe('what is matched', () => {
    it('matches the formal name, not only the display name', async () => {
      await addIngredient({ name: "Sailor's Tobacco", canonicalName: 'Artemisia vulgaris' });

      // The label alone would not have matched.
      expect(await similarity("Sailor's Tobacco", 'Artemisia vulgare')).toBeLessThan(0.4);

      expect(await namesFor(B, 'Artemisia vulgare')).toEqual(["Sailor's Tobacco"]);
    });

    it('matches a folk name, and returns the ingredient once however many match', async () => {
      await addIngredient({
        name: 'Mugwort',
        canonicalName: 'Artemisia vulgaris',
        folkNames: ['Cronewort', 'Cronewurt'],
      });

      expect(await similarity('Cronewurt', 'Cronewart')).toBeGreaterThan(0.4);
      expect(await similarity('Mugwort', 'Cronewart')).toBeLessThan(0.4);
      expect(await similarity('Artemisia vulgaris', 'Cronewart')).toBeLessThan(0.4);

      expect(await namesFor(B, 'Cronewart')).toEqual(['Mugwort']);
    });

    it('does not match a soft-deleted folk name', async () => {
      const id = await addIngredient({ name: 'Mugwort', folkNames: ['Cronewort'] });
      expect(await namesFor(B, 'Cronewart')).toEqual(['Mugwort']);

      await sql`update ingredient_folk_names set deleted_at = now(), deleted_by = ${A.id} where ingredient_id = ${id}`;

      expect(await namesFor(B, 'Cronewart')).toEqual([]);
    });

    it('ranks the closest match first', async () => {
      await addIngredient({ name: 'Mugwort', canonicalName: 'Artemisia vulgaris' });
      await addIngredient({ name: 'Mugwart', workspaceId: WORKSPACE_W_ID });

      expect(await namesFor(B, 'Mugwart')).toEqual(['Mugwart', 'Mugwort']);
    });

    it('answers a blank name with nothing', async () => {
      await addIngredient({ name: 'Mugwort' });

      expect(await duplicatesOf(B, '   ')).toEqual([]);
    });
  });

  // "Did you mean Cat's Claw?" names five plants; the formal name is what
  // tells the caller which one it meant.
  describe('every result carries its formal name', () => {
    it('tells same-labelled compendium entries apart', async () => {
      await addIngredient({ name: "Cat's Claw", canonicalName: 'Uncaria tomentosa' });
      await addIngredient({ name: "Cat's Claw", canonicalName: 'Senegalia greggii' });

      const results = await duplicatesOf(B, "Cat's Claw");

      expect(results.map((row) => row.canonicalName).sort()).toEqual([
        'Senegalia greggii',
        'Uncaria tomentosa',
      ]);
    });

    it('says so when an entry declares none', async () => {
      await addIngredient({ name: 'Graveyard Dirt', workspaceId: WORKSPACE_W_ID });

      const [result] = await duplicatesOf(B, 'Graveyard Dirt');

      expect(result).toMatchObject({ canonicalName: null, nomenclature: 'none' });
    });
  });

  // DESIGN.md §5: entry-time lookups read the compendium and the caller's own
  // workspace, never another one.
  describe('scope', () => {
    let compendium: string;
    let ours: string;
    let theirs: string;
    let theirsByFolkName: string;

    beforeEach(async () => {
      compendium = await addIngredient({ name: 'Mugwort', canonicalName: 'Artemisia vulgaris' });
      ours = await addIngredient({ name: 'Mugwurt', workspaceId: WORKSPACE_W_ID });
      theirs = await addIngredient({ name: 'Mugwart', workspaceId: WORKSPACE_X_ID });
      theirsByFolkName = await addIngredient({
        name: 'Crone Herb',
        workspaceId: WORKSPACE_X_ID,
        folkNames: ['Mugwart Herb'],
      });
    });

    it('spans the compendium and the current workspace', async () => {
      const ids = (await duplicatesOf(B, 'Mugwart')).map((row) => row.id);

      expect(ids.sort()).toEqual([compendium, ours].sort());
    });

    it('never returns another workspace’s entries, by name or by folk name', async () => {
      // Why they could have come back: they are matches, and X's own member sees them.
      const fromX = (await duplicatesOf(D, 'Mugwart', WORKSPACE_X_ID)).map((row) => row.id);
      expect(fromX).toEqual(expect.arrayContaining([theirs, theirsByFolkName]));

      const fromW = (await duplicatesOf(B, 'Mugwart')).map((row) => row.id);
      expect(fromW).not.toContain(theirs);
      expect(fromW).not.toContain(theirsByFolkName);
    });
  });

  // M5.5: the admin's compendium form names no coven, so a null workspace
  // warns of the compendium's entries alone and asks for no membership.
  describe('without a coven', () => {
    it('warns of the compendium’s entries and no coven’s, to anyone signed in', async () => {
      const compendium = await addIngredient({
        name: 'Mugwort',
        canonicalName: 'Artemisia vulgaris',
      });
      const ours = await addIngredient({ name: 'Mugwurt', workspaceId: WORKSPACE_W_ID });
      const theirs = await addIngredient({ name: 'Mugwert', workspaceId: WORKSPACE_X_ID });
      // Why a coven's could have come back: under its coven, each is warned of.
      expect((await duplicatesOf(B, 'Mugwart')).map((row) => row.id).sort()).toEqual(
        [compendium, ours].sort(),
      );
      expect((await duplicatesOf(D, 'Mugwart', WORKSPACE_X_ID)).map((row) => row.id)).toContain(
        theirs,
      );

      // E belongs to no coven, and D's is not W: neither is asked for one.
      for (const user of [B, D, E]) {
        expect((await duplicatesOf(user, 'Mugwart', null)).map((row) => row.id)).toEqual([
          compendium,
        ]);
      }
    });
  });

  describe('authorization', () => {
    beforeEach(async () => {
      await addIngredient({ name: 'Mugwurt', workspaceId: WORKSPACE_W_ID });
    });

    // It reveals nothing a reader of the workspace could not already list.
    it('answers anyone who may read the workspace’s ingredients, a viewer included', async () => {
      expect(await namesFor(C, 'Mugwart')).toEqual(['Mugwurt']);
      expect(await namesFor(A, 'Mugwart')).toEqual(['Mugwurt']);
    });

    it('refuses a member of another workspace asking about this one', async () => {
      // Why it could have succeeded: D is a member, just not here.
      await expect(namesFor(D, 'Mugwart', WORKSPACE_X_ID)).resolves.toEqual([]);

      await expect(namesFor(D, 'Mugwart', WORKSPACE_W_ID)).rejects.toThrow(Forbidden);
    });

    it('refuses a site admin, who belongs to no workspace', async () => {
      await expect(namesFor(E, 'Mugwart', WORKSPACE_W_ID)).rejects.toThrow(Forbidden);
    });

    it('refuses before answering a blank name', async () => {
      await expect(namesFor(D, '', WORKSPACE_W_ID)).rejects.toThrow(Forbidden);
    });
  });
});
