'use client';

import Link from 'next/link';
import { type FormEvent, type ReactElement, useState } from 'react';
import { resetPassword } from '../../lib/auth-client';
import { newPasswordRefusal, PASSWORD_CHECK_UNAVAILABLE } from '../../lib/password-refusals';
import BusyButton from '../BusyButton';
import Notice from '../Notice';
import PasswordField from '../PasswordField';
import { TOO_MANY_ATTEMPTS } from '../SignInPanel/password-form';
import type { ResetPasswordFormProps } from './types';
import './index.scss';

// The reset page's form: the new password for the account a mailed link names. The token is spent by the
// first reset, which signs out every session the account held (claude-docs/components/reset-password-form.md).

export const GENERIC_RESET_ERROR = "We couldn't set your new password. Please try again.";

interface Failure {
  status?: number;
  code?: string;
  message?: string;
}

const ResetPasswordForm = ({ token }: ResetPasswordFormProps): ReactElement => {
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [alert, setAlert] = useState<string>();
  const [fieldError, setFieldError] = useState<string>();
  const [spent, setSpent] = useState(token === undefined);
  const [done, setDone] = useState(false);

  const ready = password !== '' && !pending;

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    // A disabled submit stops a click, not Enter in the field.
    if (!ready || token === undefined) return;
    setPending(true);
    setAlert(undefined);
    setFieldError(undefined);
    // Better Auth answers `{ error }` for a refusal and throws for a dropped connection.
    const { error } = await resetPassword({ newPassword: password, token }).catch(() => ({
      error: {} as Failure,
    }));
    setPending(false);
    if (!error) {
      setPassword('');
      setDone(true);
      return;
    }
    const refusal = newPasswordRefusal(error);
    if (refusal) setFieldError(refusal);
    else if (error.code === 'INVALID_TOKEN') setSpent(true);
    else if (error.status === 429) setAlert(TOO_MANY_ATTEMPTS);
    // A 500 is the breached-password check unreachable, which refuses rather than waves through.
    else setAlert(error.status === 500 ? PASSWORD_CHECK_UNAVAILABLE : GENERIC_RESET_ERROR);
  };

  if (done) {
    return (
      <div className="reset-password-form">
        <Notice kind="success">
          Your new password is set, and every device that was signed in to your account has been
          signed out.
        </Notice>
        <p>
          <Link className="btn btn--solid" href="/sign-in">
            Sign In
          </Link>
        </p>
      </div>
    );
  }

  if (spent) {
    return (
      <div className="reset-password-form">
        <Notice kind="warn" quiet>
          This link has expired or has already been used. A reset link works once, within 15
          minutes.
        </Notice>
        <p>
          <Link className="btn btn--solid" href="/forgot-password">
            Ask for a New Link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="reset-password-form">
      {alert && <Notice kind="error">{alert}</Notice>}
      {/* `noValidate`: every refusal is the server's, worded and placed like the rest. */}
      <form className="form" onSubmit={(event) => void submit(event)} noValidate>
        <PasswordField
          label="New Password"
          purpose="new"
          value={password}
          onChange={setPassword}
          error={fieldError}
          required
        />
        <div className="form__actions">
          <BusyButton
            type="submit"
            className="btn btn--solid"
            disabled={!ready}
            busy={pending}
            busyLabel="Setting Password"
          >
            Set New Password
          </BusyButton>
        </div>
      </form>
    </div>
  );
};

export default ResetPasswordForm;
