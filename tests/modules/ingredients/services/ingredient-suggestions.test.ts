import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { suggestIngredients } from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { type IngredientFixture, type Overrides, makeIngredient } from '../../../support/fixtures';
import type { PageRequest } from '@/lib/types';

// The substitute picker's search (MB.138): ingredients a member may link, from
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

    it('ranks the closest match first, not alphabetically', async () => {
      await addIngredient({ name: 'Mugwart', workspaceId: WORKSPACE_W_ID });
      await addIngredient({ name: 'Mugwort', canonicalName: 'Artemisia vulgaris' });

      expect(await namesFor(B, 'mugwort')).toEqual(['Mugwort', 'Mugwart']);
    });

    it('lists everything in name order for a blank query', async () => {
      await addIngredient({ name: 'Yarrow', workspaceId: WORKSPACE_W_ID });
      await addIngredient({ name: 'Mugwort', canonicalName: 'Artemisia vulgaris' });

      expect(await namesFor(B, '   ')).toEqual(['Mugwort', 'Yarrow']);
    });

    // The compendium search's minimum: one letter ranks by noise.
    it('lists everything for a one-character query, as the compendium search does', async () => {
      await addIngredient({ name: 'Yarrow', workspaceId: WORKSPACE_W_ID });
      await addIngredient({ name: 'Mugwort', canonicalName: 'Artemisia vulgaris' });

      expect(await namesFor(B, 'y')).toEqual(['Mugwort', 'Yarrow']);
    });
  });

  // MB.131's picker shows which plant a suggestion is, and whose.
  it('carries each entry’s formal name and tier', async () => {
    await addIngredient({ name: "Cat's Claw", canonicalName: 'Uncaria tomentosa' });
    await addIngredient({ name: "Cat's Claw", workspaceId: WORKSPACE_W_ID });

    const rows = await suggestionsFor(B, "cat's claw");

    expect(rows.map(({ canonicalName, workspaceId }) => ({ canonicalName, workspaceId }))).toEqual(
      expect.arrayContaining([
        { canonicalName: 'Uncaria tomentosa', workspaceId: null },
        { canonicalName: null, workspaceId: WORKSPACE_W_ID },
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

    it('refuses before answering a blank query', async () => {
      await expect(namesFor(D, '', WORKSPACE_W_ID)).rejects.toThrow(Forbidden);
    });
  });
});
