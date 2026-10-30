'use client';

import { useId } from 'react';
import {
  type FieldError as FormFieldError,
  type FieldPath,
  type FieldValues,
  get,
  useFormState,
} from 'react-hook-form';
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
 * Whether the error on `name` is shown: after a submit, every error; before one, only a field the
 * person has both left and edited. "Edited" is any change event ever made, as `dirtyFields` unsets when
 * the value returns to its default. With no `edited` record the rule is touched alone.
 */
export function errorShown(
  { isSubmitted, touchedFields, edited }: ShownState,
  name: string,
): boolean {
  return isSubmitted || (Boolean(get(touchedFields, name)) && (!edited || edited.has(name)));
}

/**
 * A react-hook-form field's description: `fieldDescription` over its own error, read by name so a field
 * re-renders for its own error only. Held back by `errorShown`, and still while a pointer is pressed.
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
  const raw: string | undefined = get<unknown, FormFieldError | undefined>(
    state.errors,
    name,
  )?.message;
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
