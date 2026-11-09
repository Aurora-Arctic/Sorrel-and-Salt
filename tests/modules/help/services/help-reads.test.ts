import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, NotFound } from '@/lib/errors';
import type { PageEntry, PageRequest } from '@/lib/types';
import {
  listHelpArticlePaths,
  listStaffHelpArticles,
  readHelpArticle,
  readHelpArticleIndex,
  readHelpFaq,
  readHelpGlossary,
  readStaffHelpArticle,
} from '@/modules/help';
import { assertCurator } from '@/modules/identity';
import { B, C, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertHelpArticle } from '../../../support/db/insert-help-article';
import { clearDataCache } from '../../../support/next-data-cache';

// The public reads are cached; the data cache is emptied before each test so each one reads the rows it wrote.
vi.mock('next/cache', () => import('../../../support/next-data-cache'));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const PAGE: PageRequest = { limit: 101, inverted: false };
const GONE = new Date('2026-01-02T00:00:00Z');

/** Walks every page of `read`, `size` rows at a time, so a list read whole and read by cursor can be compared. */
async function walk<T>(
  read: (page: PageRequest) => Promise<PageEntry<T>[]>,
  size: number,
): Promise<{ nodes: T[]; pages: number }> {
  const nodes: T[] = [];
  let after: PageRequest['after'];
  let pages = 0;
  for (;;) {
    const entries = await read({ limit: size, inverted: false, after });
    if (entries.length === 0) break;
    pages += 1;
    nodes.push(...entries.map((entry) => entry.node));
    after = entries[entries.length - 1].cursor;
    if (pages > 50) throw new Error('the pages never end');
  }
  return { nodes, pages };
}

const titles = (entries: PageEntry<{ title: string }>[]) =>
  entries.map((entry) => entry.node.title);

let guideId: string;
let staffGuideId: string;

beforeEach(async () => {
  clearDataCache();
  await sql`truncate help_articles cascade`;

  // The FAQ: three public entries out of position order, one staff, one deleted.
  for (const [title, position] of [
    ['Testwort Question Two', 2],
    ['Testwort Question Three', 3],
    ['Testwort Question One', 1],
  ] as const) {
    await insertHelpArticle(sql, { kind: 'faq', title, position }, E.id);
  }
  await insertHelpArticle(
    sql,
    { kind: 'faq', title: 'Testwort Staff Question', position: 0, audience: 'staff' },
    E.id,
  );
  await insertHelpArticle(
    sql,
    { kind: 'faq', title: 'Testwort Gone Question', position: 0, deleted_at: GONE },
    E.id,
  );

  // The articles: three public top-level, one staff, one keeper, one deleted.
  guideId = await insertHelpArticle(
    sql,
    { title: 'Testwort Guide', slug: 'testwort-guide', position: 2 },
    E.id,
  );
  await insertHelpArticle(
    sql,
    { title: 'Testwort Primer', slug: 'testwort-primer', position: 1 },
    E.id,
  );
  await insertHelpArticle(
    sql,
    { title: 'Testwort Almanac', slug: 'testwort-almanac', position: 3 },
    E.id,
  );
  staffGuideId = await insertHelpArticle(
    sql,
    { title: 'Testwort Staff Guide', slug: 'testwort-staff-guide', audience: 'staff', position: 0 },
    E.id,
  );
  await insertHelpArticle(
    sql,
    {
      title: 'Testwort Keeper Guide',
      slug: 'testwort-keeper-guide',
      audience: 'keeper',
      position: 0,
    },
    E.id,
  );
  await insertHelpArticle(
    sql,
    { title: 'Testwort Gone Guide', slug: 'testwort-gone-guide', position: 0, deleted_at: GONE },
    E.id,
  );

  // The guide's children: two public out of position order, one staff, one keeper, one deleted.
  for (const seed of [
    { title: 'Testwort Guide Page Two', slug: 'testwort-guide-two', position: 2 },
    { title: 'Testwort Guide Page One', slug: 'testwort-guide-one', position: 1 },
    { title: 'Testwort Guide Staff Page', audience: 'staff' as const, position: 0 },
    { title: 'Testwort Guide Keeper Page', audience: 'keeper' as const, position: 0 },
    { title: 'Testwort Guide Gone Page', position: 0, deleted_at: GONE },
  ]) {
    await insertHelpArticle(sql, { ...seed, parent_id: guideId }, E.id);
  }
  // The staff guide's children: one staff, one keeper.
  await insertHelpArticle(
    sql,
    { title: 'Testwort Staff Guide Page', audience: 'staff', parent_id: staffGuideId },
    E.id,
  );
  await insertHelpArticle(
    sql,
    { title: 'Testwort Staff Guide Keeper Page', audience: 'keeper', parent_id: staffGuideId },
    E.id,
  );

  // The glossary, out of order, with one deleted.
  for (const title of ['Testwort Zephyr', 'Testwort Amber', 'Testwort Mallow']) {
    await insertHelpArticle(sql, { kind: 'term', title }, E.id);
  }
  await insertHelpArticle(sql, { kind: 'term', title: 'Testwort Beryl', deleted_at: GONE }, E.id);
});

