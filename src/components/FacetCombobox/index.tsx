'use client';

import { type ReactElement, useId } from 'react';
import { useHydrated } from '../../lib/hydrated';
import { ComboboxMultiSelect } from '../Combobox/multi-select';
import { fieldDescription } from '../Field/description';
import { FieldShell } from '../Field/shell';
import { NativeGroupedSelect } from './native-select';
import { FacetTypeahead } from './typeahead';
import type { FacetComboboxProps } from './types';
import '../Combobox/index.scss';
import './index.scss';
import { cx } from '@/lib/class-names';

// A filter's closed set with each value's count: the multi-select box, a value with none left out, the
// chosen as outlined chips, each a hidden input of the GET form. Before the script loads the server
// draws a native multiple select (claude-docs/components/facet-combobox.md).

export default function FacetCombobox({
  label,
  name,
  choices,
  values,
  onChange,
  typeahead,
  placeholder,
  emptyPlaceholder = `No ${label}`,
  removeNoun,
  loading: searching,
  counts = true,
  hideZeros = true,
  hint,
  className,
}: FacetComboboxProps): ReactElement {
  // A field without counts has no count to wait for.
  const loading = counts && searching;
  const field = fieldDescription({ id: useId(), hint });
  const hydrated = useHydrated();
  const shellClass = cx('facet-combobox', className);

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
            emptyPlaceholder={emptyPlaceholder}
            removeNoun={removeNoun}
            loading={loading}
            hideZeros={hideZeros}
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
            emptyPlaceholder={emptyPlaceholder}
            hideZeros={hideZeros}
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

  // Before hydration, and in the render that hydrates: a change applies
  // nothing, since no script runs; the search's magnifier sends it. A value
  // with nothing behind it is left out as the box leaves it out, unless chosen.
  return (
    <FieldShell label={label} hint={hint} className={shellClass} {...field}>
      <NativeGroupedSelect
        id={field.controlId}
        name={name}
        choices={choices}
        values={values}
        hideZeros={hideZeros}
        describedBy={field.aria['aria-describedby']}
      />
    </FieldShell>
  );
}
