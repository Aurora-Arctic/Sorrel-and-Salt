import {
  CITED_ENTRY_FIELDS,
  CITED_VARIANT_FIELDS,
  type CitedEntryField,
  type CitedVariantField,
  INGREDIENT_ELEMENTS,
  NAME_BASES,
  NOMENCLATURE_KINDS,
} from '@/modules/ingredients/schema/ingredient-enums';
import { capitalise } from '@/lib/text';
import type { SelectOption } from '../Field/types';

const optionsOf = (values: readonly string[]): SelectOption[] =>
  values.map((value) => ({ value, label: capitalise(value) }));

/**
 * The label `options` give `value`, as a summary or a table says a choice:
 * "Botanical" for `botanical`. A value the options lack is said as itself,
 * so a closed set grown on the server is never shown blank.
 */
export const labelOf = (options: readonly SelectOption[], value: string): string =>
  options.find((option) => option.value === value)?.label ?? value;

export const NOMENCLATURE_OPTIONS = optionsOf(NOMENCLATURE_KINDS);
export const ELEMENT_OPTIONS = optionsOf(INGREDIENT_ELEMENTS);
export const NAME_BASIS_OPTIONS = optionsOf(NAME_BASES);

const CITED_FIELD_LABELS: Record<CitedEntryField | CitedVariantField, string> = {
  name: 'Name',
  canonicalName: 'Formal Name',
  nomenclature: 'Classification',
  form: 'Form',
  description: 'Description',
  elements: 'Elements',
  celestialBodies: 'Celestial Bodies',
  zodiacSigns: 'Zodiac Signs',
  colors: 'Colours',
  safetyNotes: 'Safety Notes',
  toxic: 'Toxic',
  folkNames: 'Folk Names',
  deities: 'Deities',
  categories: 'Categories',
  substitutes: 'Substitute Ingredients',
};
const supportOptions = (fields: readonly (CitedEntryField | CitedVariantField)[]) =>
  fields.map((value) => ({ value, label: CITED_FIELD_LABELS[value] }));

export const ENTRY_SUPPORT_OPTIONS = supportOptions(CITED_ENTRY_FIELDS);
export const VARIANT_SUPPORT_OPTIONS = supportOptions(CITED_VARIANT_FIELDS);
