'use client';

import type { ReactElement } from 'react';
import { signIn } from '../../lib/auth-client';
import { settled } from '../../lib/auth-call';
import BusyButton from '../BusyButton';
import { useGuardedAction } from '../ClickFeedback/use-guarded-action';
import { PASSKEY_SIGN_IN_ERROR, leaveSignedIn } from './passkey-sign-in';
import type { PasskeyButtonProps } from './types';

const NAME = 'Sign In with a Passkey';

// "Sign In with a Passkey": the browser's own passkey prompt, started only by pressing it.
// A failure is said in a callout under the button, the focus kept on it.
const PasskeyButton = ({
  next,
  lastUsed,
  signingIn,
  onSigningIn,
}: PasskeyButtonProps): ReactElement => {
  const busy = signingIn === 'passkey';
  const { anchorRef, run, feedback } = useGuardedAction({
    name: NAME,
    state: { pending: busy, setPending: (pending) => onSigningIn(pending ? 'passkey' : null) },
    action: async () => {
      // A dropped connection throws rather than answering `error`; both say so.
      const result = await settled(signIn.passkey());
      if (result?.error) return PASSKEY_SIGN_IN_ERROR;
      leaveSignedIn(next);
    },
  });

  return (
    <div className="sign-in-panel__provider">
      <BusyButton
        ref={anchorRef}
        busy={busy}
        busyLabel="Signing In"
        className="btn sign-in-panel__button sign-in-panel__button--passkey"
        // Not `disabled` while busy, which would drop the focus a failure's callout is placed against.
        aria-disabled={busy || undefined}
        disabled={signingIn !== null && !busy}
        onClick={() => void run()}
      >
        {NAME}
        {lastUsed && (
          <>
            {' '}
            <span className="badge badge--last-used sign-in-panel__last-used">Last Used</span>
          </>
        )}
      </BusyButton>
      {feedback}
    </div>
  );
};

export default PasskeyButton;
