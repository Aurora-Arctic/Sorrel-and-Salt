'use client';

import type { ReactElement } from 'react';
import { type FieldValues, useController, useFormContext } from 'react-hook-form';
import { tidy } from '../../lib/formats';
import Combobox from '../Combobox';
import type { ComboboxOption } from '../Combobox/types';
import { FieldShell } from './shell';
import type { SuggestFieldProps } from './types';
import { useField } from './use-field';

/**
 * A text field whose box suggests as it is typed in (claude-docs/components/combobox.md): a pick fills the field with
 * the suggestion's value, and free text stays as typed, apart from its spacing. What a pick links is the caller's,
 * told of each pick and each edit; what it adds to the box is its qualifier.
 */
export function SuggestField<O extends ComboboxOption = ComboboxOption>({
  name,
  label,
  hint,
  placeholder,
  suggestions,
  onActivate,
  onPick,
  onEdit,
  qualifier,
  icon,
  typedIcon,
  offerTyped,
  note,
  after,
  autoCapitalize,
  enterKeyHint,
}: SuggestFieldProps<O>): ReactElement {
  const { control } = useFormContext<FieldValues>();
  const { field } = useController({ control, name });
  const { aria, ...shell } = useField<FieldValues>(name, hint, note);
  return (
    <FieldShell label={label} hint={hint} note={note} after={after} {...shell}>
      <Combobox
        id={shell.controlId}
        label={label}
        labelId={shell.labelId}
        value={field.value}
        onChange={(text) => {
          field.onChange(text);
          onEdit?.(text);
        }}
        onFocus={onActivate}
        onBlur={() => {
          const tidied = tidy(field.value ?? '');
          if (tidied !== field.value) field.onChange(tidied);
          field.onBlur();
        }}
        spellCheck={false}
        autoCapitalize={autoCapitalize}
        enterKeyHint={enterKeyHint}
        onPick={(value, option) => {
          field.onChange(value);
          onPick?.(option);
        }}
        suggestions={suggestions}
        qualifier={qualifier}
        icon={icon}
        typedIcon={typedIcon}
        offerTyped={offerTyped}
        placeholder={placeholder}
        inputRef={field.ref}
        name={field.name}
        {...aria}
      />
    </FieldShell>
  );
}
