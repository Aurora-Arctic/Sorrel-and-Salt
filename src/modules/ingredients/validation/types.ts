import type { INGREDIENT_ELEMENTS, NomenclatureKind } from '../schema/ingredient-enums';

// Apart from the module's types.ts, which reaches the schema tables: a form
// loads this file, so it imports only what a validation file may.

/** The list fields `dropBlankEntries` clears of blank entries and takes as absent when empty, in either variant. */
export interface Lists {
  elements?: (typeof INGREDIENT_ELEMENTS)[number][] | null;
  planets?: string[] | null;
  zodiacSigns?: string[] | null;
  colors?: string[] | null;
  folkNames?: string[] | null;
}

/** One substitute as the schema reads it: either half may be blank or missing until the rules have run. */
export interface SubstituteFields {
  ingredientId?: string | null;
  name?: string | null;
}

/**
 * One substitute as the schema parses it (DESIGN.md §5, `ingredient_substitutes`):
 * an ingredient to link, or the name of one that is not entered — exactly one,
 * as the row's `num_nonnulls` CHECK holds it.
 */
export type SubstituteEntry =
  { ingredientId: string; name: null } | { ingredientId: null; name: string };

/** One deity as the schema reads it: either half may be blank or missing until the rules have run. */
export interface DeityFields {
  deityId?: string | null;
  name?: string | null;
}

/**
 * One deity as the schema parses it (DESIGN.md §5, `ingredient_deities`): the
 * curated deity picked, whose name the service writes beside the link, or a
 * name typed — exactly one.
 */
export type DeityEntry = { deityId: string; name: null } | { deityId: null; name: string };

/** What `crossFieldRules` reads of either variant's value. */
export interface Parsed {
  name: string;
  canonicalName?: string | null;
  nomenclature: NomenclatureKind;
  form?: string | null;
  formId?: string | null;
  planets?: string[] | null;
  zodiacSigns?: string[] | null;
  colors?: string[] | null;
  folkNames?: string[] | null;
  substitutes?: SubstituteFields[] | null;
  deities?: DeityFields[] | null;
}
