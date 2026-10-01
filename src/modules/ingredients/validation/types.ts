import type { NomenclatureKind } from '../schema/ingredient-enums';

// Apart from the module's types.ts, which reaches the schema tables: a form
// loads this file, so it imports only what a validation file may.

/** The list fields `dropBlankEntries` clears of blank entries, in either variant. */
export interface Lists {
  deities?: string[] | null;
  substitutes?: string[] | null;
  folkNames?: string[] | null;
}

/** What `crossFieldRules` reads of either variant's value. */
export interface Parsed {
  name: string;
  canonicalName?: string | null;
  nomenclature: NomenclatureKind;
  folkNames?: string[] | null;
}
