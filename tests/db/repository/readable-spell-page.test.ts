import { beforeEach, describe, expect, it } from 'vitest';
import { sql as sqlExpression } from 'drizzle-orm';
import type postgres from 'postgres';
import {
  findGrimoireCategoryCounts,
  findGrimoireCount,
  findGrimoireFacetCounts,
  findGrimoirePage,
  findManyInSpells,
  findOneSpell,
  findPageInReadableSpells,
  type GrimoireQuery,
  type SortPart,
} from '@/db/repository';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { type Membership, assertMembership } from '@/modules/coven';
import type { SpellVisibility } from '@/modules/grimoire';
import { spellSteps } from '@/modules/grimoire/schema/spell-steps';
import { GRIMOIRE_ORDERS, spells } from '@/modules/grimoire/schema/spells';
import { A, B, D, asUser } from '../../support/as-user';
import { useTestDatabase } from '../../support/db/database';
import { insertSpell } from '../../support/db/insert-spell';
import { makeSpell } from '../../support/fixtures';
import type { Cursor, PageRequest } from '@/lib/types';

// The cursor-page reader for spells and the tables hung off a spell, `findPageInReadableSpells`. It ANDs `readableSpells` itself, so a page holds only what the direct-id read would return:
// the coven's shared spells and this reader's own private ones (DESIGN.md §5, CLAUDE.md rule 7). Every refusal first proves the row is there and its author pages it.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate spells cascade`;
});

type User = typeof A;

/** By title. A draft may go untitled, and a sort key must be NOT NULL. */
const byTitle: SortPart = {
  expression: sqlExpression`coalesce(${spells.title}, '')`,
  type: 'text',
};

const FIRST_PAGE: PageRequest = { limit: 100, inverted: false };

const proofFor = (user: User, workspaceId: string = WORKSPACE_W_ID): Promise<Membership> =>
  assertMembership(asUser(user), workspaceId, { spell: ['read'] });

const spellBy = (
  author: User,
  title: string,
  visibility: SpellVisibility,
  workspaceId: string = WORKSPACE_W_ID,
): Promise<string> =>
  insertSpell(
    sql,
    makeSpell({ title, visibility, workspaceId, steps: [{ body: `${title}, stirred.` }] }),
    author.id,
  );

const spellPage = async (membership: Membership) =>
  (await findPageInReadableSpells(membership, spells, [byTitle], FIRST_PAGE)).map(
    (entry) => entry.node.title,
  );

const stepPage = async (membership: Membership) =>
  // Every fixture step sits at place 1 of its own spell, so the order is the
  // id's and the bodies are compared as a set.
  (await findPageInReadableSpells(membership, spellSteps, [spellSteps.position], FIRST_PAGE))
    .map((entry) => entry.node.body)
    .sort();

