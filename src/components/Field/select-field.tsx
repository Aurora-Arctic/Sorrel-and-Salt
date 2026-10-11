'use client';

import type { ReactElement } from 'react';
import { type FieldValues, useController, useFormContext } from 'react-hook-form';
import { ComboboxSelect } from '../Combobox';
import { FieldShell } from './shell';
import type { SelectFieldProps } from './types';
import { useField } from './use-field';

/**
 * A closed set, on the combobox's select-only box (DESIGN.md §14): the same
 * control and list as a suggesting field, with nothing to type. In whichever
 * react-hook-form form provides it; lifted from IngredientForm (MB.115).
 */
export function SelectField<V extends FieldValues = FieldValues>({
  name,
  label,
  hint,
  placeholder,
  options,
  required,
  deps,
  onChange,
}: SelectFieldProps<V>): ReactElement {
  const { control } = useFormContext<V>();
  const { field } = useController({ control, name, rules: { deps } });
  const { aria, ...shell } = useField<V>(name, hint);
  return (
    <FieldShell label={label} hint={hint} required={required} {...shell}>
      <ComboboxSelect
        id={shell.controlId}
        label={label}
        labelId={shell.labelId}
        value={field.value}
        // Before the field and its `deps` revalidate: an IngredientForm
        // classification of None empties the formal name first, so its error
        // is judged on the empty value.
        onChange={(value) => {
          onChange?.(value);
          field.onChange(value);
        }}
        onBlur={field.onBlur}
        choices={options}
        placeholder={placeholder}
        required={required}
        inputRef={field.ref}
        {...aria}
      />
    </FieldShell>
  );
}
