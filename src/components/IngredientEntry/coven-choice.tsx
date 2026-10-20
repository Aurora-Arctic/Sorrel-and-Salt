'use client';

import type { ReactElement } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { SelectField } from '../Field';
import type { CovenChoiceProps } from './types';

// Which coven a cupboard write on the public entry page is for (M9.12), where two or more of
// the viewer's covens hold the entry and permit it: the dropdown Add's picker asks with, the
// shared SelectField, in a confirmation that then asks its own question. The caller holds the
// choice, since the write it confirms is the caller's. claude-docs/components/ingredient-entry.md.

export default function CovenChoice({ options, chosen, onChoose }: CovenChoiceProps): ReactElement {
  // A form only because SelectField is react-hook-form's; nothing is submitted through it.
  const form = useForm<{ coven: string }>({ defaultValues: { coven: chosen } });
  return (
    <FormProvider {...form}>
      <SelectField<{ coven: string }>
        name="coven"
        label="Coven"
        options={options.map(({ id, name }) => ({ value: id, label: name }))}
        onChange={onChoose}
      />
    </FormProvider>
  );
}