describe('findPageInReadableSpells', () => {
  beforeEach(async () => {
    await spellBy(A, 'Ash Ward', 'workspace');
    await spellBy(A, 'Birch Charm', 'private');
    await spellBy(B, 'Cedar Knot', 'private');
    await spellBy(D, 'Damson Seal', 'workspace', WORKSPACE_X_ID);
  });

  it('pages the coven’s shared spells and the reader’s own private ones, and nothing else', async () => {
    // The precondition: B's private spell and X's shared spell are there, and
    // each is paged by someone the rule admits.
    expect(await spellPage(await proofFor(B))).toEqual(['Ash Ward', 'Cedar Knot']);
    expect(await spellPage(await proofFor(D, WORKSPACE_X_ID))).toEqual(['Damson Seal']);

    expect(await spellPage(await proofFor(A))).toEqual(['Ash Ward', 'Birch Charm']);
  });

  it('pages a spell-scoped table only under the spells the reader may read', async () => {
    expect(await stepPage(await proofFor(B))).toEqual([
      'Ash Ward, stirred.',
      'Cedar Knot, stirred.',
    ]);
    expect(await stepPage(await proofFor(D, WORKSPACE_X_ID))).toEqual(['Damson Seal, stirred.']);

    expect(await stepPage(await proofFor(A))).toEqual([
      'Ash Ward, stirred.',
      'Birch Charm, stirred.',
    ]);
  });

  it('leaves out a soft-deleted spell and a soft-deleted step', async () => {
    const owner = await proofFor(A);
    expect(await spellPage(owner)).toEqual(['Ash Ward', 'Birch Charm']);

    await sql`update spells set deleted_at = now(), deleted_by = ${A.id} where title = 'Ash Ward'`;
    await sql`
      update spell_steps set deleted_at = now(), deleted_by = ${A.id}
      where body = 'Birch Charm, stirred.'`;

    expect(await spellPage(owner)).toEqual(['Birch Charm']);
    expect(await stepPage(owner)).toEqual([]);
  });

  it('continues from a cursor under the same rule', async () => {
    const owner = await proofFor(A);
    const [first, ...rest] = await findPageInReadableSpells(owner, spells, [byTitle], {
      limit: 1,
      inverted: false,
    });
    expect(first.node.title).toBe('Ash Ward');
    expect(rest).toEqual([]);

    const next = await findPageInReadableSpells(owner, spells, [byTitle], {
      limit: 10,
      inverted: false,
      after: first.cursor,
    });
    expect(next.map((entry) => entry.node.title)).toEqual(['Birch Charm']);
  });
});

describe('findGrimoirePage', () => {
  /** Sets spells' stamps with the `updated_at` trigger off so the value holds; one statement, so spells stamped together share `now()` to the microsecond. */
  const stamp = (ids: string | string[], created: string, updated: string) =>
    sql.begin(async (tx) => {
      await tx`alter table spells disable trigger set_updated_at`;
      await tx`
        update spells
        set created_at = now() - ${created}::interval, updated_at = now() - ${updated}::interval
        where id in ${sql([ids].flat())}`;
    });

  /** Three of A's shared spells whose three orders all differ, and B's private one. */
  async function grimoire() {
    const birch = await spellBy(A, 'Birch Charm', 'workspace');
    const alder = await spellBy(A, 'Alder Jar', 'workspace');
    const cedar = await spellBy(A, 'Cedar Knot', 'workspace');
    const hidden = await spellBy(B, 'Ash Ward', 'private');
    // Before the stamps, which the trigger would otherwise overwrite.
    await sql`update spells set status = 'complete' where id in ${sql([birch, cedar])}`;
    await stamp(birch, '4 days', '1 day');
    await stamp(alder, '3 days', '3 days');
    await stamp(cedar, '2 days', '2 days');
    // The precondition: B reads their own spell, which A's pages leave out.
    expect(await findOneSpell(await proofFor(B), hidden)).toMatchObject({ id: hidden });
    return { birch, alder, cedar };
  }

  const pageOf = async (query: GrimoireQuery, page: PageRequest = FIRST_PAGE) =>
    (await findGrimoirePage(await proofFor(A), page, query)).map((entry) => entry.node.id);

  it.each([
    ['UPDATED_DESC', ['birch', 'cedar', 'alder']],
    ['CREATED_DESC', ['cedar', 'alder', 'birch']],
    ['TITLE_ASC', ['alder', 'birch', 'cedar']],
  ] as const)('pages the readable spells in %s order', async (order, expected) => {
    const ids = await grimoire();

    expect(await pageOf({ order })).toEqual(expected.map((name) => ids[name]));
  });

  it('pages an untitled draft after every titled spell under TITLE_ASC', async () => {
    const ids = await grimoire();
    const untitled = await spellBy(A, 'Untitled', 'workspace');
    await sql`update spells set title = null where id = ${untitled}`;
    // The precondition: an untitled title reads as empty text, which would
    // sort before every titled spell without the untitled-last key.
    const [{ title }] = await sql<{ title: string | null }[]>`
      select title from spells where id = ${untitled}`;
    expect(title).toBeNull();

    expect(await pageOf({ order: 'TITLE_ASC' })).toEqual([
      ids.alder,
      ids.birch,
      ids.cedar,
      untitled,
    ]);
  });

  it.each(GRIMOIRE_ORDERS)(
    'pages spells that tie on every %s key once each, by id, one at a time',
    async (order) => {
      const tied: string[] = [];
      for (let i = 0; i < 3; i++) tied.push(await spellBy(A, 'Testing Jar', 'workspace'));
      await stamp(tied, '1 day', '1 day');

      const walked: string[] = [];
      let after: Cursor | undefined;
      for (;;) {
        const [entry, ...rest] = await findGrimoirePage(
          await proofFor(A),
          { limit: 1, inverted: false, after },
          { order },
        );
        expect(rest).toEqual([]);
        if (!entry) break;
        walked.push(entry.node.id);
        after = entry.cursor;
      }

      expect(walked).toEqual(await pageOf({ order }));
      expect(walked).toEqual([...tied].sort());
    },
  );

  it.each([
    ['complete', ['birch', 'cedar']],
    ['draft', ['alder']],
    [undefined, ['birch', 'cedar', 'alder']],
  ] as const)('keeps only the spells of status %s, in SQL', async (status, expected) => {
    const ids = await grimoire();

    expect(await pageOf({ order: 'UPDATED_DESC', status })).toEqual(
      expected.map((name) => ids[name]),
    );
  });
});

