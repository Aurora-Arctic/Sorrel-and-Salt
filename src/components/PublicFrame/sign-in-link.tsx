'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';
import { signInPath } from '../../lib/sign-in';

// The bar's Sign In, carrying the page the visitor is on so signing in comes back to it
// (claude-docs/auth/route-protection.md, "The return path round trip").

/** Reads the query string, which suspends a statically drawn page, so the bar wraps it in a Suspense with `SignInLink`'s bare link as the fallback. */
export function SignInLinkWithQuery(): ReactElement {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  return <SignInLink returnPath={query ? `${pathname}?${query}` : pathname} />;
}

export function SignInLink({ returnPath }: { returnPath?: string }): ReactElement {
  return (
    <PendingLink className="btn btn--solid btn--medium" href={signInPath(returnPath)}>
      Sign In
    </PendingLink>
  );
}
