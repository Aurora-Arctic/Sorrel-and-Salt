import type { ReactNode, Ref } from 'react';

/** One suggestion: the text picking it writes, and what its row shows. */
export interface ComboboxOption {
  /** The text picking it writes. */
  value: string;
  /** The row's text when it is more than the value: "Wax (Animal)". Part of the option's accessible name. */
  label?: string;
  /** A second line, also part of the name: what already claims the value, or a curated row's description. */
  note?: string;
  /** Which bucket it is in, curated or in use; left out by a source with one bucket. */
  curated?: boolean;
}

/** What a source has for the text as it stands: the rows, and whether more are on their way. */
export interface Suggestions<O extends ComboboxOption = ComboboxOption> {
  options: O[];
  /** The text has not settled, or the lookup is in flight. */
  pending: boolean;
}

export interface ComboboxProps<O extends ComboboxOption = ComboboxOption> {
  /** The box's id, which a label element's `htmlFor` names. */
  id: string;
  /** What the box is called: its accessible name, and the list's and its status's. */
  label: string;
  /** The id of a label element naming the box, which then carries no `aria-label` of its own. */
  labelId?: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  /** A suggestion chosen, or the typed row, which comes with no option. The text is the caller's to change. */
  onPick: (value: string, option: O | null) => void;
  /**
   * Enter with no suggestion highlighted: a list's add. Without it, Enter
   * closes an open list and otherwise reaches the form, as a text box's does.
   */
  onCommit?: (value: string) => void;
  /** Backspace or Delete in an empty box: a list takes its last entry. */
  onRemoveLast?: () => void;
  /** The suggestions for the text; left out for a box with no source, which never opens. */
  suggestions?: Suggestions<O>;
  /** The entries a list holds, drawn inside the control ahead of the box. */
  entries?: ReactNode;
  /** A control that empties the list, shown while it holds entries. */
  clear?: { label: string; onClear: () => void };
  inputRef?: Ref<HTMLInputElement>;
  name?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

/** An entry a list holds, drawn inside the control: its text, and the x that takes it out. */
export interface ComboboxEntryProps {
  value: string;
  /** The list's error element, when this entry is one it names: it marks the chip and describes its x. */
  errorId?: string;
  onRemove: () => void;
}

/** The last row of an open list: what was typed, offered as itself. */
export interface TypedRow {
  value: string;
  typed: true;
}

/** A row Downshift numbers: a suggestion, or the typed row. */
export type Item<O extends ComboboxOption> = O | TypedRow;

/** A bucket of rows under its heading, or the one unheaded list of a source with one bucket. */
export interface Bucket<O extends ComboboxOption> {
  heading: string | null;
  /** The heading's id suffix: one word, since a space would split the reference. */
  key: string;
  rows: O[];
}
