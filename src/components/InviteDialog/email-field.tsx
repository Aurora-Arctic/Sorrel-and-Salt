import { type ReactElement, useId } from 'react';
import { normaliseEmail, validateEmailAddress } from '../../lib/email-address';
import type { Failure } from '../../lib/types';
import { FieldShell, fieldDescription } from '../Field';

/** The same rule the service applies, said before anything is sent. */
export function checkInviteAddress(address: string): Failure | undefined {
  const issue = validateEmailAddress(normaliseEmail(address));
  return issue ? { field: { name: 'email', message: issue.message } } : undefined;
}

interface InviteEmailFieldProps {
  value: string;
  error: string | undefined;
  disabled: boolean;
  onChange: (value: string) => void;
}

/** The address field both invite forms draw; a change also clears a refusal beside it. */
const InviteEmailField = ({
  value,
  error,
  disabled,
  onChange,
}: InviteEmailFieldProps): ReactElement => {
  const { aria, ...field } = fieldDescription({ id: useId(), error });
  return (
    <FieldShell label="Email Address" required {...field}>
      <input
        id={field.controlId}
        className="input"
        type="email"
        autoComplete="off"
        placeholder="Add an email"
        aria-required
        {...aria}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </FieldShell>
  );
};

export default InviteEmailField;
