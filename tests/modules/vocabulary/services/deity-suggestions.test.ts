import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { useTestDatabase } from '../../../support/db/database';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden } from '@/lib/errors';
import { resolvePage } from '@/lib/pagination';
import type { Session } from '@/lib/session';
import { type DeitySuggestion, suggestDeities } from '@/modules/vocabulary';
import { A, B, D, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { type IngredientFixture, type Overrides, makeIngredient } from '../../../support/fixtures';
import type { ConnectionArgs, Page } from '@/lib/types';

// DESIGN.md §5 and claude-docs/db/deity-vocabulary.md, "The deity vocabulary": the deities autofill offers the curated vocabulary first, each row with its tradition, then uncurated values in use in the compendium and the caller's workspace.
// The vocabulary is the seed, revived per test since some tests retire a row; `ingredients` is emptied per test, so every in-use value is one this file wrote.

let sql: ReturnType<typeof postgres>;

useTestDatabase((client) => (sql = client));

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  await sql`delete from deity_other_names where deity_id in (
    select id from deities where slug like 'test-%')`;
  await sql`delete from deities where slug like 'test-%'`;
  await sql`delete from deity_traditions where slug like 'test-%'`;
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

/** A live tradition of this file's, with a deity under it for each name given. */
async function addTradition(tradition: string, names: string[]): Promise<void> {
  await sql`
    insert into deity_traditions (name, slug, description, created_by, updated_by)
    values (${tradition}, ${`test-${tradition.toLowerCase()}`}, 'Written by the test.', ${A.id}, ${A.id})
  `;
  for (const name of names) await addDeity(name, tradition);
}

/** An other name for the deity of this name, live unless `dropped`. */
async function addOtherName(deity: string, name: string, dropped = false): Promise<void> {
  await sql`
    insert into deity_other_names (deity_id, name, created_by, updated_by, deleted_at, deleted_by)
    select id, ${name}, ${A.id}, ${A.id}, ${dropped ? new Date() : null}, ${dropped ? A.id : null}
    from deities where name = ${deity} and deleted_at is null
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

/** Every suggestion, walked a page at a time: a blank query lists every curated deity. */
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
    // "Hecate (Greek)": the tradition is what a reader chooses among all the curated deities by.
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
        matchedName: null,
        curated: false,
      });
    });

    // What a pick sends — Greek Hecate's own row, never a spelling.
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

      // Other deities' descriptions name him too, so the vocabulary's growth must not
      // break this: only the name match leads, and Jupiter still follows.
      const values = valuesOf(await all(asUser(B), 'zeus'));
      expect(values[0]).toBe('Zeus');
      expect(values).toContain('Jupiter');
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
    // The scan: each entry of each list is a value, folded before grouping.
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
        {
          id: null,
          value: 'Hecate',
          description: null,
          tradition: null,
          matchedName: null,
          curated: false,
        },
      ]);
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
        matchedName: null,
        curated: false,
      });
    });

    it('offers no deity of a soft-deleted tradition that nobody uses', async () => {
      await retire('deity_traditions', 'Greek');

      expect(valuesOf(await all(asUser(B), 'hecate'))).not.toContain('Hecate');
    });
  });

  // The tradition is a heading the field's rows are known by, so typing its
  // name lists its deities: the same case-folded substring an admin list uses.
  describe('by tradition', () => {
    it('offers every deity of a tradition whose name holds the text, whatever the case', async () => {
      await addTradition('Testish', ['Aldrin', 'Borrowen']);
      await addTradition('Otherish', ['Cormac']);

      for (const query of ['testish', 'TESTISH', ' estish ']) {
        const suggestions = await all(asUser(B), query);
        expect(valuesOf(suggestions)).toEqual(['Aldrin', 'Borrowen']);
        expect(suggestions.map((s) => s.tradition)).toEqual(['Testish', 'Testish']);
        expect(suggestions.every((s) => s.curated)).toBe(true);
      }
    });

    it('offers nothing under a soft-deleted tradition, though its deities are live', async () => {
      await addTradition('Testish', ['Aldrin']);
      const before = await all(asUser(B), 'testish');
      expect(valuesOf(before)).toEqual(['Aldrin']);
      await retire('deity_traditions', 'Testish');
      const [deity] = await sql`select deleted_at from deities where name = 'Aldrin'`;
      expect(deity.deleted_at).toBeNull();

      expect(await all(asUser(B), 'testish')).toEqual([]);
    });

    it("keeps the in-use values to the caller's scope when a tradition is typed", async () => {
      await addTradition('Testish', ['Aldrin']);
      await addIngredient({ workspaceId: WORKSPACE_X_ID, deities: ['Testish Hermit'] });

      // Why it could have shown: the value holds the text, in another workspace.
      expect(valuesOf(await all(asUser(D), 'testish', WORKSPACE_X_ID))).toContain('Testish Hermit');
      expect(valuesOf(await all(asUser(B), 'testish'))).toEqual(['Aldrin']);
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

    // The deities in use are the table's live rows.
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
  });

  // A source's other name for a deity reaches the deity, and the
  // picker says which name it matched, since the deity's own does not show it.
  describe('other names', () => {
    beforeEach(async () => {
      await addTradition('Testfolk', ['Testara', 'Mockara']);
      await addOtherName('Testara', 'Quillabine');
      await addOtherName('Mockara', 'Vellowmere', true);
    });

    it('finds a deity by an other name, among the name matches, carrying the name that matched', async () => {
      // Why it could have missed: neither the name nor the description holds it.
      expect(await similarity('quillabine', 'Testara')).toBe(0);
      expect(await wordSimilarity('quillabine', await descriptionOf('Testara'))).toBeLessThan(0.3);

      const suggestions = await all(asUser(B), 'quillab');

      expect(suggestions[0]).toMatchObject({
        value: 'Testara',
        tradition: 'Testfolk',
        matchedName: 'Quillabine',
        curated: true,
      });
    });

    it('carries no matched name on a deity found by its own name', async () => {
      expect(find(await all(asUser(B), 'testara'), 'Testara').matchedName).toBeNull();
    });

    it('finds nothing by a dropped other name', async () => {
      expect(valuesOf(await all(asUser(B), 'vellowmere'))).toEqual([]);
    });
  });

  describe('authorization', () => {
    beforeEach(async () => {
      await addIngredient({ workspaceId: WORKSPACE_W_ID, deities: ['Abnoba'] });
    });

    // It reveals nothing a reader of the workspace could not already list.
    it('refuses a member of another workspace asking about this one', async () => {
      // Why it could have succeeded: D is a member, just not here.
      await expect(all(asUser(D), 'abnoba', WORKSPACE_X_ID)).resolves.toEqual([]);

      await expect(all(asUser(D), 'abnoba')).rejects.toThrow(Forbidden);
    });
  });
});
