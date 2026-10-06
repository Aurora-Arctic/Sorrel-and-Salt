import type { CitationFields, CitationPart } from './types';

// The one Chicago renderer (MB.151; DESIGN.md §5, "The citation is rendered,
// never stored"): a reference's fields to its bibliography entry, as parts
// in italic or roman. Pure and client-safe, beside `slugify`, because the
// page, the picker, the service's sort and the seed's test all call it. The
// rules per kind, and why italics are marks in three fields rather than a
// Markdown library, are claude-docs/db/references.md, "The renderer".

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * `fields` in Chicago bibliography form, one sentence per element the kind
 * prints, each closed by a period it does not already carry. A field the
 * kind does not print is not rendered, and a blank one is absent. Neighbouring
 * runs of one style are merged, so the parts alternate.
 */
export function renderCitation(fields: CitationFields): CitationPart[] {
  const sentences = sentencesOf(fields).filter((sentence) => sentence.length > 0);
  const runs = sentences.flatMap((sentence, index) =>
    index === 0 ? sentence : [roman(' '), ...sentence],
  );
  return merge(runs);
}

/** The citation as one plain string, italics dropped: `citation` on the wire. */
export function citationText(fields: CitationFields): string {
  return renderCitation(fields)
    .map((part) => part.text)
    .join('');
}

/**
 * Bibliography order for two plain citations: alphabetical, case- and
 * accent-insensitive, each filed less a leading quotation mark and an initial
 * _A_, _An_ or _The_ (CMOS 14.67).
 */
export function byCitation(a: string, b: string): number {
  return sortKey(a).localeCompare(sortKey(b), 'en', { sensitivity: 'base' });
}

