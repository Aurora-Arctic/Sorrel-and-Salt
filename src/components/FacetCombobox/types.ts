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
  /** A short action shown, muted, while nothing is chosen and after the chips: "Add an element". */
  placeholder?: string;
  /** What a value is of, for its cross's name: "Remove Element: Water". The bare value when left out. */
  removeNoun?: string;
  /** A search is running: every chip holds a placeholder where its count will be. */
  loading?: boolean;
  /** List a value whose count is 0 last and disabled, noted "Nothing Matches". On unless set to `false`; a value already chosen is never disabled. */
  disableZeros?: boolean;
  /** What the label's tip says, if anything. */
  hint?: string;
  /** Joins the field's own class, for the width the filter row gives it. */
  className?: string;
}
