'use client';

import { type ReactElement, useState } from 'react';
import { signOut } from '../../lib/auth-client';
import { GENERIC_FAILURE } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { useClickFeedback } from '../ClickFeedback';

// Sign Out, the last row of the account menu (MB.63, on the owner's call;
// MB.7 moved it): Better Auth's own sign-out at `/api/auth/*`, the one path
// outside GraphQL, which carries the session and no application data
// (claude-docs/auth/graphql-only-exception.md). A success is a full load of
// `/`, so nothing the signed-in page held survives it; a failure is said in
// a callout under the button (claude-docs/components/account-menu.md).

const LANDING = '/';

const SignOutButton = (): ReactElement => {
  const [pending, setPending] = useState(false);
  const { anchorRef, report, feedback } = useClickFeedback({ name: 'Sign Out' });

  async function signOutNow() {
    // `aria-disabled` lets a click through, so a second one is refused here.
    if (pending) return;
    setPending(true);
    report(undefined);
    // A refusal answers `error`; a dropped connection throws. Either says so.
    const { error } = await signOut().catch((thrown: unknown) => ({ error: thrown }));
    if (error) {
      setPending(false);
      // The shared fallback sentence, though this call is Better Auth's and
      // not GraphQL's: it has no more to say about why than a lost request.
      report(GENERIC_FAILURE);
      return;
    }
    window.location.assign(LANDING);
  }

  return (
    <div className="account-menu__signout-action">
      {/* `aria-disabled` rather than `disabled`, which would drop the focus
          to the page, where a failure's callout could not keep it. */}
      <BusyButton
        ref={anchorRef}
        className="btn"
        aria-disabled={pending || undefined}
        busy={pending}
        busyLabel="Signing Out"
        onClick={() => void signOutNow()}
      >
        Sign Out
      </BusyButton>
      {feedback}
    </div>
  );
};

export default SignOutButton;
