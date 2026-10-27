import { beforeEach, describe, expect, it } from 'vitest';
import { sql as sqlExpression } from 'drizzle-orm';
import type postgres from 'postgres';
import {
  findGrimoireCount,
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

// M10.9: the cursor-page reader for spells and the tables hung off a spell,
// `findPageInReadableSpells`. It ANDs `readableSpells` (M10.6) itself, so a
// page can only ever hold what the direct-id read would return: the coven's
// shared spells and this reader's own private ones (DESIGN.md §5, CLAUDE.md
// rule 7). Every refusal first proves the row is there and its author pages it.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate spells cascade`;
});

type User = typeof A;

/** By title. A draft may go untitled (M13.15), and a sort key must be NOT NULL. */
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
  (await findPageInReadableSpells(membership, spellSteps, [spellSteps.layerOrder], FIRST_PAGE))
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
  /**
   * Sets spells' stamps, the `updated_at` trigger off so the value holds. One
   * statement, so spells stamped together share `now()` to the microsecond.
   */
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

describe('the grimoire search and category filter (M10.11)', () => {
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
});
