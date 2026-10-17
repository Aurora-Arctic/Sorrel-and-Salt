'use client';

import { type ReactElement, useId } from 'react';
import { useHydrated } from '../../lib/hydrated';
import { ComboboxMultiSelect } from '../Combobox/multi-select';
import { fieldDescription } from '../Field/description';
import { FieldShell } from '../Field/shell';
import { FacetTypeahead } from './typeahead';
import type { FacetComboboxProps } from './types';
import '../Combobox/index.scss';
import './index.scss';

// A filter's closed set with how many entries each value would leave (M12.4):
// the multi-select box with its counts, a value with none listed last and
// disabled, the chosen values chips inside the control, outlined, and each
// one a hidden input of the filter's GET form. Before the script loads the
// server draws a native multiple select instead, so that a press on the
// search's magnifier sends the choice, as `FilterSelectField` does for a
// single value. See claude-docs/components/facet-combobox.md.

export default function FacetCombobox({
  label,
  name,
  choices,
  values,
  onChange,
  typeahead,
  placeholder,
  removeNoun,
  loading,
  disableZeros = true,
  hint,
  className,
}: FacetComboboxProps): ReactElement {
  const field = fieldDescription({ id: useId(), hint });
  const hydrated = useHydrated();
  const shellClass = className ? `facet-combobox ${className}` : 'facet-combobox';

  const typed = Boolean(typeahead) || choices.some((choice) => choice.group !== undefined);

  if (hydrated) {
    return (
      <FieldShell label={label} hint={hint} className={shellClass} {...field}>
        {typed ? (
          <FacetTypeahead
            id={field.controlId}
            label={label}
            labelId={field.labelId}
            choices={choices}
            values={values}
            onChange={onChange}
            placeholder={placeholder}
            removeNoun={removeNoun}
            loading={loading}
            disableZeros={disableZeros}
            describedBy={field.aria['aria-describedby']}
          />
        ) : (
          <ComboboxMultiSelect
            id={field.controlId}
            label={label}
            labelId={field.labelId}
            values={values}
            onChange={onChange}
            choices={choices}
            placeholder={placeholder}
            disableZeros={disableZeros}
            loading={loading}
            chipsOutlined
            removeNoun={removeNoun}
            aria-describedby={field.aria['aria-describedby']}
          />
        )}
        {values.map((value) => (
          <input key={value} type="hidden" name={name} value={value} />
        ))}
      </FieldShell>
    );
  }

  const nativeOption = (choice: (typeof choices)[number]) => (
    <option
      key={choice.value}
      value={choice.value}
      disabled={
        Boolean(choice.disabled || (disableZeros && choice.count === 0)) &&
        !values.includes(choice.value)
      }
    >
      {choice.label}
      {choice.count !== undefined && ` (${choice.count})`}
    </option>
  );
  // The choices of one group together, the groups in the order they first appear.
  const groups: { group: string | undefined; rows: (typeof choices)[number][] }[] = [];
  for (const choice of choices) {
    const at = groups.find((entry) => entry.group === choice.group);
    if (at) at.rows.push(choice);
    else groups.push({ group: choice.group, rows: [choice] });
  }

  // Before hydration, and in the render that hydrates: a change applies
  // nothing, since no script runs; the search's magnifier sends it. A value
  // with nothing behind it is disabled as the box disables it, unless chosen.
  return (
    <FieldShell label={label} hint={hint} className={shellClass} {...field}>
      <select
        id={field.controlId}
        className="select facet-combobox__native"
        name={name}
        multiple
        defaultValue={[...values]}
        aria-describedby={field.aria['aria-describedby']}
      >
        {groups.map(({ group, rows }) =>
          group === undefined ? (
            rows.map(nativeOption)
          ) : (
            <optgroup key={group} label={group}>
              {rows.map(nativeOption)}
            </optgroup>
          ),
        )}
      </select>
    </FieldShell>
  );
}
