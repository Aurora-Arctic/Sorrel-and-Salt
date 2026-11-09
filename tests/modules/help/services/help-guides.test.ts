import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { ValidationError } from '@/lib/errors';
import { slugify } from '@/lib/slugify';
import type { PageRequest } from '@/lib/types';
import {
  createHelpArticle,
  listKeeperHelpArticles,
  readHelpArticle,
  readHelpArticleIndex,
  updateHelpArticle,
} from '@/modules/help';
import { E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertHelpArticle, type HelpArticleSeed } from '../../../support/db/insert-help-article';
import { clearDataCache } from '../../../support/next-data-cache';

// A guide is a kind of its own: a top-level page that holds sub pages, beside the top-level article, which holds none
// (claude-docs/components/help-article-form.md, "Fields by kind"). Each refusal is made by direct id, and each test shows the
// same write passing once its precondition is met.

vi.mock('next/cache', () => import('../../../support/next-data-cache'));

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const PAGE: PageRequest = { limit: 101, inverted: false };

beforeEach(async () => {
  clearDataCache();
  await sql`truncate help_articles cascade`;
});

async function expectRefusedAt(promise: Promise<unknown>, field: string) {
  const error = await promise.then(
    () => {
      throw new Error(`accepted where ${field} should have been refused`);
    },
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ValidationError);
  const refusal = error as ValidationError;
  expect(refusal.issues.map((issue) => issue.path[0])).toContain(field);
  expect(refusal.message).not.toBe(new ValidationError([]).message);
}

const kindOf = async (id: string) => {
  const [row] = await sql`select kind, parent_id from help_articles where id = ${id}`;
  return row;
};

const guideRow = (title: string, extra: HelpArticleSeed = {}) =>
  insertHelpArticle(sql, { kind: 'guide', title, slug: slugify(title), ...extra }, E.id);
const articleRow = (title: string, extra: HelpArticleSeed = {}) =>
  insertHelpArticle(sql, { title, slug: slugify(title), ...extra }, E.id);

describe('a guide', () => {
  it('is written at the top level with a summary and its sub pages, last among the guides', async () => {
    await articleRow('Testwort Earlier', { position: 4 });
    const child = await articleRow('Testwort Leaf');

    const created = await createHelpArticle(asUser(E), {
      kind: 'guide',
      title: 'Testwort Grove',
      summary: 'A guide the test writes.',
      body: 'A guide keeps its own words.',
      childIds: [child],
    });

    expect(created).toMatchObject({
      kind: 'guide',
      parentId: null,
      position: 5,
      summary: 'A guide the test writes.',
    });
    expect(await kindOf(child)).toMatchObject({ parent_id: created.id });
  });

  it('has no parent, on create and on update', async () => {
    const parentId = await guideRow('Testwort Holder');
    const guide = { kind: 'guide' as const, title: 'Testwort Nested', body: 'A body.' };

    await expectRefusedAt(createHelpArticle(asUser(E), { ...guide, parentId }), 'parentId');
    // Precondition: the same guide with no parent is written.
    const created = await createHelpArticle(asUser(E), guide);

    await expectRefusedAt(updateHelpArticle(asUser(E), created.id, { parentId }), 'parentId');
    expect(await kindOf(created.id)).toMatchObject({ kind: 'guide', parent_id: null });
  });

  it('is the only kind that holds sub pages, and each sub page is an article', async () => {
    const leaf = await articleRow('Testwort Leaf');
    const otherGuide = await guideRow('Testwort Other Guide');
    const faq = await insertHelpArticle(
      sql,
      { kind: 'faq', title: 'Testwort Asked', slug: 'testwort-asked' },
      E.id,
    );
    const page = { title: 'Testwort Holder', body: 'A body.', childIds: [leaf] };

    await expectRefusedAt(createHelpArticle(asUser(E), { ...page, kind: 'article' }), 'childIds');
    for (const wrong of [otherGuide, faq]) {
      await expectRefusedAt(
        createHelpArticle(asUser(E), { ...page, kind: 'guide', childIds: [wrong] }),
        'childIds',
      );
    }
    // Precondition: a guide holding the article is written.
    await expect(createHelpArticle(asUser(E), { ...page, kind: 'guide' })).resolves.toMatchObject({
      kind: 'guide',
    });
  });

  it('is the only parent a sub page takes', async () => {
    const standalone = await articleRow('Testwort Standalone');
    const guide = await guideRow('Testwort Grove');
    const page = { kind: 'article' as const, title: 'Testwort Leaf', body: 'A body.' };

    await expectRefusedAt(
      createHelpArticle(asUser(E), { ...page, parentId: standalone }),
      'parentId',
    );
    // Precondition: the guide is a parent the same page takes.
    await expect(createHelpArticle(asUser(E), { ...page, parentId: guide })).resolves.toMatchObject(
      { parentId: guide },
    );
  });

  it('shares its address with no top-level article', async () => {
    await articleRow('Testwort Shared', { slug: 'testwort-shared' });

    await expectRefusedAt(
      createHelpArticle(asUser(E), { kind: 'guide', title: 'Testwort Shared', body: 'A body.' }),
      'title',
    );
    // Precondition: another title makes another address, which is written.
    await expect(
      createHelpArticle(asUser(E), { kind: 'guide', title: 'Testwort Apart', body: 'A body.' }),
    ).resolves.toMatchObject({ slug: 'testwort-apart' });
  });
});

