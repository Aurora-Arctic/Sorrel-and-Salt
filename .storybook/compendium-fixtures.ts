import type {
  CompendiumFacetCounts,
  CompendiumListFilter,
} from '../src/components/CompendiumList/types';

// A compendium filter with nothing chosen, and facet counts with nothing in them. The lists
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
};

export const NO_FACETS: CompendiumFacetCounts = {
  forms: [],
  deities: [],
  categories: [],
  zodiac: [],
  celestialBodies: [],
  elements: [],
  toxic: [],
  withoutReferences: 0,
  withoutForms: 0,
};
