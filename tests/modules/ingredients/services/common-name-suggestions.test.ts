import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, InvalidCursor } from '@/lib/errors';
import { type ConnectionArgs, type Page, encodeCursor, resolvePage } from '@/lib/pagination';
import type { Session } from '@/lib/session';
import { type CommonNameSuggestion, suggestCommonNames } from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { type IngredientFixture, type Overrides, makeIngredient } from '../../../support/fixtures';

// DESIGN.md §9, "Entry-time lookups are permission-scoped": typing a common
// name suggests the names already in use in the compendium and the caller's
// workspace — an entry's display name or any of its folk names — each naming,
// by formal name, the in-scope ingredients that answer to it. There is no
// curated vocabulary of common names, so there is one bucket. The table is
// emptied per test, so every name a result could carry is one this file wrote.

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

function pageOf(
  session: Session,
  query: string,
  args: ConnectionArgs = {},
  workspaceId = WORKSPACE_W_ID,
): Promise<Page<CommonNameSuggestion>> {
  return resolvePage(args, (request) => suggestCommonNames(session, workspaceId, query, request));
}

/** Every suggestion in one page — the lists here are far shorter than the maximum. */
async function all(
  session: Session,
  query: string,
  workspaceId = WORKSPACE_W_ID,
): Promise<CommonNameSuggestion[]> {
  const page = await pageOf(session, query, { first: 100 }, workspaceId);
  expect(page.pageInfo.hasNextPage).toBe(false);
  return page.edges.map((edge) => edge.node);
}

const valuesOf = (suggestions: CommonNameSuggestion[]) => suggestions.map((s) => s.value);

