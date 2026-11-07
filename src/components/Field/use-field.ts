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

export type ShownState = {
  isSubmitted: boolean;
  touchedFields: unknown;
  edited?: ReadonlySet<string> | null;
};

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