describe('the public finder', () => {
  it('reads the public FAQ in position order', async () => {
    expect(titles(await readHelpFaq(PAGE))).toEqual([
      'Testwort Question One',
      'Testwort Question Two',
      'Testwort Question Three',
    ]);
  });

  it('reads the public top-level articles as the index, in position order', async () => {
    // No child, FAQ entry, term, staff, keeper or deleted row is in it.
    expect(titles(await readHelpArticleIndex(PAGE))).toEqual([
      'Testwort Primer',
      'Testwort Guide',
      'Testwort Almanac',
    ]);
  });

  it('reads one article by slug with its public children in position order', async () => {
    const guide = await readHelpArticle('testwort-guide');

    expect(guide).toMatchObject({
      id: guideId,
      kind: 'article',
      audience: 'public',
      title: 'Testwort Guide',
      parentId: null,
    });
    expect(guide.children.map((child) => child.title)).toEqual([
      'Testwort Guide Page One',
      'Testwort Guide Page Two',
    ]);
  });

  it('reads a child by its own slug, naming its parent', async () => {
    expect(await readHelpArticle('testwort-guide-one')).toMatchObject({
      title: 'Testwort Guide Page One',
      parentId: guideId,
    });
  });

  it('reads the glossary terms from A to Z', async () => {
    expect(titles(await readHelpGlossary(PAGE))).toEqual([
      'Testwort Amber',
      'Testwort Mallow',
      'Testwort Zephyr',
    ]);
  });

  it.each(['testwort-staff-guide', 'testwort-keeper-guide'])(
    'answers NotFound for the %s row, which the staff finder answers a keeper',
    async (slug) => {
      // Precondition: the slug is a live row.
      await expect(readStaffHelpArticle(asUser(E), slug)).resolves.toMatchObject({ slug });

      await expect(readHelpArticle(slug)).rejects.toThrow(NotFound);
    },
  );

  it('answers NotFound for a deleted article and for a slug no row holds', async () => {
    const [row] =
      await sql`select count(*)::int as count from help_articles where slug = 'testwort-gone-guide'`;
    expect(row.count).toBe(1);

    await expect(readHelpArticle('testwort-gone-guide')).rejects.toThrow(NotFound);
    await expect(readHelpArticle('testwort-nowhere')).rejects.toThrow(NotFound);
  });
});

describe('every help list pages through the cursor helper', () => {
  it.each([
    ['the FAQ', readHelpFaq],
    ['the article index', readHelpArticleIndex],
    ['the glossary', readHelpGlossary],
  ])('walks %s two rows at a time to the same list read whole', async (_list, read) => {
    const whole = (await read(PAGE)).map((entry) => entry.node);
    // Precondition: there is more than one page to walk.
    expect(whole.length).toBeGreaterThan(2);

    const { nodes, pages } = await walk(read, 2);

    expect(pages).toBeGreaterThan(1);
    expect(nodes).toEqual(whole);
  });

  it('walks the staff list two rows at a time to the same list read whole', async () => {
    const read = (page: PageRequest) => listStaffHelpArticles(asUser(F), page);
    const whole = (await read(PAGE)).map((entry) => entry.node);
    expect(whole.length).toBeGreaterThan(2);

    const { nodes, pages } = await walk(read, 2);

    expect(pages).toBeGreaterThan(1);
    expect(nodes).toEqual(whole);
  });
});

