'use client';

import type { Route } from 'next';
import { type ReactElement, useId } from 'react';
import { ComboboxSelect } from '../Combobox/select';
import { fieldDescription } from '../Field/description';
import { FieldShell } from '../Field/shell';
import { useApplyFilter } from '../FilterForm';

/** The phone's stand-in for the left pane: one select of the guides and the other kinds, each choice an address. */
const HelpGuideSelect = ({
  choices,
  current,
}: {
  choices: readonly { label: string; href: Route }[];
  current: Route | undefined;
}): ReactElement => {
  const field = fieldDescription({ id: useId() });
  const apply = useApplyFilter();
  return (
    <FieldShell label="Guide" className="help-outline__select" {...field}>
      <ComboboxSelect
        id={field.controlId}
        label="Guide"
        labelId={field.labelId}
        value={current ?? ''}
        onChange={(href) => {
          if (href !== current) apply(href as Route);
        }}
        choices={choices.map(({ label, href }) => ({ value: href, label }))}
        placeholder="Choose a Guide"
      />
    </FieldShell>
  );
};

export default HelpGuideSelect;
