'use client';

import { type ReactElement, useId, useMemo, useState } from 'react';
import { useHydrated } from '../../lib/hydrated';
import { ComboboxSelect } from '../Combobox/select';
import { ComboboxTypeahead } from '../Combobox/typeahead';
import { fieldDescription } from './description';
import { FieldShell } from './shell';
import type { FilterSelectFieldProps } from './types';

/**
 * A list filter's closed set: a native `<select>` from the server, so the search's magnifier sends it
 * before the script loads, then one of Combobox's boxes. Not `SelectField`, which needs form state: a
 * filter submits natively (claude-docs/components/field.md, "Switch, search and select fields for filters").
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
  // The choice once hydrated, for the box and the hidden input.
  const [chosen, setChosen] = useState(defaultValue);
  // The select-only box's blank is a choice, "All Roles", as the native
  // select's first option is; the type-ahead's is its placeholder and clear.
  const choices = useMemo(() => [{ value: '', label: all }, ...options], [all, options]);
  /** Applies a choice other than the one shown. */
  const settle = (settled: string) => {
    if (settled !== defaultValue) onChange(settled);
  };

  if (hydrated) {
    return (
      <FieldShell label={label} className="filter-row__choice" {...field}>
        {typeahead ? (
          // A choice settled on the one shown, the box left unchanged say,
          // applies nothing.
          <ComboboxTypeahead
            id={field.controlId}
            label={label}
            labelId={field.labelId}
            value={chosen}
            onChange={setChosen}
            onSettle={settle}
            choices={options}
            placeholder={all}
            clearable
          />
        ) : (
          <ComboboxSelect
            id={field.controlId}
            label={label}
            labelId={field.labelId}
            value={chosen}
            onChange={(picked) => {
              setChosen(picked);
              settle(picked);
            }}
            choices={choices}
            placeholder={all}
          />
        )}
        <input type="hidden" name={name} value={chosen} />
      </FieldShell>
    );
  }

  // Before hydration, and in the render that hydrates: a change applies
  // nothing, since no script runs; the search's magnifier sends it.
  return (
    <FieldShell label={label} className="filter-row__choice" {...field}>
      <select id={field.controlId} className="select" name={name} defaultValue={defaultValue}>
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