function sortKey(citation: string): string {
  return citation.replace(/^["“‘']+/, '').replace(/^(?:A|An|The)\s+/i, '');
}

/** Each kind's sentences, in Chicago's order (claude-docs/db/references.md, "The renderer"). */
function sentencesOf(fields: CitationFields): CitationPart[][] {
  const f = present(fields);
  const title = f.title ?? fields.title;
  const tail = [
    sentence(f.host),
    lastModified(f.modified, true),
    accessed(f.accessed),
    sentence(f.url),
    note(f.note),
  ];

  switch (fields.kind) {
    case 'book':
      return [
        sentence(f.authors),
        closed(marked(title, true)),
        sentence(f.contributors),
        sentence(f.edition),
        sentence(f.volume),
        sentence(f.series),
        sentence(publication(f)),
        ...tail,
      ];
    case 'chapter':
      return [
        sentence(f.authors),
        quoted(title),
        closed([
          roman('In '),
          ...marked(f.container ?? '', true),
          ...[f.contributors, f.pages].flatMap((part) => (part ? [roman(`, ${part}`)] : [])),
        ]),
        sentence(f.edition),
        sentence(f.volume),
        sentence(f.series),
        sentence(publication(f)),
        ...tail,
      ];
    case 'article':
      return [sentence(f.authors), quoted(title), closed(journal(f)), ...tail];
    case 'entry':
      return [
        sentence(f.authors),
        [
          ...marked(f.container ?? '', false),
          ...(f.edition ? [roman(`, ${f.edition}`)] : []),
          roman(', s.v. '),
          ...quoted(title),
        ],
        sentence(f.contributors),
        sentence(publication(f)),
        ...tail,
      ];
    case 'web_page':
      return [
        sentence(f.authors),
        quoted(title),
        f.container ? closed(marked(f.container, false)) : [],
        sentence(f.publisher),
        webDates(f.published, f.modified),
        accessed(f.accessed),
        sentence(f.url),
        note(f.note),
      ];
  }
}

/** The fields with every blank one taken as absent. */
function present(fields: CitationFields): Partial<Record<keyof CitationFields, string>> {
  return Object.fromEntries(
    Object.entries(fields).flatMap(([key, value]) =>
      typeof value === 'string' && value.trim() !== '' ? [[key, value.trim()]] : [],
    ),
  );
}

/** `Place: Publisher, Published`, each missing piece dropped with its punctuation. */
function publication(f: Partial<Record<keyof CitationFields, string>>): string | undefined {
  const house = [f.place, f.publisher].filter(Boolean).join(': ');
  return [house, f.published].filter(Boolean).join(', ') || undefined;
}

/**
 * An article's journal clause: with a volume, `_Journal_ 51, no. 2 (1988): 399`;
 * without one, `_Journal_, no. 2, Summer 2013, 399`.
 */
function journal(f: Partial<Record<keyof CitationFields, string>>): CitationPart[] {
  const name = marked(f.container ?? '', true);
  const issue = f.issue ? `, no. ${f.issue}` : '';
  if (f.volume) {
    const date = f.published ? ` (${f.published})` : '';
    const pages = f.pages ? `: ${f.pages}` : '';
    return [...name, roman(` ${f.volume}${issue}${date}${pages}`)];
  }
  const rest = [f.published, f.pages].filter(Boolean).map((part) => `, ${part}`);
  return [...name, roman(`${issue}${rest.join('')}`)];
}

/** A web page's dates: `Published; last modified Modified`, or either alone. */
function webDates(published: string | undefined, modified: string | undefined): CitationPart[] {
  if (!published) return lastModified(modified, true);
  if (!modified) return sentence(published);
  return closed([roman(`${published}; `), ...lastModified(modified, false)]);
}

function lastModified(modified: string | undefined, capital: boolean): CitationPart[] {
  if (!modified) return [];
  return closed([roman(`${capital ? 'Last' : 'last'} modified ${day(modified)}`)]);
}

function accessed(on: string | undefined): CitationPart[] {
  return on ? closed([roman(`Accessed ${day(on)}`)]) : [];
}

/** A note, after the citation in parentheses, its period inside them. */
function note(text: string | undefined): CitationPart[] {
  if (!text) return [];
  return [roman('('), ...closed(marked(text, false)), roman(')')];
}

/** A title in quotation marks, its period inside them. */
function quoted(title: string): CitationPart[] {
  return [roman('"'), ...closed(marked(title, false)), roman('"')];
}

/** One roman field as a sentence of its own, or nothing when it is absent. */
function sentence(text: string | undefined): CitationPart[] {
  return text ? closed([roman(text)]) : [];
}

/** `runs`, with a period added unless the last of them already ends in one. */
function closed(runs: CitationPart[]): CitationPart[] {
  const text = runs.map((run) => run.text).join('');
  return /[.?!]["”]?$/.test(text) ? runs : [...runs, roman('.')];
}

/** A date as Chicago prints it: `2026-10-06` → `October 6, 2026`. */
function day(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined;
  if (!match || !month) return iso;
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

const roman = (text: string): CitationPart => ({ text, italic: false });

/**
 * A field that may carry `_…_` marks, in the style `italic` the kind gives
 * it, each marked span in the other style. CommonMark's rule for `_`: a mark
 * opens where no letter or digit precedes it and no space follows, and closes
 * where no space precedes it and no letter or digit follows, so an underscore
 * inside a word is text. An unclosed or empty mark is text.
 */
function marked(text: string, italic: boolean): CitationPart[] {
  const runs: CitationPart[] = [];
  let start = 0;
  let index = 0;
  while (index < text.length) {
    const close = text[index] === '_' && opens(text, index) ? closingMark(text, index) : -1;
    if (close === -1) {
      index += 1;
      continue;
    }
    if (index > start) runs.push({ text: text.slice(start, index), italic });
    runs.push({ text: text.slice(index + 1, close), italic: !italic });
    start = close + 1;
    index = close + 1;
  }
  if (start < text.length) runs.push({ text: text.slice(start), italic });
  return runs;
}

const WORD = /[\p{L}\p{N}]/u;
const SPACE = /\s/;

function opens(text: string, at: number): boolean {
  const before = text[at - 1];
  const after = text[at + 1];
  return (before === undefined || !WORD.test(before)) && after !== undefined && !SPACE.test(after);
}

/** The index of the mark closing the one at `open`, or -1; never an empty span. */
function closingMark(text: string, open: number): number {
  for (let at = open + 2; at < text.length; at += 1) {
    if (text[at] !== '_') continue;
    const before = text[at - 1] ?? '';
    const after = text[at + 1];
    if (!SPACE.test(before) && (after === undefined || !WORD.test(after))) return at;
  }
  return -1;
}

/** Neighbouring runs of one style as one, and empty runs gone. */
function merge(runs: CitationPart[]): CitationPart[] {
  const parts: CitationPart[] = [];
  for (const run of runs) {
    if (run.text === '') continue;
    const last = parts[parts.length - 1];
    if (last && last.italic === run.italic) last.text += run.text;
    else parts.push({ ...run });
  }
  return parts;
}
