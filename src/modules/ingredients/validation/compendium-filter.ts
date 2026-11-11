import { z } from 'zod';
import { MIN_QUERY_LENGTH } from './query-length';
import { RowId, optionalText } from '../../../lib/validation';
import {
  CATEGORY_MODES,
  COMPENDIUM_LISTINGS,
  COMPENDIUM_ORDERS,
  COMPENDIUM_SORTS,
  INGREDIENT_ELEMENTS,
  INGREDIENT_SOURCES,
  NOMENCLATURE_KINDS,
  TOXIC_FILTERS,
} from '../schema/ingredient-enums';

// Zod only, so the form side loads it too (claude-docs/validation.md, "Where the schemas live").

/**
 * Optional text as a filter takes it: blank, null or missing is no filter, so
 * undefined, where a column's optional text keeps null for the absence it stores.
 */
const filterText = optionalText().transform((value) => value ?? undefined);

/** A list of text values as a filter takes it: each trimmed, blanks dropped, and an empty, null or missing list is no filter. Any one value matches. */
const filterTexts = z
  .array(z.string())
  .nullish()
  .transform((values) => {
    const kept = (values ?? []).map((value) => value.trim()).filter((value) => value !== '');
    return kept.length > 0 ? kept : undefined;
  });

/** A list of `item` as a filter takes it: an empty, null or missing list is no filter. */
const listOrNone = <Item extends z.ZodType>(item: Item) =>
  z
    .array(item)
    .nullish()
    .transform((list) => (list && list.length > 0 ? list : undefined));

/** An option of one of `values`, where null or missing is no filter. */
const nullishEnum = <const Values extends readonly [string, ...string[]]>(values: Values) =>
  z
    .enum(values)
    .nullish()
    .transform((value) => value ?? undefined);

/** A to-do list switch: true narrows the list, and false, null or missing is no filter. */
const onlyTrue = z
  .boolean()
  .nullish()
  .transform((only) => (only === true ? true : undefined));

/**
 * A list of row ids as a filter takes it. Each is checked as a uuid, because it reaches a `uuid`
 * comparison inside the keyset query, where a malformed id would come back as "Invalid cursor".
 */
const filterIds = listOrNone(RowId);

/** A list of elements as a filter takes it: a value that is none of the five is refused rather than matched to nothing. */
const filterElements = listOrNone(z.enum(INGREDIENT_ELEMENTS));

export const CompendiumFilter = z.object({
  // Counted in composed code points, so `ñ` is one character however it was typed.
  query: filterText.transform((query) =>
    query && Array.from(query.normalize('NFC')).length >= MIN_QUERY_LENGTH ? query : undefined,
  ),
  categoryIds: filterIds,
  // `all`, like null or missing, is no change: every listed category.
  categoryMode: z
    .enum(CATEGORY_MODES)
    .nullish()
    .transform((mode) => (mode === 'any' ? mode : undefined)),
  // The facets: within each list any value matches, and the lists AND.
  // Text is folded by the read, so `Oil` and ` oil ` are one form.
  forms: filterTexts,
  deityIds: filterIds,
  zodiacSigns: filterTexts,
  celestialBodies: filterTexts,
  elements: filterElements,
  // `any`, like null or missing, is no filter.
  toxic: z
    .enum(TOXIC_FILTERS)
    .nullish()
    .transform((setting) => (setting === 'any' ? undefined : (setting ?? undefined))),
  // The keeper's to-do list: entries citing nothing. False is no filter.
  withoutReferences: onlyTrue,
  // The keeper's other to-do list: entries with no live form. False is no filter.
  withoutForms: onlyTrue,
  // A curator's review mark: true keeps the reviewed entries, false the
  // ones needing review; null or missing is no filter. The service refuses it
  // without a curator's session, so the coven list never picks it.
  reviewed: z
    .boolean()
    .nullish()
    .transform((reviewed) => reviewed ?? undefined),
  // Which entries a curator's list reads: shown (the default, and the public's only view), hidden or all. The service refuses any other
  // setting without a curator's session, so the coven list never picks it.
  listing: z
    .enum(COMPENDIUM_LISTINGS)
    .nullish()
    .transform((listing) => listing ?? 'shown'),
  // The column the list sorts on: name, or the sourcing score. Null or missing is the default order, by name or best match. The
  // service refuses the sourcing score without a curator's session, as the score is a curator's alone.
  sort: nullishEnum(COMPENDIUM_SORTS),
  // Which way the sort runs; `desc` reverses it. Read only beside a sort, so it never reverses best match.
  order: nullishEnum(COMPENDIUM_ORDERS),
  // Carry each entry's sourcing score: the admin list's alone, which the service refuses without a curator's session.
  withSourcingScore: z.boolean().optional(),
  // How the entries are classified; `unknown` is the formal names still to look up.
  nomenclature: nullishEnum(NOMENCLATURE_KINDS),
});

export type CompendiumFilterInput = z.input<typeof CompendiumFilter>;
export type CompendiumFilter = z.output<typeof CompendiumFilter>;

// The coven's list takes the compendium's search, categories and facets but not
// the keeper's two to-do lists; the two settings that need a coven's own rows
// and jars are its alone.
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
  // Where an entry came from; null or missing keeps both.
  source: nullishEnum(INGREDIENT_SOURCES),
  // Entries with a jar not at 0. False is no filter.
  inStock: onlyTrue,
  // Entries with a jar badged Low Stock or Out of Stock. False is no filter.
  lowStockOnly: onlyTrue,
});

export type WorkspaceIngredientFilterInput = z.input<typeof WorkspaceIngredientFilter>;
