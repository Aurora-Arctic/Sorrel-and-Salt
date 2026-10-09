import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, InvalidCursor } from '@/lib/errors';
import { encodeCursor, resolvePage } from '@/lib/pagination';
import type { Session } from '@/lib/session';
import { type FormSuggestion, suggestForms } from '@/modules/vocabulary';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { type IngredientFixture, type Overrides, makeIngredient } from '../../../support/fixtures';
import type { ConnectionArgs, Page } from '@/lib/types';

// DESIGN.md §5 and §9: the `form` field's autofill offers the curated
// vocabulary first, each row with its group, then the uncurated values in use
// in the compendium and the caller's own workspace — each suggestion naming
// the in-scope ingredients that already claim it. The vocabulary is the
// seed's, revived per test since some tests retire a row; `ingredients` is
// emptied per test, so every in-use value and claimant is one this file wrote.

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  // A test adds its own same-named form; the seed's slugs are all it keeps.
  await sql`delete from ingredient_forms where slug like 'test-%'`;
  // The seed soft-deletes nothing, so every row live is the seeded state.
  await sql`update ingredient_forms set deleted_at = null, deleted_by = null where deleted_at is not null`;
  await sql`update ingredient_form_groups set deleted_at = null, deleted_by = null where deleted_at is not null`;
});

/**
 * A row of this file's: the form stated, since that is what the file is
 * about, and no formal name, and so `none`, unless one is stated.
 */
function addIngredient(
  entry: Overrides<IngredientFixture> & Pick<IngredientFixture, 'form'>,
): Promise<string> {
  const nomenclature = entry.canonicalName ? 'botanical' : 'none';
  return insertIngredient(sql, makeIngredient({ nomenclature, ...entry }), A.id);
}

/** A second live form sharing a seeded one's display name, in another group. */
async function addForm(name: string, group: string): Promise<string> {
  const [row] = await sql`
    insert into ingredient_forms (name, slug, description, group_id, created_by, updated_by)
    select ${name}, ${`test-${name.toLowerCase()}-${group.toLowerCase()}`}, 'Written by the test.',
      id, ${A.id}, ${A.id}
    from ingredient_form_groups where name = ${group}
    returning id
  `;
  return row.id as string;
}

