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
  /**
   * Its group's colour pair, a category's (the owner's call): the row is
   * edged in it, so the colour its chip will wear is seen before the pick.
   */
  colors?: GroupColors;
  /**
   * A mark drawn before the label, outside the option's accessible name: a
   * form's group icon. A `ReactNode` rather than a typed name, so the
   * combobox knows no icon set; the caller hands over a drawn, decorative one.
   */
  icon?: ReactNode;
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
  /**
   * Enter with no suggestion highlighted: a list's add. Without it, Enter
   * closes an open list and otherwise reaches the form, as a text box's does.
   */
  onCommit?: (value: string) => void;
  /** Backspace or Delete in an empty box: a list takes its last entry. */
  onRemoveLast?: () => void;
  /** The suggestions for the text; left out for a box with no source, which never opens. */
  suggestions?: Suggestions<O>;
  /**
   * What an open list says once its lookup has settled with no rows and the
   * text is not blank: "No Matches". Drawn in the popup outside the listbox (it
   * is no option), and read by the status. The typed row counts as a row, so
   * a caller wanting the message passes `offerTyped={false}`. Without it a
   * list with no rows stays closed.
   */
  empty?: string;
  /** The entries a list holds, drawn inside the control ahead of the box. */
  entries?: ReactNode;
  /**
   * A control that empties the box, on the control's right. `empty` while
   * there is nothing to clear: the clear, and the separator beside it, keep
   * their room but are hidden, out of the accessibility tree and the tab
   * order, so the control's width never changes as it fills or empties.
   */
  clear?: { label: string; onClear: () => void; empty: boolean };
  /**
   * A caller's own control drawn inside the control box, before the text and
   * before any entries: a form's submit, say. A slot rather than a built-in
   * because Combobox knows nothing about forms or what the caller wants
   * pressed. A button given here should be styled `combobox__indicator` to
   * match the others; a press on it is inside the box, so it neither closes an
   * open list nor moves the focus.
   */
  leading?: ReactNode;
  /**
   * Whether a box with `suggestions` draws its chevron button. Left out
   * (`false`) for a free-text search that opens as you type, where a chevron
   * promises a set to browse. Typing still opens the list. Defaults to true.
   */
  toggle?: boolean;
  /**
   * A last row that does something rather than picking a suggestion, there
   * whatever is typed and in place of the typed row, set off in italics as the
   * typed row is. Two callers use it: "New Reference…" makes something new for
   * a list whose entries can only be picked (MB.154; last since MB.115), and
   * "See all results." applies the search to the list (M8.10). Reached by the
   * arrow keys and picked by Enter or a click, which call `onSelect`; it is
   * no result, so the status does not count it.
   */
  action?: { label: string; onSelect: () => void };
  /**
   * Whether the typed row is offered: false for text the caller would
   * refuse, a list's repeat (MB.174). Enter still reaches `onCommit`, which
   * says why. Offered unless said otherwise.
   */
  offerTyped?: boolean;
  /**
   * Whether the list opens and narrows with its first row highlighted, so
   * Enter takes it: a closed set's type-ahead. Free text highlights nothing.
   */
  highlightFirst?: boolean;
  /**
   * What a row is called, singular: the list's name, its chevron's and its
   * status's count. "suggestion" unless said; a closed set's are "choice"s.
   */
  noun?: string;
  /** The mark on the typed row, "Use what you typed": the same slot as an option's `icon`. */
  typedIcon?: ReactNode;
  /**
   * A mark drawn before the text, decorative: the type-ahead box's chosen
   * icon, there while the box reads the chosen label, as the select-only
   * box's closed value draws its choice's (M12.7).
   */
  icon?: ReactNode;
  /** Shown, muted, while the box is empty. */
  placeholder?: string;
  /** `aria-required`, as the field marks it. */
  required?: boolean;
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
  /**
   * What the entry opens beside its chip, a linked substitute's summary
   * (MB.115): its text becomes a button, led by a link mark and underlined,
   * that opens and shuts a small panel anchored to the chip. Left out of a
   * sortable entry, whose text is already its handle.
   */
  summary?: EntrySummary;
  /**
   * What kind of entry it is, read after its text by a screen reader and
   * never shown: "name only" on a substitute typed rather than linked, which
   * the eye tells by its want of a link mark.
   */
  note?: string;
  onRemove: () => void;
  /**
   * The chip's place in a sortable list, from dnd-kit's `useSortable`: it
   * draws a handle to move the chip by. Set by `ComboboxSortableEntries`,
   * never by a list itself.
   */
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
  /**
   * What the choice is besides its label, a member's role (M6.16): its row
   * reads "Fixture B (Member)", and once chosen the box shows the label with
   * the qualifier after it, muted, its detail in a tooltip. Typing matches the
   * label alone, never the qualifier.
   */
  qualifier?: ComboboxQualifier;
  /**
   * The choice makes something new rather than picking one (the switcher's
   * Create Coven): its row is set off from the rest by a rule and led by a
   * plus. The caller decides what choosing it does.
   */
  create?: boolean;
  /**
   * A mark drawn before the label, in its row and in the closed value, outside
   * the accessible name: a form group's icon. Handed over drawn and decorative,
   * as `ComboboxOption.icon` is.
   */
  icon?: ReactNode;
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
 * The type-ahead box: a closed set, chosen by typing to narrow the list. The
 * text is its own; only a choice is ever the value.
 */
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
  /**
   * The value once the person is done with the box, never mid-typing: a pick
   * from the list, the clear (`''`), or leaving the box (the choice its text
   * names in full, or `''`). Called whether or not the value changed; a
   * filter, which applies a choice rather than each letter typed, compares it
   * with the one it shows.
   */
  onSettle?: (value: string) => void;
  onBlur?: () => void;
  /** Every choice, in order; typing narrows them to those whose label holds the text. */
  choices: readonly ComboboxChoice[];
  /** Shown, muted, while the box is empty, and not itself a choice. */
  placeholder?: string;
  required?: boolean;
  /**
   * A clear on the control's right, "Clear Tradition", offered while the box
   * holds text or a choice, and its room kept while it does not: a filter's
   * way back to every group.
   */
  clearable?: boolean;
  /** The text box, which takes the focus. */
  inputRef?: Ref<HTMLInputElement>;
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
