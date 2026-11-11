'use client';

import { type FormEvent, type ReactElement, useState } from 'react';
import { twoFactor } from '../../lib/auth-client';
import { settled, type AuthFailure } from '../../lib/auth-call';
import { codeDigits } from '../../lib/formats';
import { reportLeaving } from '../../lib/navigation';
import { WRONG_CODE } from '../../lib/auth-messages';
import { signInPath } from '../../lib/sign-in';
import BusyButton from '../BusyButton';
import { PlainTextField, SwitchField } from '../Field';
import Notice from '../Notice';
import type { TwoFactorStepProps } from './types';

// The second step of a password sign-in with two-factor on: a code from an authenticator app, or a
// backup code. The right password has already been checked; this step's answer is what signs in
// (claude-docs/components/sign-in-panel.md, "Contracts").

export const CODE_LOCKED =
  'Too many wrong codes. Your account is locked for 15 minutes; please try again after that.';
export const CHALLENGE_EXPIRED =
  'Your sign-in timed out or had too many wrong codes. Please enter your password again.';
export const GENERIC_CODE_ERROR = "We couldn't check that code. Please try again.";

type Method = 'app' | 'backup';

interface Refusal {
  alert?: string;
  code?: string;
}

function refusal(failure: AuthFailure): Refusal | 'restart' {
  if (failure.code === 'INVALID_TWO_FACTOR_COOKIE') return 'restart';
  if (failure.code === 'TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE') return 'restart';
  if (failure.code === 'ACCOUNT_TEMPORARILY_LOCKED') return { alert: CODE_LOCKED };
  if (failure.code === 'INVALID_CODE' || failure.code === 'INVALID_BACKUP_CODE') {
    return { code: WRONG_CODE };
  }
  return { alert: GENERIC_CODE_ERROR };
}

const TwoFactorStep = ({ next, onRestart }: TwoFactorStepProps): ReactElement => {
  const [method, setMethod] = useState<Method>('app');
  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<Refusal>({});

  const entered = method === 'app' ? codeDigits(code) : code.trim();
  const ready = entered !== '' && !pending;

  const switchMethod = (): void => {
    setMethod(method === 'app' ? 'backup' : 'app');
    setCode('');
    setProblem({});
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    // A disabled submit stops a click, not Enter in a field.
    if (!ready) return;
    setPending(true);
    setProblem({});
    const verify = method === 'app' ? twoFactor.verifyTotp : twoFactor.verifyBackupCode;
    const { error } = await settled(verify({ code: entered, trustDevice }));
    if (error) {
      setPending(false);
      const answer = refusal(error);
      if (answer === 'restart') onRestart(CHALLENGE_EXPIRED);
      else setProblem(answer);
      return;
    }
    reportLeaving();
    window.location.assign(signInPath(next));
  };

  return (
    <div className="sign-in-panel__password">
      {problem.alert && <Notice kind="error">{problem.alert}</Notice>}
      <p>
        {method === 'app'
          ? 'Two-factor is on for this account. Enter the six-digit code your authenticator app shows for Sorrel & Salt.'
          : 'Enter one of the backup codes you saved when you turned two-factor on. Each one works once.'}
      </p>
      {/* `noValidate`: every refusal is the server's, worded and placed like the rest. */}
      <form className="form" onSubmit={(event) => void submit(event)} noValidate>
        <PlainTextField
          // A new input for each method, so the browser's one-time-code autofill is offered only for the app's.
          key={method}
          label={method === 'app' ? 'Code From Your App' : 'Backup Code'}
          required
          placeholder={method === 'app' ? '123456' : undefined}
          inputMode={method === 'app' ? 'numeric' : undefined}
          autoComplete={method === 'app' ? 'one-time-code' : 'off'}
          spellCheck={false}
          // The step replaces the password form, so the field the person was typing in is gone.
          // oxlint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          value={code}
          onChange={setCode}
          error={problem.code}
        />
        <SwitchField
          label="Trust This Device for 30 Days"
          name="trustDevice"
          value="1"
          checked={trustDevice}
          onChange={setTrustDevice}
          note="This browser skips the code step when you sign in again within 30 days."
        />
        <div className="form__actions">
          <BusyButton
            type="submit"
            className="btn btn--solid"
            disabled={!ready}
            busy={pending}
            busyLabel="Verifying"
          >
            Verify
          </BusyButton>
        </div>
      </form>
      <div className="sign-in-panel__switch">
        <button type="button" className="btn btn--quiet btn--small" onClick={switchMethod}>
          {method === 'app' ? 'Use a Backup Code' : 'Use Your App Instead'}
        </button>
        <button type="button" className="btn btn--quiet btn--small" onClick={() => onRestart()}>
          Start Again
        </button>
      </div>
    </div>
  );
};

export default TwoFactorStep;
