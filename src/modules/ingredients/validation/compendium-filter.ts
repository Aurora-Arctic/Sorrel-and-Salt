import { z } from 'zod';

// The compendium list's filter as the `compendium` query receives it, parsed
// by the service because the browser is not the only caller. Zod only, like
// every validation file: the form's side of the search box loads it too
// (claude-docs/validation.md, "Where the schemas live").

/** Optional text: trimmed, and blank is an absence — no filter — rather than a value. */
const optionalText = z
  .string()
  .trim()
  .nullish()
  .transform((value) => (value ? value : undefined));

/**
 * An id as Postgres's `uuid` type takes it, any version and variant: the
 * seed's fixture ids are written by hand, and `z.uuid()` would refuse them.
 */
export const RowId = z.guid();

/**
 * The shortest term that searches. One character is a trigram or two that
 * half the compendium shares at the search's threshold, so it filters and
 * ranks by noise; shorter is no search at all.
 */
export const MIN_SEARCH_LENGTH = 2;

export const CompendiumFilter = z.object({
  // Counted in composed code points, so `ñ` is one character however it was typed.
  search: optionalText.transform((term) =>
    term && Array.from(term.normalize('NFC')).length >= MIN_SEARCH_LENGTH ? term : undefined,
  ),
  categoryIds: z
    .array(RowId)
    .nullish()
    .transform((ids) => (ids && ids.length > 0 ? ids : undefined)),
  form: optionalText,
});

export type CompendiumFilterInput = z.input<typeof CompendiumFilter>;
export type CompendiumFilter = z.output<typeof CompendiumFilter>;
