import type { ReactNode } from 'react';
import type { CategoryMode, IngredientSource } from '@/modules/ingredients/schema/ingredient-enums';
import type { CompendiumFacetCounts, ReviewSetting } from '../CompendiumList/types';

/**
 * What the panel shows as chosen. Every facet but the last three is a list of
 * values (slugs for categories and deities, the vocabulary's own value for the
 * rest), in the order chosen.
 */
export interface FacetPanelFilter {
  /** The public compendium only (M12.55): the ids of the viewer's covens an entry must be held in, any one of them. */
  covens?: readonly string[];
  /**
   * The public compendium only (M12.55): Not In, so the entries none of the picked covens hold, or
   * with none picked none of the viewer's covens. Left out or false, In.
   */
  covensNot?: boolean;
  categories: readonly string[];
  /** Whether an entry needs every chosen category (`all`) or any of them (`any`). */
  categoryMode: CategoryMode;
  forms: readonly string[];
  deities: readonly string[];
  zodiac: readonly string[];
  celestialBodies: readonly string[];
  elements: readonly string[];
  /** `''` for either, as the address leaves it blank. */
  toxic: '' | 'toxic' | 'not_toxic';
  /** Show only the entries that cite no reference (admin). */
  withoutReferences: boolean;
  /** Show only the entries that have no live form (admin; M12.30). */
  withoutForms: boolean;
  /**
   * The admin's Reviewed strip (M14.8), shown only when this is set: `''` for either, as the
   * address leaves it blank. The public and coven panels leave it out.
   */
  reviewed?: '' | ReviewSetting;
  /**
   * The coven's Source control (M9.7), shown only when this is set: `''` for both,
   * as the address leaves it blank. The compendium's panel leaves it out.
   */
  source?: '' | IngredientSource;
  /** The coven's In Stock switch, shown only when this is set. */
  inStock?: boolean;
  /** The coven's Low Stock Only switch, shown only when this is set (M9.8). */
  lowStockOnly?: boolean;
}

export interface FacetPanelProps {
  /** Every facet's choices with their counts. */
  facets: CompendiumFacetCounts;
  /** The chosen values. */
  filter: FacetPanelFilter;
  /** Called once hydrated, on every change, with only the part that changed; the caller holds it, and nothing applies yet. Before hydration the surrounding GET form submits instead. */
  onChange: (patch: Partial<FacetPanelFilter>) => void;
  /** Show the No Refs switch. The public and coven lists leave it off. */
  admin?: boolean;
  /** A search is on its way: every chip holds a placeholder where its count will be. */
  loading?: boolean;
  /** Where the Clear All links go: the list with no facet chosen. */
  clearHref: string;
  /** Called once hydrated when the panel shuts, by whatever means other than Apply Filters (which submits the form) or Clear All: the caller applies what it holds. */
  onApply?: () => void;
  /** Called once hydrated when either Clear All is pressed: the caller empties what it holds and applies at once. Without it the links are plain. */
  onClear?: () => void;
  /** Joins the dialog's class. */
  className?: string;
  /**
   * The viewer's covens, which In My Covens offers by name (M12.55). Left out or empty, the field
   * is not drawn: a visitor signed out, a viewer in no coven, and the admin and coven lists.
   */
  covens?: readonly { id: string; name: string }[];
}

/** The Filters shell (M10.11): the button, Clear All and the panel, around a list's own filters. */
export interface FacetShellProps {
  /** How many filters are chosen, shown on the button; above nought, the bar's Clear All shows too. */
  count: number;
  /** Where the Clear All links go: the list with no filter chosen. */
  clearHref: string;
  /** Called once hydrated when the panel shuts, by whatever means other than Apply Filters (which submits the form) or Clear All: the caller applies what it holds. */
  onApply?: () => void;
  /** Called once hydrated when either Clear All is pressed: the caller empties what it holds and applies at once. Without it the links are plain. */
  onClear?: () => void;
  /** Joins the dialog's class. */
  className?: string;
  /** The filters, drawn between the panel's head and its Apply Filters, Close and Clear All. */
  children: ReactNode;
}
