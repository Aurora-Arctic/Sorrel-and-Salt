import type { ProviderId } from '../../lib/types';

export interface SignInPanelProps {
  /** Where a successful sign-in returns to; already run through safeReturnPath. */
  next: string;
  /** A readable sentence for a failed callback, from signInErrorMessage — never a raw code. */
  error?: string;
  /** Providers this environment has credentials for; the rest render greyed out. */
  configured: readonly ProviderId[];
}
