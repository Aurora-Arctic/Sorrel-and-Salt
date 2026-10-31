import type { HTMLInputTypeAttribute, ReactNode, RefObject } from 'react';
import type { FieldPath, FieldValues } from 'react-hook-form';

/** What every field shares: what it is called, and what it is told about it. */
export interface FieldProps {
  label: string;
  /** Read after the label, out of sight ("Quantity, Flower"), so a field drawn once per row has a name of its own. */
  labelSuffix?: string;
  /** What the field is for, behind an info tip beside the label. */
  hint?: string;
  /** A line beneath the label saying a state the field is in, such as why it is shut. */
  note?: string;
  /** Marked required beside its label, and to assistive technology. */
  required?: boolean;
}

export interface FieldErrorProps {
  id: string;
  message?: string;
}

/** What `fieldDescription` is told: the field's base id, and what describes it. */
export interface FieldDescriptionInput {
  /** The base the field's ids grow from: a `useId()`. */
  id: string;
  hint?: string;
  note?: string;
  /** Another element read with the field, such as a duplicate warning. */
  describedBy?: string;
  /** The field's own error, from whichever side found it. */
  error?: string;
  /** Marked invalid by something other than its own error. */
  invalid?: boolean;
}

/** The ids `FieldShell` places, the error it shows, and what the control carries. */
export interface FieldDescription {
  controlId: string;
  labelId: string;
  hintId: string;
  noteId: string;
  errorId: string;
  error?: string;
  /** Spread onto the control. */
  aria: {
    'aria-invalid': true | undefined;
    'aria-describedby': string | undefined;
  };
}

export interface FieldShellProps extends FieldProps, Omit<FieldDescription, 'aria'> {
  /** The control, carrying `controlId`, the description's `aria` and `aria-required`. */
  children: ReactNode;
  /** Beneath the error: what a field adds of its own. */
  after?: ReactNode;
  /** At the right end of the label row: a control acting on the field. */
  action?: ReactNode;
  /** A node elsewhere on the page where the error is drawn instead of beneath the control (a step row's Unit, across the whole row). */
  errorInto?: HTMLElement | null;
  /** A class beside `field` on the block: a filter's type-ahead, `filter-row__choice`. */
  className?: string;
}

/** A text field in a react-hook-form form; its name is one of that form's paths. */
export interface TextFieldProps<V extends FieldValues = FieldValues> extends FieldProps {
  name: FieldPath<V>;
  /** A short action shown, muted, while the field is empty: "Add a name". */
  placeholder?: string;
  /** A textarea, for prose. */
  multiline?: boolean;
  /** A textarea's height in lines, for prose longer than the 6rem default holds. */
  rows?: number;
  /** The input's type for a single line; a `number` takes any decimal and is read back as the text typed. */
  type?: Extract<HTMLInputTypeAttribute, 'text' | 'date' | 'url' | 'number'>;
  /** Shut, for a field the rest of the form has ruled out; its note says why. */
  disabled?: boolean;
  /** Fields whose errors this one's value also decides, revalidated when it changes. */
  deps?: FieldPath<V>[];
  /** Another element read with the field while it shows. */
  describedBy?: string;
  /** Marked invalid by something other than its own error. */
  invalid?: boolean;
  /** Drawn beneath the field, after its error. */
  after?: ReactNode;
  /** Its text is being looked up: a spinner at the input's right end and `aria-busy` on the input; a single line only. */
  busy?: boolean;
  /** At the right end of the label row. */
  action?: ReactNode;
  /** How the text is tidied as the field is left, matching what the server will store. */
  format?: (text: string) => string;
  /** The browser's autofill: `off` for a name, which Chrome otherwise takes for a person's. */
  autoComplete?: 'off';
}

export interface SelectOption {
  value: string;
  label: string;
  /** A mark drawn before the label, outside its accessible name: pass one hidden from assistive technology. */
  icon?: ReactNode;
  /** Listed but not choosable, such as a coven that already holds the entry. */
  disabled?: boolean;
  /** A second line under the option, read with it: why a disabled one is out. */
  note?: string;
}

/** A closed set in a react-hook-form form, whose value is one of its options. */
export interface SelectFieldProps<V extends FieldValues = FieldValues> extends FieldProps {
  name: FieldPath<V>;
  /** A short action shown until a choice is made, and not itself a choice: "Choose a group". */
  placeholder?: string;
  options: readonly SelectOption[];
  /** Chosen by typing, the list narrowing to labels holding the text, for a set long enough to want a search. */
  typeahead?: boolean;
  /** Shut, for a field the form has no use for yet: the select-only box only. */
  disabled?: boolean;
  deps?: FieldPath<V>[];
  /** See `FieldShellProps.errorInto`. */
  errorInto?: HTMLElement | null;
  /** Runs on a new choice, before the field and its `deps` revalidate. */
  onChange?: (value: string) => void;
}

