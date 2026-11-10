import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// A page's head is made by src/lib/page-metadata.ts, so every public page carries the same canonical, Open Graph and
// Twitter tags and every noindex page the same robots tag. Four pages add a tag beside a helper's output, for a reason
// each: a filtered or hidden view that must stay out of search, and a signed-in page that points at its public twin.

const PAGE = /^src\/app\/.*page\.tsx$/;
const HAND_WRITTEN_TAG = /\b(?:alternates|openGraph|twitter|robots):\s*\{/;
const HAND_WRITTEN_METADATA = /export const metadata: Metadata = \{/;
const MAY_ADD_A_TAG = new Set([
  'src/app/(public)/compendium/page.tsx',
  'src/app/(public)/compendium/ingredients/[slug]/page.tsx',
  'src/app/(shell)/coven/[slug]/ingredients/[id]/page.tsx',
  'src/app/sign-in/page.tsx',
]);

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
});
