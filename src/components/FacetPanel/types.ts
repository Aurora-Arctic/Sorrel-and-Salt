import type { ReactNode } from 'react';
import type { CategoryMode, IngredientSource } from '@/modules/ingredients/schema/ingredient-enums';
import type { CompendiumFacetCounts, ReviewSetting } from '../CompendiumList/types';
import type { PickerCategory } from '../CategoryPicker/types';

/** What the panel shows as chosen: each facet but the last three is a list of values (slugs for categories and deities, the vocabulary's own value otherwise), in the order chosen. */
export interface FacetPanelFilter {
  /** The public compendium only: ids of the viewer's covens an entry must be held in, any one of them. */
  covens?: readonly string[];
  covensNot?: boolean;
  categories: readonly string[];
  categoryMode: CategoryMode;
  forms: readonly string[];
  deities: readonly string[];
  zodiac: readonly string[];
  celestialBodies: readonly string[];
  elements: readonly string[];
  toxic: '' | 'toxic' | 'not_toxic';
  withoutReferences: boolean;
  withoutForms: boolean;
  /** The keeper's Hidden switch, shown only when set. The public and coven panels leave it out. */
  hidden?: boolean;
  /** The keeper's Reviewed strip, shown only when set: `''` for either. The public and coven panels leave it out. */
  reviewed?: '' | ReviewSetting;
  /** The coven's Source control, shown only when set: `''` for both. The compendium's panel leaves it out. */
  source?: '' | IngredientSource;
  /** The coven's In Stock switch, shown only when this is set. */
  inStock?: boolean;
  /** The coven's Low Stock Only switch, shown only when this is set. */
  lowStockOnly?: boolean;
}

export interface FacetPanelProps {
  facets: CompendiumFacetCounts;
  filter: FacetPanelFilter;
  onChange: (patch: Partial<FacetPanelFilter>) => void;
  admin?: boolean;
  loading?: boolean;
  clearHref: string;
  onApply?: () => void;
  /** Called once hydrated when either Clear All is pressed: the caller empties what it holds and applies at once. Without it the links are plain. */
  onClear?: () => void;
  className?: string;
  /**
   * The viewer's covens, which In My Covens offers by name; left out or empty (signed out, in no coven, the admin and coven lists), the field is not drawn.
   * A coven whose `paused` is set is listed disabled, with when the pause ends: the filter cannot read what it holds.
   */
  covens?: readonly MyCoven[];
}

export interface FacetShellProps {
  count: number;
  clearHref: string;
  onApply?: () => void;
  /** Called once hydrated when either Clear All is pressed: the caller empties what it holds and applies at once. Without it the links are plain. */
  onClear?: () => void;
  className?: string;
  children: ReactNode;
}

/** One category the Categories line offers: slug as `value`, name as `label`, and its group's colours; `count` is how many rows picking it leaves, and without it the line shows no number. */
export interface CategoryLineChoice {
  value: string;
  label: string;
  group: PickerCategory['group'];
  count?: number;
}

export interface CategoryLineProps {
  categories: readonly CategoryLineChoice[];
  values: readonly string[];
  mode: CategoryMode;
  noun: string;
  loading?: boolean;
  onChange: (patch: { categories?: string[]; categoryMode?: CategoryMode }) => void;
}

/** One of the viewer's covens as In My Covens offers it: its id, its name, and the pause standing on the viewer's seat there, or null. `until` null is open-ended. */
export interface MyCoven {
  id: string;
  name: string;
  paused: { until: Date | null } | null;
}
