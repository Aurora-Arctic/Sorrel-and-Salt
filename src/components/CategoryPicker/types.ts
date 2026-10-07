import type { ReactNode } from 'react';
import type { GroupColors } from '../../lib/types';
import type { ComboboxOption } from '../Combobox/types';

/** The group a category is filed under: the heading its row sits under, and the colour its entry wears (MB.36). */
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
}

/** A row the box offers: the category a pick adds. */
export interface CategoryOption extends ComboboxOption {
  category: PickerCategory;
}

export interface CategoryPickerProps {
  /** The fieldset's name, "Categories". */
  legend: string;
  /** What the legend's tip says, if anything. */
  hint?: string;
  /** The box's name, "Category": what a pick adds. */
  entry: string;
  /** Every category on offer, in any order: the picker groups and sorts them. */
  categories: readonly PickerCategory[];
  /** The categories are still being read: the box says it is looking. */
  pending?: boolean;
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
}
