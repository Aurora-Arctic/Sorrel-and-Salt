'use client';

import { type ReactElement, useId } from 'react';
import { fieldDescription } from './description';
import { MagnifierIcon } from './icons';
import { FieldShell } from './shell';
import type { SearchFieldProps } from './types';

/**
 * A list filter's search box, drawn first in the row: a text box with its own submit, a magnifier
 * named Search, inside its edge; the submit is the form's, so Enter and a press both apply the
 * search, and before hydration the same press sends the form as a GET.
 */
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
  const { aria, ...field } = fieldDescription({ id: id ?? own, hint });
  return (
    <FieldShell label={label} hint={hint} {...field}>
      <div className="input search-field">
        <input
          id={field.controlId}
          className="search-field__input"
          type="search"
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
