'use client';

import { type ReactElement, useId, useState } from 'react';
import { useHydrated } from '../../lib/hydrated';
import { ComboboxTypeahead } from '../Combobox/typeahead';
import { fieldDescription } from './description';
import { FieldShell } from './shell';
import type { FilterSelectFieldProps } from './types';

/**
 * A list filter's closed set (MB.115): a native `<select>` whose blank first
 * choice is no filter, uncontrolled from the value the page shows and
 * applying on its change, since the list draws its filter again from the
 * filter it shows. With `typeahead`, a set long enough to want a search, it
 * is typed into once hydrated, the owner's call, but the server still draws
 * the native select, so a press on the search's magnifier before the script
 * loads sends it; a hidden input carries the same parameter after. One width
 * for both, `filter-row__typeahead`, so hydration moves nothing. Not
 * `SelectField`, which is a react-hook-form field on Combobox's boxes: a
 * filter has no form state, and its select must submit natively.
 */
export function FilterSelectField({
  label,
  name,
  all,
  options,
  defaultValue,
  onChange,
  typeahead,
}: FilterSelectFieldProps): ReactElement {
  const field = fieldDescription({ id: useId() });
  const hydrated = useHydrated();
  // The type-ahead's choice, for the hidden input; a native select holds its own.
  const [chosen, setChosen] = useState(defaultValue);

  if (typeahead && hydrated) {
    return (
      <FieldShell label={label} className="filter-row__typeahead" {...field}>
        {/* Every choice while blank, as the select's first option says; the
            clear is the way back to it. A choice settled on the one shown,
            the box left unchanged say, applies nothing. */}
        <ComboboxTypeahead
          id={field.controlId}
          label={label}
          labelId={field.labelId}
          value={chosen}
          onChange={setChosen}
          onSettle={(settled) => {
            if (settled !== defaultValue) onChange(settled);
          }}
          choices={options}
          placeholder={all}
          clearable
        />
        <input type="hidden" name={name} value={chosen} />
      </FieldShell>
    );
  }

  return (
    <FieldShell
      label={label}
      className={typeahead ? 'filter-row__typeahead' : undefined}
      {...field}
    >
      <select
        id={field.controlId}
        className="select"
        name={name}
        defaultValue={defaultValue}
        // A server-drawn stand-in for the type-ahead applies nothing on its
        // change: the search's magnifier sends it before hydration.
        onChange={typeahead ? undefined : (event) => onChange(event.target.value)}
      >
        <option value="">{all}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
