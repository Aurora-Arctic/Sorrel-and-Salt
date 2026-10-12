'use client';

import { type ReactElement, useId } from 'react';
import { fieldDescription } from './description';
import { FieldShell } from './shell';
import type { ReasonFieldProps } from './types';

/** What a Reason is for, behind its info tip (MB.115, on the owner's call): where an admin's change is kept. */
const REASON_HINT = 'Kept with the change in the record of who changed what.';

/**
 * The optional Reason an admin gives a change, kept in the ledger beside it
 * (MB.115): a plain-state text box under "Reason", its hint behind a tip,
 * written once for the confirmed actions and the invitation form. `hint`
 * says where the reason is kept when that is not the change itself, as an
 * invitation's is kept with the invitation first. The wrapper takes the
 * caller's class, which holds the field's room above and below.
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