describe('the staff finder', () => {
  it('answers a curator a staff article with its public and staff children, never a keeper one', async () => {
    const guide = await readStaffHelpArticle(asUser(F), 'testwort-guide');
    expect(guide.children.map((child) => child.title).sort()).toEqual([
      'Testwort Guide Page One',
      'Testwort Guide Page Two',
      'Testwort Guide Staff Page',
    ]);

    const staffGuide = await readStaffHelpArticle(asUser(F), 'testwort-staff-guide');
    expect(staffGuide).toMatchObject({ id: staffGuideId, audience: 'staff' });
    expect(staffGuide.children.map((child) => child.title)).toEqual(['Testwort Staff Guide Page']);
  });

  it('answers a keeper every audience’s children', async () => {
    const staffGuide = await readStaffHelpArticle(asUser(E), 'testwort-staff-guide');

    expect(staffGuide.children.map((child) => child.title).sort()).toEqual([
      'Testwort Staff Guide Keeper Page',
      'Testwort Staff Guide Page',
    ]);
  });

  it('answers NotFound to a curator asking for a keeper row by slug', async () => {
    // Preconditions: F passes the curator check, so the refusal is the audience's, and the row is live for a keeper.
    expect(assertCurator(asUser(F))).toEqual({ userId: F.id });
    await expect(readStaffHelpArticle(asUser(E), 'testwort-keeper-guide')).resolves.toMatchObject({
      audience: 'keeper',
    });

    await expect(readStaffHelpArticle(asUser(F), 'testwort-keeper-guide')).rejects.toThrow(
      NotFound,
    );
  });

  it.each([
    ['a practitioner', B],
    ['an observer', C],
  ])('refuses %s a staff row by slug, and the staff list', async (_who, user) => {
    // Preconditions: the row is live and a curator is answered it; the caller holds no site role.
    await expect(readStaffHelpArticle(asUser(F), 'testwort-staff-guide')).resolves.toMatchObject({
      id: staffGuideId,
    });
    expect(user.role).toBe('user');

    await expect(readStaffHelpArticle(asUser(user), 'testwort-staff-guide')).rejects.toThrow(
      Forbidden,
    );
    await expect(listStaffHelpArticles(asUser(user), PAGE)).rejects.toThrow(Forbidden);
  });

  it('lists the public and staff rows for a curator, and the keeper rows too for a keeper', async () => {
    const curator = (await listStaffHelpArticles(asUser(F), PAGE)).map((entry) => entry.node);
    const keeper = (await listStaffHelpArticles(asUser(E), PAGE)).map((entry) => entry.node);

    expect(new Set(curator.map((row) => row.audience))).toEqual(new Set(['public', 'staff']));
    expect(new Set(keeper.map((row) => row.audience))).toEqual(
      new Set(['public', 'staff', 'keeper']),
    );
    // Every kind is listed, and no deleted row.
    expect(new Set(keeper.map((row) => row.kind))).toEqual(new Set(['faq', 'article', 'term']));
    expect(keeper.map((row) => row.title).filter((title) => title.includes('Gone'))).toEqual([]);
    expect(keeper.map((row) => row.title).filter((title) => title === 'Testwort Beryl')).toEqual(
      [],
    );
  });

  it('answers NotFound for a deleted row, even to a keeper', async () => {
    await expect(readStaffHelpArticle(asUser(E), 'testwort-gone-guide')).rejects.toThrow(NotFound);
  });
});

