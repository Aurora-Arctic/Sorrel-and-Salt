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
  /**
   * More small print on the note's line, after it, muted: an ingredient's categories.
   * The line stays one line and ends in an ellipsis where it runs long. Part of the name.
   * A node rather than text so a caller can draw its words in colour (the spell picker's
   * categories, in their groups' chips); only its text counts toward the name.
   */
  meta?: ReactNode;
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
  /**
   * A mark at the end of the label's line, after the count: information only (the spell picker's
   * In Jar badge). Its text counts toward the name, so a caller gives its words for a reader.
   */
  badge?: ReactNode;
  /** How many results picking it would match (M12.4): read after the label, "Wax (3)", part of the option's name. */
  count?: number;
  /**
   * Shown and read but not pickable (`aria-disabled`, stepped over by the
   * arrow keys, a press does nothing). Giving the reason in `note` keeps the
   * row from being a mystery. The caller orders it: the box lists rows as given.
   */
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
   * text is not blank. Left out, the default: No match for “text”. Pass a
   * more specific sentence where the caller knows more ("Keep typing to
   * search"), or `false` where saying nothing is right. Drawn in the popup
   * outside the listbox (it is no option), and read by the status. The typed
   * row counts as a row, so a caller wanting the message passes
   * `offerTyped={false}`. A typed box never closes for having nothing to show.
   */
  empty?: string | false;
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
   * typed row is. Two callers use it: "New Reference" makes something new for
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
   * Put the action row first rather than last, the row nearest the box where the list
   * opens beneath it: for an action that stands for what was typed, such as the spell
   * builder's one-off ingredient. Last unless said otherwise.
   */
  actionFirst?: boolean;
  /**
   * Whether the list opens and narrows with its first row highlighted, so
   * Enter takes it: a closed set's type-ahead. Free text highlights nothing.
   */
  highlightFirst?: boolean;
  /**
   * Whether a pick leaves the list open for the next one, as the multi-select
   * box does: a box that adds each pick to a list (the Forms filter, a list
   * field) rather than holding one value. Escape, Tab and a press outside
   * still close it, and the focus stays in the text. A single-value box closes
   * on a pick, the default.
   */
  keepOpen?: boolean;
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

/**
 * A button a chip carries before its x, for a list whose entries can be acted
 * on one by one: promoting a folk name to the display name (M12.1). Generic,
 * so the entry knows nothing of what it does.
 */
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
  /**
   * A mark drawn before the text, decorative and outside the chip's name: a
   * form's group icon (M12.4). Handed over drawn, as `ComboboxOption.icon` is.
   */
  icon?: ReactNode;
  /** How many results the value matches, "(12)" after the text, outside the cross's name. */
  count?: number;
  /**
   * A search is running, so a count is on its way: a shimmering placeholder
   * stands where the count goes, hidden from assistive technology, and holds
   * still under reduced motion. The cross's name is the same either way.
   */
  loading?: boolean;
  /**
   * Drawn as an outlined chip (no fill, an ink border) instead of the filled
   * one. A chip with `colors` stays filled in them.
   */
  outlined?: boolean;
  /**
   * What the value is of, "Element": the cross reads "Remove Element: Water"
   * and not the bare "Remove Water", so a column of chips from several
   * boxes still says what each one removes.
   */
  removeNoun?: string;
  onRemove: () => void;
  /** A button before the x, for acting on this entry: left out, the chip has the x alone. */
  action?: EntryAction;
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
  /**
   * How many results choosing it would match (M12.4): read after the label in
   * its row and on its chip, "Water (7)", part of the option's accessible name.
   * Left out where the number is not known (yet): the row and the chip then show
   * none, which is not a zero. Drawn by the multi-select box only.
   */
  count?: number;
  /**
   * The row is shown and read but cannot be chosen (`aria-disabled`, stepped
   * over by the arrow keys). The caller sets it by hand. Honoured by the
   * multi-select box, which lists a disabled row after the others, and by the
   * select-only box, which keeps the order given (M9.12's coven picker).
   */
  disabled?: boolean;
  /** A second line under the row, also part of its name: why a disabled choice is out. */
  note?: string;
  /**
   * The heading its row is listed under, a deity's tradition (M12.4). Drawn by
   * the facet box's typing form only, which sets the rows of one heading
   * together; the native select before hydration makes it an `optgroup`.
   */
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
  /** A change this box started is on its way (M12.33): the box is `aria-busy` and carries a spinner. */
  busy?: boolean;
  /** Shut: `aria-disabled`, out of the tab order, deaf to the pointer and the keys, drawn as a disabled input. */
  disabled?: boolean;
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
  /** Shown in place of the placeholder when nothing is chosen and no choice is left to offer. */
  emptyPlaceholder?: string;
  required?: boolean;
  /** The box, which takes the focus: a `div`, since nothing is typed into it. */
  inputRef?: Ref<HTMLDivElement>;
  /**
   * Leave out the choices with a `count` of 0 (M12.4). A value already chosen
   * keeps its chip and its cross whatever its count.
   */
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
