'use client';

import { type ReactElement, useState } from 'react';
import { signIn } from '../../lib/auth-client';
import BusyButton from '../BusyButton';
import { useClickFeedback } from '../ClickFeedback';
import { PASSKEY_SIGN_IN_ERROR, leaveSignedIn, usePasskeyAutofill } from './passkey-autofill';
import type { PasskeyButtonProps } from './types';

const NAME = 'Sign In with a Passkey';

// "Sign In with a Passkey": the browser's own passkey prompt, and the fallback wherever autofill is not offered
// (./passkey-autofill.ts). A failure is said in a callout under the button, the focus kept on it.
const PasskeyButton = ({ next, lastUsed }: PasskeyButtonProps): ReactElement => {
  const { anchorRef, report, feedback } = useClickFeedback({ name: NAME });
  const [busy, setBusy] = useState(false);
  usePasskeyAutofill(next);

  const press = async (): Promise<void> => {
    if (busy) return;
    report(undefined);
    setBusy(true);
    // A dropped connection throws rather than answering `error`; both say so.
    const result = await signIn.passkey().catch((thrown: unknown) => ({ error: thrown }));
    if (result?.error) {
      setBusy(false);
      report(PASSKEY_SIGN_IN_ERROR);
      return;
    }
    leaveSignedIn(next);
  };

  return (
    <div className="sign-in-panel__provider">
      <BusyButton
        ref={anchorRef}
        busy={busy}
        busyLabel="Signing In"
        className="btn btn--solid sign-in-panel__button"
        // Not `disabled` while busy, which would drop the focus a failure's callout is placed against.
        aria-disabled={busy || undefined}
        onClick={() => void press()}
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
