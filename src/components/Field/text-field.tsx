'use client';

import type { FocusEvent, ReactElement } from 'react';
import { type FieldPath, type FieldValues, type PathValue, useFormContext } from 'react-hook-form';
import Spinner from '../Spinner';
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
  action,
  format,
  autoComplete,
  busy,
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
    // Any decimal: the browser's default step is whole numbers, which would flag 2.5 as invalid.
    step: type === 'number' ? 'any' : undefined,
    'aria-required': required || undefined,
    ...aria,
    ...register(name, { deps, onBlur: format ? tidy : undefined }),
  };
  return (
    <FieldShell
      label={label}
      hint={hint}
      note={note}
      required={required}
      after={after}
      action={action}
      {...field}
    >
      {multiline ? (
        <textarea className="textarea" rows={rows} {...control} />
      ) : busy === undefined ? (
        <input className="input" type={type} {...control} />
      ) : (
        // A field that looks its text up (the name's duplicate check) says so
        // in the box itself, the owner's call (2026-10-18): the spinner at
        // the input's right end, the input busy, and nothing else drawn until
        // the answer has something to show. Wrapped only when the caller
        // says, so every other text field keeps its bare input.
        <span className="field__control">
          <input className="input" type={type} aria-busy={busy || undefined} {...control} />
          {busy && <Spinner className="field__busy" />}
        </span>
      )}
    </FieldShell>
  );
}
