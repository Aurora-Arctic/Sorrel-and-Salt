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
  fit,
}: FilterSelectFieldProps): ReactElement {
  const field = fieldDescription({ id: useId() });
  const hydrated = useHydrated();
  const [chosen, setChosen] = useState(defaultValue);
  const choices = useMemo(() => [{ value: '', label: all }, ...options], [all, options]);
  const className = fit ? 'filter-row__choice filter-row__choice--fit' : 'filter-row__choice';
  const settle = (settled: string) => {
    if (settled !== defaultValue) onChange(settled);
  };

  if (hydrated) {
    return (
      <FieldShell label={label} className={className} {...field}>
        {typeahead ? (
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
            fit={fit}
          />
        )}
        <input type="hidden" name={name} value={chosen} />
      </FieldShell>
    );
  }

  // Before hydration, and in the render that hydrates: a change applies
  // nothing, since no script runs; the search's magnifier sends it.
  return (
    <FieldShell label={label} className={className} {...field}>
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
