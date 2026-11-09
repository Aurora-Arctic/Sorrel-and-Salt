import type { AutoFill, HTMLInputTypeAttribute, ReactNode, RefObject } from 'react';
import type { FieldMask } from '../../lib/formats';
import type { FieldPath, FieldValues } from 'react-hook-form';

/** A specific autofill token, or `off`. Never `on` or empty, which would let a password manager fill any field. */
export type AutofillToken = Exclude<AutoFill, 'on' | ''>;

export interface FieldProps {
  label: string;
  /** Read after the label, out of sight ("Quantity, Flower"), so a field drawn once per row has a name of its own. */
  labelSuffix?: string;
  hint?: string;
  note?: ReactNode;
  required?: boolean;
}

export interface FieldErrorProps {
  id: string;
  message?: string;
}

export interface FieldDescriptionInput {
  id: string;
  hint?: string;
  note?: ReactNode;
  describedBy?: string;
  error?: string;
  invalid?: boolean;
}

export interface FieldDescription {
  controlId: string;
  labelId: string;
  hintId: string;
  noteId: string;
  errorId: string;
  error?: string;
  aria: {
    'aria-invalid': true | undefined;
    'aria-describedby': string | undefined;
  };
}

export interface FieldShellProps extends Omit<FieldProps, 'note'>, Omit<FieldDescription, 'aria'> {
  note?: ReactNode;
  children: ReactNode;
  after?: ReactNode;
  action?: ReactNode;
  /** A node elsewhere on the page where the error is drawn instead of beneath the control (a step row's Unit, across the whole row). */
  errorInto?: HTMLElement | null;
  className?: string;
}

/**
 * What a text control takes, whether it is the react-hook-form `TextField` or the plain-state
 * `PlainTextField`.
 */
export interface TextControlProps extends FieldProps {
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  /**
   * The input's type for a single line; a `number` takes any decimal and is read back as the text
   * typed.
   */
  type?: Extract<HTMLInputTypeAttribute, 'text' | 'date' | 'url' | 'number' | 'email' | 'tel'>;
  /** The on-screen keyboard: `numeric` for a whole number, which a `number` type would take as any decimal. */
  inputMode?: 'numeric' | 'decimal' | 'email' | 'tel' | 'url';
  disabled?: boolean;
  /**
   * Tidies the text when the person leaves the field. A single-line field defaults to `tidy`
   * (src/lib/formats.ts); a multiline one to none. The server schema runs the same function.
   */
  format?: (text: string) => string;
  /**
   * A soft limit in characters: typing past it is allowed, a count shows from three quarters of it,
   * and Save refuses. No `maxlength` is set. The schema states the same number, once.
   */
  limit?: number;
  /**
   * Formats the text while the person types, keeping the caret, paste and Backspace working
   * (claude-docs/components/field.md, "Masks"). Only for a field the owner has approved; the schema still
   * checks the value, and `format` still runs on blur. Not for a multiline field.
   */
  mask?: FieldMask;
  /** The browser's autofill. `off` by default; a specific token (never `on`) for a credential or the person's own details. */
  autoComplete?: AutofillToken;
  /**
   * Asks 1Password not to offer to fill or save this field (`data-1p-ignore`), for a field it may take
   * for a credential, such as the address of someone being invited. LastPass and Bitwarden document no such field attribute.
   */
  ignorePasswordManagers?: boolean;
  /** On for prose (the default for multiline), off for an identifier (the default for a single-line email, url or tel). */
  spellCheck?: boolean;
  /** `none` by default for email and url. */
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** The label on a phone keyboard's Enter key: `next` between fields, `done` or `send` on the last. */
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
  /** Takes focus when the field appears, for a step that replaces the form the person was typing in. */
  autoFocus?: boolean;
  describedBy?: string;
  invalid?: boolean;
  after?: ReactNode;
  action?: ReactNode;
  busy?: boolean;
}

export interface TextFieldProps<V extends FieldValues = FieldValues> extends TextControlProps {
  name: FieldPath<V>;
  deps?: FieldPath<V>[];
}

/** A text field for a form that holds its values in state: the caller holds `value` and the `error` text. */
export interface PlainTextFieldProps extends TextControlProps {
  value: string;
  onChange: (value: string) => void;
  /** The control's `name`, where the form submits natively. */
  name?: string;
  /** The error text the caller's own check found, drawn and announced as TextField's is. */
  error?: string;
  onBlur?: () => void;
}

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  note?: string;
}

export interface SelectFieldProps<V extends FieldValues = FieldValues> extends FieldProps {
  name: FieldPath<V>;
  /** A short action shown until a choice is made, and not itself a choice: "Choose a group". */
  placeholder?: string;
  options: readonly SelectOption[];
  typeahead?: boolean;
  disabled?: boolean;
  deps?: FieldPath<V>[];
  errorInto?: HTMLElement | null;
  onChange?: (value: string) => void;
}

