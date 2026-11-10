import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import type { PageRequest } from '@/lib/types';
import {
  listHelpArticlePaths,
  listStaffHelpArticles,
  readHelpArticle,
  readStaffHelpArticle,
  searchHelp,
} from '@/modules/help';
import { E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertHelpArticle } from '../../../support/db/insert-help-article';
import { clearDataCache } from '../../../support/next-data-cache';

// A help page's address is built from the row's own slug and its parent's (src/lib/help-paths.ts), so every read
// answers `parentSlug` beside `parentId`. The sitemap lists the public article addresses through
// listHelpArticlePaths: the public top-level articles and their public sub pages, nested under the parent, and
// nothing a signed-out reader cannot open (DESIGN.md §10).

vi.mock('next/cache', () => import('../../../support/next-data-cache'));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const PAGE: PageRequest = { limit: 101, inverted: false };
const GONE = new Date('2026-01-02T00:00:00Z');

beforeEach(async () => {
  clearDataCache();
  await sql`truncate help_articles cascade`;

  const guide = await insertHelpArticle(
    sql,
    { title: 'Testwort Ashgrove Guide', slug: 'testwort-guide', position: 1 },
    E.id,
  );
  await insertHelpArticle(
    sql,
    { title: 'Testwort Primer', slug: 'testwort-primer', position: 2 },
    E.id,
  );
  await insertHelpArticle(
    sql,
    {
      title: 'Testwort Ashgrove Signing In',
      slug: 'testwort-signing-in',
      parent_id: guide,
      position: 1,
    },
    E.id,
  );
  await insertHelpArticle(
    sql,
    {
      title: 'Testwort Ashgrove Staff Page',
      slug: 'testwort-guide-staff-page',
      audience: 'staff',
      parent_id: guide,
      position: 2,
    },
    E.id,
  );
  await insertHelpArticle(
    sql,
    {
      title: 'Testwort Gone Page',
      slug: 'testwort-gone-page',
      parent_id: guide,
      position: 3,
      deleted_at: GONE,
    },
    E.id,
  );
  await insertHelpArticle(
    sql,
    { title: 'Testwort Gone Guide', slug: 'testwort-gone-guide', position: 3, deleted_at: GONE },
    E.id,
  );

  const staffGuide = await insertHelpArticle(
    sql,
    {
      title: 'Testwort Ashgrove Vocabularies',
      slug: 'testwort-vocabularies',
      audience: 'staff',
      position: 1,
    },
    E.id,
  );
  await insertHelpArticle(
    sql,
    {
      title: 'Testwort Ashgrove Forms',
      slug: 'testwort-forms',
      audience: 'staff',
      parent_id: staffGuide,
      position: 1,
    },
    E.id,
  );
  await insertHelpArticle(
    sql,
    {
      title: 'Testwort Keeper Duties',
      slug: 'testwort-keeper-duties',
      audience: 'keeper',
      position: 2,
    },
    E.id,
  );
  await insertHelpArticle(
    sql,
    { kind: 'faq', title: 'Testwort Question?', slug: 'testwort-question', position: 1 },
    E.id,
  );
  await insertHelpArticle(
    sql,
    { kind: 'term', title: 'Testwort Ashgrove', slug: 'ashgrove' },
    E.id,
  );
});

describe('listHelpArticlePaths', () => {
  it('answers each public article address, a sub page nested under its parent', async () => {
    const paths = await listHelpArticlePaths();

    expect([...paths].sort()).toEqual(
      [
        '/help/testwort-guide',
        '/help/testwort-guide/testwort-signing-in',
        '/help/testwort-primer',
      ].sort(),
    );
  });

  it('leaves out every staff, keeper, deleted, FAQ and glossary row, each of which is in the table', async () => {
    // The precondition: each left-out row is in the table, so its absence is the filter's doing.
    const rows = await sql<{ slug: string }[]>`
      select slug from help_articles`;
    const slugs = rows.map((r) => r.slug);
    for (const slug of [
      'testwort-guide-staff-page',
      'testwort-gone-page',
      'testwort-gone-guide',
      'testwort-vocabularies',
      'testwort-forms',
      'testwort-keeper-duties',
      'testwort-question',
      'ashgrove',
    ]) {
      expect(slugs, slug).toContain(slug);
    }

    const paths = await listHelpArticlePaths();

    for (const slug of [
      'testwort-guide-staff-page',
      'testwort-gone-page',
      'testwort-gone-guide',
      'testwort-vocabularies',
      'testwort-forms',
      'testwort-keeper-duties',
      'testwort-question',
      'ashgrove',
    ]) {
      expect(
        paths.some((path) => path.split('/').includes(slug)),
        slug,
      ).toBe(false);
    }
    expect(paths.some((path) => path.startsWith('/help/staff'))).toBe(false);
  });
});

describe('every read answers the parent slug', () => {
  it('readHelpArticle: a top-level article has none, its children and a sub page name the parent', async () => {
    const guide = await readHelpArticle('testwort-guide');
    expect(guide.parentSlug).toBeNull();
    expect(guide.children.map((c) => [c.slug, c.parentSlug])).toEqual([
      ['testwort-signing-in', 'testwort-guide'],
    ]);

    const page = await readHelpArticle('testwort-signing-in');
    expect(page.parentSlug).toBe('testwort-guide');
    expect(page.parentId).not.toBeNull();
  });

  it("readStaffHelpArticle: a curator's staff sub page names its parent", async () => {
    const page = await readStaffHelpArticle(asUser(F), 'testwort-forms');

    expect(page.parentSlug).toBe('testwort-vocabularies');
    const guide = await readStaffHelpArticle(asUser(F), 'testwort-vocabularies');
    expect(guide.parentSlug).toBeNull();
    expect(guide.children.map((c) => c.parentSlug)).toEqual(['testwort-vocabularies']);
  });

  it('listStaffHelpArticles names each row its parent slug', async () => {
    const rows = (await listStaffHelpArticles(asUser(F), PAGE)).map((entry) => entry.node);

    const forms = rows.find((row) => row.slug === 'testwort-forms');
    expect(forms?.parentSlug).toBe('testwort-vocabularies');
    expect(rows.find((row) => row.slug === 'testwort-vocabularies')?.parentSlug).toBeNull();
  });

  it('searchHelp names each hit its parent slug', async () => {
    const hits = (await searchHelp(null, 'ashgrove', PAGE)).map((entry) => entry.node);

    // The precondition: the search finds both a sub page and a top-level row.
    expect(hits.map((hit) => hit.slug)).toEqual(
      expect.arrayContaining(['testwort-signing-in', 'testwort-guide']),
    );
    expect(hits.find((hit) => hit.slug === 'testwort-signing-in')?.parentSlug).toBe(
      'testwort-guide',
    );
    expect(hits.find((hit) => hit.slug === 'testwort-guide')?.parentSlug).toBeNull();
  });
});
