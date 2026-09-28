import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { findPossibleDuplicates } from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';

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

interface Entry {
  name: string;
  canonicalName?: string | null;
  workspaceId?: string | null;
  folkNames?: string[];
}

async function addIngredient({
  name,
  canonicalName = null,
  workspaceId = null,
  folkNames = [],
}: Entry): Promise<string> {
  const [row] = await sql`
    insert into ingredients (workspace_id, name, canonical_name, nomenclature, created_by, updated_by)
    values (
      ${workspaceId}, ${name}, ${canonicalName},
      ${canonicalName === null ? 'none' : 'botanical'}, ${A.id}, ${A.id}
    )
    returning id
  `;
  for (const folkName of folkNames) {
    await sql`
      insert into ingredient_folk_names (ingredient_id, name, created_by, updated_by)
      values (${row.id}, ${folkName}, ${A.id}, ${A.id})
    `;
  }
  return row.id as string;
}

async function similarity(a: string, b: string): Promise<number> {
  const [row] = await sql`select similarity(${a}, ${b}) as score`;
  return Number(row.score);
}

const namesFor = async (user: typeof A | typeof E, term: string, workspaceId = WORKSPACE_W_ID) =>
  (await findPossibleDuplicates(asUser(user), workspaceId, term)).map((row) => row.name);

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

    it('does not return a soft-deleted ingredient', async () => {
      const id = await addIngredient({ name: 'Mugwort' });
      expect(await namesFor(B, 'Mugwart')).toEqual(['Mugwort']);

      await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;

      expect(await namesFor(B, 'Mugwart')).toEqual([]);
    });

    it('ranks the closest match first', async () => {
      await addIngredient({ name: 'Mugwort', canonicalName: 'Artemisia vulgaris' });
      await addIngredient({ name: 'Mugwart', workspaceId: WORKSPACE_W_ID });

      expect(await namesFor(B, 'Mugwart')).toEqual(['Mugwart', 'Mugwort']);
    });

    it('answers a blank name with nothing', async () => {
      await addIngredient({ name: 'Mugwort' });

      await expect(findPossibleDuplicates(asUser(B), WORKSPACE_W_ID, '   ')).resolves.toEqual([]);
    });
  });

  // "Did you mean Cat's Claw?" names five plants; the formal name is what
  // tells the caller which one it meant.
  describe('every result carries its formal name', () => {
    it('tells same-labelled compendium entries apart', async () => {
      await addIngredient({ name: "Cat's Claw", canonicalName: 'Uncaria tomentosa' });
      await addIngredient({ name: "Cat's Claw", canonicalName: 'Senegalia greggii' });

      const results = await findPossibleDuplicates(asUser(B), WORKSPACE_W_ID, "Cat's Claw");

      expect(results.map((row) => row.canonicalName).sort()).toEqual([
        'Senegalia greggii',
        'Uncaria tomentosa',
      ]);
    });

    it('says so when an entry declares none', async () => {
      await addIngredient({ name: 'Graveyard Dirt', workspaceId: WORKSPACE_W_ID });

      const [result] = await findPossibleDuplicates(asUser(B), WORKSPACE_W_ID, 'Graveyard Dirt');

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
      const ids = (await findPossibleDuplicates(asUser(B), WORKSPACE_W_ID, 'Mugwart')).map(
        (row) => row.id,
      );

      expect(ids.sort()).toEqual([compendium, ours].sort());
    });

    it('never returns another workspace’s entries, by name or by folk name', async () => {
      // Why they could have come back: they are matches, and X's own member sees them.
      const fromX = (await findPossibleDuplicates(asUser(D), WORKSPACE_X_ID, 'Mugwart')).map(
        (row) => row.id,
      );
      expect(fromX).toEqual(expect.arrayContaining([theirs, theirsByFolkName]));

      const fromW = (await findPossibleDuplicates(asUser(B), WORKSPACE_W_ID, 'Mugwart')).map(
        (row) => row.id,
      );
      expect(fromW).not.toContain(theirs);
      expect(fromW).not.toContain(theirsByFolkName);
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