describe('findManyInSpells', () => {
  it('reads the rows of every readable spell named, and none of a spell the reader may not read, named by id', async () => {
    const shared = await spellBy(A, 'Ash Ward', 'workspace');
    const own = await spellBy(A, 'Birch Charm', 'private');
    const bPrivate = await spellBy(B, 'Cedar Knot', 'private');
    const elsewhere = await spellBy(D, 'Damson Seal', 'workspace', WORKSPACE_X_ID);
    // The precondition: B reads their own spell's step, D theirs.
    expect(await findManyInSpells(await proofFor(B), spellSteps, [bPrivate])).toHaveLength(1);
    expect(
      await findManyInSpells(await proofFor(D, WORKSPACE_X_ID), spellSteps, [elsewhere]),
    ).toHaveLength(1);

    const rows = await findManyInSpells(await proofFor(A), spellSteps, [
      shared,
      own,
      bPrivate,
      elsewhere,
    ]);

    expect(rows.map((row) => row.spellId).sort()).toEqual([shared, own].sort());
  });

  it('reads nothing for no ids', async () => {
    expect(await findManyInSpells(await proofFor(A), spellSteps, [])).toEqual([]);
  });
});

describe('the grimoire search and category filter', () => {
  /** A spell with an intent and assigned categories, by name. */
  const spellWith = (
    author: User,
    title: string,
    { intent = null, categories = [], visibility = 'workspace' as SpellVisibility } = {} as {
      intent?: string | null;
      categories?: string[];
      visibility?: SpellVisibility;
    },
  ) =>
    insertSpell(
      sql,
      makeSpell({ title, intent, categories, visibility, workspaceId: WORKSPACE_W_ID }),
      author.id,
    );

  const categoryId = async (name: string): Promise<string> => {
    const [row] = await sql<{ id: string }[]>`
      select id from categories where name = ${name} and deleted_at is null`;
    return row.id;
  };

  const idsOf = async (user: User, query: GrimoireQuery) =>
    (await findGrimoirePage(await proofFor(user), FIRST_PAGE, query))
      .map((entry) => entry.node.id)
      .sort();

  const countOf = async (user: User, query: GrimoireQuery) =>
    (await findGrimoireCount(await proofFor(user), query, undefined)).totalCount;

  /** A's shared spells and B's private one, which matches every search below. */
  async function grimoire() {
    const hearth = await spellWith(A, 'Hearth Charm', { categories: ['Protection'] });
    const calm = await spellWith(A, 'Moon Jar', {
      intent: 'To keep the hearth calm',
      categories: ['Cleansing'],
    });
    const birch = await spellWith(A, 'Birch Knot', { categories: ['Cleansing', 'Protection'] });
    const hidden = await spellWith(B, 'Hearth Ward', {
      intent: 'A hearth of my own',
      categories: ['Cleansing', 'Protection'],
      visibility: 'private',
    });
    return { hearth, calm, birch, hidden };
  }

  it('keeps the spells whose title or intent matches the search, and never another member’s private one', async () => {
    const ids = await grimoire();
    // The precondition: B's own private spell matches the same search.
    expect(await idsOf(B, { order: 'UPDATED_DESC', query: 'hearth' })).toContain(ids.hidden);

    expect(await idsOf(A, { order: 'UPDATED_DESC', query: 'hearth' })).toEqual(
      [ids.hearth, ids.calm].sort(),
    );
    expect(await countOf(A, { order: 'UPDATED_DESC', query: 'hearth' })).toBe(2);
  });

  it('ranks a search best match first, whatever the chosen order, and counts before a cursor in that rank', async () => {
    // Written oldest first, so newest first would list them in reverse.
    const inIntent = await spellWith(A, 'Moon Jar', { intent: 'To keep the hearth calm' });
    const later = await spellWith(A, 'Old Hearth');
    const early = await spellWith(A, 'Hearth Charm');
    const ranked = async (order: GrimoireQuery['order']) =>
      (await findGrimoirePage(await proofFor(A), FIRST_PAGE, { order, query: 'hearth' })).map(
        (entry) => entry.node.id,
      );
    // Why the order is the rank's: without a search, newest first lists them the other way.
    expect(
      (await findGrimoirePage(await proofFor(A), FIRST_PAGE, { order: 'CREATED_DESC' })).map(
        (entry) => entry.node.id,
      ),
    ).toEqual([early, later, inIntent]);

    // A title outranks an intent; between two titles, the earlier hit leads.
    for (const order of ['CREATED_DESC', 'TITLE_ASC'] as const) {
      expect(await ranked(order)).toEqual([early, later, inIntent]);
    }
    const page = await findGrimoirePage(await proofFor(A), FIRST_PAGE, {
      order: 'CREATED_DESC',
      query: 'hearth',
    });
    await expect(
      findGrimoireCount(
        await proofFor(A),
        { order: 'CREATED_DESC', query: 'hearth' },
        page[2].cursor,
      ),
    ).resolves.toEqual({ totalCount: 3, countBefore: 2 });
  });

  it('folds accents and case as the ingredient search does', async () => {
    const ids = await grimoire();

    expect(await idsOf(A, { order: 'UPDATED_DESC', query: 'HÉARTH' })).toEqual(
      [ids.hearth, ids.calm].sort(),
    );
  });

  it('keeps the spells in every chosen category, or in any with the any mode', async () => {
    const ids = await grimoire();
    const [cleansing, protection] = await Promise.all([
      categoryId('Cleansing'),
      categoryId('Protection'),
    ]);
    const both = [cleansing, protection];

    expect(await idsOf(A, { order: 'UPDATED_DESC', categoryIds: [cleansing] })).toEqual(
      [ids.calm, ids.birch].sort(),
    );
    expect(await idsOf(A, { order: 'UPDATED_DESC', categoryIds: both })).toEqual([ids.birch]);
    expect(
      await idsOf(A, { order: 'UPDATED_DESC', categoryIds: both, categoryMode: 'any' }),
    ).toEqual([ids.hearth, ids.calm, ids.birch].sort());
    // The precondition for the count: B's private spell is in both, and B counts it.
    expect(await countOf(B, { order: 'UPDATED_DESC', categoryIds: both })).toBe(2);
    expect(await countOf(A, { order: 'UPDATED_DESC', categoryIds: both })).toBe(1);
  });

  it('combines the search with the category and status filters rather than replacing them', async () => {
    const ids = await grimoire();
    await sql`update spells set status = 'complete' where id = ${ids.calm}`;
    const cleansing = await categoryId('Cleansing');

    expect(
      await idsOf(A, { order: 'UPDATED_DESC', query: 'hearth', categoryIds: [cleansing] }),
    ).toEqual([ids.calm]);
    expect(await idsOf(A, { order: 'UPDATED_DESC', query: 'hearth', status: 'draft' })).toEqual([
      ids.hearth,
    ]);
    expect(
      await countOf(A, {
        order: 'UPDATED_DESC',
        query: 'hearth',
        categoryIds: [cleansing],
        status: 'draft',
      }),
    ).toBe(0);
  });

  it('counts the spells before a cursor, as a numbered pager reads them', async () => {
    await grimoire();
    const membership = await proofFor(A);
    const query: GrimoireQuery = { order: 'TITLE_ASC' };
    const [, second] = await findGrimoirePage(membership, FIRST_PAGE, query);

    expect(await findGrimoireCount(membership, query, second.cursor)).toEqual({
      totalCount: 3,
      countBefore: 1,
    });
  });

  /** Each category's count, keyed by its id, as the Categories filter reads it. */
  const categoryCountsOf = async (user: User, query: GrimoireQuery) =>
    Object.fromEntries(
      (await findGrimoireCategoryCounts(await proofFor(user), query)).map(({ value, count }) => [
        value,
        count,
      ]),
    );

  it('counts the spells in each category the reader can read, and never another member’s private one', async () => {
    await grimoire();
    const [cleansing, protection] = await Promise.all([
      categoryId('Cleansing'),
      categoryId('Protection'),
    ]);
    // The precondition: B's private spell carries both categories, and B counts it.
    expect(await categoryCountsOf(B, { order: 'UPDATED_DESC' })).toEqual({
      [cleansing]: 3,
      [protection]: 3,
    });

    expect(await categoryCountsOf(A, { order: 'UPDATED_DESC' })).toEqual({
      [cleansing]: 2,
      [protection]: 2,
    });
  });

  it('counts each category under the tab’s status and the search', async () => {
    const ids = await grimoire();
    await sql`update spells set status = 'complete' where id = ${ids.calm}`;
    const [cleansing, protection] = await Promise.all([
      categoryId('Cleansing'),
      categoryId('Protection'),
    ]);

    expect(await categoryCountsOf(A, { order: 'UPDATED_DESC', query: 'hearth' })).toEqual({
      [cleansing]: 1,
      [protection]: 1,
    });
    expect(
      await categoryCountsOf(A, { order: 'UPDATED_DESC', query: 'hearth', status: 'complete' }),
    ).toEqual({ [cleansing]: 1 });
  });

  it('keeps the chosen categories in force under all, and sets them aside under any', async () => {
    await grimoire();
    const [cleansing, protection] = await Promise.all([
      categoryId('Cleansing'),
      categoryId('Protection'),
    ]);
    const chosen: GrimoireQuery = { order: 'UPDATED_DESC', categoryIds: [cleansing] };

    expect(await categoryCountsOf(A, chosen)).toEqual({ [cleansing]: 2, [protection]: 1 });
    expect(await categoryCountsOf(A, { ...chosen, categoryMode: 'any' })).toEqual({
      [cleansing]: 2,
      [protection]: 2,
    });
  });
});

