import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { suggestIngredients } from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { type IngredientFixture, type Overrides, makeIngredient } from '../../../support/fixtures';
import type { PageRequest } from '@/lib/types';

// The substitute picker's search: ingredients a member may link, from
// the compendium and the caller's own coven, matched as the compendium search
// matches so a typed prefix finds its entry. The table is emptied per test, so
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

/** Room for every row a test here writes, so one page is the whole answer. */
const PAGE: PageRequest = { limit: 26, inverted: false };

const suggestionsFor = async (
  user: typeof A | typeof E,
  query: string,
  workspaceId = WORKSPACE_W_ID,
) => (await suggestIngredients(asUser(user), workspaceId, query, PAGE)).map((entry) => entry.node);

const namesFor = async (user: typeof A | typeof E, query: string, workspaceId = WORKSPACE_W_ID) =>
  (await suggestionsFor(user, query, workspaceId)).map((row) => row.name);

describe('suggestIngredients', () => {
  describe('what is matched', () => {
    it('completes a typed prefix, which the duplicate warning would not', async () => {
      await addIngredient({ name: 'Mugwort' });

      // Why this is not `possibleDuplicates`: a prefix is far under its 0.4.
      const [row] = await sql`select similarity(${'mu'}, ${'Mugwort'}) as score`;
      expect(Number(row.score)).toBeLessThan(0.4);

      expect(await namesFor(B, 'mu')).toEqual(['Mugwort']);
    });

    it('matches the formal name, not only the display name', async () => {
      await addIngredient({ name: "Sailor's Tobacco", canonicalName: 'Artemisia vulgaris' });

      expect(await namesFor(B, 'vulgaris')).toEqual(["Sailor's Tobacco"]);
    });

    it('matches a folk name, accents folded, and returns the ingredient once', async () => {
      await addIngredient({
        name: "Cat's Claw",
        canonicalName: 'Uncaria tomentosa',
        folkNames: ['Uña de Gato', 'Una de Gato'],
      });

      expect(await namesFor(B, 'una de gato')).toEqual(["Cat's Claw"]);
    });

    it('does not match a soft-deleted folk name', async () => {
      const id = await addIngredient({ name: 'Mugwort', folkNames: ['Cronewort'] });
      expect(await namesFor(B, 'crone')).toEqual(['Mugwort']);

      await sql`update ingredient_folk_names set deleted_at = now(), deleted_by = ${A.id} where ingredient_id = ${id}`;

      expect(await namesFor(B, 'crone')).toEqual([]);
    });

    it('lists everything in name order for a blank query', async () => {
      await addIngredient({ name: 'Yarrow', workspaceId: WORKSPACE_W_ID });
      await addIngredient({ name: 'Mugwort', canonicalName: 'Artemisia vulgaris' });

      expect(await namesFor(B, '   ')).toEqual(['Yarrow', 'Mugwort']);
    });

    // The compendium search's minimum: one letter ranks by noise.
    it('lists everything for a one-character query, as the compendium search does', async () => {
      await addIngredient({ name: 'Yarrow', workspaceId: WORKSPACE_W_ID });
      await addIngredient({ name: 'Mugwort', canonicalName: 'Artemisia vulgaris' });

      expect(await namesFor(B, 'y')).toEqual(['Yarrow', 'Mugwort']);
    });
  });

  // MB.131's picker shows which plant a suggestion is, and whose.
  it('carries each entry’s formal name and tier', async () => {
    await addIngredient({ name: "Cat's Claw", canonicalName: 'Uncaria tomentosa' });
    // A coven entry naming another species, so the two are told apart by formal name.
    await addIngredient({
      name: "Cat's Claw",
      canonicalName: 'Acacia greggii',
      workspaceId: WORKSPACE_W_ID,
    });

    const rows = await suggestionsFor(B, "cat's claw");

    expect(rows.map(({ canonicalName, workspaceId }) => ({ canonicalName, workspaceId }))).toEqual(
      expect.arrayContaining([
        { canonicalName: 'Uncaria tomentosa', workspaceId: null },
        { canonicalName: 'Acacia greggii', workspaceId: WORKSPACE_W_ID },
      ]),
    );
  });

  // DESIGN.md §5: a coven's ingredient may link the compendium and its own
  // coven, never another one, and the search offers exactly that.
  describe('scope', () => {
    let compendium: string;
    let ours: string;
    let theirs: string;
    let theirsByFolkName: string;

    beforeEach(async () => {
      compendium = await addIngredient({ name: 'Mugwort', canonicalName: 'Artemisia vulgaris' });
      ours = await addIngredient({ name: 'Mugwort Root', workspaceId: WORKSPACE_W_ID });
      theirs = await addIngredient({ name: 'Mugwort Leaf', workspaceId: WORKSPACE_X_ID });
      theirsByFolkName = await addIngredient({
        name: 'Crone Herb',
        workspaceId: WORKSPACE_X_ID,
        folkNames: ['Mugwort Herb'],
      });
    });

    it('spans the compendium and the current workspace', async () => {
      const ids = (await suggestionsFor(B, 'mugwort')).map((row) => row.id);

      expect(ids.sort()).toEqual([compendium, ours].sort());
    });

    it('never returns another workspace’s entries, by name or by folk name', async () => {
      // Why they could have come back: they are matches, and X's own member sees them.
      const fromX = (await suggestionsFor(D, 'mugwort', WORKSPACE_X_ID)).map((row) => row.id);
      expect(fromX).toEqual(expect.arrayContaining([theirs, theirsByFolkName]));

      const fromW = (await suggestionsFor(B, 'mugwort')).map((row) => row.id);
      expect(fromW).not.toContain(theirs);
      expect(fromW).not.toContain(theirsByFolkName);
    });

    it('never lists another workspace’s entries for a blank query either', async () => {
      const fromW = (await suggestionsFor(B, '')).map((row) => row.id);

      expect(fromW.sort()).toEqual([compendium, ours].sort());
    });
  });

  // The picker offers the coven's cupboard, then the compendium.
  describe('the two groups', () => {
    const groupsFor = async (query: string, workspaceId = WORKSPACE_W_ID, user = B) =>
      (await suggestIngredients(asUser(user), workspaceId, query, PAGE)).map((entry) => ({
        id: entry.node.id,
        group: entry.group,
      }));

    it("offers the coven's own entry and the compendium's same-named one, apart", async () => {
      const compendium = await addIngredient({
        name: 'Mugwort',
        canonicalName: 'Artemisia vulgaris',
      });
      const own = await addIngredient({ name: 'Mugwort', workspaceId: WORKSPACE_W_ID });

      expect(await groupsFor('mugwort')).toEqual([
        { id: own, group: 'yours' },
        { id: compendium, group: 'compendium' },
      ]);
    });

    it('lists a cupboard entry once, in yours, and not in the compendium group', async () => {
      const mugwort = await addIngredient({ name: 'Mugwort', canonicalName: 'Artemisia vulgaris' });
      const yarrow = await addIngredient({ name: 'Yarrow', canonicalName: 'Achillea millefolium' });
      // The precondition: with no cupboard row the entry is the compendium group's.
      expect(await groupsFor('mugwort')).toEqual([{ id: mugwort, group: 'compendium' }]);

      await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: mugwort }, A.id);

      expect(await groupsFor('')).toEqual([
        { id: mugwort, group: 'yours' },
        { id: yarrow, group: 'compendium' },
      ]);
    });

    it('finds a relabelled cupboard entry by its label and by the compendium name', async () => {
      const mugwort = await addIngredient({ name: 'Mugwort', canonicalName: 'Artemisia vulgaris' });
      await insertCupboardEntry(
        sql,
        { workspaceId: WORKSPACE_W_ID, ingredientId: mugwort, label: 'Crone Herb' },
        A.id,
      );

      const expected = [{ id: mugwort, group: 'yours' }];
      expect(await groupsFor('crone herb')).toEqual(expected);
      expect(await groupsFor('mugwort')).toEqual(expected);
    });

    it("does not let another coven's cupboard row move an entry into this coven's yours", async () => {
      const mugwort = await addIngredient({ name: 'Mugwort', canonicalName: 'Artemisia vulgaris' });
      await insertCupboardEntry(sql, { workspaceId: WORKSPACE_X_ID, ingredientId: mugwort }, A.id);
      // Why it could have moved: X's own member sees it in yours.
      expect(await groupsFor('mugwort', WORKSPACE_X_ID, D)).toEqual([
        { id: mugwort, group: 'yours' },
      ]);

      expect(await groupsFor('mugwort')).toEqual([{ id: mugwort, group: 'compendium' }]);
    });

    it('limits each group to eight, ranked within itself', async () => {
      for (let n = 1; n <= 10; n++) {
        await addIngredient({ name: `Fixture Mug ${n}` });
        await addIngredient({ name: `Fixture Own ${n}`, workspaceId: WORKSPACE_W_ID });
      }
      const exact = await addIngredient({ name: 'Fixture', workspaceId: WORKSPACE_W_ID });

      const groups = await groupsFor('fixture');

      expect(groups.map(({ group }) => group)).toEqual([
        ...Array(8).fill('yours'),
        ...Array(8).fill('compendium'),
      ]);
      expect(groups[0].id).toBe(exact);
    });
  });

  describe('the category filter', () => {
    it('keeps only entries carrying any of the given categories, and none given keeps all', async () => {
      const rows =
        await sql`select id, name from categories where deleted_at is null order by name limit 3`;
      const [first, second, third] = rows;
      await addIngredient({ name: 'Mugwort', categories: [first.name as string] });
      await addIngredient({ name: 'Mugroot', categories: [second.name as string] });
      await addIngredient({ name: 'Mugleaf', categories: [third.name as string] });
      await addIngredient({ name: 'Mugbare' });
      const names = async (categoryIds?: string[]) =>
        (await suggestIngredients(asUser(B), WORKSPACE_W_ID, 'mug', PAGE, undefined, categoryIds))
          .map((entry) => entry.node.name)
          .sort();

      // Why it could have succeeded: all four match the typed text.
      expect(await names()).toEqual(['Mugbare', 'Mugleaf', 'Mugroot', 'Mugwort']);
      expect(await names([])).toHaveLength(4);
      expect(await names([first.id as string])).toEqual(['Mugwort']);
      expect(await names([first.id as string, second.id as string])).toEqual([
        'Mugroot',
        'Mugwort',
      ]);
    });
  });

  describe('authorization', () => {
    beforeEach(async () => {
      await addIngredient({ name: 'Mugwort', workspaceId: WORKSPACE_W_ID });
    });

    // It reveals nothing a reader of the workspace could not already list.
    it('answers anyone who may read the workspace’s ingredients, a viewer included', async () => {
      expect(await namesFor(C, 'mugwort')).toEqual(['Mugwort']);
      expect(await namesFor(A, 'mugwort')).toEqual(['Mugwort']);
    });

    it('refuses a member of another workspace asking about this one', async () => {
      // Why it could have succeeded: D is a member, just not here.
      await expect(namesFor(D, 'mugwort', WORKSPACE_X_ID)).resolves.toEqual([]);

      await expect(namesFor(D, 'mugwort', WORKSPACE_W_ID)).rejects.toThrow(Forbidden);
    });

    it('refuses a site admin, who belongs to no workspace', async () => {
      await expect(namesFor(E, 'mugwort', WORKSPACE_W_ID)).rejects.toThrow(Forbidden);
    });
  });
});
