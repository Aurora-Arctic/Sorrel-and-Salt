import { marked, merge, UNDER_ENTRY } from './citation';
import type { CitationKind, CitationPart, ShortCitationFields } from './types';

// Reads `citation.ts`'s `_…_` marks the same way (claude-docs/db/references.md, "The short form").

const PART_KINDS: ReadonlySet<CitationKind> = new Set(['chapter', 'article', 'entry', 'web_page']);

/** An editor's, translator's or compiler's role after the names: ", ed.", ", eds.", ", ed. and trans.". */
const ROLE = /,\s*(?:eds?|trans|comps?)\.(?:\s*(?:,|and)\s*(?:eds?|trans|comps?)\.)*\s*$/i;

const ET_AL = /,?\s+et\s+al\.?$/i;

/** A generational suffix, which is not a name: "Jr.", "Sr.", "III". */
const SUFFIX = /^(?:Jr|Sr)\.?$|^[IVX]+$/;

const NAME_BREAK = /\s*,\s*(?:and\s+)?|\s+and\s+/;

const PARTICLES = new Set([
  'al',
  'bin',
  'da',
  'das',
  'de',
  'del',
  'della',
  'den',
  'der',
  'di',
  'do',
  'dos',
  'du',
  'ibn',
  'la',
  'le',
  'ten',
  'ter',
  'van',
  'von',
]);

const DANGLING = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'from',
  'in',
  'into',
  'nor',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
]);

const SHORT_TITLE_WORDS = 4;

/** Four or more authors give the first and "et al."; with no authors the title leads, except a reference-work entry, cited "under" its headword. `continued` puts the comma a locator follows inside the quotation marks. */
export function renderShortCitation(
  fields: ShortCitationFields,
  continued = false,
): CitationPart[] {
  const names = fields.authors ? surnames(fields.authors) : undefined;
  const container = fields.container?.trim();
  if (!names && fields.kind === 'entry' && container) {
    return merge([
      ...marked(container, false),
      roman(`, ${UNDER_ENTRY} `),
      ...quoted(marked(fields.title.trim(), false), continued),
    ]);
  }
  const part = PART_KINDS.has(fields.kind);
  const title = shortTitle(fields.title, !part);
  const lead = names ? [roman(`${names}, `)] : [];
  const body = part
    ? quoted(title, continued)
    : [...title, ...(continued && !asks(title) ? [roman(',')] : [])];
  return merge([...lead, ...body]);
}

export function shortCitationText(fields: ShortCitationFields, continued = false): string {
  return plain(renderShortCitation(fields, continued));
}

/** Written as a bibliography prints it ("Fixture, Ada, and Bram Testwort"), so the first comma ends the first surname; with no comma it is one name as written. */
function surnames(authors: string): string | undefined {
  let text = authors.trim().replace(ROLE, '');
  const etAl = ET_AL.test(text);
  text = text.replace(ET_AL, '').trim();
  if (text === '') return undefined;
  const comma = text.indexOf(',');
  if (comma === -1) return etAl ? `${text} et al.` : text;
  const names = [
    text.slice(0, comma).trim(),
    ...text
      .slice(comma + 1)
      .split(NAME_BREAK)
      .map((name) => name.trim())
      .filter(Boolean)
      // The first author's given names, and any suffix set off by a comma.
      .slice(1)
      .filter((name) => !SUFFIX.test(name))
      .map(surnameOf),
  ];
  if (etAl || names.length >= 4) return `${names[0]} et al.`;
  if (names.length === 3) return `${names[0]}, ${names[1]}, and ${names[2]}`;
  return names.join(' and ');
}

function surnameOf(name: string): string {
  const words = name.split(/\s+/);
  while (words.length > 1 && SUFFIX.test(words[words.length - 1])) words.pop();
  let start = words.length - 1;
  while (start > 0 && PARTICLES.has(words[start - 1].toLowerCase())) start -= 1;
  return words.slice(start).join(' ');
}

/** Cut to four words, not ending on "and", "of" or a comma. `italic` is the title's style, each `_…_` span the other. */
function shortTitle(title: string, italic: boolean): CitationPart[] {
  const runs = marked(title.trim(), italic);
  const text = plain(runs);
  const subtitle = /:\s|[?!](?=\s+\S)/.exec(text);
  // A colon goes with its subtitle; a question mark stays with its question.
  const end = subtitle && (subtitle[0].startsWith(':') ? subtitle.index : subtitle.index + 1);
  const main = end ? cut(runs, end) : runs;
  let words = wordsOf(main);
  if (words.length > 1 && /^(?:a|an|the)$/i.test(plain(words[0]))) words = words.slice(1);
  if (words.length > SHORT_TITLE_WORDS) {
    words = words.slice(0, SHORT_TITLE_WORDS);
    while (words.length > 1 && DANGLING.has(bare(plain(words[words.length - 1])))) words.pop();
  }
  const last = words[words.length - 1];
  if (last) {
    const end = last[last.length - 1];
    last[last.length - 1] = { ...end, text: end.text.replace(/[,;:]+$/, '') };
  }
  return merge(
    words.flatMap((word, index) => {
      if (index === 0) return word;
      // The space between two words takes their style when they share it.
      const before = words[index - 1][words[index - 1].length - 1];
      return [{ text: ' ', italic: before.italic && word[0].italic }, ...word];
    }),
  );
}

function cut(runs: CitationPart[], end: number): CitationPart[] {
  const kept: CitationPart[] = [];
  let at = 0;
  for (const run of runs) {
    if (at >= end) break;
    kept.push({ ...run, text: run.text.slice(0, end - at) });
    at += run.text.length;
  }
  return kept;
}

function wordsOf(runs: CitationPart[]): CitationPart[][] {
  const words: CitationPart[][] = [];
  let word: CitationPart[] = [];
  for (const run of runs) {
    for (const piece of run.text.split(/(\s+)/)) {
      if (piece === '') continue;
      if (/^\s+$/.test(piece)) {
        if (word.length > 0) words.push(word);
        word = [];
      } else {
        word.push({ text: piece, italic: run.italic });
      }
    }
  }
  if (word.length > 0) words.push(word);
  return words;
}

function quoted(title: CitationPart[], continued: boolean): CitationPart[] {
  const comma = continued && !asks(title) ? ',' : '';
  return [roman('"'), ...title, roman(`${comma}"`)];
}

const asks = (title: CitationPart[]) => /[?!]$/.test(plain(title));

const plain = (runs: CitationPart[]) => runs.map((run) => run.text).join('');

const bare = (word: string) => word.toLowerCase().replace(/^\W+|\W+$/g, '');

const roman = (text: string): CitationPart => ({ text, italic: false });
