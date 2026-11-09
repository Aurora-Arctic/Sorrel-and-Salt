import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadDocuments } from '@/db/seed/documents';
import { fromRoot } from '../../support/paths';

function footnotesOf(body: string): { cited: string[]; defined: string[] } {
  const defined = [...body.matchAll(/^\[\^([^\]]+)\]:/gm)].map(([, label]) => label);
  const cited = [...body.matchAll(/\[\^([^\]]+)\](?!:)/g)].map(([, label]) => label);
  return { cited: [...new Set(cited)].sort(), defined: [...new Set(defined)].sort() };
}

describe('the document files', () => {
  const documents = loadDocuments(fromRoot('documents'));
  const byKey = new Map(documents.map((document) => [document.key, document]));

  it('hold the five documents, one file each', () => {
    expect(documents.map((document) => document.key).sort()).toEqual([
      'about',
      'code-of-ethics',
      'disclaimer',
      'privacy',
      'terms',
    ]);
    for (const document of documents) {
      expect(document.title, document.key).not.toBe('');
      expect(document.lede, document.key).not.toBe('');
      expect(document.body, document.key).not.toBe('');
    }
  });

  // Version 1 is dated by the day each page showed before the move, so no reader sees a date change.
  it('date each document by the day its page last changed', () => {
    const days = Object.fromEntries(
      documents
        .filter((document) => document.key !== 'about')
        .map((document) => [document.key, document.publishedOn.toISOString()]),
    );
    expect(days).toEqual({
      'code-of-ethics': '2026-11-02T00:00:00.000Z',
      disclaimer: '2026-11-02T00:00:00.000Z',
      privacy: '2026-11-03T00:00:00.000Z',
      terms: '2026-11-02T00:00:00.000Z',
    });
  });

  // Each source is a footnote marked from its sentence: a mark with no definition prints as text, and a definition nothing marks is
  // a source no sentence supports.
  it('cite every source as a footnote that a sentence marks', () => {
    for (const key of ['disclaimer', 'code-of-ethics', 'terms']) {
      const { cited, defined } = footnotesOf(byKey.get(key)?.body ?? '');
      // Precondition: the document has sources, so equal lists are not two empty ones.
      expect(defined.length, key).toBeGreaterThan(0);
      expect(cited, key).toEqual(defined);
    }
  });

  // The title is the page's one `h1`, from the front matter; raw HTML in a body would print as text.
  it('hold no level-one heading and no HTML in a body', () => {
    for (const { key, body } of documents) {
      expect(body.match(/^# /m), key).toBeNull();
      expect(body.match(/<\/?[a-z][\w-]*[\s/>]/i), key).toBeNull();
    }
  });

  // Who can see what is drawn as cards from code, so the privacy file holds a placeholder paragraph where the table stood, under its
  // editable heading and introduction; a table there would print beside the cards.
  it('hold the access cards placeholder, and no table, under the privacy policy’s Who Can See What', () => {
    const body = byKey.get('privacy')?.body ?? '';
    const section = body.split(/^### Who Can See What$/m)[1]?.split(/^#{1,6} /m)[0] ?? '';
    const blocks = section
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter((block) => block !== '');

    // Precondition: the heading is there, with an introduction before the placeholder.
    expect(body).toMatch(/^### Who Can See What$/m);
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    expect(blocks[0]).not.toBe('{access-cards}');
    expect(blocks).toContain('{access-cards}');
    expect(section).not.toMatch(/^\s*\|/m);
  });

  // A keeper may email every account about a published change, so the privacy policy says so where it says how it changes. The
  // wording is the owner’s; what is checked is that the section holds more than its one dating paragraph, and that the addition is
  // about email.
  it('say, under the privacy policy’s Changes to This Policy, that a change may be emailed to every account', () => {
    const body = byKey.get('privacy')?.body ?? '';
    const section = body.split(/^## Changes to This Policy$/m)[1]?.split(/^#{1,6} /m)[0] ?? '';
    const blocks = section
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter((block) => block !== '');

    expect(body).toMatch(/^## Changes to This Policy$/m);
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    expect(blocks.some((block) => /\bemail/i.test(block))).toBe(true);
  });

  // The About Us page draws its four parts and its three roles as cards from code, so the file holds a placeholder paragraph where
  // each list stood, under its editable heading and the sentence before it; a list there would print beside the cards.
  it.each([
    ['What Sorrel & Salt Is', '{aboutPillars}'],
    ['Who Runs It', '{aboutRoles}'],
  ])('hold the about page’s %s placeholder %s, and no list beside it', (heading, placeholder) => {
    const body = byKey.get('about')?.body ?? '';
    const section = body.split(new RegExp(`^## ${heading}$`, 'm'))[1]?.split(/^#{1,6} /m)[0] ?? '';
    const blocks = section
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter((block) => block !== '');

    expect(body).toMatch(new RegExp(`^## ${heading}$`, 'm'));
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    expect(blocks[0]).not.toBe(placeholder);
    expect(blocks).toContain(placeholder);
    expect(section).not.toMatch(/^\s*[-*] /m);
  });
});

describe('loadDocuments', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'documents-fixture-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const write = (name: string, text: string) => writeFileSync(join(root, name), text);

  it('reads the key, title, lede and day from the front matter, and the rest as the body', () => {
    write(
      'fixture-policy.md',
      [
        '---',
        'key: privacy',
        'title: Fixture Policy',
        'lede: What the fixture keeps.',
        'published: 2026-03-04',
        '---',
        '',
        '## Fixture Section',
        '',
        'Fixture text.[^1]',
        '',
        '[^1]: Fixture citation.',
        '',
      ].join('\n'),
    );

    expect(loadDocuments(root)).toEqual([
      {
        key: 'privacy',
        title: 'Fixture Policy',
        lede: 'What the fixture keeps.',
        publishedOn: new Date('2026-03-04T00:00:00Z'),
        body: '## Fixture Section\n\nFixture text.[^1]\n\n[^1]: Fixture citation.',
      },
    ]);
  });

  it('refuses a file whose front matter leaves a field out, naming the file', () => {
    write(
      'fixture-terms.md',
      [
        '---',
        'key: terms',
        'title: Fixture Terms',
        'published: 2026-03-04',
        '---',
        '',
        'Text.',
      ].join('\n'),
    );

    expect(() => loadDocuments(root)).toThrow(/fixture-terms\.md/);
  });

  it('refuses a day that is not a calendar date, naming the file', () => {
    write(
      'fixture-terms.md',
      [
        '---',
        'key: terms',
        'title: Fixture Terms',
        'lede: What the fixture binds.',
        'published: soon',
        '---',
        '',
        'Text.',
      ].join('\n'),
    );

    expect(() => loadDocuments(root)).toThrow(/fixture-terms\.md/);
  });
});
