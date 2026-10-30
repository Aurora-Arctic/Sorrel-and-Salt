'use client';

import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { requestPasswordReset } from '../../lib/auth-client';
import BusyButton from '../BusyButton';
import { FieldShell, fieldDescription } from '../Field';
import Notice from '../Notice';
import { TOO_MANY_ATTEMPTS } from '../SignInPanel/password-form';
import './index.scss';

// The forgot-password page's form: asks Better Auth to mail a reset link. Every address gets the same
// answer, so the page never says whether one has an account (claude-docs/components/forgot-password-form.md).

export const GENERIC_RESET_REQUEST_ERROR = "We couldn't send the link. Please try again.";

const ForgotPasswordForm = (): ReactElement => {
  const id = useId();
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [alert, setAlert] = useState<string>();
  // The address the last request was answered for, which the notice names.
  const [sentTo, setSentTo] = useState<string>();

  const ready = email.trim() !== '' && !pending;

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    // A disabled submit stops a click, not Enter in the field.
    if (!ready) return;
    setPending(true);
    setAlert(undefined);
    setSentTo(undefined);
    const address = email.trim();
    // Better Auth answers `{ error }` for a refusal and throws for a dropped connection.
    const { error } = await requestPasswordReset({
      email: address,
      redirectTo: '/reset-password',
    }).catch(() => ({ error: {} as { status?: number } }));
    setPending(false);
    if (error) {
      setAlert(error.status === 429 ? TOO_MANY_ATTEMPTS : GENERIC_RESET_REQUEST_ERROR);
      return;
    }
    setEmail('');
    setSentTo(address.toLowerCase());
  };

  const field = fieldDescription({ id });

  return (
    <div className="forgot-password-form">
      {alert && <Notice kind="error">{alert}</Notice>}
      {sentTo && (
        <Notice kind="success">
          If {sentTo} has an account, we&apos;ve sent it a link to choose a new password. The link
          works once, within 15 minutes.
        </Notice>
      )}
      {/* `noValidate`: every refusal is the server's, worded and placed like the rest. */}
      <form className="form" onSubmit={(event) => void submit(event)} noValidate>
        <FieldShell label="Email Address" required {...field}>
          <input
            id={field.controlId}
            className="input"
            type="email"
            autoComplete="username"
            placeholder="Your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-required
            {...field.aria}
          />
        </FieldShell>
        <div className="form__actions">
          <BusyButton
            type="submit"
            className="btn btn--solid"
            disabled={!ready}
            busy={pending}
            busyLabel="Sending Link"
          >
            Send Reset Link
          </BusyButton>
        </div>
      </form>
    </div>
  );
};

export default ForgotPasswordForm;
