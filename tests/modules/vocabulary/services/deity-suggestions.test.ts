import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { DEITIES } from '@/db/seed/deities';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, InvalidCursor } from '@/lib/errors';
import { encodeCursor, resolvePage } from '@/lib/pagination';
import type { Session } from '@/lib/session';
import { type DeitySuggestion, suggestDeities } from '@/modules/vocabulary';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { type IngredientFixture, type Overrides, makeIngredient } from '../../../support/fixtures';
import type { ConnectionArgs, Page } from '@/lib/types';

// DESIGN.md §5 and claude-docs/db/deity-vocabulary.md, "The deity
// vocabulary": the deities field's autofill offers the curated vocabulary
// first, each row with its tradition, then the uncurated values in use in the
// compendium and the caller's own workspace. The vocabulary is
// MB.129's seed, revived per test since some tests retire a row; `ingredients`
// is emptied per test, so every in-use value is one this file wrote.

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  await sql`delete from deities where slug like 'test-%'`;
  // The seed soft-deletes nothing, so every row live is the seeded state.
  await sql`update deities set deleted_at = null, deleted_by = null where deleted_at is not null`;
  await sql`update deity_traditions set deleted_at = null, deleted_by = null where deleted_at is not null`;
});

/** A row of this file's: no formal name, so `none`; what matters is its deities. */
function addIngredient(
  entry: Overrides<IngredientFixture> & Pick<IngredientFixture, 'deities'>,
): Promise<string> {
  return insertIngredient(sql, makeIngredient({ nomenclature: 'none', ...entry }), A.id);
}

/** A second live deity sharing a seeded one's display name, under another tradition. */
async function addDeity(name: string, tradition: string): Promise<void> {
  await sql`
    insert into deities (name, slug, description, tradition_id, created_by, updated_by)
    select ${name}, ${`test-${name.toLowerCase()}-${tradition.toLowerCase()}`},
      'Written by the test.', id, ${A.id}, ${A.id}
    from deity_traditions where name = ${tradition}
  `;
}

async function retire(table: 'deities' | 'deity_traditions', name: string) {
  await sql`update ${sql(table)} set deleted_at = now(), deleted_by = ${A.id} where name = ${name}`;
}

async function similarity(a: string, b: string): Promise<number> {
  const [row] = await sql`select similarity(${a}, ${b}) as score`;
  return Number(row.score);
}

async function wordSimilarity(query: string, text: string): Promise<number> {
  const [row] = await sql`select word_similarity(${query}, ${text}) as score`;
  return Number(row.score);
}

async function descriptionOf(deity: string): Promise<string> {
  const [row] = await sql`select description from deities where name = ${deity}`;
  return row.description as string;
}

function pageOf(
  session: Session,
  query: string,
  args: ConnectionArgs = {},
  workspaceId = WORKSPACE_W_ID,
): Promise<Page<DeitySuggestion>> {
  return resolvePage(args, (request) => suggestDeities(session, workspaceId, query, request));
}

/** Every suggestion, walked a page at a time: a blank query lists all 216. */
async function all(
  session: Session,
  query: string,
  workspaceId = WORKSPACE_W_ID,
): Promise<DeitySuggestion[]> {
  const seen: DeitySuggestion[] = [];
  let after: string | null = null;
  for (;;) {
    const page: Page<DeitySuggestion> = await pageOf(
      session,
      query,
      { first: 100, after },
      workspaceId,
    );
    seen.push(...page.edges.map((edge) => edge.node));
    if (!page.pageInfo.hasNextPage) return seen;
    after = page.pageInfo.endCursor;
  }
}

const valuesOf = (suggestions: DeitySuggestion[]) => suggestions.map((s) => s.value);

function find(suggestions: DeitySuggestion[], value: string): DeitySuggestion {
  const found = suggestions.filter((s) => s.value === value);
  expect(found).toHaveLength(1);
  return found[0];
}