/**
 * An on-or-off choice in a plain-state form, such as a list filter's No Refs. Held by the caller
 * through `checked`, or left to the native checkbox from `defaultChecked`. Not a react-hook-form
 * field.
 */
export interface SwitchFieldProps {
  /** The name beside the switch, and its accessible name. */
  label: string;
  /** The parameter it submits under while on. */
  name: string;
  /** What it submits while on: `1`, or empty for a bare flag. */
  value: string;
  /** On or off, held by the caller; leave it out for `defaultChecked`. */
  checked?: boolean;
  /** On or off as first drawn, the checkbox holding it after: a filter switch, which applies on its change. */
  defaultChecked?: boolean;
  onChange: (checked: boolean) => void;
  /** Shut: dashed, faded, its name dimmed. */
  disabled?: boolean;
  /** A change is in flight: `aria-busy` on the toggle, which stays enabled (loading.md, "Control"). */
  busy?: boolean;
  /** What the switch is for, behind an info tip beside the label. */
  hint?: string;
  /** A line under the toggle, read with it, saying what its state means. */
  note?: string;
  /** More of the note, behind an info tip beside it and still read with the toggle. */
  noteTip?: string;
}

/** One choice of a `RadioGroupField`: its value, its name and what it means. */
export interface RadioOption<T extends string> {
  value: T;
  label: string;
  /** What choosing it means, read after its name. */
  description?: string;
  /** A mark drawn before the name, outside its accessible name: pass one hidden from assistive technology. */
  icon?: ReactNode;
  /** How many entries choosing it would leave, read with its name in the segmented layout: "Toxic (4)". */
  count?: number;
}

export interface RadioGroupFieldProps<T extends string> {
  /** The group's name, in title case. */
  legend: string;
  /** The group's `name`, shared by its radios. */
  name: string;
  options: readonly RadioOption<T>[];
  /** The chosen value, held by the caller; `null` when nothing is chosen yet, so no radio is checked. */
  value: T | null;
  onChange: (value: T) => void;
  /** Shut: every radio dashed and faded. */
  disabled?: boolean;
  /** A line for the whole group, read with it: what holds whichever is chosen. */
  note?: string;
  /** `list` (default): a row each with its explanation; `strip`: icon-only segments, chosen name beneath; `segmented`: text segments with any `count`; `cards`: two columns of bordered cards, each with its name and explanation, one column on a phone. A radio underneath every way. */
  layout?: 'list' | 'strip' | 'segmented' | 'cards';
  /** An InfoTip beside the legend, for what the choices mean. */
  hint?: string;
  /** Why the group cannot be sent as it stands, under the choices and read with the group. */
  error?: string;
}

/** A form's row of actions: Save, any further saves, Cancel and Delete. */
export interface FormActionsProps {
  /** What is saved, in title case: "Save Group", "Saving Group", "Delete Group". */
  noun: string;
  /** The submit's name, where the form sends rather than saves: "Send Invitation". `Save ${noun}` when left out. */
  label?: string;
  /** The submit's name while busy: "Sending". `Saving ${noun}` when left out. */
  busyLabel?: string;
  /** The form holds something to save; Save is off until it does. */
  dirty: boolean;
  /** A save is in flight; Save is off meanwhile. */
  submitting: boolean;
  /** Save shows itself busy; `submitting` unless the form has several saves and this one was not pressed. */
  busy?: boolean;
  /** Save's `value`, which tells a form with several saves which was pressed. */
  saveValue?: string;
  /** Save's description, a note above the row about what saving will do. */
  saveDescribedBy?: string;
  /** Why Save is off, said in a tip and as its description; the button is then `aria-disabled` so it keeps focus. Left out, an off Save is plain `disabled`. */
  saveReason?: string;
  /** Save as a plain button calling this, for a panel inside another form, rather than the form's submit. */
  onSave?: () => void;
  /** Cancel, drawn when given: the form's way out, through its discard guard. */
  onCancel?: () => void;
  /** Cancel waits while a save is in flight, so a write is never left half-done. */
  holdCancel?: boolean;
  /** Delete, drawn when given: asks the form's question. */
  onDelete?: () => void;
  /** Further saves, between Save and Cancel. */
  children?: ReactNode;
  /** Set apart at the row's far end in Delete's place, for further choices that are not a delete; a form draws one or the other. */
  aside?: ReactNode;
}

/** An admin change's optional Reason, held by the caller in plain state. */
export interface ReasonFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Where the reason is kept, behind the info tip; by default, with the change in the ledger. */
  hint?: string;
  /** The wrapper's class, which holds the field's room above and below. */
  className?: string;
}

