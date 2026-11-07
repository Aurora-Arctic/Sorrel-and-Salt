import type { CompendiumListFilter } from '../src/components/CompendiumList/types';
import type { CompendiumFacets } from '../src/modules/ingredients';

// A compendium filter with nothing chosen, and facet counts with nothing in them, as the service answers them. The lists
// and cards stories start from these (a coven's list spreads them and adds its own controls).
export const NO_FILTER: CompendiumListFilter = {
  query: '',
  forms: [],
  withoutReferences: false,
  withoutForms: false,
  hidden: false,
  elements: [],
  categories: [],
  categoryMode: 'all',
  deities: [],
  zodiac: [],
  celestialBodies: [],
  covens: [],
  covensNot: false,
  toxic: '',
  reviewed: '',
  sort: '',
  order: '',
};

export const NO_COUNTS: CompendiumFacets = {
  forms: [],
  deities: [],
  categories: [],
  zodiacSigns: [],
  celestialBodies: [],
  elements: [],
  toxic: [],
  withoutReferences: 0,
  withoutForms: 0,
  reviewed: null,
};