describe('suggestCommonNames', () => {
  // §5's own example: "Cat's Claw" is four plants and a literal claw. A
  // suggestion that does not say which is worse than none.
  describe('what a suggestion carries', () => {
    beforeEach(async () => {
      await addIngredient({ name: "Cat's Claw", canonicalName: 'Uncaria tomentosa', form: 'bark' });
      await addIngredient({
        name: "Cat's Claw",
        canonicalName: 'Senegalia greggii',
        form: 'thorn',
      });
      await addIngredient({
        name: 'Wait-a-Minute Bush',
        canonicalName: 'Mimosa aculeaticarpa',
        folkNames: ["cat's claw"],
      });
      await addIngredient({ name: "Cat's Claw", workspaceId: WORKSPACE_W_ID, form: 'claw' });
    });

    it('offers a name once, naming every in-scope ingredient that answers to it', async () => {
      expect(await all(asUser(B), "cat's claw")).toEqual([
        {
          // The spelling most of them use.
          value: "Cat's Claw",
          claimants: [
            { name: 'Wait-a-Minute Bush', canonicalName: 'Mimosa aculeaticarpa' },
            { name: "Cat's Claw", canonicalName: 'Senegalia greggii' },
            { name: "Cat's Claw", canonicalName: 'Uncaria tomentosa' },
            // An entry with no formal name still claims it, by its label.
            { name: "Cat's Claw", canonicalName: null },
          ],
        },
      ]);
    });

    it('offers a folk name as readily as a display name', async () => {
      await addIngredient({
        name: 'Testvine',
        canonicalName: 'Fixtura unguis',
        folkNames: ['Uña de Gato'],
      });

      expect(await all(asUser(B), 'uña de gato')).toEqual([
        {
          value: 'Uña de Gato',
          claimants: [{ name: 'Testvine', canonicalName: 'Fixtura unguis' }],
        },
      ]);
    });

    it('names an ingredient once when its label and a folk name are the same name', async () => {
      await addIngredient({
        name: 'Testwort',
        canonicalName: 'Fixtura testalis',
        folkNames: ['testwort'],
      });

      const suggestions = await all(asUser(B), 'testwort');

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].claimants).toEqual([
        { name: 'Testwort', canonicalName: 'Fixtura testalis' },
      ]);
    });

    // A formal name is identity, not something the field writes.
    it('does not offer a formal name as a common name', async () => {
      expect(await all(asUser(B), 'uncaria tomentosa')).toEqual([]);
    });
  });

  describe('what counts as in use', () => {
    it('drops a soft-deleted folk name', async () => {
      await addIngredient({ name: 'Testwort', folkNames: ['Moonwort Minor'] });
      expect(valuesOf(await all(asUser(B), 'moonwort minor'))).toEqual(['Moonwort Minor']);

      await sql`update ingredient_folk_names set deleted_at = now(), deleted_by = ${A.id}`;

      expect(await all(asUser(B), 'moonwort minor')).toEqual([]);
    });

    it('drops a soft-deleted ingredient’s names, label and folk names alike', async () => {
      const id = await addIngredient({
        name: 'Testwort',
        workspaceId: WORKSPACE_W_ID,
        folkNames: ['Fixture Bane'],
      });
      expect(valuesOf(await all(asUser(B), ''))).toEqual(['Fixture Bane', 'Testwort']);

      await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;

      expect(await all(asUser(B), '')).toEqual([]);
    });

    it('drops a soft-deleted claimant but keeps the name another still claims', async () => {
      const gone = await addIngredient({ name: 'Testwort', canonicalName: 'Fixtura prima' });
      await addIngredient({ name: 'Testwort', canonicalName: 'Fixtura secunda' });

      await sql`update ingredients set deleted_at = now(), deleted_by = ${A.id} where id = ${gone}`;

      expect(await all(asUser(B), 'testwort')).toEqual([
        { value: 'Testwort', claimants: [{ name: 'Testwort', canonicalName: 'Fixtura secunda' }] },
      ]);
    });
  });

  // §9: both the suggested strings and their attribution are scoped to the
  // compendium and the caller's workspace — never another one.
  describe('scope', () => {
    beforeEach(async () => {
      await addIngredient({ name: 'Testwort', folkNames: ['Fixture Bane'] });
      await addIngredient({ name: 'Testbane', workspaceId: WORKSPACE_W_ID });
      await addIngredient({
        name: 'Ninebark Testwort',
        workspaceId: WORKSPACE_X_ID,
        folkNames: ['Widow’s Fixture'],
      });
    });

    it('spans the compendium and the current workspace', async () => {
      expect(valuesOf(await all(asUser(B), ''))).toEqual(['Fixture Bane', 'Testbane', 'Testwort']);
    });

    it('never offers a name in use only in another workspace, label or folk name', async () => {
      // Why they could have come back: X holds both, and X's own member is offered them.
      const fromX = valuesOf(await all(asUser(D), '', WORKSPACE_X_ID));
      expect(fromX).toContain('Ninebark Testwort');
      expect(fromX).toContain('Widow’s Fixture');

      // Near-misses in scope may still come back; X's own strings never do.
      expect(valuesOf(await all(asUser(B), 'ninebark testwort'))).not.toContain(
        'Ninebark Testwort',
      );
      expect(valuesOf(await all(asUser(B), 'widow’s fixture'))).not.toContain('Widow’s Fixture');
      expect(valuesOf(await all(asUser(B), ''))).toEqual(['Fixture Bane', 'Testbane', 'Testwort']);
    });

    it('never names another workspace’s ingredient as a claimant', async () => {
      await addIngredient({
        name: 'Ninebark Bane',
        canonicalName: 'Fixtura aliena',
        workspaceId: WORKSPACE_X_ID,
        folkNames: ['Testwort'],
      });
      // Why it could have been named: X's member sees it answer to Testwort.
      const seenFromX = (await all(asUser(D), 'testwort', WORKSPACE_X_ID)).find(
        (s) => s.value === 'Testwort',
      );
      expect(seenFromX?.claimants.map((c) => c.name)).toContain('Ninebark Bane');

      expect(await all(asUser(B), 'testwort')).toEqual([
        { value: 'Testwort', claimants: [{ name: 'Testwort', canonicalName: null }] },
      ]);
    });
  });

  describe('the thresholds', () => {
    it('is 0.4 for similarity, not the database default of 0.3', async () => {
      await addIngredient({ name: 'Mandrake', canonicalName: 'Mandragora officinarum' });
      await addIngredient({ name: 'Vervain', canonicalName: 'Verbena officinalis' });
      // `vervian` clears the database default for `%` but not an explicit 0.4.
      const [row] = await sql`
        select similarity('Vervain', 'vervian') as score, 'Vervain' % 'vervian' as defaulted`;
      expect(Number(row.score)).toBeLessThan(0.4);
      expect(row.defaulted).toBe(true);

      expect(valuesOf(await all(asUser(B), 'mandr'))).toEqual(['Mandrake']);
      expect(await all(asUser(B), 'vervian')).toEqual([]);
    });
  });

  // CLAUDE.md rule 8: walked by cursor.
  describe('pagination', () => {
    it('walks every name once, in order', async () => {
      await addIngredient({ name: 'Testwort', folkNames: ['Fixture Bane', 'Testroot'] });
      await addIngredient({
        name: 'Testbane',
        workspaceId: WORKSPACE_W_ID,
        folkNames: ['Testroot'],
      });

      const seen: string[] = [];
      let after: string | null = null;
      for (;;) {
        const page: Page<CommonNameSuggestion> = await pageOf(asUser(B), '', { first: 2, after });
        seen.push(...valuesOf(page.edges.map((edge) => edge.node)));
        if (!page.pageInfo.hasNextPage) break;
        after = page.pageInfo.endCursor;
      }

      expect(seen).toEqual(['Fixture Bane', 'Testbane', 'Testroot', 'Testwort']);
    });

    it('refuses a cursor that names no position in this list', async () => {
      const forged = encodeCursor({ key: ['testwort'], id: 'testwort' });

      await expect(pageOf(asUser(B), '', { after: forged })).rejects.toThrow(InvalidCursor);
    });
  });

  describe('authorization', () => {
    beforeEach(async () => {
      await addIngredient({ name: 'Testbane', workspaceId: WORKSPACE_W_ID });
    });

    it('answers anyone who may read the workspace’s ingredients, a viewer included', async () => {
      expect(valuesOf(await all(asUser(C), 'testbane'))).toEqual(['Testbane']);
      expect(valuesOf(await all(asUser(A), 'testbane'))).toEqual(['Testbane']);
    });

    it('refuses a member of another workspace asking about this one', async () => {
      // Why it could have succeeded: D is a member, just not here.
      await expect(all(asUser(D), 'testbane', WORKSPACE_X_ID)).resolves.toEqual([]);

      await expect(all(asUser(D), 'testbane')).rejects.toThrow(Forbidden);
    });

    it('refuses a site admin, who belongs to no workspace', async () => {
      await expect(all(asUser(E), 'testbane')).rejects.toThrow(Forbidden);
    });
  });
});