async function retire(table: 'ingredient_forms' | 'ingredient_form_groups', name: string) {
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

async function descriptionOf(form: string): Promise<string> {
  const [row] = await sql`select description from ingredient_forms where name = ${form}`;
  return row.description as string;
}

function pageOf(
  session: Session,
  query: string,
  args: ConnectionArgs = {},
  workspaceId = WORKSPACE_W_ID,
): Promise<Page<FormSuggestion>> {
  return resolvePage(args, (request) => suggestForms(session, workspaceId, query, request));
}

/** Every suggestion in one page — the lists here are far shorter than the maximum. */
async function all(
  session: Session,
  query: string,
  workspaceId = WORKSPACE_W_ID,
): Promise<FormSuggestion[]> {
  const page = await pageOf(session, query, { first: 100 }, workspaceId);
  expect(page.pageInfo.hasNextPage).toBe(false);
  return page.edges.map((edge) => edge.node);
}

const valuesOf = (suggestions: FormSuggestion[]) => suggestions.map((s) => s.value);

function find(suggestions: FormSuggestion[], value: string): FormSuggestion {
  const found = suggestions.filter((s) => s.value === value);
  expect(found).toHaveLength(1);
  return found[0];
}

describe('suggestForms', () => {
  describe('the two buckets', () => {
    it('offers curated matches first and in-use uncurated values second, each saying which', async () => {
      await addIngredient({ name: 'Testwort', workspaceId: WORKSPACE_W_ID, form: 'root bark' });

      const suggestions = await all(asUser(B), 'root');

      // Root by name, Bark by its description, then the uncurated value.
      expect(valuesOf(suggestions)).toEqual(['Root', 'Bark', 'root bark']);
      expect(suggestions.map((s) => s.curated)).toEqual([true, true, false]);
    });

    it('carries each curated row’s group, and no group on a value only in use', async () => {
      await addIngredient({ name: 'Testwort', workspaceId: WORKSPACE_W_ID, form: 'root bark' });

      const suggestions = await all(asUser(B), 'root');

      expect(find(suggestions, 'Root')).toMatchObject({ group: 'Botanical', curated: true });
      expect(find(suggestions, 'root bark')).toMatchObject({
        group: null,
        description: null,
        curated: false,
      });
    });

    // §5: uniqueness is on the slug alone, so two live forms may share a
    // display name, and the group is the only thing that tells them apart.
    it('returns two same-named forms in different groups, each with its own group', async () => {
      await addForm('Wax', 'Animal');
      // Why they could have collapsed: two live rows, one display name.
      const [{ count }] = await sql`
        select count(*)::int as count from ingredient_forms where name = 'Wax' and deleted_at is null`;
      expect(count).toBe(2);

      const waxes = (await all(asUser(B), 'wax')).filter((s) => s.value === 'Wax');

      // Group name breaks the tie, so the pair reads in a stable order.
      expect(waxes.map((s) => s.group)).toEqual(['Animal', 'Substance']);
      expect(waxes.every((s) => s.curated)).toBe(true);
    });

    // §5: a description names the words a reader reaches for, so typing
    // `salve` or `balm` offers Ointment rather than an uncurated value.
    it('matches a description, so salve and balm offer Ointment', async () => {
      // Why Ointment could only have come from its description.
      expect(await similarity('salve', 'Ointment')).toBe(0);
      expect(await similarity('balm', 'Ointment')).toBe(0);
      expect(await similarity('salve', await descriptionOf('Ointment'))).toBeLessThan(0.4);
      expect(await wordSimilarity('salve', await descriptionOf('Ointment'))).toBe(1);

      for (const query of ['salve', 'balm']) {
        expect(await all(asUser(B), query)).toEqual([
          expect.objectContaining({ value: 'Ointment', group: 'Substance', curated: true }),
        ]);
      }
    });

    it('ranks a name match above a description match, whatever the alphabet says', async () => {
      // Candle's and Poppet's descriptions mention wax; both sort before Wax by name.
      expect(await descriptionOf('Candle')).toMatch(/wax/i);
      expect(await descriptionOf('Poppet')).toMatch(/wax/i);

      expect(valuesOf(await all(asUser(B), 'wax'))).toEqual(['Wax', 'Candle', 'Poppet']);
    });
  });

  // §9: a suggestion says which in-scope ingredients already claim it, each
  // by formal name, so the ambiguity is visible at the moment of entry.
  describe('who claims a suggestion', () => {
    it('names every in-scope ingredient whose form folds to a curated value', async () => {
      await addIngredient({
        name: 'Valerian',
        canonicalName: 'Valeriana officinalis',
        form: 'root',
      });
      await addIngredient({
        name: 'Testwort',
        canonicalName: 'Fixtura testalis',
        workspaceId: WORKSPACE_W_ID,
        form: ' Root ',
      });

      const root = find(await all(asUser(B), 'root'), 'Root');

      expect(root.claimants).toEqual([
        { name: 'Testwort', canonicalName: 'Fixtura testalis' },
        { name: 'Valerian', canonicalName: 'Valeriana officinalis' },
      ]);
    });

    it('names the claimants of an uncurated value, a claimant without a formal name included', async () => {
      await addIngredient({ name: 'Testroot', canonicalName: 'Fixtura radix', form: 'rhizome' });
      await addIngredient({ name: 'Grave Testroot', workspaceId: WORKSPACE_W_ID, form: 'Rhizome' });

      const rhizome = find(await all(asUser(B), 'rhizome'), 'rhizome');

      expect(rhizome.curated).toBe(false);
      // Formal names first; an entry with none is still a claimant, named by its label.
      expect(rhizome.claimants).toEqual([
        { name: 'Testroot', canonicalName: 'Fixtura radix' },
        { name: 'Grave Testroot', canonicalName: null },
      ]);
    });

    it('offers a curated value nobody claims, with no claimants', async () => {
      expect(find(await all(asUser(B), 'ointment'), 'Ointment').claimants).toEqual([]);
    });
  });

  describe('what counts as curated', () => {
    it('never offers a value twice when it is curated and in use', async () => {
      await addIngredient({ name: 'Testwort', form: 'root' });
      await addIngredient({ name: 'Testbane', workspaceId: WORKSPACE_W_ID, form: 'ROOT' });

      const roots = (await all(asUser(B), 'root')).filter((s) => s.value.toLowerCase() === 'root');

      expect(roots).toEqual([expect.objectContaining({ value: 'Root', curated: true })]);
    });

    it('moves a soft-deleted form’s in-use spelling into the uncurated bucket', async () => {
      await addIngredient({ name: 'Testwort', workspaceId: WORKSPACE_W_ID, form: 'root' });

      await retire('ingredient_forms', 'Root');

      expect(find(await all(asUser(B), 'root'), 'root')).toMatchObject({
        curated: false,
        group: null,
        claimants: [{ name: 'Testwort', canonicalName: null }],
      });
    });

    it('reads a form whose group is soft-deleted as uncurated, and never names the dead group', async () => {
      await addIngredient({ name: 'Testwort', workspaceId: WORKSPACE_W_ID, form: 'wax' });
      // Why it could have come back curated: the form row itself is live.
      await retire('ingredient_form_groups', 'Substance');
      const [form] = await sql`select deleted_at from ingredient_forms where name = 'Wax'`;
      expect(form.deleted_at).toBeNull();

      const suggestions = await all(asUser(B), 'wax');

      expect(suggestions.some((s) => s.group === 'Substance')).toBe(false);
      expect(find(suggestions, 'wax')).toMatchObject({ curated: false, group: null });
    });
  });

  // §9: both the suggested strings and their attribution are scoped to the
  // compendium and the caller's workspace — never another one.
  describe('scope', () => {
    beforeEach(async () => {
      await addIngredient({ name: 'Testroot', canonicalName: 'Fixtura radix', form: 'rhizome' });
      await addIngredient({ name: 'Testwort', workspaceId: WORKSPACE_W_ID, form: 'tuber' });
      await addIngredient({
        name: 'Ninebark Testwort',
        canonicalName: 'Fixtura aliena',
        workspaceId: WORKSPACE_X_ID,
        form: 'caudex',
      });
    });

    it('spans the compendium and the current workspace', async () => {
      const uncurated = (await all(asUser(B), '')).filter((s) => !s.curated);

      expect(valuesOf(uncurated)).toEqual(['rhizome', 'tuber']);
    });

    it('never offers a form in use only in another workspace', async () => {
      // Why it could have come back: X holds it, and X's own member is offered it.
      const [held] = await sql`
        select form from ingredients where workspace_id = ${WORKSPACE_X_ID} and deleted_at is null`;
      expect(held.form).toBe('caudex');
      expect(valuesOf(await all(asUser(D), 'caudex', WORKSPACE_X_ID))).toEqual(['caudex']);

      expect(await all(asUser(B), 'caudex')).toEqual([]);
      expect(valuesOf(await all(asUser(B), ''))).not.toContain('caudex');
    });

    it('never names another workspace’s ingredient as a claimant', async () => {
      await addIngredient({
        name: 'Ninebark Root',
        canonicalName: 'Fixtura aliena radix',
        workspaceId: WORKSPACE_X_ID,
        form: 'root',
      });
      await addIngredient({ name: 'Testwort Root', workspaceId: WORKSPACE_W_ID, form: 'root' });
      // Why it could have been named: X's member sees it claim Root.
      const seenFromX = find(await all(asUser(D), 'root', WORKSPACE_X_ID), 'Root');
      expect(seenFromX.claimants.map((c) => c.name)).toEqual(['Ninebark Root']);

      const seenFromW = find(await all(asUser(B), 'root'), 'Root');

      expect(seenFromW.claimants).toEqual([{ name: 'Testwort Root', canonicalName: null }]);
    });
  });

  describe('the query', () => {
    it('treats whitespace as no query, and offers the whole live vocabulary', async () => {
      const [{ count }] = await sql`
        select count(*)::int as count from ingredient_forms where deleted_at is null`;

      const suggestions = await all(asUser(B), '   ');

      expect(suggestions).toHaveLength(count);
      expect(suggestions.every((s) => s.curated && s.group)).toBe(true);
    });

    it('offers nothing for a query matching nothing', async () => {
      expect(await all(asUser(B), 'xqzv')).toEqual([]);
    });
  });

  // CLAUDE.md rule 8: one connection over both buckets, walked by cursor.
  describe('pagination', () => {
    it('walks every suggestion once, in order, across the bucket boundary', async () => {
      await addIngredient({ name: 'Testwort', workspaceId: WORKSPACE_W_ID, form: 'root bark' });
      await addForm('Wax', 'Animal');
      const expected = valuesOf(await all(asUser(B), ''));

      const seen: string[] = [];
      let after: string | null = null;
      for (;;) {
        const page: Page<FormSuggestion> = await pageOf(asUser(B), '', { first: 7, after });
        seen.push(...valuesOf(page.edges.map((edge) => edge.node)));
        if (!page.pageInfo.hasNextPage) break;
        after = page.pageInfo.endCursor;
      }

      expect(seen).toEqual(expected);
      expect(seen[seen.length - 1]).toBe('root bark');
      expect(seen.filter((value) => value === 'Wax')).toHaveLength(2);
    });

    it('refuses a cursor that names no position in this list', async () => {
      const forged = encodeCursor({ key: ['root'], id: 'root' });

      await expect(pageOf(asUser(B), '', { after: forged })).rejects.toThrow(InvalidCursor);
    });
  });

  describe('authorization', () => {
    beforeEach(async () => {
      await addIngredient({ name: 'Testwort', workspaceId: WORKSPACE_W_ID, form: 'tuber' });
    });

    // It reveals nothing a reader of the workspace could not already list.
    it('answers anyone who may read the workspace’s ingredients, a viewer included', async () => {
      expect(valuesOf(await all(asUser(C), 'tuber'))).toEqual(['tuber']);
      expect(valuesOf(await all(asUser(A), 'tuber'))).toEqual(['tuber']);
    });

    it('refuses a member of another workspace asking about this one', async () => {
      // Why it could have succeeded: D is a member, just not here.
      await expect(all(asUser(D), 'tuber', WORKSPACE_X_ID)).resolves.toEqual([]);

      await expect(all(asUser(D), 'tuber')).rejects.toThrow(Forbidden);
    });

    it('refuses a site admin, who belongs to no workspace', async () => {
      await expect(all(asUser(E), 'tuber')).rejects.toThrow(Forbidden);
    });
  });
});
