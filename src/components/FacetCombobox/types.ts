import type { ComboboxChoice } from '../Combobox/types';

/** A filter's closed set, chosen from one box with how many entries each value would leave. */
export interface FacetComboboxProps {
  label: string;
  name: string;
  choices: readonly ComboboxChoice[];
  values: readonly string[];
  onChange: (values: string[]) => void;
  typeahead?: boolean;
  placeholder?: string;
  emptyPlaceholder?: string;
  removeNoun?: string;
  loading?: boolean;
  /**
   * Whether the values carry counts. On unless set to `false`: a field without counts
   * (In My Covens) never draws a count or its placeholder.
   */
  counts?: boolean;
  /** Leave out a value whose count is 0. On unless set to `false`; a value already chosen keeps its chip. */
  hideZeros?: boolean;
  hint?: string;
  className?: string;
}
