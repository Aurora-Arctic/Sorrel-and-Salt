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
import { FIELD_NOUNS } from './values';

const optionsOf = (values: readonly string[]): SelectOption[] =>
  values.map((value) => ({ value, label: capitalise(value) }));

export const NOMENCLATURE_OPTIONS = optionsOf(NOMENCLATURE_KINDS);
export const ELEMENT_OPTIONS = optionsOf(INGREDIENT_ELEMENTS);
export const NAME_BASIS_OPTIONS = optionsOf(NAME_BASES);

const CITED_FIELD_LABELS: Record<CitedEntryField | CitedVariantField, string> = {
  name: 'Name',
  canonicalName: 'Formal Name',
  nomenclature: 'Classification',
  form: 'Form',
  description: 'Description',
  elements: FIELD_NOUNS.elements.label,
  celestialBodies: FIELD_NOUNS.celestialBodies.label,
  zodiacSigns: FIELD_NOUNS.zodiacSigns.label,
  colors: FIELD_NOUNS.colors.label,
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
