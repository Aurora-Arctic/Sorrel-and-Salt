import { z } from 'zod';
import { RowId, optionalText } from '../../../lib/validation';
import { NOMENCLATURE_KINDS } from '../schema/ingredient-enums';

// The compendium list's filter as the `compendium` query receives it, parsed
// by the service because the browser is not the only caller. Zod only, like
// every validation file: the form's side of the search box loads it too
// (claude-docs/validation.md, "Where the schemas live").

/**
 * Optional text as a filter takes it: blank, null or missing is no filter, so
 * undefined, where a column's optional text keeps null for the absence it stores.
 */
const filterText = optionalText().transform((value) => value ?? undefined);

/**
 * The shortest query that searches. One character is a trigram or two that
 * half the compendium shares at the search's threshold, so it filters and
 * ranks by noise; shorter is no search at all.
 */
export const MIN_QUERY_LENGTH = 2;

export const CompendiumFilter = z.object({
  // Counted in composed code points, so `ñ` is one character however it was typed.
  query: filterText.transform((query) =>
    query && Array.from(query.normalize('NFC')).length >= MIN_QUERY_LENGTH ? query : undefined,
  ),
  categoryIds: z
    .array(RowId)
    .nullish()
    .transform((ids) => (ids && ids.length > 0 ? ids : undefined)),
  form: filterText,
  // The admin's to-do list: entries citing nothing (MB.153). False is no filter.
  withoutReferences: z
    .boolean()
    .nullish()
    .transform((only) => (only === true ? true : undefined)),
  // How the entries are classified; `unknown` is the formal names still to look up (M5.5).
  nomenclature: z
    .enum(NOMENCLATURE_KINDS)
    .nullish()
    .transform((kind) => kind ?? undefined),
});

export type CompendiumFilterInput = z.input<typeof CompendiumFilter>;
export type CompendiumFilter = z.output<typeof CompendiumFilter>;
