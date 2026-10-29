'use client';

import type { ReactElement } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { SelectField } from '../Field';
import type { CovenChoiceProps } from './types';

// Which coven a cupboard write on the public entry page is for, where two or more of the viewer's
// covens hold the entry and permit it: the shared SelectField, held by the caller since the write
// it confirms is the caller's.

export default function CovenChoice({ options, chosen, onChoose }: CovenChoiceProps): ReactElement {
  // A form only because SelectField is react-hook-form's; nothing is submitted through it.
  const methods = useForm<{ coven: string }>({ defaultValues: { coven: chosen } });
  return (
    <FormProvider {...methods}>
      <SelectField<{ coven: string }>
        name="coven"
        label="Coven"
        options={options.map(({ id, name }) => ({ value: id, label: name }))}
        onChange={onChoose}
      />
    </FormProvider>
  );
}
