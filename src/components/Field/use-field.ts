'use client';

import { useId } from 'react';
import { type FieldPath, type FieldValues, get, useFormState } from 'react-hook-form';
import { fieldDescription } from './description';
import type { FieldDescription } from './types';

/**
 * The part of a react-hook-form field's state that decides whether its error
 * is drawn.
 */
export type ShownState = {
  isSubmitted: boolean;
  touchedFields: unknown;
};

/**
 * Whether the error on `name` is shown. After a submit, every error is. Before
 * one, only a field the person has left (story 31, the owner's call): a
 * required field left empty is flagged as they move on, while one whose error
 * came from another field's change (a classification pick raising the
 * formal-name rule) stays quiet until it is left itself. The one rule, so no
 * field and no section flag repeats it.
 */
export function errorShown({ isSubmitted, touchedFields }: ShownState, name: string): boolean {
  return isSubmitted || Boolean(get(touchedFields, name));
}

/**
 * A react-hook-form field's description: `fieldDescription` over the field's
 * own error, read from the form state by name, so a field re-renders for its
 * own error and not for every other field's. The error is held back by
 * `errorShown`.
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
  const raw: string | undefined = get(state.errors, name)?.message;
  // The rest of the state is read only for a field in error, so a field with
  // none re-renders for nothing but its error.
  const error = raw && errorShown(state, name) ? raw : undefined;
  return fieldDescription({ id, hint, note, describedBy, error, invalid });
}
