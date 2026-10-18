import { z } from 'zod';
import { RowId, optionalText } from '../../../lib/validation';
import {
  CATEGORY_MODES,
  INGREDIENT_ELEMENTS,
  INGREDIENT_SOURCES,
  NOMENCLATURE_KINDS,
  TOXIC_FILTERS,
} from '../schema/ingredient-enums';

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
 * A list of text values as a filter takes it: each trimmed and the blank ones
 * dropped, and a list left empty, null or missing is no filter. Any one of
 * the values matches (M11.22).
 */
const filterTexts = z
  .array(z.string())
  .nullish()
  .transform((values) => {
    const kept = (values ?? []).map((value) => value.trim()).filter((value) => value !== '');
    return kept.length > 0 ? kept : undefined;
  });

/**
 * A list of row ids as a filter takes it: an empty list, null or missing is
 * no filter. Each is checked as a uuid, since it reaches a `uuid` comparison
 * inside the keyset query, whose one client text was the cursor: unchecked, a
 * malformed id would come back as "Invalid cursor".
 */
const filterIds = z
  .array(RowId)
  .nullish()
  .transform((ids) => (ids && ids.length > 0 ? ids : undefined));

/**
 * A list of elements as a filter takes it: a value that is none of the five is
 * refused rather than matched to nothing, and a list left empty, null or
 * missing is no filter. Any one of them matches (M8.13).
 */
const filterElements = z
  .array(z.enum(INGREDIENT_ELEMENTS))
  .nullish()
  .transform((elements) => (elements && elements.length > 0 ? elements : undefined));

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
  categoryIds: filterIds,
  // `all`, like null or missing, is no change: every listed category (M8.12).
  categoryMode: z
    .enum(CATEGORY_MODES)
    .nullish()
    .transform((mode) => (mode === 'any' ? mode : undefined)),
  // M11.22's facets: within each list any value matches, and the lists AND.
  // Text is folded by the read, so `Oil` and ` oil ` are one form.
  forms: filterTexts,
  deityIds: filterIds,
  zodiacSigns: filterTexts,
  celestialBodies: filterTexts,
  // M8.13: an entry whose own `elements` holds any one listed.
  elements: filterElements,
  // `any`, like null or missing, is no filter.
  toxic: z
    .enum(TOXIC_FILTERS)
    .nullish()
    .transform((setting) => (setting === 'any' ? undefined : (setting ?? undefined))),
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

// The coven's ingredient list takes the compendium's search, categories and
// facets (M9.4, M11.22), but not the admin's two to-do lists, so it parses
// them exactly as the compendium does; the two settings that need a coven's
// own rows and jars (M9.7) are its alone.
export const WorkspaceIngredientFilter = CompendiumFilter.pick({
  query: true,
  categoryIds: true,
  categoryMode: true,
  forms: true,
  deityIds: true,
  zodiacSigns: true,
  celestialBodies: true,
  elements: true,
  toxic: true,
}).extend({
  // M9.7: where an entry came from; null or missing keeps both.
  source: z
    .enum(INGREDIENT_SOURCES)
    .nullish()
    .transform((source) => source ?? undefined),
  // M9.7: entries with a jar not at 0. False is no filter.
  inStock: z
    .boolean()
    .nullish()
    .transform((only) => (only === true ? true : undefined)),
});

export type WorkspaceIngredientFilterInput = z.input<typeof WorkspaceIngredientFilter>;
