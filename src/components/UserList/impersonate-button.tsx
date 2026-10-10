'use client';

import { type ReactElement, useState } from 'react';
import { impersonateUser } from '../../lib/auth-client';
import type { ImpersonateButtonProps } from './types';

// The row's Impersonate (MB.53). Better Auth's endpoint is the guard: it
// refuses a non-admin and an admin target whatever this shows. A success
// swaps the session cookie, so the next page is a full load as the user.

const LANDING = '/';

const ImpersonateButton = ({ userId, name }: ImpersonateButtonProps): ReactElement => {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function impersonate() {
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
          saying what it sees still reaches it. */}
      <button
        className="btn btn--small btn--destructive"
        type="button"
        aria-label={`Impersonate ${name}`}
        disabled={pending}
        onClick={impersonate}
      >
        Impersonate
      </button>
      {failed && (
        <p className="notice notice--error" role="alert">
          {name} could not be impersonated.
        </p>
      )}
    </>
  );
};

export default ImpersonateButton;