/**
 * An on-or-off choice in a plain-state form, such as a list filter's No Refs. Held by the caller
 * through `checked`, or left to the native checkbox from `defaultChecked`. Not a react-hook-form
 * field.
 */
export interface SwitchFieldProps {
  label: string;
  name: string;
  value: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  busy?: boolean;
  hint?: string;
  note?: string;
  noteTip?: string;
}

export interface RadioOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
  /** How many entries choosing it would leave, read with its name in the segmented layout: "Toxic (4)". */
  count?: number;
  /** Offered but not choosable now: kept in place, so the group keeps its shape. */
  disabled?: boolean;
}

export interface RadioGroupFieldProps<T extends string> {
  /** The group's `id`, for a caller that moves focus into it. */
  id?: string;
  legend: string;
  name: string;
  options: readonly RadioOption<T>[];
  /** The chosen value, held by the caller; `null` when nothing is chosen yet, so no radio is checked. */
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
  note?: string;
  layout?: 'list' | 'strip' | 'segmented' | 'cards';
  hint?: string;
  /** Why the group cannot be sent as it stands, under the choices and read with the group. */
  error?: string;
  required?: boolean;
}

export interface FormActionsProps {
  noun: string;
  /** The submit's name, where the form sends rather than saves: "Send Invitation". `Save ${noun}` when left out. */
  label?: string;
  busyLabel?: string;
  /** The form holds something to save; Save is off until it does. */
  dirty: boolean;
  submitting: boolean;
  /** Save shows itself busy; `submitting` unless the form has several saves and this one was not pressed. */
  busy?: boolean;
  saveValue?: string;
  saveDescribedBy?: string;
  /** Why Save is off, said in a tip and as its description; the button is then `aria-disabled` so it keeps focus. Left out, an off Save is plain `disabled`. */
  saveReason?: string;
  /** Save as a plain button calling this, for a panel inside another form, rather than the form's submit. */
  onSave?: () => void;
  onCancel?: () => void;
  /** Cancel waits while a save is in flight, so a write is never left half-done. */
  holdCancel?: boolean;
  onDelete?: () => void;
  children?: ReactNode;
  /** Set apart at the row's far end in Delete's place, for further choices that are not a delete; a form draws one or the other. */
  aside?: ReactNode;
}

export interface ReasonFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hint?: string;
  className?: string;
}

export interface SearchFieldProps {
  id?: string;
  label: string;
  name: string;
  placeholder?: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}

export interface FilterSelectFieldProps {
  label: string;
  name: string;
  all: string;
  options: readonly SelectOption[];
  defaultValue: string;
  onChange: (value: string) => void;
  typeahead?: boolean;
  /** As wide as its longest choice, rather than the filter row's one width for a choice. Not with `typeahead`. */
  fit?: boolean;
}

export interface HistoryDiff {
  name: string;
  before: unknown;
  after: unknown;
}

export interface HistoryStep {
  diffs: HistoryDiff[];
  at: number;
  /** Typed into one text box, so that the next key within the pause may extend it. */
  typing: boolean;
}

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

export type HistoryMerge = 'new' | 'join' | 'extend';

export interface HistoryMergeInput {
  newest: HistoryStep | undefined;
  name: string;
  typing: boolean;
  now: number;
  pauseMs: number;
  sameTick: boolean;
  held: boolean;
  /** Focus left a field, or a step was undone, since the newest step. */
  sealed: boolean;
}

export interface UseFormHistoryOptions {
  /** The form's element: where the hook looks for the fields it restores, and listens for focus leaving. */
  root: RefObject<HTMLElement | null>;
  enabled?: boolean;
  ignore?: (target: HTMLElement) => boolean;
  /** Told the names a step restored, its diffs and the direction, before focus moves, so a folded section can open; may return a name to focus instead of the first. */
  onRestored?: (
    names: string[],
    diffs: readonly HistoryDiff[],
    direction: 'undo' | 'redo',
  ) => string | void;
  /** Adjusts a value just before an undo or redo writes it back, for values naming things that can stop existing; left out, it is written as recorded. */
  prepare?: (name: string, value: unknown) => unknown;
  skip?: (name: string) => boolean;
  pauseMs?: number;
  limit?: number;
}

export interface FormHistory {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
  announcement: string;
  /** The buttons register themselves here: the last place focus may land. */
  undoButton: RefObject<HTMLButtonElement | null>;
  redoButton: RefObject<HTMLButtonElement | null>;
}

export interface CharacterCountProps {
  id: string;
  length: number;
  limit: number;
}
