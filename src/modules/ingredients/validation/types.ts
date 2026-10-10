import type { CitationFields } from '../../../lib/types';
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

/**
 * One entry that links a row by `IdKey` or names one, as the schema reads it:
 * either half may be blank or missing until `linkOrNameRules` has run.
 */
export type LinkOrNameFields<IdKey extends string> = { [K in IdKey]?: string | null } & {
  name?: string | null;
};

/**
 * One such entry as the schema parses it: a row to link, or a name — exactly
 * one, as each such table's `num_nonnulls` CHECK holds it.
 */
export type LinkOrName<IdKey extends string> =
  ({ [K in IdKey]: string } & { name: null }) | ({ [K in IdKey]: null } & { name: string });

/** What each of an entry's refusals says, in the noun of what it lists. */
export interface LinkOrNameMessages {
  /** Both halves given. */
  both: string;
  /** Neither half given, or only blanks. */
  neither: string;
  /** A link that is not an id, so names nothing. */
  noSuchLink: string;
  /** The same row linked twice. */
  linkRepeated: string;
  /** The same name typed twice, in any case. */
  nameRepeated: string;
}

/** One substitute as the schema reads it. */
export type SubstituteFields = LinkOrNameFields<'ingredientId'>;

/**
 * One substitute as the schema parses it (DESIGN.md §5, `ingredient_substitutes`):
 * an ingredient to link, or the name of one that is not entered.
 */
export type SubstituteEntry = LinkOrName<'ingredientId'>;

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

/** One deity as the schema reads it. */
export type DeityFields = LinkOrNameFields<'deityId'>;

/**
 * One deity as the schema parses it (DESIGN.md §5, `ingredient_deities`): the
 * curated deity picked, whose name the service writes beside the link, or a
 * name typed.
 */
export type DeityEntry = LinkOrName<'deityId'>;

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
  references?: ReferenceLinkFields[] | null;
  categoryIds?: string[] | null;
}

/** A reference's text fields, every one but the kind: what `FORMAT_OF` formats (MB.154). */
export type ReferenceTextField = Exclude<keyof CitationFields, 'kind'>;

/** How one text field is tidied, the same on the form as it is left and in the schema. */
export type FieldFormat = (text: string) => string;
