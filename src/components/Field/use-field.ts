'use client';

import { useId } from 'react';
import { type FieldPath, type FieldValues, get, useFormState } from 'react-hook-form';
import { fieldDescription } from './description';
import type { FieldDescription } from './types';

/**
 * A react-hook-form field's description: `fieldDescription` over the field's
 * own error, read from the form state by name, so a field re-renders for its
 * own error and not for every other field's.
 */
export function useField<V extends FieldValues>(
  name: FieldPath<V>,
  hint?: string,
  note?: string,
  describedBy?: string,
  invalid?: boolean,
): FieldDescription {
  const id = useId();
  const { errors } = useFormState<V>({ name });
  const error: string | undefined = get(errors, name)?.message;
  return fieldDescription({ id, hint, note, describedBy, error, invalid });
}
