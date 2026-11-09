import type {
  CompendiumFacets,
  FacetCount,
  WorkspaceIngredientFacets,
} from '@/modules/ingredients';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';
import { capitalise, fold } from '../../lib/text';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import type {
  CategoryFacetChoice,
  CompendiumCategoryChoice,
  CompendiumFacetCounts,
  CompendiumFacetVocabulary,
  DeityFacetChoice,
  FacetCountsById,
  FacetChoice,
  FormFacetChoice,
} from './types';

export interface DeityVocabulary {
  slug: string;
  name: string;
  tradition: string;
}

export interface FacetVocabularies {
  formIcons: ReadonlyMap<string, FormGroupIcon>;
  deities: ReadonlyMap<string, DeityVocabulary>;
  categories: ReadonlyMap<string, CompendiumCategoryChoice>;
}

const SOURCE_LABELS = { local: 'Local', compendium: 'Compendium' } as const;

const TOXIC_LABELS = { toxic: 'Toxic', not_toxic: 'Not Toxic' } as const;

const REVIEW_LABELS = { reviewed: 'Reviewed', needs_review: 'Needs Review' } as const;

const named = ({ value, count }: FacetCount): FacetChoice => ({ value, label: value, count });

export function covenFacetCounts(
  facets: WorkspaceIngredientFacets,
  vocabularies: FacetVocabularies,
): CompendiumFacetCounts {
  return {
    ...compendiumFacetCounts(
      { ...facets, withoutReferences: 0, withoutForms: 0, reviewed: null },
      vocabularies,
    ),
    source: facets.source.map(({ value, count }) => ({
      value,
      label: SOURCE_LABELS[value],
      count,
    })),
    inStock: facets.inStock,
    lowStockOnly: facets.lowStockOnly,
  };
}

/**
 * The service's counts as the props the compendium list takes. A deity or category the vocabulary no
 * longer holds is dropped (the count predates a delete). Pure, so it is tested against plain maps.
 */
export function compendiumFacetCounts(
  facets: CompendiumFacets,
  { formIcons, deities, categories }: FacetVocabularies,
): CompendiumFacetCounts {
  return {
    forms: facets.forms.map(({ value, count }): FormFacetChoice => ({
      value,
      label: formLabel(value),
      count,
      icon: formIcons.get(fold(value)) ?? null,
    })),
    deities: facets.deities.flatMap(({ value, count }): DeityFacetChoice[] => {
      const deity = deities.get(value);
      return deity
        ? [{ value: deity.slug, label: deity.name, count, tradition: deity.tradition }]
        : [];
    }),
    categories: facets.categories.flatMap(({ value, count }): CategoryFacetChoice[] => {
      const category = categories.get(value);
      return category
        ? [{ value: category.slug, label: category.name, count, group: category.group }]
        : [];
    }),
    zodiac: facets.zodiacSigns.map(named),
    celestialBodies: facets.celestialBodies.map(named),
    elements: facets.elements.map(({ value, count }) => ({
      value,
      label: capitalise(value),
      count,
    })),
    toxic: facets.toxic.map(({ value, count }) => ({
      value,
      label: TOXIC_LABELS[value],
      count,
    })),
    withoutReferences: facets.withoutReferences,
    withoutForms: facets.withoutForms,
    ...(facets.reviewed && {
      reviewed: facets.reviewed.map(({ value, count }) => ({
        value,
        label: REVIEW_LABELS[value],
        count,
      })),
    }),
  };
}

/** The vocabularies a list's props carry, keyed as the counts name them. */
export function vocabulariesOf(
  categories: readonly CompendiumCategoryChoice[],
  vocabulary: CompendiumFacetVocabulary,
): FacetVocabularies {
  return {
    formIcons: new Map(Object.entries(vocabulary.formIcons)),
    deities: new Map(vocabulary.deities.map(({ id, ...deity }) => [id, deity])),
    categories: new Map(categories.map((category) => [category.id, category])),
  };
}

/**
 * A list's counts as its filter's choices: a coven's, told by its Source counts, through
 * `covenFacetCounts`, any other through `compendiumFacetCounts`.
 */
export function facetChoices(
  counts: FacetCountsById,
  vocabularies: FacetVocabularies,
): CompendiumFacetCounts {
  return 'source' in counts
    ? covenFacetCounts(counts, vocabularies)
    : compendiumFacetCounts(counts, vocabularies);
}
