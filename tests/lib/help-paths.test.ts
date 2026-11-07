import { describe, expect, it } from 'vitest';
import { helpPath } from '@/lib/help-paths';

// Every help row has one address, read from its kind, its audience and its parent's slug: a term is an anchor on the
// glossary, an FAQ entry an anchor on its index, and an article a page under /help or, for staff and keepers, under
// /help/staff, nested beneath its parent when it has one (DESIGN.md §10, "Help and FAQ articles").

describe('helpPath', () => {
  it.each([
    [
      'a term, at its glossary anchor',
      { kind: 'term', audience: 'public', slug: 'steward', parentSlug: null },
      '/help/glossary#steward',
    ],
    [
      'a public FAQ entry, at its anchor on /help',
      { kind: 'faq', audience: 'public', slug: 'who-can-see-my-spells', parentSlug: null },
      '/help#who-can-see-my-spells',
    ],
    [
      'a staff FAQ entry, at its anchor on /help/staff',
      { kind: 'faq', audience: 'staff', slug: 'testwort-staff-question', parentSlug: null },
      '/help/staff#testwort-staff-question',
    ],
    [
      'a public top-level article',
      { kind: 'article', audience: 'public', slug: 'getting-started', parentSlug: null },
      '/help/getting-started',
    ],
    [
      'a public sub page, beneath its parent',
      { kind: 'article', audience: 'public', slug: 'signing-in', parentSlug: 'getting-started' },
      '/help/getting-started/signing-in',
    ],
    [
      'a staff top-level article, under /help/staff',
      { kind: 'article', audience: 'staff', slug: 'vocabularies', parentSlug: null },
      '/help/staff/vocabularies',
    ],
    [
      'a keeper top-level article, under /help/staff',
      { kind: 'article', audience: 'keeper', slug: 'minting-printed-cards', parentSlug: null },
      '/help/staff/minting-printed-cards',
    ],
    [
      'a keeper sub page of a staff article, beneath its parent under /help/staff',
      {
        kind: 'article',
        audience: 'keeper',
        slug: 'timing-a-sender-out',
        parentSlug: 'working-the-support-queue',
      },
      '/help/staff/working-the-support-queue/timing-a-sender-out',
    ],
    [
      'a staff sub page of a public article, under /help/staff since its reader is staff',
      {
        kind: 'article',
        audience: 'staff',
        slug: 'testwort-staff-page',
        parentSlug: 'testwort-guide',
      },
      '/help/staff/testwort-guide/testwort-staff-page',
    ],
  ] as const)('gives %s', (_, row, path) => {
    expect(helpPath(row)).toBe(path);
  });
});
