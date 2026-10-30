import { describe, expect, it } from 'vitest';
import { renderShortCitation, shortCitationText } from '@/lib/short-citation';
import type { CitationPart, ShortCitationFields } from '@/lib/types';

// A source's Chicago short form (claude-docs/db/references.md, "The short form"): the authors'
// surnames and a short title. Every name and title is invented. The parts are joined back with
// `_` around the italic ones, as citation.test.ts joins the full form's.

const marked = (parts: CitationPart[]) =>
  parts.map(({ text, italic }) => (italic ? `_${text}_` : text)).join('');

const short = (fields: ShortCitationFields, continued = false) =>
  marked(renderShortCitation(fields, continued));

const book = (authors: string | null, title = 'The Testwort Herbal') =>
  short({ kind: 'book', authors, title });

describe('renderShortCitation', () => {
  describe('the authors', () => {
    it('gives one author by surname, the title after a comma', () => {
      expect(book('Fixture, Ada')).toBe('Fixture, _Testwort Herbal_');
    });

    it('joins two authors by "and"', () => {
      expect(book('Fixture, Ada, and Bram Testwort')).toBe(
        'Fixture and Testwort, _Testwort Herbal_',
      );
      expect(book('Fixture, Ada and Bram Testwort')).toBe(
        'Fixture and Testwort, _Testwort Herbal_',
      );
    });

    it('lists three authors as a series', () => {
      expect(book('Fixture, Ada, Bram Testwort, and Cara Mockley')).toBe(
        'Fixture, Testwort, and Mockley, _Testwort Herbal_',
      );
    });

    it('gives four or more authors as the first and "et al."', () => {
      expect(book('Fixture, Ada, Bram Testwort, Cara Mockley, and Dov Placeholder')).toBe(
        'Fixture et al., _Testwort Herbal_',
      );
      expect(book('Fixture, Ada, et al.')).toBe('Fixture et al., _Testwort Herbal_');
    });

    it("drops an editor's or translator's role", () => {
      expect(book('Fixture, Ada, ed.')).toBe('Fixture, _Testwort Herbal_');
      expect(book('Fixture, Ada, and Bram Testwort, eds.')).toBe(
        'Fixture and Testwort, _Testwort Herbal_',
      );
      expect(book('Fixture, Ada, ed. and trans.')).toBe('Fixture, _Testwort Herbal_');
    });

    it("keeps a later author's particle and drops a suffix", () => {
      expect(book('Fixture, Ada, Jr., and Bram van der Testwort III')).toBe(
        'Fixture and van der Testwort, _Testwort Herbal_',
      );
    });

    it('gives a name with no comma as written: an organisation, or a single name', () => {
      expect(book('Fixture Guild of Mockford')).toBe(
        'Fixture Guild of Mockford, _Testwort Herbal_',
      );
    });

    it('leads with the title when there are no authors', () => {
      expect(book(null)).toBe('_Testwort Herbal_');
      expect(book('  ')).toBe('_Testwort Herbal_');
      expect(short({ kind: 'web_page', title: 'Testwort', container: 'Fixture Wiki' })).toBe(
        '"Testwort"',
      );
    });
  });

  describe('the short title', () => {
    it('drops a subtitle after a colon, and keeps a question it asks', () => {
      expect(book('Fixture, Ada', 'Testwort: A Life in Fixtures')).toBe('Fixture, _Testwort_');
      expect(book('Fixture, Ada', 'What Is Testwort? A Primer')).toBe(
        'Fixture, _What Is Testwort?_',
      );
    });

    it('drops a leading article and keeps four words, a cut ending on no "and" and no comma', () => {
      expect(book('Fixture, Ada', 'A History of Fixture Herbs in Mockford')).toBe(
        'Fixture, _History of Fixture Herbs_',
      );
      expect(book('Fixture, Ada', 'Herbs and Roots and Barks of Mockford')).toBe(
        'Fixture, _Herbs and Roots_',
      );
      expect(book('Fixture, Ada', 'Herbs, Roots, Barks, Leaves, and More')).toBe(
        'Fixture, _Herbs, Roots, Barks, Leaves_',
      );
    });

    it('keeps a title that is only an article', () => {
      expect(book(null, 'The')).toBe('_The_');
    });

    it('sets a marked span in the other style, as the full form does', () => {
      expect(
        renderShortCitation({
          kind: 'book',
          authors: 'Fixture, Ada',
          title: 'The Voyage of the _Testwort_ to Mockford',
        }),
      ).toEqual([
        { text: 'Fixture, ', italic: false },
        { text: 'Voyage of the', italic: true },
        { text: ' Testwort', italic: false },
      ]);
    });
  });

  describe('italics or quotation marks', () => {
    it('sets a whole work in italics and a part of one in quotation marks', () => {
      const of = (kind: ShortCitationFields['kind']) =>
        short({ kind, authors: 'Placeholder, Bram', title: 'Notes on Mockleaf', container: 'X' });
      expect(of('book')).toBe('Placeholder, _Notes on Mockleaf_');
      expect(of('chapter')).toBe('Placeholder, "Notes on Mockleaf"');
      expect(of('article')).toBe('Placeholder, "Notes on Mockleaf"');
      expect(of('entry')).toBe('Placeholder, "Notes on Mockleaf"');
      expect(of('web_page')).toBe('Placeholder, "Notes on Mockleaf"');
    });

    it('cites an entry with no authors by its work, "under", and its headword', () => {
      expect(
        short({ kind: 'entry', title: 'The Testwort', container: 'Fixture Encyclopedia' }),
      ).toBe('Fixture Encyclopedia, under "The Testwort"');
      expect(
        short({ kind: 'entry', title: 'Testwort', container: '_Encyclopedia of Fixtures_' }),
      ).toBe('_Encyclopedia of Fixtures_, under "Testwort"');
    });
  });

  describe('continued by a locator', () => {
    it('takes a comma, inside the quotation marks', () => {
      expect(book('Fixture, Ada')).toBe('Fixture, _Testwort Herbal_');
      expect(short({ kind: 'book', authors: 'Fixture, Ada', title: 'Testwort Herbal' }, true)).toBe(
        'Fixture, _Testwort Herbal_,',
      );
      expect(
        short({ kind: 'article', authors: 'Placeholder, Bram', title: 'Notes on Mockleaf' }, true),
      ).toBe('Placeholder, "Notes on Mockleaf,"');
    });

    it('takes none after a question', () => {
      expect(short({ kind: 'book', title: 'What Is Testwort?' }, true)).toBe('_What Is Testwort?_');
      expect(short({ kind: 'web_page', title: 'Why Mockleaf?' }, true)).toBe('"Why Mockleaf?"');
    });
  });

  it('reads as one plain string, italics dropped', () => {
    expect(
      shortCitationText({ kind: 'book', authors: 'Fixture, Ada', title: 'The Testwort Herbal' }),
    ).toBe('Fixture, Testwort Herbal');
  });
});
