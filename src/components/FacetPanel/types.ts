import type { CategoryMode } from '@/modules/ingredients/schema/ingredient-enums';
import type { CompendiumFacetCounts } from '../CompendiumList/types';

/**
 * What the panel shows as chosen. Every facet but the last three is a list of
 * values (slugs for categories and deities, the vocabulary's own value for the
 * rest), in the order chosen.
 */
export interface FacetPanelFilter {
  categories: readonly string[];
  /** Whether an entry needs every chosen category (`all`) or any of them (`any`). */
  categoryMode: CategoryMode;
  forms: readonly string[];
  deities: readonly string[];
  zodiac: readonly string[];
  planets: readonly string[];
  elements: readonly string[];
  /** `''` for either, as the address leaves it blank. */
  toxic: '' | 'toxic' | 'not_toxic';
  /** Show only the entries that cite no reference (admin). */
  withoutReferences: boolean;
}

export interface FacetPanelProps {
  /** Every facet's choices with their counts. */
  facets: CompendiumFacetCounts;
  /** The chosen values. */
  filter: FacetPanelFilter;
  /** Called once hydrated, on every change, with only the part that changed. Before hydration the surrounding GET form submits instead. */
  onChange: (patch: Partial<FacetPanelFilter>) => void;
  /** Show the No Refs switch. The public and coven lists leave it off. */
  admin?: boolean;
  /** A search is on its way: every chip holds a placeholder where its count will be. */
  loading?: boolean;
  /** Where the Clear All links go: the list with no facet chosen. */
  clearHref: string;
  /** Joins the panel's bar class. */
  className?: string;
}
