'use client';

import Link from 'next/link';
import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { signIn, signUp } from '../../lib/auth-client';
import { reportLeaving } from '../../lib/navigation';
import { signInPath } from '../../lib/sign-in';
import BusyButton from '../BusyButton';
import { FieldShell, fieldDescription } from '../Field';
import Notice from '../Notice';
import PasswordField from '../PasswordField';
import { PASSKEY_AUTOCOMPLETE } from './passkey-autofill';
import TwoFactorStep from './two-factor-step';
import type { PasswordFormProps } from './types';

// The email and password half of the panel: sign in, or switch to create an account. Every refusal is
// the server's, said where it belongs; nothing here judges a password but the meter's advice
// (claude-docs/components/sign-in-panel.md, "Email and password").

/** Sign-in's one refusal, the same for a wrong password and an unknown address. */
export const WRONG_CREDENTIALS =
  "That email address and password don't match an account. Please try again.";
export const SIGN_UP_UNAVAILABLE =
  "We couldn't create your account just now. Please try again later.";
export const TOO_MANY_ATTEMPTS = 'Too many attempts. Please wait a minute, then try again.';
export const GENERIC_PASSWORD_SIGN_IN_ERROR = "We couldn't sign you in. Please try again.";
export const GENERIC_SIGN_UP_ERROR = "We couldn't create your account. Please try again.";

const FIELD_ERRORS: Record<string, { field: 'email' | 'password'; message: string }> = {
  PASSWORD_TOO_SHORT: { field: 'password', message: 'Use at least 15 characters.' },
  PASSWORD_TOO_LONG: { field: 'password', message: 'Use 128 characters or fewer.' },
  INVALID_EMAIL: { field: 'email', message: 'Enter an email address, such as name@example.com.' },
};

type Mode = 'sign-in' | 'sign-up';

interface Failure {
  status?: number;
  code?: string;
  message?: string;
}

interface Refusal {
  alert?: string;
  email?: string;
  password?: string;
}

// Better Auth answers `{ error }` for a refusal and throws for a dropped connection; both arrive here.
function refusal(mode: Mode, failure: Failure): Refusal {
  const field = failure.code ? FIELD_ERRORS[failure.code] : undefined;
  if (field) return { [field.field]: field.message };
  // The breached-list refusal carries the server's own sentence, which says why.
  if (failure.code === 'PASSWORD_COMPROMISED') return { password: failure.message };
  if (failure.status === 429) return { alert: TOO_MANY_ATTEMPTS };
  if (mode === 'sign-in') {
    return { alert: failure.status === 401 ? WRONG_CREDENTIALS : GENERIC_PASSWORD_SIGN_IN_ERROR };
  }
  // A 500 at sign-up is the breached-password check unreachable, which refuses rather than waves through.
  return { alert: failure.status === 500 ? SIGN_UP_UNAVAILABLE : GENERIC_SIGN_UP_ERROR };
}

const PasswordForm = ({ next, lastUsed, onStart }: PasswordFormProps): ReactElement => {
  const nameId = useId();
  const emailId = useId();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<Refusal>({});
  // The address a sign-up was answered for: every sign-up gets the same answer, held or not.
  const [signedUp, setSignedUp] = useState<string>();
  // The right password was given for an account with two-factor on: the code step replaces this form.
  const [askingForCode, setAskingForCode] = useState(false);

  const signingUp = mode === 'sign-up';
  const ready =
    email.trim() !== '' && password !== '' && (!signingUp || name.trim() !== '') && !pending;

  const switchTo = (to: Mode): void => {
    setMode(to);
    setProblem({});
    setSignedUp(undefined);
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    // A disabled submit stops a click, not Enter in a field.
    if (!ready) return;
    setPending(true);
    setProblem({});
    setSignedUp(undefined);
    onStart?.();
    const address = email.trim();
    const { data, error } = await (
      signingUp
        ? signUp.email({
            name: name.trim(),
            email: address,
            password,
            ...(next && { callbackURL: next }),
          })
        : signIn.email({ email: address, password })
    ).catch(() => ({ data: null, error: {} as Failure }));
    if (error) {
      setPending(false);
      setProblem(refusal(mode, error));
      return;
    }
    if (signingUp) {
      // No session yet: the account signs in, then follows the mailed link.
      setPending(false);
      setPassword('');
      setMode('sign-in');
      setSignedUp(address.toLowerCase());
      return;
    }
    // No session yet: the server holds the attempt until a code completes it.
    if (data && 'twoFactorRedirect' in data && data.twoFactorRedirect) {
      setPending(false);
      setPassword('');
      setAskingForCode(true);
      return;
    }
    // A full load of the sign-in page, which sends a signed-in account on: to `next` or its
    // landing, and an unverified one to the email page first.
    reportLeaving();
    window.location.assign(signInPath(next));
  };

  if (askingForCode) {
    return (
      <TwoFactorStep
        next={next}
        onRestart={(reason) => {
          setAskingForCode(false);
          setProblem(reason ? { alert: reason } : {});
        }}
      />
    );
  }

  const nameField = fieldDescription({ id: nameId });
  const emailField = fieldDescription({ id: emailId, error: problem.email });

  return (
    <div className="sign-in-panel__password">
      <h2 className="sign-in-panel__password-heading">
        {signingUp ? 'Create an Account' : 'Sign In With Email'}
        {lastUsed && !signingUp && (
          <>
            {' '}
            <span className="badge badge--last-used">Last Used</span>
          </>
        )}
      </h2>
      {problem.alert && <Notice kind="error">{problem.alert}</Notice>}
      {signedUp && (
        <Notice kind="success">
          We&apos;ve sent a link to {signedUp}. Sign in below, then open the link in this browser
          within an hour to confirm your address. If the address already has an account, we&apos;ve
          written to it instead.
        </Notice>
      )}
      {/* `noValidate`: every refusal is the server's, worded and placed like the rest. */}
      <form className="form" onSubmit={(event) => void submit(event)} noValidate>
        {signingUp && (
          <FieldShell label="Name" required {...nameField}>
            <input
              id={nameField.controlId}
              className="input"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-required
              {...nameField.aria}
            />
          </FieldShell>
        )}
        <FieldShell label="Email Address" required {...emailField}>
          <input
            id={emailField.controlId}
            className="input"
            type="email"
            autoComplete={signingUp ? 'email' : PASSKEY_AUTOCOMPLETE}
            placeholder="Your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-required
            {...emailField.aria}
          />
        </FieldShell>
        <PasswordField
          label="Password"
          purpose={signingUp ? 'new' : 'current'}
          value={password}
          onChange={setPassword}
          error={problem.password}
          required
        />
        <div className="form__actions">
          <BusyButton
            type="submit"
            className="btn btn--solid"
            disabled={!ready}
            busy={pending}
            busyLabel={signingUp ? 'Creating Account' : 'Signing In'}
          >
            {signingUp ? 'Create Account' : 'Sign In'}
          </BusyButton>
        </div>
      </form>
      {!signingUp && (
        <p className="sign-in-panel__switch">
          <Link href="/forgot-password">Forgot Password?</Link>
        </p>
      )}
      <p className="sign-in-panel__switch">
        {signingUp ? 'Already have an account?' : 'New here?'}{' '}
        <button
          type="button"
          className="btn btn--quiet btn--small"
          onClick={() => switchTo(signingUp ? 'sign-in' : 'sign-up')}
        >
          {signingUp ? 'Sign In Instead' : 'Create an Account'}
        </button>
      </p>
    </div>
  );
};

export default PasswordForm;
