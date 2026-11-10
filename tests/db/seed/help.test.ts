import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { loadHelpArticles, seedHelp } from '@/db/seed/help';
import type { SeedHelpArticle } from '@/db/seed/types';
import { slugify } from '@/lib/slugify';
import { E } from '../../support/as-user';
import { insertHelpArticle } from '../../support/db/insert-help-article';
import { useTestDatabase } from '../../support/db/database';

// What running the help seed writes: each entry as a row keyed on its `seed_key`, its slug derived from its title, a sub page linked
// to its parent by the parent's key. A re-run restates a row no person has touched and leaves one a keeper edited or deleted as
// the keeper left it. The shape every seed shares (stamps, idempotency, no resurrection, the dry run) is index.test.ts's; which
// rows the shipped list holds is help-list.test.ts's.

let sql: ReturnType<typeof postgres>;

useTestDatabase((client) => {
  sql = client;
});

let db: ReturnType<typeof drizzle>;

beforeAll(() => {
  db = drizzle(sql);
});

beforeEach(async () => {
  await sql`truncate help_articles cascade`;
});

const GUIDE: SeedHelpArticle = {
  seedKey: 'fixture-guide',
  kind: 'guide',
  audience: 'public',
  title: 'Testwort Guide',
  summary: 'What the Testwort guide covers.',
  body: 'How the Testwort guide reads.',
  position: null,
  parent: null,
};

const DETAIL: SeedHelpArticle = {
  seedKey: 'fixture-guide-detail',
  kind: 'article',
  audience: 'staff',
  title: 'Testwort Guide Detail',
  summary: 'What the detail covers.',
  body: 'How the detail reads.',
  position: null,
  parent: 'fixture-guide',
};

const QUESTION: SeedHelpArticle = {
  seedKey: 'fixture-question',
  kind: 'faq',
  audience: 'public',
  title: 'Is Testwort a Question?',
  summary: null,
  body: 'Testwort is an answer.',
  position: 1,
  parent: null,
};

const TERM: SeedHelpArticle = {
  seedKey: 'fixture-term',
  kind: 'term',
  audience: 'public',
  title: 'Testwort',
  summary: null,
  body: 'A fixture word.',
  position: null,
  parent: null,
};

