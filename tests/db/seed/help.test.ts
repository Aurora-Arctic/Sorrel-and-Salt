import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { loadHelpArticles, seedHelp } from '@/db/seed/help';
import type { SeedHelpArticle } from '@/db/seed/types';
import { slugify } from '@/lib/slugify';
import { E } from '../../support/as-user';

// What running the help seed writes: each entry as a row keyed on its `seed_key`, its slug derived from its title, a sub page linked
// to its parent by the parent's key. A re-run restates a row no person has touched and leaves one a keeper edited or deleted as
// the keeper left it. The shape every seed shares (stamps, idempotency, no resurrection, the dry run) is index.test.ts's; which
// rows the shipped list holds is help-list.test.ts's.

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);
});

afterAll(async () => {
  await sql.end();
});

beforeEach(async () => {
  await sql`truncate help_articles cascade`;
});

const GUIDE: SeedHelpArticle = {
  seedKey: 'fixture-guide',
  kind: 'article',
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
  created_by: string;
  updated_by: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Every row, live or deleted, with its parent's `seed_key`, in key order. */
async function rows(): Promise<HelpRow[]> {
  const found = await sql<HelpRow[]>`
    select a.id, a.seed_key, a.kind::text as kind, a.audience::text as audience, a.title, a.slug, a.summary, a.body,
           a.position, p.seed_key as parent_key, a.parent_id, a.created_by, a.updated_by,
           a.updated_at::text as updated_at, a.deleted_at::text as deleted_at
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
