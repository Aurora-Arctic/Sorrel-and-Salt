'use client';

import { type ReactElement, useEffect, useId, useRef } from 'react';
import { fieldDescription } from './description';
import { MagnifierIcon } from './icons';
import { FieldShell } from './shell';
import type { SearchFieldProps } from './types';

export function SearchField({
  id,
  label,
  name,
  placeholder,
  hint,
  value,
  onChange,
}: SearchFieldProps): ReactElement {
  const own = useId();
  const input = useRef<HTMLInputElement>(null);
  const entered = useRef(false);
  const { aria, ...field } = fieldDescription({ id: id ?? own, hint });
  // The browser's own clear control empties the box and fires `search`, which React has no prop for; the form
  // is submitted so the list reads the empty query. Enter fires `search` too, and its submit is already on its way.
  useEffect(() => {
    const box = input.current;
    if (!box) return;
    const cleared = () => {
      const byEnter = entered.current;
      entered.current = false;
      if (!byEnter && box.value === '') box.form?.requestSubmit();
    };
    box.addEventListener('search', cleared);
    return () => box.removeEventListener('search', cleared);
  }, []);

  return (
    <FieldShell label={label} hint={hint} {...field}>
      <div className="input search-field">
        <input
          id={field.controlId}
          ref={input}
          className="search-field__input"
          onKeyDown={(event) => {
            entered.current = event.key === 'Enter';
          }}
          type="search"
          // Not a sign-in field; 1Password documents this attribute to leave a field alone.
          data-1p-ignore
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          {...aria}
        />
        {/* An id of its own, so a filter applied by a press on it can give
            it the focus back once the new list arrives (FilterForm). */}
        <button id={`${field.controlId}-submit`} type="submit" className="search-field__submit">
          <MagnifierIcon />
          <span className="visually-hidden">Search</span>
        </button>
      </div>
    </FieldShell>
  );
}
