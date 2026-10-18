'use client';

import { type KeyboardEvent, type ReactElement, useId, useState } from 'react';
import { ComboboxEntry } from '../Combobox';
import { fieldDescription } from '../Field';
import { FieldShell } from '../Field';
import type { ListInputProps } from './types';

/**
 * A list of typed entries, in plain state: a box that adds what is typed on
 * Enter or Add, and a chip for each entry with its cross. The form keeps the
 * list itself, because "the coven's own, empty" must stay distinguishable
 * from "the compendium's", which a form library's array would blur. Repeats
 * are dropped, ignoring case.
 */
export default function ListInput({
  label,
  hint,
  placeholder,
  entry,
  values,
  onChange,
  action,
}: ListInputProps): ReactElement {
  const id = useId();
  const [draft, setDraft] = useState('');
  const { aria, ...shell } = fieldDescription({ id, hint });

  const add = (): void => {
    const text = draft.trim();
    if (text === '') return;
    if (!values.some((each) => each.toLowerCase() === text.toLowerCase())) {
      onChange([...values, text]);
    }
    setDraft('');
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Enter') return;
    // Adds the entry; never submits the form.
    event.preventDefault();
    add();
  };

  return (
    <FieldShell label={label} hint={hint} {...shell} action={action}>
      <div className="cupboard-form__add">
        <input
          id={shell.controlId}
          className="input"
          type="text"
          autoComplete="off"
          placeholder={placeholder}
          {...aria}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="btn btn--quiet"
          disabled={draft.trim() === ''}
          onClick={add}
        >
          {`Add ${entry}`}
        </button>
      </div>
      {values.length > 0 && (
        <ul className="cupboard-form__chips">
          {values.map((value) => (
            <ComboboxEntry
              key={value}
              value={value}
              removeNoun={entry}
              onRemove={() => onChange(values.filter((each) => each !== value))}
            />
          ))}
        </ul>
      )}
    </FieldShell>
  );
}
