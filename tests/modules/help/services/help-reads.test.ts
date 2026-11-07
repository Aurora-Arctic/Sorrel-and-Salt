import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { Forbidden, NotFound } from '@/lib/errors';
import type { PageEntry, PageRequest } from '@/lib/types';
import {
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
