import type { ComboboxChoice } from '../Combobox/types';

/** A filter's closed set, chosen from one box with how many entries each value would leave. */
export interface FacetComboboxProps {
  /** The field's name above the box and the box's accessible name, in title case: "Elements". */
  label: string;
  /**
   * The parameter each chosen value submits under, once per value (`elements`
   * twice for `?elements=fire&elements=water`): a hidden input for each once
   * hydrated, and the native select's own name before.
   */
  name: string;
  /** Every value on offer, in order: its `label`, and its `count` where the number is known. `icon` and `qualifier` are drawn as the multi-select draws them. */
  choices: readonly ComboboxChoice[];
  /** The values chosen, in the order chosen. */
  values: readonly string[];
  /** Every change, as the whole list. Called once hydrated; before, the form submits the native select. */
  onChange: (values: string[]) => void;
  /**
   * Type to narrow the list: the typed box in place of the select-style one. A choice with a `group` is
   * listed under that heading, and any such choice forces the typing form, the only one that draws headings.
   */
  typeahead?: boolean;
  /** A short action shown, muted, while nothing is chosen and after the chips: "Add an element". */
  placeholder?: string;
  /**
   * Shown in place of the placeholder when nothing is chosen and no value is left to offer
   * (every count 0): "No Elements". Defaults to "No" and the label.
   */
  emptyPlaceholder?: string;
  /** What a value is of, for its cross's name: "Remove Element: Water". The bare value when left out. */
  removeNoun?: string;
  /** A search is running: every chip holds a placeholder where its count will be. */
  loading?: boolean;
  /**
   * Whether the values carry counts. On unless set to `false`: a field without counts
   * (In My Covens) never draws a count or its placeholder.
   */
  counts?: boolean;
  /** Leave out a value whose count is 0. On unless set to `false`; a value already chosen keeps its chip. */
  hideZeros?: boolean;
  /** What the label's tip says, if anything. */
  hint?: string;
  /** Joins the field's own class, for the width the filter row gives it. */
  className?: string;
}
