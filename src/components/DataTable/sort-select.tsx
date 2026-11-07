'use client';

import { type ReactElement, useId } from 'react';
import { useHydrated } from '../../lib/hydrated';
import { usePendingNavigation } from '../../lib/navigation';
import { ComboboxSelect } from '../Combobox/select';
import { FieldShell, fieldDescription } from '../Field';
import type { SortSelectProps } from './types';

/**
 * The sort a phone shows above the cards, where the headings are hidden: each sortable column in each direction, and any
 * other order. Drawn once hydrated and not before, as choosing navigates by script; the heading links sort without it.
 */
export function SortSelect({ choices, current, disabled }: SortSelectProps): ReactElement | null {
  const field = fieldDescription({ id: useId() });
  const hydrated = useHydrated();
  const { pending, navigate } = usePendingNavigation();
  if (!hydrated) return null;
  return (
    <FieldShell label="Sort By" className="data-table__sort" {...field}>
      <ComboboxSelect
        id={field.controlId}
        label="Sort By"
        labelId={field.labelId}
        value={current ?? ''}
        onChange={(href) => {
          if (href !== current) navigate(href);
        }}
        choices={choices.map(({ label, href }) => ({ value: href, label }))}
        busy={pending}
        disabled={disabled}
      />
    </FieldShell>
  );
}
