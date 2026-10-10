import { ISO_DAY, QUOTE_PAIRS } from '../../../lib/citation';
import type { FieldFormat, ReferenceTextField } from './types';

// How a reference's fields are tidied, and the shapes the schema's extra
// checks accept (MB.154, the owner's calls). Pure and client-safe: the shared
// schema applies each format as it parses, so the server stores it, and the
// form applies the same one as a field is left, so the user sees it first. A
// format changes only what it can read with certainty — spacing, the marks
// around a title, a dash between numbers, an address's missing scheme, an
// edition given as a number — and leaves everything else as typed, since
// Chicago's forms vary more than any rule here would guess
// (claude-docs/db/references.md, "Formatting and checks").

/** Trimmed, every run of whitespace — a newline, a tab — one space. */
export const tidy: FieldFormat = (text) => text.replace(/\s+/g, ' ').trim();

/**
 * A title less the quotation marks wrapping the whole of it: the citation
 * quotes a chapter's or an article's title itself, so typed marks would print
 * twice. Marks inside it, a title within a title, stay.
 */
export const unquote: FieldFormat = (text) => {
  const close = QUOTE_PAIRS[text.charAt(0)];
  return close !== undefined && text.length > 1 && text.endsWith(close)
    ? text.slice(1, -1).trim()
    : text;
};

/** A hyphen, or another dash, as it may be typed between two numbers. */
const DASHES = '[-‐‑‒—―]';
const DIGIT_RANGE = new RegExp(`(\\d)\\s*${DASHES}\\s*(?=\\d)`, 'g');
const NUMERAL_RANGE = new RegExp(`\\b([ivxlcdm]+)\\s*${DASHES}\\s*(?=[ivxlcdm]+\\b)`, 'gi');

/**
 * Each range between numbers set with an en dash, as Chicago prints it:
 * "12-19" → "12–19", "1882—88" → "1882–88". A hyphen joining words stays,
 * and so does a day written as a date.
 */
export const dashRanges: FieldFormat = (text) =>
  ISO_DAY.test(text) ? text : text.replace(DIGIT_RANGE, '$1–');

/**
 * As `dashRanges`, and a range of roman numerals too, "xii-xv" → "xii–xv":
 * only in a field that holds nothing but numbers, where a hyphen between two
 * runs of those letters cannot be a word's.
 */
export const dashNumbers: FieldFormat = (text) => dashRanges(text).replace(NUMERAL_RANGE, '$1–');

/** A scheme already given: "https:", "ftp:", "javascript:". */
const SCHEME = /^[a-z][a-z\d+.-]*:/i;
/** What reads as a host: a name, a dot, a name, and a path or nothing after. */
const BARE_HOST = /^[\w-]+(\.[\w-]+)+([/?#]|$)/;

/** An address typed without its scheme, "example.org/x", taken as https. */
export const withScheme: FieldFormat = (text) =>
  !SCHEME.test(text) && BARE_HOST.test(text) ? `https://${text}` : text;

const ORDINAL_WORDS = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
];
const EDITION = new RegExp(
  `^(?:(\\d+)(?:st|nd|rd|th)?|(${ORDINAL_WORDS.join('|')}))\\.?(?:\\s*(?:ed|edn|edition)\\.?)?$`,
  'i',
);

/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th … 21st, 22nd. */
function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}

/**
 * An edition given as a number or a word as Chicago writes it: "2",
 * "second edition", "2nd edn" → "2nd ed.". Anything else — "Rev. ed.",
 * "2nd rev. ed." — stays as typed.
 */
export const chicagoEdition: FieldFormat = (text) => {
  const match = EDITION.exec(text);
  if (!match) return text;
  const n = match[1] ? Number(match[1]) : ORDINAL_WORDS.indexOf(match[2].toLowerCase()) + 1;
  return `${ordinal(n)} ed.`;
};

/** A locator: tidied and its ranges dashed, its words — "s.v. Hecate", "chap. 3" — as typed. */
export const formatLocator: FieldFormat = (text) => dashRanges(tidy(text));

const title: FieldFormat = (text) => unquote(tidy(text));
const numbers: FieldFormat = (text) => dashNumbers(tidy(text));
const trimmed: FieldFormat = (text) => text.trim();

/**
 * Each field's format, by what it holds, in the order `CitationFields`
 * declares them, which is the order the form and the schema take them in.
 */
export const FORMAT_OF: Record<ReferenceTextField, FieldFormat> = {
  title,
  authors: tidy,
  container: title,
  contributors: tidy,
  edition: (text) => chicagoEdition(tidy(text)),
  volume: numbers,
  issue: numbers,
  series: tidy,
  place: tidy,
  publisher: tidy,
  published: (text) => dashRanges(tidy(text)),
  pages: numbers,
  host: tidy,
  url: (text) => withScheme(text.trim()),
  // The date input's own value, which needs no more.
  modified: trimmed,
  accessed: trimmed,
  note: tidy,
};

/**
 * A reference's text fields, every one but the kind: the one list of them,
 * read off `FORMAT_OF`, whose type holds it to `CitationFields`, so a field
 * added there and not formatted here fails the type check.
 */
export const REFERENCE_TEXT_FIELDS = Object.keys(FORMAT_OF) as readonly ReferenceTextField[];

/**
 * What is wrong with an address, or undefined when it is a full http(s) one
 * a browser can follow to a named site: no other scheme, no space, and a host
 * with a dot in it.
 */
export function addressProblem(url: string): string | undefined {
  if (!/^https?:\/\//i.test(url) || !URL.canParse(url)) {
    return 'Give the full address, starting http:// or https://';
  }
  if (/\s/.test(url) || !new URL(url).hostname.includes('.')) {
    return 'That is not a web address: check it for spaces and a full site name';
  }
  return undefined;
}

/** A year somewhere in it — "1985", "November 1950", "1882–88" — or "n.d." or "forthcoming". */
export const holdsYear = (published: string): boolean =>
  /\b\d{4}\b/.test(published) || /^(n\.\s?d\.|forthcoming)$/i.test(published);

const NUMBER = '(?:\\d+[a-z]?|[ivxlcdm]+)';
const NUMBER_RANGE = `${NUMBER}(?:\\s*–\\s*${NUMBER})?`;
const NUMBER_LIST = new RegExp(`^${NUMBER_RANGE}(?:\\s*,\\s*${NUMBER_RANGE})*$`, 'i');

/** Numbers, numerals, ranges and lists of them, dashed: "51", "xii", "399–412", "12–19, 40". */
export const isNumberList = (text: string): boolean => NUMBER_LIST.test(text);

/**
 * The latest day a reference may say it was read or modified: tomorrow in
 * UTC, since a day east of Greenwich can already be tomorrow there, and the
 * form and the server may not share a clock's zone.
 */
export function latestDay(now: Date = new Date()): string {
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}
