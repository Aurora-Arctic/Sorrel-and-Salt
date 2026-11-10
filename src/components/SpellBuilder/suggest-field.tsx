'use client';

import { type ReactElement, useMemo } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { tidy } from '@/lib/formats';
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
        onBlur={() => {
          // Typed text is kept as typed, apart from its spacing.
          if (tidy(text) !== text) field.onChange(tidy(text));
          field.onBlur();
        }}
        onPick={(value) => field.onChange(value)}
        suggestions={suggestions}
        offerTyped
        icon={icon?.(text)}
        placeholder={placeholder}
        spellCheck={false}
        autoCapitalize="none"
        enterKeyHint="next"
        inputRef={field.ref}
        name={field.name}
        {...aria}
      />
    </FieldShell>
  );
}
