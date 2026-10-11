import { describe, expect, it } from 'vitest';
import {
  FORMAT_OF,
  addressProblem,
  chicagoEdition,
  dashNumbers,
  dashRanges,
  formatLocator,
  holdsYear,
  isNumberList,
  latestDay,
  tidy,
  unquote,
  withScheme,
} from '@/modules/ingredients/validation/reference-format';

// MB.154, the owner's calls: what a reference's fields are tidied into, the
// same on the form as a field is left and in the shared schema the service
// parses with, and the shapes the schema's extra checks accept
// (claude-docs/db/references.md, "Formatting and checks").

describe('tidy', () => {
  it('trims, and collapses every run of whitespace, newlines included, to one space', () => {
    expect(tidy('  A   Herbal\nof\t Fixtures ')).toBe('A Herbal of Fixtures');
    expect(tidy('   ')).toBe('');
  });
});

describe('unquote', () => {
  it.each([
    ['"Notes on Mockleaf"', 'Notes on Mockleaf'],
    ['“Notes on Mockleaf”', 'Notes on Mockleaf'],
    ["'Notes on Mockleaf'", 'Notes on Mockleaf'],
    ['‘Notes on Mockleaf’', 'Notes on Mockleaf'],
  ])('drops the quotation marks wrapping %s, which the citation adds itself', (typed, kept) => {
    expect(unquote(typed)).toBe(kept);
  });

  it('keeps marks that do not wrap the whole, or do not pair', () => {
    expect(unquote('On "Testwort" and Others')).toBe('On "Testwort" and Others');
    expect(unquote('"Testwort')).toBe('"Testwort');
    expect(unquote('“Testwort"')).toBe('“Testwort"');
    expect(unquote('"')).toBe('"');
  });
});

describe('dashRanges', () => {
  it.each([
    ['12-19', '12–19'],
    ['pp. 12 - 19, 40-41', 'pp. 12–19, 40–41'],
    ['1882—88', '1882–88'],
    ['1882‐88', '1882–88'],
  ])('sets a range between numbers with an en dash: %s', (typed, dashed) => {
    expect(dashRanges(typed)).toBe(dashed);
  });

  it('leaves a hyphen that joins words, and a day written as a date, alone', () => {
    expect(dashRanges('s.v. Jack-in-the-green')).toBe('s.v. Jack-in-the-green');
    expect(dashRanges('2013-10-06')).toBe('2013-10-06');
  });
});

describe('dashNumbers', () => {
  it('dashes a range of roman numerals too, in a field that holds only numbers', () => {
    expect(dashNumbers('xii-xv')).toBe('xii–xv');
    expect(dashNumbers('399 - 412')).toBe('399–412');
  });
});

describe('withScheme', () => {
  it('gives an address with no scheme https://', () => {
    expect(withScheme('example.org/testwort')).toBe('https://example.org/testwort');
    expect(withScheme('www.example.org')).toBe('https://www.example.org');
  });

  it('leaves one that has a scheme, or does not look like a host, as typed', () => {
    expect(withScheme('http://example.org')).toBe('http://example.org');
    expect(withScheme('ftp://example.org/a')).toBe('ftp://example.org/a');
    expect(withScheme('javascript:alert(1)')).toBe('javascript:alert(1)');
    expect(withScheme('testwort')).toBe('testwort');
    expect(withScheme('')).toBe('');
  });
});

describe('chicagoEdition', () => {
  it.each([
    ['2', '2nd ed.'],
    ['2nd', '2nd ed.'],
    ['2nd edition', '2nd ed.'],
    ['2 ed', '2nd ed.'],
    ['second edition', '2nd ed.'],
    ['Third', '3rd ed.'],
    ['1', '1st ed.'],
    ['11', '11th ed.'],
    ['12th edn.', '12th ed.'],
    ['21', '21st ed.'],
    ['103', '103rd ed.'],
  ])('writes %s as Chicago does', (typed, chicago) => {
    expect(chicagoEdition(typed)).toBe(chicago);
  });

  it('leaves an edition it does not read as a number as typed', () => {
    expect(chicagoEdition('Rev. ed.')).toBe('Rev. ed.');
    expect(chicagoEdition('2nd rev. ed.')).toBe('2nd rev. ed.');
    expect(chicagoEdition('')).toBe('');
  });
});

