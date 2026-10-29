'use client';

import { type ReactElement, useMemo, useState } from 'react';
import Combobox from '.';
import type { ComboboxChoice, ComboboxOption, ComboboxTypeaheadProps } from './types';

// A closed set chosen by typing, react-select's single select: only a choice is ever the value. Not re-exported from the folder's index, as the lint refuses an import cycle
// (claude-docs/components/combobox.md, "The type-ahead box").

// Not the ingredient form's `fold`: this matches what a person types against a label they read, so it folds in their locale.
const fold = (text: string) => text.trim().toLocaleLowerCase();

/** The choice the text names in full, whatever its case, or none. */
const choiceNamed = (choices: readonly ComboboxChoice[], text: string) =>
  choices.find((choice) => fold(choice.label) === fold(text));

export function ComboboxTypeahead({
  id,
  label,
  labelId,
  value,
  onChange,
  onSettle,
  onBlur,
  choices,
  placeholder,
  required,
  clearable,
  inputRef,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: ComboboxTypeaheadProps): ReactElement {
  const selected = choices.find((choice) => choice.value === value);
  const [text, setText] = useState(selected?.label ?? '');
  // A value set from outside writes its label into the box, unless the text already names it.
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    if (selected && choiceNamed(choices, text) !== selected) setText(selected.label);
  }

  // The text narrows the list once it is not the choice's own label.
  const query = selected && text === selected.label ? '' : fold(text);
  // A qualified choice's row reads its label with the qualifier in brackets; the text a pick writes and the query match the label alone.
  const suggestions = useMemo(
    () => ({
      options: choices
        .filter((choice) => choice.label.toLocaleLowerCase().includes(query))
        .map((choice): ComboboxOption => ({
          value: choice.label,
          label: choice.qualifier ? `${choice.label} (${choice.qualifier.text})` : undefined,
          key: choice.value,
          icon: choice.icon,
        })),
      pending: false,
    }),
    [choices, query],
  );

  // Text that names no choice is no value: the field holds none.
  const type = (next: string) => {
    setText(next);
    const named = choiceNamed(choices, next)?.value ?? '';
    if (named !== value) onChange(named);
  };

  return (
    <Combobox
      id={id}
      label={label}
      labelId={labelId}
      value={text}
      onChange={type}
      onPick={(picked, option) => {
        if (!option?.key) return;
        setText(picked);
        if (option.key !== value) onChange(option.key);
        onSettle?.(option.key);
      }}
      onBlur={() => {
        // Left naming a choice in another case, the box reads its label.
        const named = choiceNamed(choices, text);
        if (named && named.label !== text) setText(named.label);
        onSettle?.(named?.value ?? '');
        onBlur?.();
      }}
      // From the first render, so its room is kept while hidden and the box never changes width.
      clear={
        clearable
          ? {
              label: `Clear ${label}`,
              empty: text === '' && value === '',
              onClear: () => {
                setText('');
                if (value !== '') onChange('');
                onSettle?.('');
                // The pressed clear hides; the box keeps the focus.
                document.getElementById(id)?.focus();
              },
            }
          : undefined
      }
      suggestions={suggestions}
      // The chosen choice's qualifier and icon, once the box reads its label as written.
      qualifier={selected && text === selected.label ? selected.qualifier : undefined}
      icon={selected && text === selected.label ? selected.icon : undefined}
      offerTyped={false}
      highlightFirst
      noun="choice"
      placeholder={placeholder}
      required={required}
      inputRef={inputRef}
      aria-describedby={describedBy}
      aria-invalid={invalid}
    />
  );
}
