'use client';

import { type ReactElement, type ReactNode, useId } from 'react';
import DateField from '../DateField';
import type { DateFieldProps } from '../DateField/types';
import { fieldDescription } from './description';
import { FieldShell } from './shell';
import type { FieldDescription, FieldProps } from './types';

type DateShellProps = FieldProps &
  Pick<DateFieldProps, 'value' | 'onChange' | 'min' | 'max' | 'disabled'> & {
    action?: ReactNode;
  };

/** A labelled day picker over a field description the caller already built, as a react-hook-form field's is. */
export function DateFieldShell({
  description,
  label,
  labelSuffix,
  hint,
  note,
  required,
  action,
  ...picker
}: DateShellProps & { description: FieldDescription }): ReactElement {
  const { aria, ...shell } = description;
  return (
    <FieldShell
      label={label}
      labelSuffix={labelSuffix}
      hint={hint}
      note={note}
      required={required}
      action={action}
      {...shell}
    >
      <DateField id={shell.controlId} labelledBy={shell.labelId} {...picker} {...aria} />
    </FieldShell>
  );
}

/** `DateField` with its label, hint, note and error, for a form that holds its values in state. */
export function PlainDateField({
  error,
  hint,
  note,
  ...rest
}: DateShellProps & { error?: string }): ReactElement {
  const id = useId();
  return (
    <DateFieldShell
      {...rest}
      hint={hint}
      note={note}
      description={fieldDescription({ id, hint, note, error })}
    />
  );
}
