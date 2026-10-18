import type {
  CompendiumFacets,
  FacetCount,
  WorkspaceIngredientFacets,
} from '@/modules/ingredients';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';
import { capitalise } from '../../lib/text';
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
 * the page reads the rest once (M12.4).
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

/** Most entries first, then by label, so a tie reads alphabetically whatever order the ids came in. */
const byCountThenLabel = (a: FacetChoice, b: FacetChoice): number =>
  b.count - a.count || a.label.localeCompare(b.label);

/** Counts that carry no vocabulary of their own: the value is the label. */
const named = ({ value, count }: FacetCount): FacetChoice => ({ value, label: value, count });

/**
 * A coven's counts as the props its panel takes (M9.7): the compendium's kinds mapped as
 * `compendiumFacetCounts` maps them, and the Source strip and In Stock switch beside
 * them. A coven has no No Refs switch, so that count reads zero and nothing shows it. Not yet
 * called by a page: M9.6 builds the coven's list and reads `workspaceIngredientFacets` here.
 */
export function covenFacetCounts(
  facets: WorkspaceIngredientFacets,
  vocabularies: FacetVocabularies,
): CompendiumFacetCounts {
  return {
    ...compendiumFacetCounts({ ...facets, withoutReferences: 0 }, vocabularies),
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
 * The service's counts as the props the compendium list takes (M12.4). A
 * deity or category whose id the vocabulary no longer holds is dropped: the
 * count was read a moment before a delete, and a choice with no name or slug
 * could not be offered or written to the address. Pure, so it is tested
 * against plain maps.
 */
export function compendiumFacetCounts(
  facets: CompendiumFacets,
  { formIcons, deities, categories }: FacetVocabularies,
): CompendiumFacetCounts {
  return {
    forms: facets.forms
      .map(({ value, count }): FormFacetChoice => ({
        value,
        label: value,
        count,
        icon: formIcons.get(value.toLocaleLowerCase()) ?? null,
      }))
      .sort(byCountThenLabel),
    deities: facets.deities
      .flatMap(({ value, count }): DeityFacetChoice[] => {
        const deity = deities.get(value);
        return deity
          ? [{ value: deity.slug, label: deity.name, count, tradition: deity.tradition }]
          : [];
      })
      .sort((a, b) => byCountThenLabel(a, b) || a.tradition.localeCompare(b.tradition)),
    categories: facets.categories
      .flatMap(({ value, count }): CategoryFacetChoice[] => {
        const category = categories.get(value);
        return category
          ? [{ value: category.slug, label: category.name, count, group: category.group }]
          : [];
      })
      .sort(byCountThenLabel),
    zodiac: facets.zodiacSigns.map(named),
    planets: facets.celestialBodies.map(named),
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
  };
}
