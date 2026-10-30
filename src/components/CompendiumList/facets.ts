import type {
  CompendiumFacets,
  FacetCount,
  WorkspaceIngredientFacets,
} from '@/modules/ingredients';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';
import { capitalise } from '../../lib/text';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import type {
  CategoryFacetChoice,
  CompendiumCategoryChoice,
  CompendiumFacetCounts,
  DeityFacetChoice,
  FacetChoice,
  FormFacetChoice,
} from './types';

/** A live deity as the facets read it: its slug, its name and its tradition's name. */
export interface DeityVocabulary {
  slug: string;
  name: string;
  tradition: string;
}

/**
 * What turns the service's counts into choices a filter can show: the
 * counts name a deity or a category by id and a form by its spelling, and
 * the page reads the rest once.
 */
export interface FacetVocabularies {
  /** Each curated form's group icon, by the form's name folded to lower case. */
  formIcons: ReadonlyMap<string, FormGroupIcon>;
  /** Every live deity under a live tradition, by id. */
  deities: ReadonlyMap<string, DeityVocabulary>;
  /** Every live category, by id. */
  categories: ReadonlyMap<string, CompendiumCategoryChoice>;
}

/** The Source strip's two values as the facets name them, and what each says. */
const SOURCE_LABELS = { local: 'Local', compendium: 'Compendium' } as const;

/** The toxic strip's two settings as the facets name them, and what each says. */
const TOXIC_LABELS = { toxic: 'Toxic', not_toxic: 'Not Toxic' } as const;

/** The Reviewed strip's two settings as the facets name them, and what each says. */
const REVIEW_LABELS = { reviewed: 'Reviewed', needs_review: 'Needs Review' } as const;

/** Counts that carry no vocabulary of their own: the value is the label. */
const named = ({ value, count }: FacetCount): FacetChoice => ({ value, label: value, count });

/**
 * A coven's counts as the props its panel takes: the compendium's kinds mapped as `compendiumFacetCounts`
 * maps them, plus Source and In Stock. A coven has no No Refs or No Form switch, so those counts read zero.
 */
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
      icon: formIcons.get(value.toLocaleLowerCase()) ?? null,
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
