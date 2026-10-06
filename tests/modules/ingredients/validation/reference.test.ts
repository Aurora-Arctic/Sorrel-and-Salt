import { describe, expect, it } from 'vitest';
import { ReferenceInput } from '@/modules/ingredients/validation/reference';

// DESIGN.md §5, "References": a reference's fields as the form sends them,
// held to the CHECKs MB.152 put on the table — each refusal pathed to its
// field, per kind — plus the form's own rule that a book needs a date
// (claude-docs/design-decisions/mb.151-references.md).

/** The paths and messages a failed parse reported, which is what lands beside a field. */
function failures(input: unknown) {
  const result = ReferenceInput.safeParse(input);
  expect(result.success).toBe(false);
  return result.error?.issues.map(({ path, message }) => ({ path, message })) ?? [];
}

const failedPaths = (input: unknown) => failures(input).map(({ path }) => path);

// The least each kind takes, so a case varies one field against a row that
// is otherwise accepted.
const MINIMAL = {
  book: { kind: 'book', title: 'A Herbal of Fixture Covens', published: '1988' },
  chapter: { kind: 'chapter', title: 'On Testwort', container: 'The Fixture Reader' },
  article: {
    kind: 'article',
    title: 'A Note on Testwort',
    container: 'Journal of Invented Botany',
  },
  entry: { kind: 'entry', title: 'Testwort', container: 'Encyclopaedia Fixturalis' },
  web_page: {
    kind: 'web_page',
    title: 'Testwort',
    url: 'https://example.org/testwort',
    accessed: '2026-10-06',
  },
} as const;

describe('ReferenceInput', () => {
  it.each(Object.entries(MINIMAL))('takes the least a %s needs', (_kind, input) => {
    expect(ReferenceInput.safeParse(input).success).toBe(true);
  });

  it('trims every text field, and takes a blank one as absent', () => {
    expect(
      ReferenceInput.parse({
        ...MINIMAL.chapter,
        title: '  On Testwort ',
        authors: ' Testwort, Fixtura ',
        edition: '',
        pages: '   ',
        modified: '',
        note: null,
      }),
    ).toEqual({
      kind: 'chapter',
      title: 'On Testwort',
      container: 'The Fixture Reader',
      authors: 'Testwort, Fixtura',
      edition: null,
      pages: null,
      modified: null,
      note: null,
    });
  });

  it('takes every field filled', () => {
    expect(
      ReferenceInput.safeParse({
        kind: 'book',
        authors: 'Testwort, Fixtura, ed.',
        title: 'A Herbal of Fixture Covens',
        container: 'Collected Fixtures',
        contributors: 'Translated by Mock Fixture',
        edition: '2nd ed.',
        volume: '2 vols.',
        issue: '4',
        series: 'Handbooks of Invented Botany',
        place: 'Testford',
        publisher: 'Fixture Press',
        published: '1988',
        pages: '399–412',
        host: 'Invented Digital Library',
        url: 'http://example.org/herbal',
        modified: '2024-12-28',
        accessed: '2026-10-06',
        note: 'Each entry names the herb’s _Fixtura_.',
      }).success,
    ).toBe(true);
  });

  it('refuses a missing or blank title, at the title', () => {
    expect(failedPaths({ kind: 'book', published: '1988' })).toEqual([['title']]);
    expect(failedPaths({ ...MINIMAL.book, title: '  ' })).toEqual([['title']]);
  });

  it('refuses a missing kind, or one outside the five, at the kind', () => {
    expect(failedPaths({ title: 'Testwort' })).toEqual([['kind']]);
    expect(failedPaths({ ...MINIMAL.book, kind: 'other' })).toEqual([['kind']]);
  });

  describe('per kind', () => {
    it.each([
      ['chapter', 'Name the book this chapter is in'],
      ['article', 'Name the journal this article is in'],
      ['entry', 'Name the reference work this entry is in'],
    ] as const)('refuses a %s without its container, at the container', (kind, message) => {
      expect(failures({ ...MINIMAL[kind], container: ' ' })).toEqual([
        { path: ['container'], message },
      ]);
    });

    // Why the refusal above is the kind's: a book and a web page need none.
    it('takes a book or a web page without a container', () => {
      expect(ReferenceInput.safeParse(MINIMAL.book).success).toBe(true);
      expect(ReferenceInput.safeParse(MINIMAL.web_page).success).toBe(true);
    });

    it('refuses a web page without its address or the day it was read, at each', () => {
      expect(failures({ kind: 'web_page', title: 'Testwort' })).toEqual([
        { path: ['url'], message: 'A web page needs its address' },
        { path: ['accessed'], message: 'A web page needs the day it was read' },
      ]);
    });

    it('refuses a book without a date, at the date', () => {
      expect(failures({ ...MINIMAL.book, published: '' })).toEqual([
        { path: ['published'], message: 'A book needs the year it was published' },
      ]);
    });

    // A form rule, not the table's: why a chapter saves without one.
    it('takes a chapter, an article or an entry without a date', () => {
      for (const kind of ['chapter', 'article', 'entry'] as const) {
        expect(ReferenceInput.safeParse(MINIMAL[kind]).success, kind).toBe(true);
      }
    });
  });

  describe('the address and the days', () => {
    it.each(['ftp://example.org/a', 'www.example.org', 'javascript:alert(1)', 'https://'])(
      'refuses %s as not a full http(s) address, at the url',
      (url) => {
        expect(failures({ ...MINIMAL.book, url, accessed: '2026-10-06' })).toEqual([
          { path: ['url'], message: 'Give the full address, starting http:// or https://' },
        ]);
      },
    );

    it('takes an http or https address', () => {
      for (const url of ['http://example.org/a', 'https://example.org/Greek_Mythology/']) {
        expect(ReferenceInput.safeParse({ ...MINIMAL.book, url }).success, url).toBe(true);
      }
    });

    it('refuses an accessed day without an address, at the day', () => {
      expect(failures({ ...MINIMAL.book, accessed: '2026-10-06' })).toEqual([
        {
          path: ['accessed'],
          message: 'A day read goes with an address — add the URL, or clear the day',
        },
      ]);
    });

    it.each(['modified', 'accessed'])('refuses a %s that is not a calendar day', (field) => {
      const input = { ...MINIMAL.web_page, [field]: '6 October 2026' };

      expect(failedPaths(input)).toEqual([[field]]);
      expect(failedPaths({ ...MINIMAL.web_page, [field]: '2026-02-30' })).toEqual([[field]]);
    });
  });
});
