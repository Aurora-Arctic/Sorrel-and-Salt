'use client';

import { type ReactElement, useMemo } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import Combobox from '../Combobox';
import { matchesLabelOrGroup } from '../Combobox/match';
import { FieldShell, useField } from '../Field';
import type { SpellBuilderValues, SpellSuggestFieldProps } from './types';

/**
 * A spell field that suggests from a fixed list (./constants): a pick fills the name and anything else typed is kept as typed
 * (claude-docs/components/spell-builder.md, "The suggest field").
 */
export function SpellSuggestField({
  name,
  label,
  hint,
  placeholder,
  options,
  icon,
}: SpellSuggestFieldProps): ReactElement {
  const { control } = useFormContext<SpellBuilderValues>();
  const { field } = useController({ control, name });
  const { aria, ...shell } = useField<SpellBuilderValues>(name, hint);
  const text = field.value;
  const suggestions = useMemo(
    () => ({
      options: options
        .filter((option) => matchesLabelOrGroup(option, undefined, text))
        .map((value) => ({ value, icon: icon?.(value) })),
      pending: false,
    }),
    [options, text, icon],
  );
  return (
    <FieldShell label={label} hint={hint} {...shell}>
      <Combobox
        id={shell.controlId}
        label={label}
        labelId={shell.labelId}
        value={text}
        onChange={field.onChange}
        onBlur={field.onBlur}
        onPick={(value) => field.onChange(value)}
        suggestions={suggestions}
        offerTyped
        // The value's own mark in the box, there while the text is a listed
        // name: a value typed outside the list draws none.
        icon={icon?.(text)}
        placeholder={placeholder}
        inputRef={field.ref}
        name={field.name}
        {...aria}
      />
    </FieldShell>
  );
}
