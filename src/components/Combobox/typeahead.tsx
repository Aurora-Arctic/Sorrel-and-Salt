'use client';

import { type ReactElement, useMemo, useState } from 'react';
import Combobox from '.';
import type { ComboboxChoice, ComboboxOption, ComboboxTypeaheadProps } from './types';

// A closed set chosen by typing, react-select's single select: the typing
// box over the set's choices, its text its own and narrowing the list, and
// only a choice ever the value. Not re-exported from the folder's index,
// which this imports, since the lint refuses an import cycle. See
// claude-docs/components/combobox.md, "The type-ahead box".

// Not the ingredient form's `fold`, which keys entries as the database folds
// them: this matches what a person types against a label they read, so it
// folds in their locale.
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
  // A value set from outside, a pick or a reset, writes its label into the
  // box, unless the text already names it: typing "mockish" chooses Mockish
  // and keeps what was typed until the box is left.
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    if (selected && choiceNamed(choices, text) !== selected) setText(selected.label);
  }

  // The text narrows the list once it is not the choice's own label, so a
  // box holding a choice opens on every choice rather than on that one.
  const query = selected && text === selected.label ? '' : fold(text);
  const suggestions = useMemo(
    () => ({
      options: choices
        .filter((choice) => choice.label.toLocaleLowerCase().includes(query))
        .map((choice): ComboboxOption => ({ value: choice.label, key: choice.value })),
      pending: false,
    }),
    [choices, query],
  );

  // Text that names no choice is no value: the field holds none, and a
  // required one shows its error on save, as one never chosen does.
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
      }}
      onBlur={() => {
        // Left naming a choice in another case, the box reads its label.
        const named = choiceNamed(choices, text);
        if (named && named.label !== text) setText(named.label);
        onBlur?.();
      }}
      // From the first render, empty or not, so its room is kept while it
      // is hidden and the box never changes width.
      clear={
        clearable
          ? {
              label: `Clear ${label}`,
              empty: text === '' && value === '',
              onClear: () => {
                setText('');
                if (value !== '') onChange('');
                // The pressed clear hides; the box keeps the focus.
                document.getElementById(id)?.focus();
              },
            }
          : undefined
      }
      suggestions={suggestions}
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