describe('the grimoire facets', () => {
  /** A spell of W by `author`, with the facet fields written as given. */
  const made = (
    author: User,
    title: string,
    fields: Partial<Parameters<typeof makeSpell>[0]>,
    workspaceId: string = WORKSPACE_W_ID,
  ): Promise<string> =>
    insertSpell(
      sql,
      makeSpell({ title, workspaceId, steps: [{ body: 'Stir.' }], ...fields }),
      author.id,
    );

  const NEWEST: GrimoireQuery = { order: 'UPDATED_DESC' };

  const facetsOf = async (user: User, query: GrimoireQuery = NEWEST) => {
    const counts = await findGrimoireFacetCounts(await proofFor(user), query);
    const byValue = (rows: { value: string; count: number }[]) =>
      Object.fromEntries(rows.map(({ value, count }) => [value, count]));
    return {
      moonPhases: byValue(counts.moonPhases),
      daysOfWeek: byValue(counts.daysOfWeek),
      visibilities: byValue(counts.visibilities),
      makers: byValue(counts.makers),
    };
  };

  const titlesOf = async (user: User, query: GrimoireQuery) =>
    (await findGrimoirePage(await proofFor(user), FIRST_PAGE, query))
      .map(({ node }) => node.title)
      .sort();

  it('folds a moon phase and a day by trim and case, names the group by its most-used spelling, and skips blanks', async () => {
    await made(A, 'One', { moonPhase: 'Full Moon', dayOfWeek: 'Friday' });
    await made(A, 'Two', { moonPhase: ' full moon ', dayOfWeek: 'FRIDAY' });
    await made(B, 'Three', { moonPhase: 'Full Moon', dayOfWeek: 'friday' });
    await made(B, 'Four', { moonPhase: '  ', dayOfWeek: null });

    const { moonPhases, daysOfWeek } = await facetsOf(A);

    expect(moonPhases).toEqual({ 'Full Moon': 3 });
    expect(Object.values(daysOfWeek)).toEqual([3]);
    expect(await titlesOf(A, { ...NEWEST, moonPhases: ['FULL moon'] })).toEqual([
      'One',
      'Three',
      'Two',
    ]);
  });

  it('never suggests, counts or lists another member’s private spell', async () => {
    await made(B, 'Shared', {
      moonPhase: 'Full Moon',
      dayOfWeek: 'Friday',
      visibility: 'workspace',
    });
    await made(B, 'Hidden', {
      moonPhase: 'Waning Crescent',
      dayOfWeek: 'Monday',
      visibility: 'private',
    });
    // The precondition: B's private spell carries the values, and B is offered them.
    expect(await facetsOf(B)).toMatchObject({
      moonPhases: { 'Full Moon': 1, 'Waning Crescent': 1 },
      daysOfWeek: { Friday: 1, Monday: 1 },
      visibilities: { private: 1, workspace: 1 },
    });

    expect(await facetsOf(A)).toEqual({
      moonPhases: { 'Full Moon': 1 },
      daysOfWeek: { Friday: 1 },
      visibilities: { workspace: 1 },
      makers: { [B.id]: 1 },
    });
    // Direct: asking for the private spell's own values lists nothing for A, and it for B.
    expect(await titlesOf(A, { ...NEWEST, moonPhases: ['Waning Crescent'] })).toEqual([]);
    expect(await titlesOf(A, { ...NEWEST, visibilities: ['private'] })).toEqual([]);
    expect(await titlesOf(B, { ...NEWEST, visibilities: ['private'] })).toEqual(['Hidden']);
  });

  it('counts a viewer’s Private as their own private spells only', async () => {
    await made(A, 'Mine', { visibility: 'private' });
    await made(B, 'Theirs', { visibility: 'private' });
    await made(B, 'Ours', { visibility: 'workspace' });

    expect((await facetsOf(A)).visibilities).toEqual({ private: 1, workspace: 1 });
    expect((await facetsOf(B)).visibilities).toEqual({ private: 1, workspace: 1 });
    expect(await titlesOf(A, { ...NEWEST, visibilities: ['private'] })).toEqual(['Mine']);
  });

  it('ORs the picks within a facet and ANDs the facets, each facet’s counts dropping its own picks', async () => {
    await made(A, 'FullFri', { moonPhase: 'Full Moon', dayOfWeek: 'Friday' });
    await made(A, 'FullMon', { moonPhase: 'Full Moon', dayOfWeek: 'Monday' });
    await made(A, 'NewFri', { moonPhase: 'New Moon', dayOfWeek: 'Friday' });
    await made(A, 'NewMon', { moonPhase: 'New Moon', dayOfWeek: 'Monday' });

    expect(
      await titlesOf(A, {
        ...NEWEST,
        moonPhases: ['Full Moon', 'New Moon'],
        daysOfWeek: ['Friday'],
      }),
    ).toEqual(['FullFri', 'NewFri']);

    const counts = await facetsOf(A, {
      ...NEWEST,
      moonPhases: ['Full Moon'],
      daysOfWeek: ['Friday'],
    });
    // Moon phases ignore the moon pick and keep the day; days the reverse.
    expect(counts.moonPhases).toEqual({ 'Full Moon': 1, 'New Moon': 1 });
    expect(counts.daysOfWeek).toEqual({ Friday: 1, Monday: 1 });
    expect(counts.visibilities).toEqual({ workspace: 1 });
  });

  it('keeps the status and the search in force in every facet’s counts', async () => {
    await made(A, 'Hearth Working', { moonPhase: 'Full Moon', status: 'complete' });
    await made(A, 'Hearth Draft', { moonPhase: 'New Moon', status: 'draft' });
    await made(A, 'Unrelated', { moonPhase: 'Waxing Moon', status: 'complete' });

    expect(
      (await facetsOf(A, { ...NEWEST, status: 'complete', query: 'hearth' })).moonPhases,
    ).toEqual({
      'Full Moon': 1,
    });
  });

  it('filters by the maker, not the last editor, and a pick of a stranger lists nothing', async () => {
    const id = await made(A, 'By A', {});
    await made(B, 'By B', {});
    await sql`update spells set updated_by = ${B.id} where id = ${id}`;

    expect(await titlesOf(A, { ...NEWEST, makerIds: [A.id] })).toEqual(['By A']);
    expect(await titlesOf(A, { ...NEWEST, makerIds: [B.id] })).toEqual(['By B']);
    expect((await facetsOf(A)).makers).toEqual({ [A.id]: 1, [B.id]: 1 });
    // D sits in X only, and made a spell there: a pick of D in W lists nothing.
    await made(D, 'In X', {}, WORKSPACE_X_ID);
    expect(await titlesOf(A, { ...NEWEST, makerIds: [D.id] })).toEqual([]);
  });

  it('offers a maker who no longer holds a seat, since it reads spells and not seats', async () => {
    await made(B, 'Left Behind', {});
    await sql`update workspace_members set deleted_at = now() where user_id = ${B.id} and workspace_id = ${WORKSPACE_W_ID}`;

    expect((await facetsOf(A)).makers).toEqual({ [B.id]: 1 });
  });

  it('suggests and counts nothing from another coven', async () => {
    await made(
      D,
      'In X',
      { moonPhase: 'Blood Moon', dayOfWeek: 'Sunday', visibility: 'workspace' },
      WORKSPACE_X_ID,
    );
    await made(B, 'In W', { moonPhase: 'Full Moon' });
    // The precondition: X's own member is offered the value.

    const counts = await findGrimoireFacetCounts(await proofFor(D, WORKSPACE_X_ID), NEWEST);
    expect(counts.moonPhases).toEqual([{ value: 'Blood Moon', count: 1 }]);
    const inW = await facetsOf(A);
    expect(inW.moonPhases).toEqual({ 'Full Moon': 1 });
    expect(inW.daysOfWeek).toEqual({});
    expect(inW.makers).toEqual({ [B.id]: 1 });
  });
});
