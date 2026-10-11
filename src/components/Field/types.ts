import type { HTMLInputTypeAttribute, ReactNode } from 'react';
import type { FieldPath, FieldValues } from 'react-hook-form';

/** What every field shares: what it is called, and what it is told about it. */
export interface FieldProps {
  label: string;
  /** What the field is for, behind an info tip beside the label. */
  hint?: string;
  /** A state the field is in — why it is shut — as a line beneath the label, never tucked away. */
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
  /** Another element read with the field: IngredientForm's duplicate warning. */
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
  /** A class beside `field` on the block: a filter's type-ahead, `filter-row__typeahead`. */
  className?: string;
}

/**
 * A text field in a react-hook-form form: the ingredient form, its reference
 * panel's (MB.154), or an admin form. Its name is one of that form's paths.
 */
export interface TextFieldProps<V extends FieldValues = FieldValues> extends FieldProps {
  name: FieldPath<V>;
  /** A short action shown, muted, while the field is empty: "Add a name". What the field is for is its `hint`. */
  placeholder?: string;
  /** A textarea, for prose. */
  multiline?: boolean;
  /** A textarea's height in lines, where its prose runs longer than the primitive's 6rem holds. */
  rows?: number;
  /** The input's type, for a single line: a reference's days are `date`s. */
  type?: Extract<HTMLInputTypeAttribute, 'text' | 'date' | 'url'>;
  /** Shut, for a field the rest of the form has ruled out; its note says why. */
  disabled?: boolean;
  /** Fields whose errors this one's value decides as well, revalidated when it changes. */
  deps?: FieldPath<V>[];
  /** Another element read with the field while it shows: the name's duplicate warning. */
  describedBy?: string;
  /** Marked invalid by something other than its own error: the name's held duplicate warning. */
  invalid?: boolean;
  /** Drawn beneath the field, after its error: the name's duplicate warning. */
  after?: ReactNode;
  /** How the text is tidied as the field is left: a reference's fields, as the server will store them. */
  format?: (text: string) => string;
  /** The browser's autofill: `off` for a name, which Chrome otherwise takes for a person's. */
  autoComplete?: 'off';
}

export interface SelectOption {
  value: string;
  label: string;
}

/** A closed set in a react-hook-form form, whose value is one of its options. */
export interface SelectFieldProps<V extends FieldValues = FieldValues> extends FieldProps {
  name: FieldPath<V>;
  /** A short action shown until a choice is made, and not itself a choice: "Choose a group". */
  placeholder?: string;
  options: readonly SelectOption[];
  /**
   * Chosen by typing, the list narrowing to the options whose label holds the
   * text, rather than picked from the select-only box: a set long enough to
   * want a search, the deities' traditions.
   */
  typeahead?: boolean;
  deps?: FieldPath<V>[];
  /** Runs on a new choice, before the field and its `deps` revalidate. */
  onChange?: (value: string) => void;
}

/**
 * An on-or-off choice in a plain-state form, held by the caller: a list
 * filter's Without References or Needs Approval. Not a react-hook-form field,
 * since no such form has one yet.
 */
export interface SwitchFieldProps {
  /** The name beside the switch, and its accessible name. */
  label: string;
  /** The parameter it submits under while on. */
  name: string;
  /** What it submits while on: `1`, or empty for a bare flag. */
  value: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Shut: dashed, faded, its name dimmed. */
  disabled?: boolean;
}
