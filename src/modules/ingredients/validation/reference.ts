import { z } from 'zod';
import { REFERENCE_KINDS } from '../schema/ingredient-enums';

// One reference as the form submits it and the service parses it (MB.153):
// the CHECKs MB.152 put on `references`, each refusal pathed to the field it
// is about rather than surfacing as a constraint name, plus the form's own
// rule that a book needs a date (claude-docs/db/references.md).

/** Text as Chicago prints it: trimmed, and a blank is an absence, as the table's CHECKs require. */
const optionalText = z
  .string()
  .trim()
  .nullish()
  .transform((value) => (value === '' ? null : value));

/** A full day, `YYYY-MM-DD`, or absent: `modified` and `accessed` are `date`s. */
const optionalDay = optionalText.pipe(
  z.iso.date({ error: 'Give the day as YYYY-MM-DD' }).nullish(),
);

/** Absolute http(s), as `references_url_absolute` holds it, and an address a browser can follow. */
const url = optionalText.refine(
  (value) => value == null || (/^https?:\/\//.test(value) && URL.canParse(value)),
  { error: 'Give the full address, starting http:// or https://' },
);

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
      .trim()
      .min(1, { error: 'Give the source its title' }),
    authors: optionalText,
    container: optionalText,
    contributors: optionalText,
    edition: optionalText,
    volume: optionalText,
    issue: optionalText,
    series: optionalText,
    place: optionalText,
    publisher: optionalText,
    published: optionalText,
    pages: optionalText,
    host: optionalText,
    url,
    modified: optionalDay,
    accessed: optionalDay,
    note: optionalText,
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
    }
  });

export type ReferenceInput = z.output<typeof ReferenceInput>;