describe('a page read takes articles only, since a slug is unique within its kind', () => {
  /** A term and an FAQ entry under each article's slug. */
  async function shareTheArticleSlugs() {
    for (const slug of ['testwort-guide', 'testwort-staff-guide', 'testwort-keeper-guide']) {
      await insertHelpArticle(sql, { kind: 'term', title: `Testwort Term ${slug}`, slug }, E.id);
      await insertHelpArticle(
        sql,
        { kind: 'faq', title: `Testwort Question ${slug}`, slug, position: 9 },
        E.id,
      );
    }
    // Rewriting the articles moves their tuples behind the term and the FAQ entry, so a read that
    // ignores the kind finds one of those first instead of the article by luck of heap order.
    await sql`update help_articles set body = body || '' where kind = 'article' and parent_id is null`;
  }

  beforeEach(async () => {
    // A slug a term or an FAQ entry holds alone.
    await insertHelpArticle(
      sql,
      { kind: 'term', title: 'Testwort Lone Term', slug: 'testwort-lone-term' },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { kind: 'faq', title: 'Testwort Lone Question', slug: 'testwort-lone-question', position: 9 },
      E.id,
    );
  });

  it('reads the public article when a term and an FAQ entry share its slug', async () => {
    await shareTheArticleSlugs();
    const [row] =
      await sql`select count(*)::int as count from help_articles where slug = 'testwort-guide' and deleted_at is null`;
    expect(row.count).toBe(3);

    expect(await readHelpArticle('testwort-guide')).toMatchObject({
      id: guideId,
      kind: 'article',
      title: 'Testwort Guide',
    });
  });

  it.each([
    ['a curator', 'testwort-staff-guide', F],
    ['a keeper', 'testwort-staff-guide', E],
    ['a keeper', 'testwort-keeper-guide', E],
  ] as const)(
    'reads %s the %s article when a term and an FAQ entry share its slug',
    async (_who, slug, user) => {
      await shareTheArticleSlugs();
      expect(await readStaffHelpArticle(asUser(user), slug)).toMatchObject({
        slug,
        kind: 'article',
      });
    },
  );

  it.each(['testwort-lone-term', 'testwort-lone-question'])(
    'answers NotFound for %s, which no article holds',
    async (slug) => {
      // Precondition: a live public row holds the slug.
      const [row] =
        await sql`select count(*)::int as count from help_articles where slug = ${slug} and audience = 'public' and deleted_at is null`;
      expect(row.count).toBe(1);

      await expect(readHelpArticle(slug)).rejects.toThrow(NotFound);
      await expect(readStaffHelpArticle(asUser(E), slug)).rejects.toThrow(NotFound);
    },
  );
});

