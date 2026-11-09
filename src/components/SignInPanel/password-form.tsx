'use client';

import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { getSession, signIn, signUp } from '../../lib/auth-client';
import { reportLeaving, PendingLink } from '../../lib/navigation';
import { signInPath } from '../../lib/sign-in';
import { useResultFocus } from '../../lib/use-result-focus';
import { BackChevron } from '../IngredientEntry/back-chevron';
import BusyButton from '../BusyButton';
import PageHeader from '../PageHeader';
import { FieldShell, fieldDescription } from '../Field';
import Notice from '../Notice';
import PasswordField from '../PasswordField';
import ModeSwitch from './mode-switch';
import TwoFactorStep from './two-factor-step';
import type { PasswordFormProps, SignInMode } from './types';

// The email and password half of the panel: sign in, or switch to create an account. Every refusal is
// the server's, said where it belongs; nothing here judges a password but the meter's advice
// (claude-docs/components/sign-in-panel.md, "Contracts").

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

// Better Auth answers `{ error }` for a refusal and throws for a dropped connection; both arrive
// here.
function refusal(mode: SignInMode, failure: Failure): Refusal {
  const field = failure.code ? FIELD_ERRORS[failure.code] : undefined;
  if (field) return { [field.field]: field.message };
  if (failure.code === 'PASSWORD_COMPROMISED') return { password: failure.message };
  if (failure.status === 429) return { alert: TOO_MANY_ATTEMPTS };
  if (mode === 'sign-in') {
    return { alert: failure.status === 401 ? WRONG_CREDENTIALS : GENERIC_PASSWORD_SIGN_IN_ERROR };
  }
  // A 500 at sign-up is the breached-password check unreachable, which refuses rather than waves through.
  return { alert: failure.status === 500 ? SIGN_UP_UNAVAILABLE : GENERIC_SIGN_UP_ERROR };
}

// Whether the browser holds a session now, read from the server so the cookie a sign-up set is what counts.
async function hasSession(): Promise<boolean> {
  const { data } = await getSession({ query: { disableCookieCache: true } }).catch(() => ({
    data: null,
  }));
  return Boolean(data);
}

const PasswordForm = ({
  next,
  mode,
  onModeChange,
  headingLevel,
  signUpLandsOnNext,
  lastUsed,
  email,
  onEmailChange,
  onBack,
  onStart,
  onCodeStep,
}: PasswordFormProps): ReactElement => {
  const nameId = useId();
  const emailId = useId();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<Refusal>({});
  // Every sign-up gets the same answer, held or not, so the page does not reveal which addresses
  // exist.
  const [signedUp, setSignedUp] = useState<string>();
  const [askingForCode, setAskingForCode] = useState(false);
  const { ref, settle } = useResultFocus<HTMLDivElement>();

  const signingUp = mode === 'sign-up';
  const ready =
    email.trim() !== '' && password !== '' && (!signingUp || name.trim() !== '') && !pending;

  const switchTo = (to: SignInMode): void => {
    onModeChange(to);
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
      settle();
      return;
    }
    // A new account is signed in by the sign-up itself. A held address earns no session: the holder is
    // written to instead, and the answer is the same for both until the session is looked for.
    if (signingUp && !(await hasSession())) {
      setPending(false);
      setPassword('');
      onModeChange('sign-in');
      setSignedUp(address.toLowerCase());
      settle();
      return;
    }
    // No session yet: the server holds the attempt until a code completes it.
    if (data && 'twoFactorRedirect' in data && data.twoFactorRedirect) {
      setPending(false);
      setPassword('');
      setAskingForCode(true);
      onCodeStep?.(true);
      return;
    }
    // A full load of the sign-in page, which sends a signed-in account on: to `next` or its
    // landing, and an unverified one (every new account) to the email page first.
    reportLeaving();
    window.location.assign(signingUp && signUpLandsOnNext && next ? next : signInPath(next));
  };

  if (askingForCode) {
    return (
      <TwoFactorStep
        next={next}
        headingLevel={headingLevel}
        onRestart={(reason) => {
          setAskingForCode(false);
          onCodeStep?.(false);
          setProblem(reason ? { alert: reason } : {});
        }}
      />
    );
  }

  const nameField = fieldDescription({ id: nameId });
  const emailField = fieldDescription({ id: emailId, error: problem.email });

  return (
    <div className="sign-in-panel__password" ref={ref}>
      <button type="button" className="back-link sign-in-panel__back" onClick={onBack}>
        <BackChevron />
        Back
      </button>
      {/* The view's heading: focus lands here when the view opens (./index.tsx). */}
      <PageHeader
        className="sign-in-panel__password-head"
        headingClassName="auth-title sign-in-panel__password-heading"
        level={headingLevel}
        focusable
        title={signingUp ? 'Create an Account with Email' : 'Sign In with Email'}
        suffix={
          lastUsed && !signingUp ? (
            <span className="badge badge--last-used">Last Used</span>
          ) : undefined
        }
      />
      {problem.alert && (
        <Notice kind="error" result>
          {problem.alert}
        </Notice>
      )}
      {signedUp && (
        <Notice kind="success" result>
          We&apos;ve written to {signedUp}: follow the link in that email to continue.
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
              placeholder="Add a name"
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
            autoComplete={signingUp ? 'email' : 'username'}
            placeholder="Add an email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            aria-required
            {...emailField.aria}
          />
        </FieldShell>
        <PasswordField
          label="Password"
          purpose={signingUp ? 'new' : 'current'}
          value={password}
          onChange={(value) => {
            setPassword(value);
            setProblem((was) => (was.password ? { ...was, password: undefined } : was));
          }}
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
          <PendingLink href="/forgot-password">Forgot Password?</PendingLink>
        </p>
      )}
      <ModeSwitch mode={mode} onSwitch={switchTo} />
    </div>
  );
};

export default PasswordForm;
