'use client';

import { useEffect } from 'react';
import { signIn } from '../../lib/auth-client';
import { reportLeaving } from '../../lib/navigation';
import { signInPath } from '../../lib/sign-in';

/** The `autocomplete` an email field carries to offer saved passkeys among its suggestions. */
export const PASSKEY_AUTOCOMPLETE = 'username webauthn';

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

/**
 * Whether this browser offers passkeys in a field's autofill. Conditional mediation is past the browser floor, so this
 * is an enhancement behind its own feature check, and the passkey button is the fallback where it answers false.
 */
async function autofillAvailable(): Promise<boolean> {
  if (typeof PublicKeyCredential === 'undefined') return false;
  if (typeof PublicKeyCredential.isConditionalMediationAvailable !== 'function') return false;
  return PublicKeyCredential.isConditionalMediationAvailable().catch(() => false);
}

/**
 * Offers saved passkeys in the autofill of the page's field marked `PASSKEY_AUTOCOMPLETE`, where the browser can, and
 * signs in with the one picked. Started only when such a field is on the page, since the browser has nowhere to offer
 * them otherwise. A ceremony that ends unpicked or refused says nothing: the visitor did not ask for it.
 */
export function usePasskeyAutofill(next: string | undefined): void {
  useEffect(() => {
    let live = true;
    void (async () => {
      if (!document.querySelector(`input[autocomplete="${PASSKEY_AUTOCOMPLETE}"]`)) return;
      if (!(await autofillAvailable()) || !live) return;
      const result = await signIn.passkey({ autoFill: true }).catch(() => undefined);
      if (live && result?.data && !result.error) leaveSignedIn(next);
    })();
    return () => {
      live = false;
    };
  }, [next]);
}
