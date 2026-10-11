'use client';

import { type ReactElement, useState } from 'react';
import { impersonateUser } from '../../lib/auth-client';
import BusyButton from '../BusyButton';
import Notice from '../Notice';
import type { ImpersonateButtonProps } from './types';

// The row's Impersonate (MB.53). Better Auth's endpoint is the guard: it
// refuses a non-admin and an admin target whatever this shows. A success
// swaps the session cookie, so the next page is a full load as the user.

const LANDING = '/';

const ImpersonateButton = ({ userId, name }: ImpersonateButtonProps): ReactElement => {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function impersonate() {
    // `aria-disabled` lets a click through, so a second one is refused here.
    if (pending) return;
    setPending(true);
    setFailed(false);
    const { error } = await impersonateUser({ userId });
    if (error) {
      setPending(false);
      setFailed(true);
      return;
    }
    window.location.assign(LANDING);
  }

  return (
    <>
      {/* The visible label opens the accessible name, so a voice command
          saying what it sees still reaches it, busy or not. Busy until the
          site opens as the user; `aria-disabled` rather than `disabled`,
          which would drop the focus and leave a keyboard nowhere. */}
      <BusyButton
        className="btn btn--small btn--destructive"
        aria-label={pending ? `Impersonating ${name}` : `Impersonate ${name}`}
        aria-disabled={pending || undefined}
        busy={pending}
        busyLabel="Impersonating"
        onClick={() => void impersonate()}
      >
        Impersonate
      </BusyButton>
      {failed && <Notice kind="error">{name} could not be impersonated.</Notice>}
    </>
  );
};

export default ImpersonateButton;
