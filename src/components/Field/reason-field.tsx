'use client';

import type { ReactElement } from 'react';
import { limitMessage } from '../../lib/formats';
import { REASON_LIMIT, reasonTooLong } from '../../modules/identity/validation/reason';
import { PlainTextField } from './plain-text-field';
import type { ReasonFieldProps } from './types';

const REASON_HINT = 'Kept with the change in the record of who changed what.';

export function ReasonField({
  value,
  onChange,
  disabled,
  hint = REASON_HINT,
  className,
}: ReasonFieldProps): ReactElement {
  return (
    <div className={className}>
      <PlainTextField
        label="Reason"
        hint={hint}
        // Off: the reason is about someone else's change, not the person's own details.
        autoComplete="off"
        placeholder="Add a reason"
        limit={REASON_LIMIT}
        error={reasonTooLong(value) ? limitMessage(REASON_LIMIT) : undefined}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
