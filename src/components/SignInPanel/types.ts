import type { ProviderId } from '../../lib/types';

export interface SignInPanelProps {
  /** Where a successful sign-in returns to, already run through safeReturnPath; absent, the landing is the account's role's. */
  next?: string;
  /** A readable sentence for a failed callback, from signInErrorMessage — never a raw code. */
  error?: string;
  /** Providers this environment has credentials for; the rest render greyed out. */
  configured: readonly ProviderId[];
  /** A class from the caller, added after the panel's own: a `.panel` ground, or one of the panel's modifiers. */
  className?: string;
}
