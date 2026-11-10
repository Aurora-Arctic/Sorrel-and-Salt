'use client';

import { type FormEvent, type ReactElement, useState } from 'react';
import { emailFormat, validateEmailAddress } from '../../lib/email-address';
import { useResultFocus } from '../../lib/use-result-focus';
import { requestPasswordReset } from '../../lib/auth-client';
import BusyButton from '../BusyButton';
import { PlainTextField } from '../Field';
import Notice from '../Notice';
import { TOO_MANY_ATTEMPTS } from '../SignInPanel/password-form';
import './index.scss';

// Every address gets the same answer, so the page never says whether one has an account (claude-docs/components/forgot-password-form.md).

export const GENERIC_RESET_REQUEST_ERROR = "We couldn't send the link. Please try again.";

const ForgotPasswordForm = (): ReactElement => {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [alert, setAlert] = useState<string>();
  const [emailError, setEmailError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();

  const ready = email.trim() !== '' && !pending;
  const { ref, settle } = useResultFocus<HTMLDivElement>();
  const [retyping, setRetyping] = useState(false);

  const request = async (address: string): Promise<void> => {
    setPending(true);
    setAlert(undefined);
    // Better Auth answers `{ error }` for a refusal and throws for a dropped connection.
    const { error } = await requestPasswordReset({
      email: address,
      redirectTo: '/reset-password',
    }).catch(() => ({ error: {} as { status?: number } }));
    setPending(false);
    if (error) setAlert(error.status === 429 ? TOO_MANY_ATTEMPTS : GENERIC_RESET_REQUEST_ERROR);
    else setSentTo(address.toLowerCase());
    settle();
  };

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    // A disabled submit stops a click, not Enter in the field.
    if (!ready) return;
    const invalid = validateEmailAddress(email.trim());
    setEmailError(invalid?.message);
    if (invalid) return;
    void request(email.trim());
  };

  const useAnotherAddress = (): void => {
    setSentTo(undefined);
    setAlert(undefined);
    setEmail('');
    setRetyping(true);
  };

  if (sentTo) {
    return (
      <div className="forgot-password-form" ref={ref}>
        {alert && (
          <Notice kind="error" result>
            {alert}
          </Notice>
        )}
        <Notice kind="success" result={!alert}>
          If {sentTo} has an account, we&apos;ve sent it a link to choose a new password. The link
          works once, within 15 minutes.
        </Notice>
        <div className="form__actions">
          <BusyButton
            type="button"
            className="btn"
            busy={pending}
            busyLabel="Sending Link"
            onClick={() => void request(sentTo)}
          >
            Send Again
          </BusyButton>
          <button type="button" className="btn" disabled={pending} onClick={useAnotherAddress}>
            Use a Different Address
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-password-form" ref={ref}>
      {alert && (
        <Notice kind="error" result>
          {alert}
        </Notice>
      )}
      {/* `noValidate`: every refusal is the server's, worded and placed like the rest. */}
      <form className="form" onSubmit={submit} noValidate>
        <PlainTextField
          label="Email Address"
          required
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          // Typing a different address replaces the confirmation, so the field takes focus again.
          autoFocus={retyping}
          format={emailFormat}
          value={email}
          error={emailError}
          onChange={(next) => {
            setEmail(next);
            setEmailError(undefined);
          }}
        />
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
