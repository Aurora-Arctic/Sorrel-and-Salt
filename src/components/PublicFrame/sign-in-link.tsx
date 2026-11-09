'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';
import { signInPath } from '../../lib/sign-in';
import SignInDialog from '../SignInDialog';
import type { ProviderId } from '../../lib/types';

// The bar's Sign In, carrying the page the visitor is on so signing in comes back to it
// (claude-docs/auth/route-protection.md, "The return path round trip").

/** Reads the query string, which suspends a statically drawn page, so the bar wraps it in a Suspense with `SignInLink`'s bare link as the fallback. */
export function SignInLinkWithQuery({
  configured,
}: {
  configured: readonly ProviderId[];
}): ReactElement {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  return (
    <SignInDialog
      next={query ? `${pathname}?${query}` : pathname}
      configured={configured}
      label="Sign In"
    />
  );
}

export function SignInLink(): ReactElement {
  return (
    <PendingLink className="btn btn--solid btn--medium" href={signInPath(undefined)}>
      Sign In
    </PendingLink>
  );
}
