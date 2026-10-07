import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    it.each(['ftp://example.org/a', 'javascript:alert(1)', 'https://', 'testwort'])(
      'refuses %s as not a full http(s) address, at the url',
      (url) => {
        expect(failures({ ...MINIMAL.book, url, accessed: '2026-10-06' })).toEqual([
          { path: ['url'], message: 'Give the full address, starting http:// or https://' },
        ]);
      },
    );

    // MB.154: an address typed without its scheme is taken as https.
    it('takes an address with no scheme as https', () => {
      expect(
        ReferenceInput.parse({ ...MINIMAL.web_page, url: 'www.example.org/testwort' }).url,
      ).toBe('https://www.example.org/testwort');
    });

    it('refuses an address with a space, or a host with no dot, at the url', () => {
      for (const url of ['https://example.org/a b', 'https://fixture/testwort']) {
        expect(failures({ ...MINIMAL.web_page, url }), url).toEqual([
          {
            path: ['url'],
            message: 'That is not a web address: check it for spaces and a full site name',
          },
        ]);
      }
    });

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

  // MB.154, the owner's calls: what is typed is tidied the way the citation
  // prints it, on the server as on the form (reference-format.ts).
  describe('formatting', () => {
    it('tidies spacing, drops quotes around a title, and dashes ranges', () => {
      expect(
        ReferenceInput.parse({
          kind: 'article',
          title: ' "Notes  on   Mockleaf" ',
          container: '“Journal of Fixtures”',
          authors: 'Placeholder,   Bram',
          volume: '3',
          issue: '1-2',
          published: '1950-51',
          pages: '12 - 19',
        }),
      ).toEqual({
        kind: 'article',
        title: 'Notes on Mockleaf',
        container: 'Journal of Fixtures',
        authors: 'Placeholder, Bram',
        volume: '3',
        issue: '1–2',
        published: '1950–51',
        pages: '12–19',
      });
    });

    it('writes an edition given as a number or a word as Chicago does', () => {
      expect(ReferenceInput.parse({ ...MINIMAL.book, edition: 'second edition' }).edition).toBe(
        '2nd ed.',
      );
      expect(ReferenceInput.parse({ ...MINIMAL.book, edition: 'Rev. ed.' }).edition).toBe(
        'Rev. ed.',
      );
    });

    it('refuses a title that is only quotation marks, at the title', () => {
      expect(failedPaths({ ...MINIMAL.book, title: '""' })).toEqual([['title']]);
    });
  });

  // MB.154: the extra checks, each beside its field.
  describe('checks', () => {
    beforeEach(() => {
      vi.useFakeTimers({ now: new Date('2026-10-07T12:00:00Z'), toFake: ['Date'] });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('refuses a day read or modified after tomorrow, at the day', () => {
      expect(failures({ ...MINIMAL.web_page, accessed: '2026-10-09' })).toEqual([
        { path: ['accessed'], message: 'That day is in the future' },
      ]);
      expect(failures({ ...MINIMAL.web_page, modified: '2026-11-01' })).toEqual([
        { path: ['modified'], message: 'That day is in the future' },
      ]);
      // Tomorrow is already today east of Greenwich.
      expect(
        ReferenceInput.safeParse({ ...MINIMAL.web_page, accessed: '2026-10-08' }).success,
      ).toBe(true);
    });

    it('refuses a last modified day after the day it was read, at the modified day', () => {
      expect(
        failures({ ...MINIMAL.web_page, modified: '2026-10-06', accessed: '2026-10-01' }),
      ).toEqual([
        { path: ['modified'], message: 'It cannot have been modified after the day it was read' },
      ]);
      expect(
        ReferenceInput.safeParse({
          ...MINIMAL.web_page,
          modified: '2026-10-01',
          accessed: '2026-10-01',
        }).success,
      ).toBe(true);
    });

    it('refuses a published date with no year, at the date', () => {
      expect(failures({ ...MINIMAL.book, published: 'soon' })).toEqual([
        {
          path: ['published'],
          message: 'Give the year it was published — 1985, November 1950 — or n.d. for none',
        },
      ]);
      for (const published of ['November 1950', 'Summer/Autumn 2013', 'n.d.', 'forthcoming']) {
        expect(ReferenceInput.safeParse({ ...MINIMAL.book, published }).success, published).toBe(
          true,
        );
      }
    });

    it('refuses pages that are not numbers, on any kind, at the pages', () => {
      expect(failures({ ...MINIMAL.chapter, pages: 'the middle' })).toEqual([
        { path: ['pages'], message: 'Give the pages as numbers: 112, or 399–412' },
      ]);
      expect(ReferenceInput.parse({ ...MINIMAL.chapter, pages: 'xii-xv' }).pages).toBe('xii–xv');
    });

    it("refuses an article's volume or issue that is not a number, at each", () => {
      expect(failures({ ...MINIMAL.article, volume: 'vol. 3', issue: 'Summer' })).toEqual([
        { path: ['volume'], message: 'Give the volume as a number: 51' },
        { path: ['issue'], message: 'Give the issue as a number: 2' },
      ]);
    });

    // Why the refusal above is the article's: a book's volume is a statement.
    it("takes a book's volume as Chicago words it", () => {
      expect(ReferenceInput.safeParse({ ...MINIMAL.book, volume: '4 vols.' }).success).toBe(true);
    });
  });
});
