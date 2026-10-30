'use client';

import { type ReactElement, useId } from 'react';
import { fieldDescription } from './description';
import { FieldShell } from './shell';
import type { ReasonFieldProps } from './types';

/** What a Reason is for, behind its info tip: where an admin's change is kept. */
const REASON_HINT = 'Kept with the change in the record of who changed what.';

/**
 * The optional Reason an admin gives a change, kept in the ledger beside it: a plain-state text box with
 * its hint behind a tip. `hint` says where the reason is kept when that is not the change itself.
 */
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