interface HelpRow {
  id: string;
  seed_key: string | null;
  kind: string;
  audience: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  position: number | null;
  parent_key: string | null;
  parent_id: string | null;
  shown: boolean;
  created_by: string;
  updated_by: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

/** Every row, live or deleted, with its parent's `seed_key`, in key order. */
async function rows(): Promise<HelpRow[]> {
  const found = await sql<HelpRow[]>`
    select a.id, a.seed_key, a.kind::text as kind, a.audience::text as audience, a.title, a.slug, a.summary, a.body,
           a.position, p.seed_key as parent_key, a.parent_id, a.shown, a.created_by, a.updated_by,
           a.updated_at::text as updated_at, a.deleted_at::text as deleted_at, a.deleted_by
    from help_articles a left join help_articles p on p.id = a.parent_id`;
  // Sorted by code point here, since a collation may ignore the hyphens that tell the keys apart.
  const key = (row: HelpRow) => row.seed_key ?? '';
  return [...found].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
}

async function rowOf(seedKey: string): Promise<HelpRow> {
  const found = (await rows()).find((row) => row.seed_key === seedKey);
  if (!found) throw new Error(`no row has seed_key ${seedKey}`);
  return found;
}

/** The columns the seed writes, as the row should hold them for `entry`. */
function written(entry: SeedHelpArticle) {
  return {
    seed_key: entry.seedKey,
    kind: entry.kind,
    audience: entry.audience,
    title: entry.title,
    slug: slugify(entry.title),
    summary: entry.summary,
    body: entry.body,
    position: entry.position,
    parent_key: entry.parent,
  };
}

describe('seedHelp', () => {
  it('writes each entry as a row, its slug from its title and a sub page linked to its parent', async () => {
    await seedHelp(db, { articles: [GUIDE, DETAIL, QUESTION, TERM] });

    const after = await rows();
    expect(after).toMatchObject([GUIDE, DETAIL, QUESTION, TERM].map(written));
    expect(after.every((row) => row.deleted_at === null)).toBe(true);
  });

  it('links a sub page added on a later run to the parent an earlier run wrote', async () => {
    await seedHelp(db, { articles: [GUIDE] });
    const parent = await rowOf(GUIDE.seedKey);

    await seedHelp(db, { articles: [GUIDE, DETAIL] });

    expect((await rowOf(DETAIL.seedKey)).parent_id).toBe(parent.id);
    expect(await rows()).toHaveLength(2);
  });

  it('restates a row no person has touched to the seed’s new text, keeping its id and its bootstrap stamps', async () => {
    await seedHelp(db, { articles: [GUIDE, QUESTION] });
    const before = await rowOf(GUIDE.seedKey);
    // Precondition: the landed row is the seed's own, so restating it is not overwriting a person's work.
    expect(before).toMatchObject({ created_by: BOOTSTRAP_USER_ID, updated_by: BOOTSTRAP_USER_ID });

    const revised: SeedHelpArticle = {
      ...GUIDE,
      audience: 'staff',
      title: 'Testwort Handbook',
      summary: 'What the Testwort handbook covers.',
      body: 'How the Testwort handbook reads.',
    };
    await seedHelp(db, { articles: [revised, QUESTION] });

    const after = await rowOf(GUIDE.seedKey);
    expect(after).toMatchObject({
      ...written(revised),
      id: before.id,
      created_by: BOOTSTRAP_USER_ID,
      updated_by: BOOTSTRAP_USER_ID,
    });
    expect(await rows()).toHaveLength(2);
  });

  it('leaves a row a keeper edited as the keeper wrote it, while restating the untouched row beside it', async () => {
    await seedHelp(db, { articles: [GUIDE, QUESTION] });
    await sql`
      update help_articles set body = 'The keeper’s own Testwort text.', updated_by = ${E.id}
      where seed_key = ${GUIDE.seedKey}`;
    const edited = await rowOf(GUIDE.seedKey);
    // Precondition: the edit landed as the keeper's, so the row reads as touched.
    expect(edited.updated_by).toBe(E.id);

    const revisedGuide: SeedHelpArticle = { ...GUIDE, body: 'The seed’s revised guide.' };
    const revisedQuestion: SeedHelpArticle = { ...QUESTION, body: 'The seed’s revised answer.' };
    // Precondition: the seed now differs from the keeper's row, so an unchanged row is the seed leaving it.
    expect(revisedGuide.body).not.toBe(edited.body);

    await seedHelp(db, { articles: [revisedGuide, revisedQuestion] });

    expect(await rowOf(GUIDE.seedKey)).toEqual(edited);
    expect(await rowOf(QUESTION.seedKey)).toMatchObject(written(revisedQuestion));
  });

  it('leaves a row a keeper hid hidden, and a sub page a keeper moved to the top level where the keeper put it', async () => {
    await seedHelp(db, { articles: [GUIDE, DETAIL, QUESTION] });
    // As setHelpArticleShown and a parent's childIds save write them: the flag or the place, stamped as the keeper.
    await sql`
      update help_articles set shown = false, updated_by = ${E.id}
      where seed_key = ${QUESTION.seedKey}`;
    await sql`
      update help_articles set parent_id = null, position = 9, updated_by = ${E.id}
      where seed_key = ${DETAIL.seedKey}`;
    const hidden = await rowOf(QUESTION.seedKey);
    const moved = await rowOf(DETAIL.seedKey);
    // Preconditions: the seed's list still says shown and still puts the sub page under the guide.
    expect(hidden.shown).toBe(false);
    expect(moved.parent_id).toBeNull();

    await seedHelp(db, { articles: [GUIDE, DETAIL, QUESTION] });

    expect(await rowOf(QUESTION.seedKey)).toEqual(hidden);
    expect(await rowOf(DETAIL.seedKey)).toEqual(moved);
  });

  it('leaves a row a keeper deleted deleted, and writes no second row for its key', async () => {
    await seedHelp(db, { articles: [GUIDE, QUESTION] });
    await sql`
      update help_articles set deleted_at = now(), deleted_by = ${E.id}
      where seed_key = ${QUESTION.seedKey}`;
    const deleted = await rowOf(QUESTION.seedKey);
    expect(deleted.deleted_at).not.toBeNull();

    await seedHelp(db, {
      articles: [GUIDE, { ...QUESTION, body: 'The seed’s revised answer.' }],
    });

    expect(await rowOf(QUESTION.seedKey)).toEqual(deleted);
    expect(await rows()).toHaveLength(2);
  });

  // The slug rules read the real list, since they are about the addresses the shipped rows take.
  it('gives every shipped row a slug slugify would write, none of them reserved, each the slug of its own title', async () => {
    await seedHelp(db);

    const after = await rows();
    // Precondition: the shipped list landed, so the sweeps below have rows to read.
    expect(after.length).toBe(loadHelpArticles().length);
    expect(after.length).toBeGreaterThan(0);

    for (const row of after) {
      expect(slugify(row.slug), row.title).toBe(row.slug);
      expect(['glossary', 'staff', 'search'], row.title).not.toContain(row.slug);
      // A slug is unique within its kind, so an article and a term may share one; a term's is its anchor on /help/glossary.
      expect(row.slug, row.title).toBe(slugify(row.title));
    }
  });
});

// A guide is a kind of its own; the seed is where an existing top-level article holding sub pages becomes one, as a migration
// cannot use an enum value in the transaction that adds it (src/db/migrations/0140_help-guide-kind.sql).
describe('seedHelp and guides', () => {
  const kindOf = async (id: string) => {
    const [row] =
      await sql`select kind::text as kind, body, updated_by from help_articles where id = ${id}`;
    return row;
  };

  it('makes every live top-level article holding a live sub page a guide, changing nothing else, even on a row a keeper wrote', async () => {
    const holder = await insertHelpArticle(
      sql,
      { title: 'Testwort Holder', body: 'The keeper’s own words.' },
      E.id,
    );
    await insertHelpArticle(sql, { title: 'Testwort Held', parent_id: holder, position: 1 }, E.id);
    const lone = await insertHelpArticle(sql, { title: 'Testwort Lone' }, E.id);
    const emptied = await insertHelpArticle(sql, { title: 'Testwort Emptied' }, E.id);
    const gone = await insertHelpArticle(
      sql,
      { title: 'Testwort Gone', parent_id: emptied, position: 1 },
      E.id,
    );
    await sql`update help_articles set deleted_at = now(), deleted_by = ${E.id} where id = ${gone}`;
    // Precondition: each is an article before the seed runs, and the holder reads as a keeper's.
    expect(await kindOf(holder)).toMatchObject({ kind: 'article', updated_by: E.id });

    await seedHelp(db, { articles: [QUESTION] });

    expect(await kindOf(holder)).toEqual({
      kind: 'guide',
      body: 'The keeper’s own words.',
      updated_by: E.id,
    });
    expect((await kindOf(lone)).kind).toBe('article');
    expect((await kindOf(emptied)).kind).toBe('article');
  });

  it('refuses a list whose sub page hangs beneath an entry that is not a guide', async () => {
    const plain: SeedHelpArticle = { ...GUIDE, kind: 'article' };

    await expect(seedHelp(db, { articles: [plain, DETAIL] })).rejects.toThrow(/not a guide/);
    // Precondition: the same list with its parent a guide seeds.
    await expect(seedHelp(db, { articles: [GUIDE, DETAIL] })).resolves.toBeDefined();
  });

  it('ships every entry holding sub pages as a guide, and every sub page as an article', async () => {
    const shipped = loadHelpArticles();
    const parents = new Set(shipped.flatMap((entry) => (entry.parent ? [entry.parent] : [])));
    // Precondition: the shipped list has sub pages, so the sweep reads something.
    expect(parents.size).toBeGreaterThan(0);

    for (const entry of shipped) {
      if (parents.has(entry.seedKey)) expect(entry.kind, entry.title).toBe('guide');
      if (entry.parent) expect(entry.kind, entry.title).toBe('article');
      if (entry.kind === 'guide') expect(entry.parent, entry.title).toBeNull();
    }
  });
});

// An entry dropped from the list is retired: soft-deleted by the seed when only the seed ever wrote it, and kept, with the
// reason printed, when a person edited it or a live sub page still hangs beneath it.
describe('seedHelp retiring entries the list no longer holds', () => {
  /** Asserts the row is the seed's own: written and last changed by the bootstrap user, and live. */
  async function expectSeedOnly(seedKey: string): Promise<HelpRow> {
    const row = await rowOf(seedKey);
    expect(row).toMatchObject({
      created_by: BOOTSTRAP_USER_ID,
      updated_by: BOOTSTRAP_USER_ID,
      deleted_at: null,
    });
    return row;
  }

  it('soft-deletes a seed-only row dropped from the list, stamped as the bootstrap user', async () => {
    await seedHelp(db, { articles: [GUIDE, QUESTION] });
    const before = await expectSeedOnly(QUESTION.seedKey);

    await seedHelp(db, { articles: [GUIDE] });

    const after = await rowOf(QUESTION.seedKey);
    expect(after.id).toBe(before.id);
    expect(after.deleted_at).not.toBeNull();
    expect(after.deleted_by).toBe(BOOTSTRAP_USER_ID);
    expect((await rowOf(GUIDE.seedKey)).deleted_at).toBeNull();
  });

  it('prints a RETIRED line for each row it retires and none for an entry still in the list', async () => {
    await seedHelp(db, { articles: [GUIDE, QUESTION, TERM] });
    await expectSeedOnly(QUESTION.seedKey);
    await expectSeedOnly(TERM.seedKey);

    const lines = await seedHelp(db, { articles: [GUIDE] });

    expect([...lines].sort()).toEqual([`RETIRED ${QUESTION.seedKey}`, `RETIRED ${TERM.seedKey}`]);
  });

  it('keeps a row a keeper edited when the list drops it, and prints why', async () => {
    await seedHelp(db, { articles: [GUIDE, QUESTION] });
    await sql`
      update help_articles set body = 'The keeper’s own Testwort answer.', updated_by = ${E.id}
      where seed_key = ${QUESTION.seedKey}`;
    const edited = await rowOf(QUESTION.seedKey);
    // Precondition: the edit landed as the keeper's, so the row reads as a person's work.
    expect(edited).toMatchObject({ updated_by: E.id, deleted_at: null });

    const lines = await seedHelp(db, { articles: [GUIDE] });

    expect(await rowOf(QUESTION.seedKey)).toEqual(edited);
    expect(lines).toEqual([`KEPT ${QUESTION.seedKey}: edited by a person`]);
  });

  it('keeps a seed-only parent the list drops while a sub page still in the list hangs beneath it, and prints why', async () => {
    await seedHelp(db, { articles: [GUIDE, DETAIL] });
    const parent = await expectSeedOnly(GUIDE.seedKey);
    // Precondition: the sub page is live and linked to the parent, so retiring the parent would orphan it.
    expect(await rowOf(DETAIL.seedKey)).toMatchObject({ parent_id: parent.id, deleted_at: null });

    const lines = await seedHelp(db, { articles: [DETAIL] });

    expect((await rowOf(GUIDE.seedKey)).deleted_at).toBeNull();
    expect((await rowOf(DETAIL.seedKey)).deleted_at).toBeNull();
    expect(lines).toEqual([`KEPT ${GUIDE.seedKey}: has live sub pages`]);
  });

  it('retires a dropped parent together with its dropped sub page, the sub page first', async () => {
    await seedHelp(db, { articles: [GUIDE, DETAIL, QUESTION] });
    const parent = await expectSeedOnly(GUIDE.seedKey);
    await expectSeedOnly(DETAIL.seedKey);
    expect((await rowOf(DETAIL.seedKey)).parent_id).toBe(parent.id);

    const lines = await seedHelp(db, { articles: [QUESTION] });

    expect((await rowOf(GUIDE.seedKey)).deleted_at).not.toBeNull();
    expect((await rowOf(DETAIL.seedKey)).deleted_at).not.toBeNull();
    expect(lines).toEqual([`RETIRED ${DETAIL.seedKey}`, `RETIRED ${GUIDE.seedKey}`]);
  });

  it('revives a row the seed retired when its entry comes back into the list, with the list’s text', async () => {
    await seedHelp(db, { articles: [GUIDE, QUESTION] });
    await seedHelp(db, { articles: [GUIDE] });
    const retired = await rowOf(QUESTION.seedKey);
    // Precondition: the seed itself retired the row, so no person chose to delete it.
    expect(retired.deleted_at).not.toBeNull();
    expect(retired.deleted_by).toBe(BOOTSTRAP_USER_ID);

    const returning: SeedHelpArticle = { ...QUESTION, body: 'The seed’s returning answer.' };
    await seedHelp(db, { articles: [GUIDE, returning] });

    expect(await rowOf(QUESTION.seedKey)).toMatchObject({
      ...written(returning),
      id: retired.id,
      deleted_at: null,
      deleted_by: null,
    });
    expect(await rows()).toHaveLength(2);
  });

  it('on a dry run prints the same lines and writes nothing', async () => {
    await seedHelp(db, { articles: [GUIDE, QUESTION, TERM] });
    await sql`
      update help_articles set body = 'The keeper’s own Testwort word.', updated_by = ${E.id}
      where seed_key = ${TERM.seedKey}`;
    await expectSeedOnly(QUESTION.seedKey);
    const before = await rows();

    const lines = await seedHelp(db, { articles: [GUIDE], dryRun: true });

    expect([...lines].sort()).toEqual([
      `KEPT ${TERM.seedKey}: edited by a person`,
      `RETIRED ${QUESTION.seedKey}`,
    ]);
    expect(await rows()).toEqual(before);
  });

  it('lets an entry moved to a new seed_key under the same title take the retired row’s slug', async () => {
    await seedHelp(db, { articles: [GUIDE] });
    const old = await expectSeedOnly(GUIDE.seedKey);
    const moved: SeedHelpArticle = { ...GUIDE, seedKey: 'fixture-guide-moved' };
    // Precondition: the new entry wants the very slug the old row holds, so inserting first would collide.
    expect(slugify(moved.title)).toBe(old.slug);

    const lines = await seedHelp(db, { articles: [moved] });

    expect((await rowOf(GUIDE.seedKey)).deleted_at).not.toBeNull();
    expect(await rowOf(moved.seedKey)).toMatchObject({ ...written(moved), deleted_at: null });
    expect(lines).toEqual([`RETIRED ${GUIDE.seedKey}`]);
  });
});
