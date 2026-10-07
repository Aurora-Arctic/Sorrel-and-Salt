import { z } from 'zod';
import { REFERENCE_KINDS } from '../schema/ingredient-enums';
import {
  FORMAT_OF,
  ISO_DAY,
  addressProblem,
  holdsYear,
  isNumberList,
  latestDay,
} from './reference-format';
import type { ReferenceTextField } from './types';

// One reference as the form submits it and the service parses it (MB.153):
// the CHECKs MB.152 put on `references`, each refusal pathed to the field it
// is about rather than surfacing as a constraint name, plus the form's own
// rule that a book needs a date (claude-docs/db/references.md). Each field is
// tidied as it is parsed — spacing, a title's wrapping quotes, a range's
// dash, an address's scheme, an edition's form — and held to MB.154's
// checks, the owner's calls: a day not yet come, a page that is not a number
// (reference-format.ts; the same doc, "Formatting and checks").

/**
 * A text field as Chicago prints it: formatted as the form formats it when
 * left, and a blank an absence, as the table's CHECKs require.
 */
const optionalText = (field: ReferenceTextField) =>
  z
    .string()
    .nullish()
    .transform((value) => {
      if (value == null) return value;
      const formatted = FORMAT_OF[field](value);
      return formatted === '' ? null : formatted;
    });

/** A full day, `YYYY-MM-DD`, or absent: `modified` and `accessed` are `date`s. */
const optionalDay = (field: 'modified' | 'accessed') =>
  optionalText(field).pipe(z.iso.date({ error: 'Give the day as YYYY-MM-DD' }).nullish());

/**
 * Absolute http(s), as `references_url_absolute` holds it, and an address a
 * browser can follow to a named site; one typed without its scheme is taken
 * as https first.
 */
const url = optionalText('url').superRefine((value, ctx) => {
  const problem = value == null ? undefined : addressProblem(value);
  if (problem) ctx.addIssue({ code: 'custom', message: problem });
});

/** Where each kind's container is named, and so what its refusal says. */
const CONTAINER_OF = {
  chapter: 'Name the book this chapter is in',
  article: 'Name the journal this article is in',
  entry: 'Name the reference work this entry is in',
} as const;

export const ReferenceInput = z
  .object({
    kind: z.enum(REFERENCE_KINDS, { error: 'Choose what kind of source this is' }),
    title: z
      .string({ error: 'Give the source its title' })
      .transform(FORMAT_OF.title)
      .pipe(z.string().min(1, { error: 'Give the source its title' })),
    authors: optionalText('authors'),
    container: optionalText('container'),
    contributors: optionalText('contributors'),
    edition: optionalText('edition'),
    volume: optionalText('volume'),
    issue: optionalText('issue'),
    series: optionalText('series'),
    place: optionalText('place'),
    publisher: optionalText('publisher'),
    published: optionalText('published'),
    pages: optionalText('pages'),
    host: optionalText('host'),
    url,
    modified: optionalDay('modified'),
    accessed: optionalDay('accessed'),
    note: optionalText('note'),
  })
  .superRefine((value, ctx) => {
    const refuse = (field: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [field], message });

    if (value.kind in CONTAINER_OF && value.container == null) {
      refuse('container', CONTAINER_OF[value.kind as keyof typeof CONTAINER_OF]);
    }
    if (value.kind === 'web_page') {
      if (value.url == null) refuse('url', 'A web page needs its address');
      if (value.accessed == null) refuse('accessed', 'A web page needs the day it was read');
    } else if (value.accessed != null && value.url == null) {
      refuse('accessed', 'A day read goes with an address — add the URL, or clear the day');
    }
    if (value.kind === 'book' && value.published == null) {
      refuse('published', 'A book needs the year it was published');
    } else if (value.published != null && !holdsYear(value.published)) {
      refuse(
        'published',
        'Give the year it was published — 1985, November 1950 — or n.d. for none',
      );
    }
    if (value.pages != null && !isNumberList(value.pages)) {
      refuse('pages', 'Give the pages as numbers: 112, or 399–412');
    }
    // An article's are numbers; a book's volume is a statement, "4 vols.".
    if (value.kind === 'article') {
      if (value.volume != null && !isNumberList(value.volume)) {
        refuse('volume', 'Give the volume as a number: 51');
      }
      if (value.issue != null && !isNumberList(value.issue)) {
        refuse('issue', 'Give the issue as a number: 2');
      }
    }
    // A day may be tomorrow, which east of Greenwich is already today. Only
    // a well-formed day is compared — a malformed one is refused as that
    // already — and ISO days compare as strings. A day refused as not yet
    // come is not refused again for its order.
    const latest = latestDay();
    const day = (field: 'modified' | 'accessed') => {
      const on = value[field];
      return on != null && ISO_DAY.test(on) ? on : undefined;
    };
    const [modified, accessed] = [day('modified'), day('accessed')];
    if (modified !== undefined && modified > latest) {
      refuse('modified', 'That day is in the future');
    } else if (modified !== undefined && accessed !== undefined && modified > accessed) {
      refuse('modified', 'It cannot have been modified after the day it was read');
    }
    if (accessed !== undefined && accessed > latest)
      refuse('accessed', 'That day is in the future');
  });

export type ReferenceInput = z.output<typeof ReferenceInput>;
