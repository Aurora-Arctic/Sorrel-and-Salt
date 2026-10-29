import type { useSortable } from '@dnd-kit/sortable';
import type { ReactNode, Ref } from 'react';
import type { GroupColors } from '../../lib/types';

/** One suggestion: the text picking it writes, and what its row shows. */
export interface ComboboxOption {
  /** The text picking it writes. */
  value: string;
  /** The row's text when it is more than the value: "Wax (Animal)". Part of the option's accessible name. */
  label?: string;
  /** A second line, also part of the name: what already claims the value, or a curated row's description. */
  note?: string;
  /** Muted small print after the note, one line with an ellipsis; a node so a caller can colour it, and only its text names the option. */
  meta?: ReactNode;
  /** Which bucket it is in, curated or in use; left out by a source with one bucket. */
  curated?: boolean;
  /** The heading of the bucket it is listed under, in place of `curated`'s two (claude-docs/components/combobox.md, "Prop notes"). */
  heading?: string;
  /** What tells it from a row that reads the same — an ingredient's id — where its text cannot. */
  key?: string;
  /** Its group's colour pair: the row is edged in it, so a category chip's colour shows before the pick. */
  colors?: GroupColors;
  /** A decorative mark before the label, outside the accessible name; a `ReactNode` so the combobox knows no icon set. */
  icon?: ReactNode;
  /** A mark at the end of the label's line, after the count; its text counts toward the name. */
  badge?: ReactNode;
  /** How many results picking it would match: read after the label, "Wax (3)", part of the name. */
  count?: number;
  /** Shown and read but not pickable (`aria-disabled`, skipped by the arrow keys); the caller orders it and gives the reason in `note`. */
  disabled?: boolean;
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
  /** The id of a label element naming the box, which then renders no hidden label of its own. */
  labelId?: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  /** A suggestion chosen, or the typed row, which comes with no option. The text is the caller's to change. */
  onPick: (value: string, option: O | null) => void;
  /** Enter with no suggestion highlighted: a list's add. Without it, Enter closes an open list and otherwise reaches the form. */
  onCommit?: (value: string) => void;
  /** Backspace or Delete in an empty box: a list takes its last entry. */
  onRemoveLast?: () => void;
  /** The suggestions for the text; left out for a box with no source, which never opens. */
  suggestions?: Suggestions<O>;
  /** The message of an open list with no rows for non-blank text; `false` says nothing (claude-docs/components/combobox.md, "The empty message"). */
  empty?: string | false;
  /** The entries a list holds, drawn inside the control ahead of the box. */
  entries?: ReactNode;
  /** A control that empties the box; `empty` hides it but keeps its room (claude-docs/components/combobox.md, "Prop notes"). */
  clear?: { label: string; onClear: () => void; empty: boolean };
  /** A caller's own control inside the control box before the text, such as a submit (claude-docs/components/combobox.md, "Prop notes"). */
  leading?: ReactNode;
  /** Whether a box with `suggestions` draws its chevron button; true unless said, false for free-text search that opens as you type. */
  toggle?: boolean;
  /** A last row that does something rather than picking a suggestion; `onSelect` runs on Enter or a click (claude-docs/components/combobox.md, "The action row"). */
  action?: { label: string; onSelect: () => void };
  /** Whether the typed row is offered (true unless said): false for text the caller would refuse, where Enter still reaches `onCommit`. */
  offerTyped?: boolean;
  /** Put the action row first rather than last, for an action standing for what was typed. */
  actionFirst?: boolean;
  /** Whether the list opens and narrows with its first row highlighted, so Enter takes it: a closed set's type-ahead. */
  highlightFirst?: boolean;
  /** Whether a pick leaves the list open for the next, as the multi-select box does; Escape, Tab and a press outside still close it. */
  keepOpen?: boolean;
  /** What a row is called, singular: the list's name, its chevron's and its status's count. "suggestion" unless said. */
  noun?: string;
  /** The mark on the typed row, "Use what you typed": the same slot as an option's `icon`. */
  typedIcon?: ReactNode;
  /** A decorative mark before the text, there while the box reads the chosen label. */
  icon?: ReactNode;
  /** Shown, muted, while the box is empty. */
  placeholder?: string;
  /** `aria-required`, as the field marks it. */
  required?: boolean;
  /** What a pick leaves out of the text, drawn muted in brackets after it: a picked form's group. */
  qualifier?: ComboboxQualifier;
  /** What the open list spans and opens beside: a list field's row, its box and its Add together. The control when left out. */
  listAnchor?: HTMLElement | null;
  inputRef?: Ref<HTMLInputElement>;
  name?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

/** What a pick leaves out of the box's text, drawn after it muted in brackets, "Wax (Substance)", and read as the box's description. */
export interface ComboboxQualifier {
  /** Unbracketed: the box adds the brackets. */
  text: string;
  /** Shown in a tooltip while the qualifier is hovered or the box has focus, and read after the text. */
  detail?: string;
}

/** A button a chip carries before its x, for acting on one entry at a time; generic, so the entry knows nothing of what it does. */
export interface EntryAction {
  /** The button's accessible name: "Make Hedge Fixture the Display Name". */
  label: string;
  /** The word its tooltip shows on hover and focus; decoration, as the name says it. */
  tip: string;
  /** The glyph, drawn at the icon size in the button's own ink. */
  icon: ReactNode;
  onClick: () => void;
  /** Shut while what it starts is running. */
  disabled?: boolean;
}

/** An entry a list holds, drawn inside the control: its text, and the x that takes it out. */
export interface ComboboxEntryProps {
  value: string;
  /** The list's error element, when this entry is one it names: it marks the chip and describes its x. */
  errorId?: string;
  /** What the chip leaves out, "Dried leaf · Compendium entry": in its tooltip beneath the text (which then always opens), and read as its x's description. */
  detail?: string;
  /** What tells it from a namesake: read after the text on the tooltip's first line, "Testward (Wards & Fixtures)", and before the detail in the x's description. */
  qualifier?: string;
  /** Its group's colour pair: the chip is filled solid with it, its text and x inverted. */
  colors?: GroupColors;
  /** What the entry opens beside its chip: its text becomes a button toggling a panel (claude-docs/components/combobox.md, "A linked entry's summary"). Not for a sortable entry. */
  summary?: EntrySummary;
  /** What kind of entry it is, read after its text by a screen reader and never shown: "name only" on a typed substitute. */
  note?: string;
  /** A decorative mark before the text, outside the chip's name; handed over drawn, as `ComboboxOption.icon` is. */
  icon?: ReactNode;
  /** How many results the value matches, "(12)" after the text, outside the cross's name. */
  count?: number;
  /** A count is on its way: a shimmering placeholder, hidden from assistive technology and still under reduced motion, stands where it goes. */
  loading?: boolean;
  /** Drawn as an outlined chip (no fill, an ink border); a chip with `colors` stays filled in them. */
  outlined?: boolean;
  /** What the value is of, "Element": the cross reads "Remove Element: Water", not "Remove Water". */
  removeNoun?: string;
  onRemove: () => void;
  /** A button before the x, for acting on this entry: left out, the chip has the x alone. */
  action?: EntryAction;
  /** The chip's place in a sortable list, from dnd-kit's `useSortable`; set by `ComboboxSortableEntries`, never by a list itself. */
  sortable?: ReturnType<typeof useSortable>;
}

/** The panel a linked entry opens: what names it, and what it holds. */
export interface EntrySummary {
  /** Names the panel as a dialog: "About Mockwort (Fixtura vulgaris)". */
  label: string;
  /** The panel's content, drawn only while it is open, so it may ask the server then. */
  content: () => ReactNode;
}

/** A sortable list's wrapping row, measured as a move starts. */
export interface FlowShape {
  /** How wide the row may run before a chip wraps. */
  width: number;
  /** Between two chips on a row. */
  columnGap: number;
  /** From one row's top to the next's: a chip's height and the gap between rows. */
  rowPitch: number;
}

/** Where a chip sits in the row, as client coordinates. */
export interface FlowSlot {
  left: number;
  top: number;
  width: number;
}

/** A sortable chip's handle: what it moves, and what it is read with. */
export interface EntryHandleProps {
  /** The entry's text, which names the handle, "Move Mars". */
  value: string;
  sortable: ReturnType<typeof useSortable>;
  /** The list's error and the entry's detail, read before how it moves. */
  describedBy?: string;
  onFocus: () => void;
  onBlur: () => void;
  /** The text, cut off as the chip's is. */
  children: ReactNode;
}

/** An entry a sortable list holds: a chip, and the id that is its identity as it moves. */
export interface ComboboxSortableEntry extends Omit<ComboboxEntryProps, 'sortable'> {
  /** Stable across a move, as react-hook-form's field id is: the list's key. */
  id: string;
}

/** A list whose order means something, its chips moved by a handle each. */
export interface ComboboxSortableEntriesProps {
  entries: ComboboxSortableEntry[];
  /** An entry put down at another place, by keyboard or by pointer: indexes into `entries`. */
  onMove: (from: number, to: number) => void;
}

/** The last row of an open list: what was typed, offered as itself. */
export interface TypedRow {
  value: string;
  typed: true;
}

/** The last row of a list whose caller gave an `action`: its label. */
export interface ActionRow {
  value: string;
  action: true;
}

/** A row Downshift numbers: a suggestion, the typed row, or the action row. */
export type Item<O extends ComboboxOption> = O | TypedRow | ActionRow;

/** A bucket of rows under its heading, or the one unheaded list of a source with one bucket. */
export interface Bucket<O extends ComboboxOption> {
  heading: string | null;
  /** The heading's id suffix: one word, since a space would split the reference. */
  key: string;
  rows: O[];
}

/** One choice of a closed set: the value it writes, and what it reads as. */
export interface ComboboxChoice {
  value: string;
  label: string;
  /** What the choice is besides its label, a member's role: its row reads "Fixture B (Member)", the chosen box shows it muted after the label; typing matches the label alone. */
  qualifier?: ComboboxQualifier;
  /** The choice makes something new rather than picking one (the switcher's Create Coven): its row is set off by a rule and led by a plus. */
  create?: boolean;
  /** A decorative mark before the label in its row and the closed value, outside the accessible name; handed over drawn. */
  icon?: ReactNode;
  /** How many results choosing it would match, read after the label, "Water (7)"; left out where unknown (no zero is shown). Multi-select box only. */
  count?: number;
  /** Shown and read but not chosen (`aria-disabled`, skipped by the arrow keys); the multi-select box lists it last, the select-only box keeps the order given. */
  disabled?: boolean;
  /** A second line under the row, also part of its name: why a disabled choice is out. */
  note?: string;
  /** The heading its row is listed under, a deity's tradition; drawn by the facet box's typing form only, and an `optgroup` in the native select. */
  group?: string;
}

/** The select-only box: a closed set, chosen from the same control and list. */
export interface ComboboxSelectProps {
  /** The box's id, which a label element's `htmlFor` names. */
  id: string;
  /** What the box is called: its `aria-label` unless `labelId` is given, and the list's name. */
  label: string;
  /** The id of a label element naming the box. */
  labelId?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Every choice, in order. One whose value is `''` is the choice that leaves the set unanswered: "None". */
  choices: readonly ComboboxChoice[];
  /** Shown while the value is none of the choices, and not itself a choice. */
  placeholder?: string;
  required?: boolean;
  /** The box, which takes the focus: a `div`, since nothing is typed into it. */
  inputRef?: Ref<HTMLDivElement>;
  /** A change this box started is on its way: the box is `aria-busy` and carries a spinner. */
  busy?: boolean;
  /** Shut: `aria-disabled`, out of the tab order, deaf to the pointer and the keys, drawn as a disabled input. */
  disabled?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

/** The type-ahead box: a closed set, chosen by typing to narrow the list. The text is its own; only a choice is ever the value. */
export interface ComboboxTypeaheadProps {
  /** The box's id, which a label element's `htmlFor` names. */
  id: string;
  /** What the box is called, and its list's name, "Tradition choices". */
  label: string;
  /** The id of a label element naming the box. */
  labelId?: string;
  /** The chosen value, `''` while the text names no choice. */
  value: string;
  /** Every change of value, typing included: text naming a choice in full chooses it. */
  onChange: (value: string) => void;
  /** The value once the person is done with the box (a pick, the clear, or leaving), never mid-typing; called whether or not it changed, so a filter can compare. */
  onSettle?: (value: string) => void;
  onBlur?: () => void;
  /** Every choice, in order; typing narrows them to those whose label holds the text. */
  choices: readonly ComboboxChoice[];
  /** Shown, muted, while the box is empty, and not itself a choice. */
  placeholder?: string;
  required?: boolean;
  /** A clear on the control's right, "Clear Tradition", offered while the box holds text or a choice, its room kept otherwise. */
  clearable?: boolean;
  /** The text box, which takes the focus. */
  inputRef?: Ref<HTMLInputElement>;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

/** The multi-select box: a closed set holding several values, chosen as in the select-only box and drawn as chips inside its control. */
export interface ComboboxMultiSelectProps {
  /** The box's id, which a label element's `htmlFor` names. */
  id: string;
  /** What the box is called: its `aria-label` unless `labelId` is given, its list's name, its clear's and its status's. */
  label: string;
  /** The id of a label element naming the box. */
  labelId?: string;
  /** The values chosen, in the order chosen. */
  values: readonly string[];
  /** Every change, as the whole list: a choice appended, one taken out, or none. */
  onChange: (values: string[]) => void;
  onBlur?: () => void;
  /** Every choice, in order; the list offers those not yet chosen. */
  choices: readonly ComboboxChoice[];
  /** Shown while nothing is chosen, and not itself a choice. */
  placeholder?: string;
  /** Shown in place of the placeholder when nothing is chosen and no choice is left to offer. */
  emptyPlaceholder?: string;
  required?: boolean;
  /** The box, which takes the focus: a `div`, since nothing is typed into it. */
  inputRef?: Ref<HTMLDivElement>;
  /** Leave out the choices with a `count` of 0; a value already chosen keeps its chip whatever its count. */
  hideZeros?: boolean;
  /** A search is running: the chips show a count placeholder, as `ComboboxEntry`'s `loading`. */
  loading?: boolean;
  /** Draw the chips outlined, as `ComboboxEntry`'s `outlined`. */
  chipsOutlined?: boolean;
  /** What the values are of, for the crosses' names: "Remove Element: Water". The bare value when left out. */
  removeNoun?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}
