'use client';

import { type ReactElement, useId } from 'react';
import { fieldDescription } from './description';
import { FieldShell } from './shell';
import type { ReasonFieldProps } from './types';

const REASON_HINT = 'Kept with the change in the record of who changed what.';

export function ReasonField({
  value,
  onChange,
  disabled,
  hint = REASON_HINT,
  className,
}: ReasonFieldProps): ReactElement {
  const { aria, ...shell } = fieldDescription({ id: useId(), hint });
  return (
    <div className={className}>
      <FieldShell label="Reason" hint={hint} {...shell}>
        <input
          id={shell.controlId}
          className="input"
          type="text"
          autoComplete="off"
          placeholder="Add a reason"
          {...aria}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      </FieldShell>
    </div>
  );
}
