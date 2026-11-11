'use client';

import type { ReactElement } from 'react';
import { signOut } from '../../lib/auth-client';
import { settled } from '../../lib/auth-call';
import { GENERIC_FAILURE } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { useGuardedAction } from '../ClickFeedback/use-guarded-action';
import { reportLeaving } from '../../lib/navigation';
import { signOutDestination } from '../../lib/public-routes';

// Sign Out: Better Auth's own sign-out at `/api/auth/*`, the one path outside GraphQL, carrying the
// session and no application data (claude-docs/auth/config.md, "The one exception to the
// GraphQL-only rule"). A success is a full load of `/`, or of the public page the visitor is on; a failure is a callout under the button
// (claude-docs/components/account-menu.md).

const SignOutButton = (): ReactElement => {
  const { anchorRef, run, pending, feedback } = useGuardedAction({
    name: 'Sign Out',
    action: async () => {
      // A refusal answers error; a dropped connection throws. Either says so.
      const { error } = await settled(signOut());
      if (error) return GENERIC_FAILURE;
      reportLeaving();
      const { pathname, search } = window.location;
      const destination = signOutDestination(pathname);
      window.location.assign(destination === pathname ? `${pathname}${search}` : destination);
    },
  });

  return (
    <div className="account-menu__signout-action">
      {/* `aria-disabled` rather than `disabled`, which would drop the focus
          to the page, where a failure's callout could not keep it. */}
      <BusyButton
        ref={anchorRef}
        className="account-menu__item"
        aria-disabled={pending || undefined}
        busy={pending}
        busyLabel="Signing Out"
        onClick={() => void run()}
      >
        Sign Out
      </BusyButton>
      {feedback}
    </div>
  );
};

export default SignOutButton;
