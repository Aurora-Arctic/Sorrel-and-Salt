import {
  INGREDIENT_ELEMENTS,
  NOMENCLATURE_KINDS,
} from '@/modules/ingredients/schema/ingredient-enums';
import { capitalise } from '@/lib/text';
import type { SelectOption } from '../Field/types';

// The closed sets' choices, each value by its capitalised self: the form's,
// and the admin compendium filter's Classification, which offers the same.

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