describe('a hidden row reaches no reader', () => {
  const PUBLIC_SLUG = 'testwort-shy-guide';
  const STAFF_SLUG = 'testwort-shy-staff-guide';
  const KEEPER_SLUG = 'testwort-shy-keeper-guide';

  const show = async (slug: string) => {
    await sql`update help_articles set shown = true where slug = ${slug}`;
    clearDataCache();
  };

  const stateOf = async (slug: string) => {
    const [row] =
      await sql`select audience, shown, deleted_at from help_articles where slug = ${slug}`;
    return row;
  };

  beforeEach(async () => {
    await insertHelpArticle(
      sql,
      { title: 'Testwort Shy Guide', slug: PUBLIC_SLUG, position: 4, shown: false },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { title: 'Testwort Shy Staff Guide', slug: STAFF_SLUG, audience: 'staff', shown: false },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { title: 'Testwort Shy Keeper Guide', slug: KEEPER_SLUG, audience: 'keeper', shown: false },
      E.id,
    );
  });

  it('answers NotFound to a signed-out reader for a hidden public article by slug, and the article once shown', async () => {
    // Preconditions: the row is there, live and public, so only the flag stands between it and the reader.
    expect(await stateOf(PUBLIC_SLUG)).toEqual({
      audience: 'public',
      shown: false,
      deleted_at: null,
    });

    await expect(readHelpArticle(PUBLIC_SLUG)).rejects.toThrow(NotFound);

    await show(PUBLIC_SLUG);
    expect((await readHelpArticle(PUBLIC_SLUG)).title).toBe('Testwort Shy Guide');
  });

  it('answers NotFound to a curator for a hidden staff article by slug, and the article once shown', async () => {
    // Preconditions: F is a curator, the row is staff, so the curator's reach covers it.
    expect(assertCurator(asUser(F))).toEqual({ userId: F.id });
    expect(await stateOf(STAFF_SLUG)).toEqual({
      audience: 'staff',
      shown: false,
      deleted_at: null,
    });

    await expect(readStaffHelpArticle(asUser(F), STAFF_SLUG)).rejects.toThrow(NotFound);
    // The hidden public row is no nearer by the staff path.
    await expect(readStaffHelpArticle(asUser(F), PUBLIC_SLUG)).rejects.toThrow(NotFound);

    await show(STAFF_SLUG);
    expect((await readStaffHelpArticle(asUser(F), STAFF_SLUG)).title).toBe(
      'Testwort Shy Staff Guide',
    );
  });

  it('answers NotFound to a keeper reading a hidden keeper article as a page, and the article once shown', async () => {
    expect(await stateOf(KEEPER_SLUG)).toEqual({
      audience: 'keeper',
      shown: false,
      deleted_at: null,
    });

    await expect(readStaffHelpArticle(asUser(E), KEEPER_SLUG)).rejects.toThrow(NotFound);

    await show(KEEPER_SLUG);
    expect((await readStaffHelpArticle(asUser(E), KEEPER_SLUG)).title).toBe(
      'Testwort Shy Keeper Guide',
    );
  });

  it('hides a shown child with its hidden parent, by the child’s own slug and in every list, and keeps the child’s flag', async () => {
    const [{ id: parentId }] = await sql`select id from help_articles where slug = ${PUBLIC_SLUG}`;
    await insertHelpArticle(
      sql,
      { title: 'Testwort Shy Page', slug: 'testwort-shy-page', parent_id: parentId as string },
      E.id,
    );
    // Precondition: the child itself is shown and public.
    expect(await stateOf('testwort-shy-page')).toEqual({
      audience: 'public',
      shown: true,
      deleted_at: null,
    });

    await expect(readHelpArticle('testwort-shy-page')).rejects.toThrow(NotFound);
    await expect(readStaffHelpArticle(asUser(E), 'testwort-shy-page')).rejects.toThrow(NotFound);
    expect(await listHelpArticlePaths()).not.toContain(
      '/help/testwort-shy-guide/testwort-shy-page',
    );
    const staffList = (await listStaffHelpArticles(asUser(E), PAGE)).map(
      (entry) => entry.node.slug,
    );
    expect(staffList).not.toContain('testwort-shy-page');

    await show(PUBLIC_SLUG);
    expect((await readHelpArticle('testwort-shy-page')).title).toBe('Testwort Shy Page');
    expect(await listHelpArticlePaths()).toContain('/help/testwort-shy-guide/testwort-shy-page');
  });

  it('leaves a hidden child out of its shown parent’s children, and out of the sitemap', async () => {
    await insertHelpArticle(
      sql,
      {
        title: 'Testwort Guide Shy Page',
        slug: 'testwort-guide-shy-page',
        parent_id: guideId,
        shown: false,
      },
      E.id,
    );

    const children = (await readHelpArticle('testwort-guide')).children.map((child) => child.title);
    expect(children).toEqual(['Testwort Guide Page One', 'Testwort Guide Page Two']);
    expect(
      (await readStaffHelpArticle(asUser(E), 'testwort-guide')).children.map((c) => c.title),
    ).not.toContain('Testwort Guide Shy Page');
    expect(await listHelpArticlePaths()).not.toContain(
      '/help/testwort-guide/testwort-guide-shy-page',
    );
  });

  it('leaves hidden rows out of the FAQ, the index, the glossary, the staff list and the sitemap', async () => {
    await insertHelpArticle(
      sql,
      { kind: 'faq', title: 'Testwort Shy Question', position: 4, shown: false },
      E.id,
    );
    await insertHelpArticle(sql, { kind: 'term', title: 'Testwort Shy Term', shown: false }, E.id);

    expect(titles(await readHelpFaq(PAGE))).not.toContain('Testwort Shy Question');
    expect(titles(await readHelpArticleIndex(PAGE))).not.toContain('Testwort Shy Guide');
    // A mark naming a hidden term finds no term, so it draws as its text with no link (tests/components/DocumentPage/help-marks.test.tsx).
    expect(titles(await readHelpGlossary(PAGE))).not.toContain('Testwort Shy Term');
    const staff = titles(await listStaffHelpArticles(asUser(E), PAGE));
    for (const title of [
      'Testwort Shy Guide',
      'Testwort Shy Staff Guide',
      'Testwort Shy Keeper Guide',
      'Testwort Shy Question',
      'Testwort Shy Term',
    ])
      expect(staff).not.toContain(title);
    expect(await listHelpArticlePaths()).not.toContain(`/help/${PUBLIC_SLUG}`);

    // Precondition: the lists answer shown rows of the same kinds.
    expect(titles(await readHelpFaq(PAGE))).toContain('Testwort Question One');
    expect(staff).toContain('Testwort Staff Guide');
  });
});
