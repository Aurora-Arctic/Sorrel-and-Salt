import type { SignInAddress, SignInMode } from './types';

// What /sign-in keeps in its address, so a reload shows the same view in the same mode. Kept apart from the client
// panel, because the page reads the mode on the server. Each view is its own history entry, so the browser's Back
// returns from the email form to the provider buttons; a mode is written in place, as no entry of its own.
export const EMAIL_VIEW_PARAM = 'method';
export const EMAIL_VIEW = 'email';
// Sign-in is the default and is never written, so the address names only creating an account.
export const MODE_PARAM = 'mode';
export const SIGN_UP_MODE = 'sign-up' satisfies SignInMode;

/** The mode an address names: creating an account for the one known value, signing in for anything else. */
export function modeFromParam(value: string | string[] | null | undefined): SignInMode {
  return value === SIGN_UP_MODE ? 'sign-up' : 'sign-in';
}

/** A link to /sign-in that opens in `mode`: sign-up is named in the address, sign-in, the default, is left out. */
export function withMode(path: SignInAddress, mode: SignInMode): SignInAddress {
  if (mode !== SIGN_UP_MODE) return path;
  const param = `${MODE_PARAM}=${SIGN_UP_MODE}` as const;
  return path === '/sign-in' ? `/sign-in?${param}` : `${path}&${param}`;
}
