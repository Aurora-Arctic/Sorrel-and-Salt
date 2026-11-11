'use client';

import { type ReactElement, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { matchesLabelOrGroup } from '../Combobox/match';
import { SuggestField } from '../Field';
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
  const text = useWatch({ control, name });
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
    <SuggestField
      name={name}
      label={label}
      hint={hint}
      placeholder={placeholder}
      suggestions={suggestions}
      offerTyped
      icon={icon?.(text)}
      autoCapitalize="none"
      enterKeyHint="next"
    />
  );
}
