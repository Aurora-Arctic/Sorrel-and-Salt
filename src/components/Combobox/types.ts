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
  /** Which bucket it is in, curated or in use; left out by a source with one bucket. */
  curated?: boolean;
  /**
   * The heading of the bucket it is listed under, a category's group
   * (MB.126): a source naming its own buckets, in place of `curated`'s two.
   */
  heading?: string;
  /** What tells it from a row that reads the same — an ingredient's id — where its text cannot. */
  key?: string;
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
  /**
   * A first row that makes something new rather than picking a suggestion,
   * "Add a reference", there whatever is typed and in place of the typed row:
   * for a list whose entries can only be picked (MB.154).
   */
  create?: { label: string; onCreate: () => void };
  /**
   * Whether the typed row is offered: false for text the caller would
   * refuse, a list's repeat (MB.174). Enter still reaches `onCommit`, which
   * says why. Offered unless said otherwise.
   */
  offerTyped?: boolean;
  /** What a pick leaves out of the text, drawn muted in brackets after it: a picked form's group. */
  qualifier?: ComboboxQualifier;
  /**
   * What the open list spans and opens beside: a list field's row, its box
   * and its Add together. The control when left out (MB.154).
   */
  listAnchor?: HTMLElement | null;
  inputRef?: Ref<HTMLInputElement>;
  name?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

/**
 * What a pick leaves out of the box's text, "Substance" for a picked "Wax"
 * (MB.169): drawn after the text, muted and in brackets, "Wax (Substance)",
 * and read as the box's description.
 */
export interface ComboboxQualifier {
  /** Unbracketed: the box adds the brackets. */
  text: string;
  /** Shown in a tooltip while the qualifier is hovered or the box has focus, and read after the text. */
  detail?: string;
}

/** An entry a list holds, drawn inside the control: its text, and the x that takes it out. */
export interface ComboboxEntryProps {
  value: string;
  /** The list's error element, when this entry is one it names: it marks the chip and describes its x. */
  errorId?: string;
  /**
   * What the chip leaves out, "Dried leaf · Compendium entry": shown beneath
   * the text in its tooltip, which then opens whether the text is cut off or
   * not, and read as its x's description.
   */
  detail?: string;
  /**
   * What tells the entry from a namesake, a category's group (MB.126): read
   * after the text on the tooltip's first line, "Testward (Wards & Fixtures)",
   * as a picked deity's pill reads its tradition, and as the x's description
   * before the detail. The tooltip then opens whether the text is cut off or
   * not, as it does for a detail.
   */
  qualifier?: string;
  /**
   * Its group's colour pair, from the row (MB.126): the chip is filled solid
   * with it, its text and x inverted, as the solid-fill rule asks.
   */
  colors?: GroupColors;
  onRemove: () => void;
  /**
   * The chip's place in a sortable list, from dnd-kit's `useSortable`: it
   * draws a handle to move the chip by. Set by `ComboboxSortableEntries`,
   * never by a list itself.
   */
  sortable?: ReturnType<typeof useSortable>;
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

/** A list whose order means something, its chips moved by a handle each (MB.170). */
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

/** The first row of a list whose caller can make something new: its label. */
export interface CreateRow {
  value: string;
  create: true;
}

/** A row Downshift numbers: a suggestion, the typed row, or the create row. */
export type Item<O extends ComboboxOption> = O | TypedRow | CreateRow;

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
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

/**
 * The multi-select box: a closed set holding several values, chosen from the
 * select-only box and drawn as chips inside its control, as a list's entries
 * are.
 */
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
  required?: boolean;
  /** The box, which takes the focus: a `div`, since nothing is typed into it. */
  inputRef?: Ref<HTMLDivElement>;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}