describe('suggestDeities', () => {
  describe('the two buckets', () => {
    it('offers curated matches first and in-use uncurated values second, each saying which', async () => {
      await addIngredient({ workspaceId: WORKSPACE_W_ID, deities: ['Hermes Trismegistus'] });

      const suggestions = await all(asUser(B), 'hermes');

      // Hermes by name, Mercury by its description, then the uncurated value.
      expect(valuesOf(suggestions)).toEqual(['Hermes', 'Mercury', 'Hermes Trismegistus']);
      expect(suggestions.map((s) => s.curated)).toEqual([true, true, false]);
    });

    // "Hecate (Greek)": the tradition is what a reader chooses among 216 by.
    it('carries each curated row’s tradition, and no tradition on a value only in use', async () => {
      await addIngredient({ workspaceId: WORKSPACE_W_ID, deities: ['Hermes Trismegistus'] });

      const suggestions = await all(asUser(B), 'hermes');

      expect(find(suggestions, 'Hermes')).toMatchObject({ tradition: 'Greek', curated: true });
      expect(find(suggestions, 'Mercury')).toMatchObject({ tradition: 'Roman', curated: true });
      expect(find(suggestions, 'Hermes Trismegistus')).toEqual({
        id: null,
        value: 'Hermes Trismegistus',
        description: null,
        tradition: null,
        curated: false,
      });
    });

    // MB.167: what a pick sends — Greek Hecate's own row, never a spelling.
    it('carries each curated row’s id, and none on a value only in use', async () => {
      await addIngredient({ workspaceId: WORKSPACE_W_ID, deities: ['Hermes Trismegistus'] });
      const [hermes] = await sql`select id from deities where name = 'Hermes'`;

      const suggestions = await all(asUser(B), 'hermes');

      expect(find(suggestions, 'Hermes').id).toBe(hermes.id);
      expect(find(suggestions, 'Hermes Trismegistus').id).toBeNull();
    });

    it('ranks a name match above a description match, whatever the alphabet says', async () => {
      // Jupiter sorts before Zeus, and only its description names him.
      expect(await descriptionOf('Jupiter')).toMatch(/Zeus/);
      expect(await similarity('zeus', 'Jupiter')).toBe(0);

      expect(valuesOf(await all(asUser(B), 'zeus'))).toEqual(['Zeus', 'Jupiter']);
    });

    // The description carries the other spellings and the words a reader
    // reaches for, so `crossroads` finds Hecate rather than nothing.
    it('matches a description by a word inside it', async () => {
      const description = await descriptionOf('Hecate');
      // Why Hecate could only have come from her description.
      expect(await similarity('crossroads', 'Hecate')).toBe(0);
      expect(await similarity('crossroads', description)).toBeLessThan(0.4);
      expect(await wordSimilarity('crossroads', description)).toBe(1);

      expect(find(await all(asUser(B), 'crossroads'), 'Hecate')).toMatchObject({
        tradition: 'Greek',
        curated: true,
      });
    });

    it('returns two same-named deities under different traditions, each with its own', async () => {
      await addDeity('Hecate', 'Roman');
      // Why they could have collapsed: two live rows, one display name.
      const [{ count }] = await sql`
        select count(*)::int as count from deities where name = 'Hecate' and deleted_at is null`;
      expect(count).toBe(2);

      const hecates = (await all(asUser(B), 'hecate')).filter((s) => s.value === 'Hecate');

      // The tradition breaks the tie, so the pair reads in a stable order.
      expect(hecates.map((s) => s.tradition)).toEqual(['Greek', 'Roman']);
    });
  });

  describe('what counts as curated', () => {
    // MB.136's scan: each entry of each list is a value, folded before grouping.
    it('reads Hecate and hecate in two ingredients’ lists as one in-use value', async () => {
      await retire('deities', 'Hecate');
      await addIngredient({ deities: ['Hecate', 'Selene'] });
      await addIngredient({ name: 'Testbane', workspaceId: WORKSPACE_W_ID, deities: [' hecate'] });
      await addIngredient({
        name: 'Grave Testwort',
        workspaceId: WORKSPACE_W_ID,
        deities: ['Hecate'],
      });

      const hecates = (await all(asUser(B), 'hecate')).filter(
        (s) => s.value.trim().toLowerCase() === 'hecate',
      );

      // The spelling most entries use stands for the group.
      expect(hecates).toEqual([
        { id: null, value: 'Hecate', description: null, tradition: null, curated: false },
      ]);
    });

    it('never offers a value twice when it is curated and in use', async () => {
      await addIngredient({ deities: ['hecate'] });
      await addIngredient({ name: 'Testbane', workspaceId: WORKSPACE_W_ID, deities: ['HECATE'] });

      const hecates = (await all(asUser(B), 'hecate')).filter(
        (s) => s.value.toLowerCase() === 'hecate',
      );

      expect(hecates).toEqual([expect.objectContaining({ value: 'Hecate', curated: true })]);
    });

    it('moves a soft-deleted deity’s in-use spelling into the uncurated bucket', async () => {
      await addIngredient({ workspaceId: WORKSPACE_W_ID, deities: ['hecate'] });

      await retire('deities', 'Hecate');

      expect(find(await all(asUser(B), 'hecate'), 'hecate')).toMatchObject({
        curated: false,
        tradition: null,
      });
    });

    it('reads a deity whose tradition is soft-deleted as uncurated, and never names the dead tradition', async () => {
      await addIngredient({ workspaceId: WORKSPACE_W_ID, deities: ['Hecate'] });
      // Why it could have come back curated: the deity row itself is live.
      await retire('deity_traditions', 'Greek');
      const [deity] = await sql`select deleted_at from deities where name = 'Hecate'`;
      expect(deity.deleted_at).toBeNull();

      const suggestions = await all(asUser(B), 'hecate');

      expect(suggestions.some((s) => s.tradition === 'Greek')).toBe(false);
      expect(find(suggestions, 'Hecate')).toEqual({
        id: null,
        value: 'Hecate',
        description: null,
        tradition: null,
        curated: false,
      });
    });

    it('offers no deity of a soft-deleted tradition that nobody uses', async () => {
      await retire('deity_traditions', 'Greek');

      expect(valuesOf(await all(asUser(B), 'hecate'))).not.toContain('Hecate');
    });
  });

  // §9: the suggested strings are scoped to the compendium and the caller's
  // workspace — never another one.
  describe('scope', () => {
    beforeEach(async () => {
      await addIngredient({ deities: ['Nodens'] });
      await addIngredient({ workspaceId: WORKSPACE_W_ID, deities: ['Abnoba'] });
      await addIngredient({
        name: 'Ninebark Testwort',
        workspaceId: WORKSPACE_X_ID,
        deities: ['Belisama'],
      });
    });

    it('spans the compendium and the current workspace', async () => {
      const uncurated = (await all(asUser(B), '')).filter((s) => !s.curated);

      expect(valuesOf(uncurated)).toEqual(['Abnoba', 'Nodens']);
    });

    it('never offers a deity in use only in another workspace', async () => {
      // Why it could have come back: X holds it, and X's own member is offered it.
      const held = await sql`
        select d.name from ingredient_deities d join ingredients i on i.id = d.ingredient_id
        where i.workspace_id = ${WORKSPACE_X_ID} and i.deleted_at is null and d.deleted_at is null`;
      expect(held.map((row) => row.name)).toEqual(['Belisama']);
      expect(valuesOf(await all(asUser(D), 'belisama', WORKSPACE_X_ID))).toEqual(['Belisama']);

      expect(await all(asUser(B), 'belisama')).toEqual([]);
      expect(valuesOf(await all(asUser(B), ''))).not.toContain('Belisama');
    });

    // MB.167: the deities in use are the table's live rows.
    it('drops a deity row soft-deleted from a live ingredient', async () => {
      await sql`
        update ingredient_deities set deleted_at = now(), deleted_by = ${A.id}
        where name = 'Abnoba'`;
      // Why it could have come back: its ingredient is live and in scope.
      const [{ count }] = await sql`
        select count(*)::int as count from ingredients
        where workspace_id = ${WORKSPACE_W_ID} and deleted_at is null`;
      expect(count).toBe(1);

      expect(await all(asUser(B), 'abnoba')).toEqual([]);
    });

    it('drops a soft-deleted ingredient’s deities', async () => {
      await sql`
        update ingredients set deleted_at = now(), deleted_by = ${A.id}
        where workspace_id = ${WORKSPACE_W_ID}`;

      expect(await all(asUser(B), 'abnoba')).toEqual([]);
    });
  });

  describe('the query', () => {
    it('treats whitespace as no query, and offers the whole live vocabulary, each with its tradition', async () => {
      const suggestions = await all(asUser(B), '   ');

      expect(suggestions).toHaveLength(DEITIES.length);
      expect(suggestions.every((s) => s.curated && s.tradition)).toBe(true);
    });

    it('offers nothing for a query matching nothing', async () => {
      expect(await all(asUser(B), 'xqzv')).toEqual([]);
    });
  });

  // CLAUDE.md rule 8: one connection over both buckets, walked by cursor.
  describe('pagination', () => {
    it('walks every suggestion once, in order, across the bucket boundary', async () => {
      await addIngredient({ workspaceId: WORKSPACE_W_ID, deities: ['Hermes Trismegistus'] });
      const expected = valuesOf(await all(asUser(B), 'hermes'));

      const seen: string[] = [];
      let after: string | null = null;
      for (;;) {
        const page: Page<DeitySuggestion> = await pageOf(asUser(B), 'hermes', { first: 1, after });
        seen.push(...valuesOf(page.edges.map((edge) => edge.node)));
        if (!page.pageInfo.hasNextPage) break;
        after = page.pageInfo.endCursor;
      }

      expect(seen).toEqual(expected);
      expect(seen).toHaveLength(3);
    });

    it('refuses a cursor that names no position in this list', async () => {
      const forged = encodeCursor({ key: ['hecate'], id: 'hecate' });

      await expect(pageOf(asUser(B), '', { after: forged })).rejects.toThrow(InvalidCursor);
    });
  });

  describe('authorization', () => {
    beforeEach(async () => {
      await addIngredient({ workspaceId: WORKSPACE_W_ID, deities: ['Abnoba'] });
    });

    // It reveals nothing a reader of the workspace could not already list.
    it('answers anyone who may read the workspace’s ingredients, a viewer included', async () => {
      expect(valuesOf(await all(asUser(C), 'abnoba'))).toEqual(['Abnoba']);
      expect(valuesOf(await all(asUser(A), 'abnoba'))).toEqual(['Abnoba']);
    });

    it('refuses a member of another workspace asking about this one', async () => {
      // Why it could have succeeded: D is a member, just not here.
      await expect(all(asUser(D), 'abnoba', WORKSPACE_X_ID)).resolves.toEqual([]);

      await expect(all(asUser(D), 'abnoba')).rejects.toThrow(Forbidden);
    });

    it('refuses a site admin, who belongs to no workspace', async () => {
      await expect(all(asUser(E), 'abnoba')).rejects.toThrow(Forbidden);
    });
  });
});
