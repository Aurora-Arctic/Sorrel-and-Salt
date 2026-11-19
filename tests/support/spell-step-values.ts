import type { SpellStepValue } from '@/components/SpellBuilder/steps/types';
import type { GroupColors } from '@/lib/types';

// A jar step as the builder and the spell page's side column both hold it, for the tests that draw
// Category Match from either.

export const categoryNamed = (name: string) => ({ id: `c-${name}`, name });

export function stepValue(
  name: string,
  categories: readonly string[],
  extra: Partial<SpellStepValue> = {},
): SpellStepValue {
  return {
    stepId: null,
    ingredientId: `i-${name}`,
    variantId: `v-${name}`,
    name,
    form: null,
    quantity: '',
    unit: '',
    savedUnit: null,
    body: null,
    icon: null,
    categories: categories.map(categoryNamed),
    jarUnit: null,
    safety: null,
    jar: null,
    ...extra,
  };
}

/** One group's colours for each named category, so every chip of theirs is drawn. */
export const colouredGroups = (names: readonly string[]): Map<string, GroupColors> =>
  new Map(names.map((name) => [`c-${name}`, { colorDark: '#8fb8de', colorLight: '#2f5d86' }]));

/**
 * A jar whose extra categories are added by three, two and one ingredients, met in the reverse
 * of that order and named in it too, so neither first-met nor name order passes for count order.
 */
export const RANKED_EXTRAS = {
  intended: [categoryNamed('Testintent')],
  steps: [
    stepValue('Fixture Basil', ['Testbane', 'Testcalm']),
    stepValue('Fixture Mugwort', ['Testward', 'Testcalm']),
    stepValue('Fixture Rue', ['Testward']),
    stepValue('Fixture Sage', ['Testward']),
  ],
  names: ['Testintent', 'Testbane', 'Testcalm', 'Testward'],
  order: ['Testward', 'Testcalm', 'Testbane'],
} as const;
