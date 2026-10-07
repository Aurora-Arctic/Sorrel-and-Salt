import {
  INGREDIENT_ELEMENTS,
  NOMENCLATURE_KINDS,
} from '@/modules/ingredients/schema/ingredient-enums';
import type { SelectOption } from './types';

// The closed sets' choices, each value by its capitalised self: the form's,
// and the admin compendium filter's Classification, which offers the same.

const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
const optionsOf = (values: readonly string[]): SelectOption[] =>
  values.map((value) => ({ value, label: capitalise(value) }));

export const NOMENCLATURE_OPTIONS = optionsOf(NOMENCLATURE_KINDS);
export const ELEMENT_OPTIONS = optionsOf(INGREDIENT_ELEMENTS);
