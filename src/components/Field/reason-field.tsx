'use client';

import { type ReactElement, useState } from 'react';
import { REASON_LIMIT, reasonProblem } from '../../modules/identity/validation/reason';
import { PlainTextField } from './plain-text-field';
import type { ReasonFieldProps } from './types';

const REASON_HINT = 'Kept with the change in the record of who changed what.';

export function ReasonField({
  value,
  onChange,
  disabled,
  error,
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
        check={reasonProblem}
        error={error}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

/**
 * A reason note held by the form around a ReasonField: the text, the refusal beside it, a check
 * that sets the refusal and a reset. Spread `field` onto the ReasonField.
 */
export function useReasonNote() {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();
  return {
    note,
    /** Says whether the note passes, drawing the refusal beside the field when it does not. */
    check: (): boolean => {
      const problem = reasonProblem(note);
      setError(problem);
      return problem === undefined;
    },
    reset: (): void => {
      setNote('');
      setError(undefined);
    },
    field: {
      value: note,
      error,
      onChange: (next: string): void => {
        setNote(next);
        setError(undefined);
      },
    },
  };
}
