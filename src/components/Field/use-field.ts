'use client';

import { useId } from 'react';
import { type FieldPath, type FieldValues, get, useFormState } from 'react-hook-form';
import { fieldDescription } from './description';
import { useEditedFieldsContext } from './edited-fields';
import { useSettledWhilePressed } from './pointer-held';
import type { FieldDescription } from './types';

/**
 * The part of a react-hook-form field's state that decides whether its error
 * is drawn.
 */
export type ShownState = {
  isSubmitted: boolean;
  touchedFields: unknown;
  /** The fields the person has ever edited; null or absent tracks nothing. */
  edited?: ReadonlySet<string> | null;
};

/**
 * Whether the error on `name` is shown. After a submit, every error is. Before
 * one, only a field the person has both left and edited (story 31, the owner's
 * call): a required field typed into and left empty is flagged as they move
 * on, while one merely passed through, or one whose error came from another
 * field's change (a classification pick raising the formal-name rule), stays
 * quiet until it is edited and left itself. "Edited" is any change event ever
 * made on the field, so typing a name and deleting it still counts;
 * react-hook-form's `dirtyFields` is not used, since it unsets when the value
 * returns to its default. With no `edited` record the rule is touched alone.
 * The one rule, so no field and no section flag repeats it.
 */
export function errorShown(
  { isSubmitted, touchedFields, edited }: ShownState,
  name: string,
): boolean {
  return isSubmitted || (Boolean(get(touchedFields, name)) && (!edited || edited.has(name)));
}

/**
 * A react-hook-form field's description: `fieldDescription` over the field's
 * own error, read from the form state by name, so a field re-renders for its
 * own error and not for every other field's. The error is held back by
 * `errorShown`, and stands still while a pointer is pressed
 * (`useSettledWhilePressed`).
 */
export function useField<V extends FieldValues>(
  name: FieldPath<V>,
  hint?: string,
  note?: string,
  describedBy?: string,
  invalid?: boolean,
): FieldDescription {
  const id = useId();
  const state = useFormState<V>({ name });
  const edited = useEditedFieldsContext();
  const raw: string | undefined = get(state.errors, name)?.message;
  // The rest of the state is read only for a field in error, so a field with
  // none re-renders for nothing but its error.
  const error = useSettledWhilePressed(
    raw &&
      errorShown(
        { isSubmitted: state.isSubmitted, touchedFields: state.touchedFields, edited },
        name,
      )
      ? raw
      : undefined,
  );
  return fieldDescription({ id, hint, note, describedBy, error, invalid });
}
