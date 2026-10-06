import type { INGREDIENT_ELEMENTS, NomenclatureKind } from '../schema/ingredient-enums';

// Apart from the module's types.ts, which reaches the schema tables: a form
// loads this file, so it imports only what a validation file may.

/** The list fields `dropBlankEntries` clears of blank entries and takes as absent when empty, in either variant. */
export interface Lists {
  elements?: (typeof INGREDIENT_ELEMENTS)[number][] | null;
  planets?: string[] | null;
  zodiacSigns?: string[] | null;
  deities?: string[] | null;
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

/** One reference as the schema reads it: the id may be blank until the rules have run. */
export interface ReferenceLinkFields {
  referenceId: string;
  locator?: string | null;
}

/**
 * One reference an ingredient cites (DESIGN.md §7): an existing reference's
 * id, and the locator the link carries — "p. 112" — or null.
 */
export interface ReferenceLinkEntry {
  referenceId: string;
  locator: string | null;
}

/** What `crossFieldRules` reads of either variant's value. */
export interface Parsed {
  name: string;
  canonicalName?: string | null;
  nomenclature: NomenclatureKind;
  folkNames?: string[] | null;
  substitutes?: SubstituteFields[] | null;
  references?: ReferenceLinkFields[] | null;
}
