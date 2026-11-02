import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadDocuments } from '@/db/seed/documents';
import { fromRoot } from '../../support/paths';

// The site's four documents as the seed reads them, database-free: the markdown files under `documents/` are the seed's only source,
// so a file that would not seed, or whose sources would not link, fails here before it merges. What running the seed writes is
// documents.test.ts's (claude-docs/design-decisions/m15.59-document-editor-scope.md, "Moving the four documents into rows").

/** The labels a body cites (`[^3]`), and the labels it defines (`[^3]: …`), each once. */
function footnotesOf(body: string): { cited: string[]; defined: string[] } {
  const defined = [...body.matchAll(/^\[\^([^\]]+)\]:/gm)].map(([, label]) => label);
  const cited = [...body.matchAll(/\[\^([^\]]+)\](?!:)/g)].map(([, label]) => label);
  return { cited: [...new Set(cited)].sort(), defined: [...new Set(defined)].sort() };
}

describe('the document files', () => {
  const documents = loadDocuments(fromRoot('documents'));
  const byKey = new Map(documents.map((document) => [document.key, document]));

  it('hold the four documents, one file each', () => {
    expect(documents.map((document) => document.key).sort()).toEqual([
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
      documents.map((document) => [document.key, document.publishedOn.toISOString()]),
    );
    expect(days).toEqual({
      'code-of-ethics': '2026-11-02T00:00:00.000Z',
      disclaimer: '2026-11-02T00:00:00.000Z',
      privacy: '2026-11-01T00:00:00.000Z',
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