describe('formatLocator', () => {
  it('tidies a locator and dashes its ranges, and leaves its words as typed', () => {
    expect(formatLocator('  pp. 12-19,  40;  chap. 3 ')).toBe('pp. 12–19, 40; chap. 3');
    expect(formatLocator('112')).toBe('112');
    expect(formatLocator('s.v. Hecate')).toBe('s.v. Hecate');
  });
});

describe('FORMAT_OF', () => {
  it('formats each field by what it holds', () => {
    expect(FORMAT_OF.title(' "Notes  on Mockleaf" ')).toBe('Notes on Mockleaf');
    expect(FORMAT_OF.container('“Journal of Fixtures”')).toBe('Journal of Fixtures');
    expect(FORMAT_OF.pages('12-19')).toBe('12–19');
    expect(FORMAT_OF.published('1882-88')).toBe('1882–88');
    expect(FORMAT_OF.edition('second')).toBe('2nd ed.');
    expect(FORMAT_OF.url(' example.org/x ')).toBe('https://example.org/x');
    expect(FORMAT_OF.authors(' Fixture,   Ada ')).toBe('Fixture, Ada');
    // A day is the date input's own, and only trimmed.
    expect(FORMAT_OF.accessed(' 2026-10-06 ')).toBe('2026-10-06');
  });
});

describe('addressProblem', () => {
  it('takes a full http(s) address with a host', () => {
    for (const url of ['https://example.org/a', 'http://sub.example.co.uk/Greek_Mythology/']) {
      expect(addressProblem(url), url).toBeUndefined();
    }
  });

  it('refuses another scheme, or none, as not a full address', () => {
    for (const url of ['ftp://example.org/a', 'javascript:alert(1)', 'https://', 'testwort']) {
      expect(addressProblem(url), url).toBe('Give the full address, starting http:// or https://');
    }
  });

  it('refuses spaces, and a host with no dot, as not a web address', () => {
    for (const url of ['https://example.org/a b', 'https://localhost/x', 'https://fixture/']) {
      expect(addressProblem(url), url).toBe(
        'That is not a web address: check it for spaces and a full site name',
      );
    }
  });
});

describe('holdsYear', () => {
  it('takes a date holding a year, or n.d. or forthcoming', () => {
    for (const published of [
      '1985',
      'November 1950',
      'Summer/Autumn 2013',
      '1882–88',
      'n.d.',
      'Forthcoming',
    ]) {
      expect(holdsYear(published), published).toBe(true);
    }
  });

  it('refuses one with no year', () => {
    for (const published of ['soon', '85', 'November', 'nd']) {
      expect(holdsYear(published), published).toBe(false);
    }
  });
});

describe('isNumberList', () => {
  it('takes numbers, roman numerals and ranges, in a list', () => {
    for (const text of ['51', 'xii', 'XIV', '399–412', '12a', '12–19, 40', 'iv–ix']) {
      expect(isNumberList(text), text).toBe(true);
    }
  });

  it('refuses words, and a range or a list left open', () => {
    for (const text of ['Summer', 'no. 2', 'vol. 3', '12–', '–19', '1,']) {
      expect(isNumberList(text), text).toBe(false);
    }
  });
});

describe('latestDay', () => {
  // A day east of Greenwich can already be tomorrow there: one day's grace.
  it('is the day after today, in UTC', () => {
    expect(latestDay(new Date('2026-10-07T23:30:00Z'))).toBe('2026-10-08');
    expect(latestDay(new Date('2026-12-31T00:00:00Z'))).toBe('2027-01-01');
  });
});