describe('a change of kind', () => {
  it('makes a top-level article a guide, and refuses a sub page until its parent is removed', async () => {
    const guide = await guideRow('Testwort Grove');
    const subPage = await articleRow('Testwort Leaf', { parent_id: guide, position: 1 });
    const standalone = await articleRow('Testwort Standalone');

    await expectRefusedAt(updateHelpArticle(asUser(E), subPage, { kind: 'guide' }), 'kind');
    expect(await kindOf(subPage)).toMatchObject({ kind: 'article', parent_id: guide });

    await expect(
      updateHelpArticle(asUser(E), standalone, { kind: 'guide' }),
    ).resolves.toMatchObject({ kind: 'guide' });
    // Precondition met: with its parent removed in the same save, the sub page becomes a guide.
    await expect(
      updateHelpArticle(asUser(E), subPage, { kind: 'guide', parentId: null }),
    ).resolves.toMatchObject({ kind: 'guide', parentId: null });
  });

  it('makes a guide an article only once it holds no live sub page', async () => {
    const guide = await guideRow('Testwort Grove');
    const subPage = await articleRow('Testwort Leaf', { parent_id: guide, position: 1 });
    await articleRow('Testwort Gone', { parent_id: guide, position: 2, deleted_at: new Date() });

    await expectRefusedAt(updateHelpArticle(asUser(E), guide, { kind: 'article' }), 'kind');
    expect(await kindOf(guide)).toMatchObject({ kind: 'guide' });

    // Precondition met: once its one live sub page leaves, the guide becomes an article; a deleted one does not count.
    await updateHelpArticle(asUser(E), subPage, { parentId: null });
    await expect(updateHelpArticle(asUser(E), guide, { kind: 'article' })).resolves.toMatchObject({
      kind: 'article',
    });
  });

  it.each([
    ['an FAQ entry to an article', 'faq' as const, 'article' as const],
    ['an article to an FAQ entry', 'article' as const, 'faq' as const],
    ['a term to a guide', 'term' as const, 'guide' as const],
    ['a guide to a term', 'guide' as const, 'term' as const],
  ])('refuses %s', async (_what, from, to) => {
    const id = await insertHelpArticle(
      sql,
      { kind: from, title: 'Testwort Fixed', slug: 'testwort-fixed' },
      E.id,
    );

    await expectRefusedAt(updateHelpArticle(asUser(E), id, { kind: to }), 'kind');
    expect(await kindOf(id)).toMatchObject({ kind: from });
    // Precondition: the same row takes an update that keeps its kind.
    await expect(
      updateHelpArticle(asUser(E), id, { kind: from, body: 'A second body.' }),
    ).resolves.toMatchObject({ kind: from });
  });
});

describe('the reader’s pages', () => {
  it('list guides and articles together at the top level, and a sub page only under its guide', async () => {
    const guide = await guideRow('Testwort Grove', { position: 2, body: 'The guide’s own words.' });
    await articleRow('Testwort Standalone', { position: 1 });
    await articleRow('Testwort Leaf', { parent_id: guide, position: 1 });

    const index = await readHelpArticleIndex(PAGE);
    expect(index.map(({ node }) => [node.title, node.kind])).toEqual([
      ['Testwort Standalone', 'article'],
      ['Testwort Grove', 'guide'],
    ]);

    const page = await readHelpArticle('testwort-grove');
    expect(page).toMatchObject({ kind: 'guide', body: 'The guide’s own words.' });
    expect(page.children.map((child) => child.title)).toEqual(['Testwort Leaf']);
  });
});

describe('the keeper’s list', () => {
  it('reads the top-level guides and articles together in position order, by the kinds asked for', async () => {
    const guide = await guideRow('Testwort Grove', { position: 2 });
    await articleRow('Testwort Standalone', { position: 1 });
    await articleRow('Testwort Leaf', { parent_id: guide, position: 1 });
    await insertHelpArticle(
      sql,
      { kind: 'faq', title: 'Testwort Asked', slug: 'testwort-asked', position: 0 },
      E.id,
    );
    const read = async (kinds: ('guide' | 'article')[]) =>
      (
        await listKeeperHelpArticles(asUser(E), { kinds, topLevel: true, order: 'position' }, PAGE)
      ).map(({ node }) => node.title);

    // Precondition: one kind alone reads only its own rows.
    expect(await read(['guide'])).toEqual(['Testwort Grove']);
    expect(await read(['guide', 'article'])).toEqual(['Testwort Standalone', 'Testwort Grove']);
  });
});