/** A list filter's search box: its text held by the caller, with a submit of its own (a magnifier named Search) at the box's end. */
export interface SearchFieldProps {
  /** The base the field's ids grow from, as `fieldDescription` takes it; its own `useId()` when left out. */
  id?: string;
  /** The name above the box, and its accessible name: "Name or Email". */
  label: string;
  /** The parameter the text submits under: `query`. */
  name: string;
  /** A short action shown, muted, while the box is empty: "Search names". */
  placeholder?: string;
  /** What the box matches, behind an info tip beside the label. */
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}

/** A list filter's closed set: a native select, or with `typeahead` a type-ahead once hydrated; the blank choice is no filter. */
export interface FilterSelectFieldProps {
  /** The name above the box, and its accessible name: "Role". */
  label: string;
  /** The parameter the choice submits under: `role`. */
  name: string;
  /** The blank first choice, no filter, and a type-ahead's placeholder: "All Roles". */
  all: string;
  /** Each choice, its value what the page reads and its label what the box shows. */
  options: readonly SelectOption[];
  /** The value the page shows, the blank for none; the field holds its own after. */
  defaultValue: string;
  /** Applies a new value: a select's on its change, a type-ahead's once a choice other than the one shown settles. */
  onChange: (value: string) => void;
  /** Typed into once hydrated, its list narrowing to the choices holding the text. */
  typeahead?: boolean;
}

/** One field an action changed: what it held before, and what it holds now. */
export interface HistoryDiff {
  /** The form path: `name`, `variants.0.form`, or an array's own path, `variants`. */
  name: string;
  before: unknown;
  after: unknown;
}

/** What one action changed: the fields it touched, when, and whether it was typing. */
export interface HistoryStep {
  diffs: HistoryDiff[];
  /** The time of the newest change in the step, from `Date.now()`. */
  at: number;
  /** Typed into one text box, so that the next key within the pause may extend it. */
  typing: boolean;
}

/** The two stacks: `past` oldest first, `future` the steps undone, next redo last. */
export interface HistoryState {
  past: HistoryStep[];
  future: HistoryStep[];
}

export type HistoryAction =
  | { type: 'recorded'; step: HistoryStep; limit: number }
  | { type: 'extended'; diffs: HistoryDiff[]; at: number }
  | { type: 'undone' }
  | { type: 'redone' }
  | { type: 'cleared' };

/** What a new change is to the newest step: its own step, part of it, or more of its typing. */
export type HistoryMerge = 'new' | 'join' | 'extend';

/** What `decideMerge` weighs. */
export interface HistoryMergeInput {
  newest: HistoryStep | undefined;
  name: string;
  typing: boolean;
  now: number;
  pauseMs: number;
  /** The newest step was recorded in the event or microtask still running. */
  sameTick: boolean;
  /** The change comes while a pointer is held down, and the hold has already recorded a step. */
  held: boolean;
  /** Focus left a field, or a step was undone, since the newest step. */
  sealed: boolean;
}

/** What `useFormHistory` is given besides the form. */
export interface UseFormHistoryOptions {
  /** The form's element: where the hook looks for the fields it restores, and listens for focus leaving. */
  root: RefObject<HTMLElement | null>;
  /** False while a question is up over the form: nothing is undone, and both buttons are off. */
  enabled?: boolean;
  /** True for a target whose chords the form leaves alone: a panel with a history of its own. */
  ignore?: (target: HTMLElement) => boolean;
  /** Told the names a step restored, its diffs and the direction, before focus moves, so a folded section can open; may return a name to focus instead of the first. */
  onRestored?: (
    names: string[],
    diffs: readonly HistoryDiff[],
    direction: 'undo' | 'redo',
  ) => string | void;
  /** Adjusts a value just before an undo or redo writes it back, for values naming things that can stop existing; left out, it is written as recorded. */
  prepare?: (name: string, value: unknown) => unknown;
  /** True for a name the history leaves out: interface state kept among the values. */
  skip?: (name: string) => boolean;
  /** How long a pause in typing ends its step. */
  pauseMs?: number;
  /** How many steps are kept. */
  limit?: number;
}

/** What `useFormHistory` returns, and `FormHistoryContext` carries to the buttons. */
export interface FormHistory {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Forgets every step: after a save, or whatever else starts the form over. */
  clear: () => void;
  /** What the live region says; it differs from the last even when the words are the same. */
  announcement: string;
  /** The buttons register themselves here: the last place focus may land. */
  undoButton: RefObject<HTMLButtonElement | null>;
  redoButton: RefObject<HTMLButtonElement | null>;
}
