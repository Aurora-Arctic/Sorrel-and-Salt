'use client';

import { type ReactElement, useId } from 'react';
import { ComboboxSelect } from '../Combobox';
import { fieldDescription } from './description';
import { FieldShell } from './shell';
import type { PlainSelectFieldProps } from './types';

/** `SelectField` for a form that holds its values in state: the caller holds `value` and `error`. */
export function PlainSelectField({
  id,
  label,
  hint,
  required,
  placeholder,
  options,
  disabled,
  busy,
  error,
  value,
  onChange,
}: PlainSelectFieldProps): ReactElement {
  const ownId = useId();
  const { aria, ...description } = fieldDescription({ id: id ?? ownId, hint, error });
  return (
    <FieldShell label={label} hint={hint} required={required} {...description}>
      <ComboboxSelect
        id={description.controlId}
        label={label}
        labelId={description.labelId}
        value={value}
        onChange={onChange}
        choices={options}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        busy={busy}
        {...aria}
      />
    </FieldShell>
  );
}
