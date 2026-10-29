import type { ReactNode } from 'react';
import type { GroupColors } from '../../lib/types';
import type { ComboboxOption } from '../Combobox/types';

/** The group a category is filed under: the heading its row sits under, and the colour its entry wears. */
export interface PickerGroup extends GroupColors {
  id: string;
  name: string;
}

/** One category the picker offers, under its group. */
export interface PickerCategory {
  id: string;
  name: string;
  /** Read beneath the row, and in the entry's tooltip. */
  description?: string | null;
  group: PickerGroup;
  /** How many entries picking it would leave, when the filter knows: read after the name, "Fire (9)". */
  count?: number;
}

/** A row the box offers: the category a pick adds. */
export interface CategoryOption extends ComboboxOption {
  category: PickerCategory;
}

export interface CategoryPickerProps {
  /** The box's `name` attribute, which a form that moves focus by field name (an undo) finds it by. */
  boxName?: string;
  /** The fieldset's name, "Categories". */
  legend: string;
  /** What the legend's tip says, if anything. */
  hint?: string;
  /** The box's name, "Category": what a pick adds. */
  entry: string;
  /** A short action shown, muted, while the box is empty: "Add a category". */
  placeholder?: string;
  /** Every category on offer, in any order: the picker groups and sorts them. */
  categories: readonly PickerCategory[];
  /** The categories are still being read: the box says it is looking. */
  pending?: boolean;
  /** The counts are still being read: a pick's chip holds a placeholder where its count will be. */
  loading?: boolean;
  /** Names a pick's x with the noun, "Remove Category: Testward"; without it, "Remove Testward". */
  removeNoun?: string;
  /** Leaves out a category whose count is zero. A pick keeps its chip. */
  hideZeros?: boolean;
  /** The picked categories' ids. */
  value: readonly string[];
  /** Called with the ids picked after one is added or taken out, in the order they were picked. */
  onChange: (ids: string[]) => void;
  /** The ids of the categories an error names: each entry is marked, and its x described by the error. */
  invalid?: readonly string[];
  /**
   * The id of the element `error` renders, which the box and every invalid
   * entry are described by. Set only while an error shows.
   */
  errorId?: string;
  /** The picker's one error element, drawn beneath the box: the form's `FieldError`. */
  error?: ReactNode;
  /** Said beneath the box: the categories could not be read. */
  status?: string;
  /**
   * A control at the right end of the legend, acting on the picks: a
   * variant's Copy From Ingredient. Handed the picker's announcer, so what
   * it did is said where an add or a removal is.
   */
  action?: LegendAction;
}

/** Says `message` through a group's own live region. */
export type Announce = (message: string) => void;

/** A control drawn in a group's legend, handed the group's announcer. */
export type LegendAction = (announce: Announce) => ReactNode;
