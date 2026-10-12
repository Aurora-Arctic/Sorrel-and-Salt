'use client';

import { type ReactElement, useId } from 'react';
import { fieldDescription } from './description';
import { MagnifierIcon } from './icons';
import { FieldShell } from './shell';
import type { SearchFieldProps } from './types';

/**
 * A list filter's search box, drawn first in the row (MB.115): a text box
 * with its own submit, a magnifier named Search, at its end. The submit is
 * the form's, so the search applies by a press on the mark, which a first-time
 * user can see, or by Enter, which a box in a form with a submit button sends
 * natively; and before hydration the same press sends the whole form as a
 * GET. Drawn as one box, `.input.search-field`, holding a borderless input
 * and the button, as Combobox's control holds its text and indicators, so
 * the mark sits inside the edge rather than as a button beside it.
 */
export function SearchField({
  id,
  label,
  name,
  placeholder,
  value,
  onChange,
}: SearchFieldProps): ReactElement {
  const own = useId();
  const { aria, ...field } = fieldDescription({ id: id ?? own });
  return (
    <FieldShell label={label} {...field}>
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
