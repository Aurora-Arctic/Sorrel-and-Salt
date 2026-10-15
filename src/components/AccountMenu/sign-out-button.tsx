'use client';

import { type ReactElement, useState } from 'react';
import { signOut } from '../../lib/auth-client';
import { GENERIC_FAILURE } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import Notice from '../Notice';

// Sign Out, the last row of the account menu (MB.63, on the owner's call;
// MB.7 moved it): Better Auth's own sign-out at `/api/auth/*`, the one path
// outside GraphQL, which carries the session and no application data
// (claude-docs/auth/graphql-only-exception.md). A success is a full load of
// `/`, so nothing the signed-in page held survives it
// (claude-docs/components/account-menu.md).

const LANDING = '/';

const SignOutButton = (): ReactElement => {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOutNow() {
    setPending(true);
    setFailed(false);
    // A refusal answers `error`; a dropped connection throws. Either says so.
    const { error } = await signOut().catch((thrown: unknown) => ({ error: thrown }));
    if (error) {
      setPending(false);
      setFailed(true);
      return;
    }
    window.location.assign(LANDING);
  }

  return (
    <div className="account-menu__signout-action">
      <BusyButton
        className="btn"
        disabled={pending}
        busy={pending}
        busyLabel="Signing Out"
        onClick={() => void signOutNow()}
      >
        Sign Out
      </BusyButton>
      {/* The shared fallback sentence, though this call is Better Auth's and
          not GraphQL's: it has no more to say about why than a lost request. */}
      {failed && <Notice kind="error">{GENERIC_FAILURE}</Notice>}
    </div>
  );
};

export default SignOutButton;
