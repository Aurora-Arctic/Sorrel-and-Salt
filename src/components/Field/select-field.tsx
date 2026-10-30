'use client';

import type { ReactElement } from 'react';
import { type FieldValues, useController, useFormContext } from 'react-hook-form';
import { ComboboxSelect } from '../Combobox';
import { ComboboxTypeahead } from '../Combobox/typeahead';
import { FieldShell } from './shell';
import type { SelectFieldProps } from './types';
import { useField } from './use-field';

/**
 * A closed set on the combobox's select-only box (DESIGN.md §14), or, with `typeahead`, its type-ahead
 * box. In whichever react-hook-form form provides it.
 */
export function SelectField<V extends FieldValues = FieldValues>({
  name,
  label,
  labelSuffix,
  hint,
  placeholder,
  options,
  typeahead,
  disabled,
  required,
  deps,
  errorInto,
  onChange,
}: SelectFieldProps<V>): ReactElement {
  const { control } = useFormContext<V>();
  const { field } = useController({ control, name, rules: { deps } });
  const { aria, ...shell } = useField<V>(name, hint);
  const Box = typeahead ? ComboboxTypeahead : ComboboxSelect;
  return (
    <FieldShell
      label={label}
      labelSuffix={labelSuffix}
      hint={hint}
      required={required}
      errorInto={errorInto}
      {...shell}
    >
      <Box
        id={shell.controlId}
        label={labelSuffix ? `${label}, ${labelSuffix}` : label}
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
        {...(!typeahead && { disabled })}
        inputRef={field.ref}
        {...aria}
      />
    </FieldShell>
  );
}
