'use client';

import type { FocusEvent, ReactElement } from 'react';
import { type FieldPath, type FieldValues, type PathValue, useFormContext } from 'react-hook-form';
import { FieldShell } from './shell';
import type { TextFieldProps } from './types';
import { useField } from './use-field';

/**
 * A text input or textarea in whichever react-hook-form form provides it,
 * reading and showing its own error. Lifted from IngredientForm (MB.115) so
 * every react-hook-form form draws its text fields through one.
 */
export function TextField<V extends FieldValues = FieldValues>({
  name,
  label,
  hint,
  note,
  required,
  placeholder,
  multiline,
  rows,
  type,
  disabled,
  deps,
  describedBy,
  invalid,
  after,
  format,
  autoComplete,
}: TextFieldProps<V>): ReactElement {
  const { register, setValue, getFieldState } = useFormContext<V>();
  const { aria, ...field } = useField<V>(name, hint, note, describedBy, invalid);
  // Tidied as it is left, the way the server will store it (MB.154); an
  // error it was showing is judged again on the tidied text.
  const tidy = (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const text = event.target.value;
    const formatted = format?.(text) ?? text;
    if (formatted === text) return;
    setValue(name, formatted as PathValue<V, FieldPath<V>>, {
      shouldDirty: true,
      shouldValidate: getFieldState(name).invalid,
    });
  };
  // The attribute, not register's `disabled`, which would also drop the value
  // from what is validated and sent: the form decides that itself. And
  // `aria-required` rather than `required`, whose `:invalid` would mark an
  // empty field before anyone has tried to save.
  const control = {
    id: field.controlId,
    disabled,
    placeholder,
    autoComplete,
    'aria-required': required || undefined,
    ...aria,
    ...register(name, { deps, onBlur: format ? tidy : undefined }),
  };
  return (
    <FieldShell label={label} hint={hint} note={note} required={required} after={after} {...field}>
      {multiline ? (
        <textarea className="textarea" rows={rows} {...control} />
      ) : (
        <input className="input" type={type} {...control} />
      )}
    </FieldShell>
  );
}
