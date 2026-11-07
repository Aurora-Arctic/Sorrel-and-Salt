import type { useSortable } from '@dnd-kit/sortable';
import type { ReactNode, Ref } from 'react';
import type { GroupColors } from '../../lib/types';

export interface ComboboxOption {
  value: string;
  label?: string;
  note?: string;
  /** Muted small print after the note, one line with an ellipsis; a node so a caller can colour it, and only its text names the option. */
  meta?: ReactNode;
  curated?: boolean;
  /** The heading of the bucket it is listed under, in place of `curated`'s two (claude-docs/components/combobox.md, "Props in detail"). */
  heading?: string;
  /** What tells it from a row that reads the same — an ingredient's id — where its text cannot. */
  key?: string;
  /** Its group's colour pair: the row is edged in it, so a category chip's colour shows before the pick. */
  colors?: GroupColors;
  /** A decorative mark before the label, outside the accessible name; a `ReactNode` so the combobox knows no icon set. */
  icon?: ReactNode;
  badge?: ReactNode;
  /** How many results picking it would match: read after the label, "Wax (3)", part of the name. */
  count?: number;
  disabled?: boolean;
}

export interface Suggestions<O extends ComboboxOption = ComboboxOption> {
  options: O[];
  pending: boolean;
}

export interface ComboboxProps<O extends ComboboxOption = ComboboxOption> {
  id: string;
  label: string;
  labelId?: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onPick: (value: string, option: O | null) => void;
  /** Enter with no suggestion highlighted: a list's add. Without it, Enter closes an open list and otherwise reaches the form. */
  onCommit?: (value: string) => void;
  onRemoveLast?: () => void;
  /** The suggestions for the text; left out for a box with no source, which never opens. */
  suggestions?: Suggestions<O>;
  /** The message of an open list with no rows for non-blank text; `false` says nothing (claude-docs/components/combobox.md, "The empty message"). */
  empty?: string | false;
  entries?: ReactNode;
  /** A control that empties the box; `empty` hides it but keeps its room (claude-docs/components/combobox.md, "Props in detail"). */
  clear?: { label: string; onClear: () => void; empty: boolean };
  /** A caller's own control inside the control box before the text, such as a submit (claude-docs/components/combobox.md, "Props in detail"). */
  leading?: ReactNode;
  /** Whether a box with `suggestions` draws its chevron button; true unless said, false for free-text search that opens as you type. */
  toggle?: boolean;
  /** A last row that does something rather than picking a suggestion; `onSelect` runs on Enter or a click (claude-docs/components/combobox.md, "The action row"). */
  action?: { label: string; onSelect: () => void };
  /** Whether the typed row is offered (true unless said): false for text the caller would refuse, where Enter still reaches `onCommit`. */
  offerTyped?: boolean;
  /** Put the action row first rather than last, for an action standing for what was typed. */
  actionFirst?: boolean;
  highlightFirst?: boolean;
  keepOpen?: boolean;
  /** What a row is called, singular: the list's name, its chevron's and its status's count. "suggestion" unless said. */
  noun?: string;
  typedIcon?: ReactNode;
  icon?: ReactNode;
  placeholder?: string;
  required?: boolean;
  qualifier?: ComboboxQualifier;
  listAnchor?: HTMLElement | null;
  inputRef?: Ref<HTMLInputElement>;
  name?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

export interface ComboboxQualifier {
  text: string;
  /** Shown in a tooltip while the qualifier is hovered or the box has focus, and read after the text. */
  detail?: string;
}

/** A button a chip carries before its x, for acting on one entry at a time; generic, so the entry knows nothing of what it does. */
export interface EntryAction {
  label: string;
  /** The word its tooltip shows on hover and focus; decoration, as the name says it. */
  tip: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export interface ComboboxEntryProps {
  value: string;
  errorId?: string;
  detail?: string;
  qualifier?: string;
  colors?: GroupColors;
  /** What the entry opens beside its chip: its text becomes a button toggling a panel (claude-docs/components/combobox.md, "A linked entry's summary"). Not for a sortable entry. */
  summary?: EntrySummary;
  /** What kind of entry it is, read after its text by a screen reader and never shown: "name only" on a typed substitute. */
  note?: string;
  icon?: ReactNode;
  count?: number;
  loading?: boolean;
  outlined?: boolean;
  removeNoun?: string;
  onRemove: () => void;
  action?: EntryAction;
  /** The chip's place in a sortable list, from dnd-kit's `useSortable`; set by `ComboboxSortableEntries`, never by a list itself. */
  sortable?: ReturnType<typeof useSortable>;
}

export interface EntrySummary {
  label: string;
  /** The panel's content, drawn only while it is open, so it may ask the server then. */
  content: () => ReactNode;
}

export interface FlowShape {
  width: number;
  columnGap: number;
  rowPitch: number;
}

export interface FlowSlot {
  left: number;
  top: number;
  width: number;
}

export interface EntryHandleProps {
  value: string;
  sortable: ReturnType<typeof useSortable>;
  describedBy?: string;
  onFocus: () => void;
  onBlur: () => void;
  children: ReactNode;
}

export interface ComboboxSortableEntry extends Omit<ComboboxEntryProps, 'sortable'> {
  id: string;
}

export interface ComboboxSortableEntriesProps {
  entries: ComboboxSortableEntry[];
  onMove: (from: number, to: number) => void;
}

export interface TypedRow {
  value: string;
  typed: true;
}

export interface ActionRow {
  value: string;
  action: true;
}

/** A row Downshift numbers: a suggestion, the typed row, or the action row. */
export type Item<O extends ComboboxOption> = O | TypedRow | ActionRow;

export interface Bucket<O extends ComboboxOption> {
  heading: string | null;
  /** The heading's id suffix: one word, since a space would split the reference. */
  key: string;
  rows: O[];
}

export interface ComboboxChoice {
  value: string;
  label: string;
  qualifier?: ComboboxQualifier;
  /** The choice makes something new rather than picking one (the switcher's Create Coven): its row is set off by a rule and led by a plus. */
  create?: boolean;
  icon?: ReactNode;
  /** How many results choosing it would match, read after the label, "Water (7)"; left out where unknown (no zero is shown). Multi-select box only. */
  count?: number;
  disabled?: boolean;
  note?: string;
  group?: string;
}

export interface ComboboxSelectProps {
  id: string;
  /** What the box is called: its `aria-label` unless `labelId` is given, and the list's name. */
  label: string;
  labelId?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Every choice, in order. A choice whose value is `''` leaves the set unanswered: "None". */
  choices: readonly ComboboxChoice[];
  placeholder?: string;
  /** The box is as wide as its longest choice whichever is shown, rather than its field's width. */
  fit?: boolean;
  required?: boolean;
  /** The box, which takes the focus: a `div`, since nothing is typed into it. */
  inputRef?: Ref<HTMLDivElement>;
  busy?: boolean;
  disabled?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

export interface ComboboxTypeaheadProps {
  id: string;
  label: string;
  labelId?: string;
  value: string;
  onChange: (value: string) => void;
  /** The value once the person is done with the box (a pick, the clear, or leaving), never mid-typing; called whether or not it changed, so a filter can compare. */
  onSettle?: (value: string) => void;
  onBlur?: () => void;
  choices: readonly ComboboxChoice[];
  placeholder?: string;
  required?: boolean;
  /** A clear on the control's right, "Clear Tradition", offered while the box holds text or a choice, its room kept otherwise. */
  clearable?: boolean;
  /** The text box, which takes the focus. */
  inputRef?: Ref<HTMLInputElement>;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

export interface ComboboxMultiSelectProps {
  id: string;
  /** What the box is called: its `aria-label` unless `labelId` is given, its list's name, its clear's and its status's. */
  label: string;
  labelId?: string;
  values: readonly string[];
  onChange: (values: string[]) => void;
  onBlur?: () => void;
  choices: readonly ComboboxChoice[];
  placeholder?: string;
  emptyPlaceholder?: string;
  required?: boolean;
  /** The box, which takes the focus: a `div`, since nothing is typed into it. */
  inputRef?: Ref<HTMLDivElement>;
  hideZeros?: boolean;
  loading?: boolean;
  chipsOutlined?: boolean;
  removeNoun?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}
