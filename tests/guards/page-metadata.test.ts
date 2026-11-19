import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// A page's head is made by src/lib/page-metadata.ts, so every public page carries the same canonical, Open Graph and
// Twitter tags and every noindex page the same robots tag. Three pages add a tag beside a helper's output, for a reason
// each: a filtered or hidden view that must stay out of search, and a signed-in page that points at its public twin.

const PAGE = /^src\/app\/.*page\.tsx$/;
const HAND_WRITTEN_TAG = /\b(?:alternates|openGraph|twitter|robots):\s*\{/;
const HAND_WRITTEN_METADATA = /export const metadata: Metadata = \{/;
const MAY_ADD_A_TAG = new Set([
  'src/app/(public)/compendium/page.tsx',
  'src/app/(public)/compendium/ingredients/[slug]/page.tsx',
  'src/app/(shell)/coven/[slug]/ingredients/[id]/page.tsx',
]);

// The helper's signature requires a description and a path, so a page that reaches it carries both tags. A
// noindex page goes through noIndexMetadata instead, and is named here so a new page cannot skip the helper.
const PUBLIC_PAGE = /^src\/app\/(?:\(public\)\/.*\/)?page\.tsx$/;
const INDEXABLE_HEAD = /\b(?:publicPageMetadata|versionDocumentMetadata|helpArticleMetadata)\(/;
const WRAPPERS = ['src/app/(public)/_documents.tsx', 'src/lib/help-article-props.ts'];
const NOINDEX = new Set([
  '/access-paused',
  '/forgot-password',
  '/help/search',
  '/reset-password',
  '/support',
  '/support/request',
]);

function routeOf(file: string): string {
  return `/${file
    .replace(/^src\/app\//, '')
    .replace(/^\(public\)\//, '')
    .replace(/\/?page\.tsx$/, '')}`;
}

describe('page metadata', () => {
  const pages = inject('repoFiles').filter((file) => PAGE.test(file));
  const read = (file: string) => readFileSync(file, 'utf8');

  it('is built by a helper, never an object a page writes out', () => {
    // Preconditions: the scan found the app's pages, and the pattern matches the shape it refuses.
    expect(pages.length).toBeGreaterThan(40);
    expect('export const metadata: Metadata = {\n  title: "X",\n};').toMatch(HAND_WRITTEN_METADATA);

    expect(pages.filter((file) => HAND_WRITTEN_METADATA.test(read(file)))).toEqual([]);
  });

  it('writes no canonical, social or robots tag by hand outside the named pages', () => {
    expect('robots: { index: false },').toMatch(HAND_WRITTEN_TAG);
    expect(
      pages.filter((file) => !MAY_ADD_A_TAG.has(file) && HAND_WRITTEN_TAG.test(read(file))),
    ).toEqual([]);
  });

  describe('on a public page', () => {
    const publicPages = pages.filter((file) => PUBLIC_PAGE.test(file));
    const indexable = publicPages.filter((file) => !NOINDEX.has(routeOf(file)));

    it('reaches publicPageMetadata, which requires a description and a canonical path', () => {
      // Preconditions: the home page and the public group were found, and each wrapper calls the helper.
      expect(publicPages).toContain('src/app/page.tsx');
      expect(publicPages).toContain('src/app/(public)/about/page.tsx');
      expect(indexable.length).toBeGreaterThan(10);
      for (const wrapper of WRAPPERS) expect(read(wrapper)).toMatch(/\bpublicPageMetadata\(/);

      expect(indexable.filter((file) => !INDEXABLE_HEAD.test(read(file)))).toEqual([]);
    });

    it('names exactly the noindex pages, each of which builds a noindex head', () => {
      const routes = publicPages.map(routeOf);
      expect([...NOINDEX].filter((route) => !routes.includes(route))).toEqual([]);

      const noIndexPages = publicPages.filter((file) => NOINDEX.has(routeOf(file)));
      expect(noIndexPages.filter((file) => !/\bnoIndexMetadata\(/.test(read(file)))).toEqual([]);
      expect(noIndexPages.filter((file) => INDEXABLE_HEAD.test(read(file)))).toEqual([]);
    });
  });
});
