'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';
import { signInPath } from '../../lib/sign-in';
import SignInDialog from '../SignInDialog';
import type { ProviderId } from '../../lib/types';

// The bar's Sign In, carrying the page the visitor is on so signing in comes back to it
// (claude-docs/auth/route-protection.md, "The return path round trip").

/**
 * The page signing in comes back to, or null on the sign-in page itself, where a Sign In would open the page already
 * open. Reads the query string, which suspends a statically drawn page.
 */
export function useSignInReturn(): string | null {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  if (pathname === signInPath(undefined)) return null;
  return query ? `${pathname}?${query}` : pathname;
}

/** Suspends, so the bar wraps it in a Suspense with `SignInLink`'s bare link as the fallback. */
export function SignInLinkWithQuery({
  configured,
}: {
  configured: readonly ProviderId[];
}): ReactElement | null {
  const next = useSignInReturn();
  if (next === null) return null;
  return <SignInDialog next={next} configured={configured} label="Sign In" nofollow />;
}

/** The bare link a statically drawn bar shows until the query string is read. */
export function SignInLink(): ReactElement {
  return (
    <PendingLink className="btn btn--solid btn--medium" href={signInPath(undefined)} rel="nofollow">
      Sign In
    </PendingLink>
  );
}
