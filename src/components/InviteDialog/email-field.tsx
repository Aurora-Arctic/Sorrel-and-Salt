import type { ReactElement } from 'react';
import { emailAddressProblem, emailFormat } from '../../lib/email-address';
import { PlainTextField } from '../Field';

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
}: InviteEmailFieldProps): ReactElement => (
  <PlainTextField
    label="Email Address"
    name="email"
    type="email"
    required
    // The address is someone else's, so the browser must not offer the signed-in person's own.
    autoComplete="off"
    ignorePasswordManagers
    autoCapitalize="none"
    spellCheck={false}
    placeholder="name@example.com"
    format={emailFormat}
    check={emailAddressProblem}
    value={value}
    disabled={disabled}
    error={error}
    onChange={onChange}
  />
);

export default InviteEmailField;
