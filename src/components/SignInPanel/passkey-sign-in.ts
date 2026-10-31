'use client';

import { reportLeaving } from '../../lib/navigation';
import { signInPath } from '../../lib/sign-in';

/** What the panel says when a passkey sign-in does not finish, cancelled or refused. */
export const PASSKEY_SIGN_IN_ERROR =
  'That passkey did not sign you in. Try again, or use another way to sign in.';

/**
 * Leaves for /sign-in, which sends the new session where a sign-in goes: `next`, the role's landing, or the email page
 * first. A full navigation, so the server reads the cookie the verify response set.
 */
export function leaveSignedIn(next: string | undefined): void {
  reportLeaving();
  window.location.assign(signInPath(next));
}
