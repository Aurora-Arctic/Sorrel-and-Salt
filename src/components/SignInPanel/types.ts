import type { ProviderId } from '../../lib/types';

export interface SignInPanelProps {
  /** Where a successful sign-in returns to, already run through safeReturnPath; absent, the landing is the account's role's. */
  next?: string;
  /** A readable sentence for a failed callback, from signInErrorMessage — never a raw code. */
  error?: string;
  /** Providers this environment has credentials for; the rest render greyed out. */
  configured: readonly ProviderId[];
}

export interface ProviderButtonProps {
  provider: { id: ProviderId; label: string };
  /** Whether this environment has credentials for the provider. */
  available: boolean;
  /** Whether this browser last signed in with it. */
  lastUsed: boolean;
  /** The provider whose sign-in is under way, if any. */
  signingIn: ProviderId | null;
  /** Starts the sign-in; resolves to the failure's sentence, or nothing once the redirect starts. */
  onSignIn: (providerId: ProviderId) => Promise<string | undefined>;
}

export interface PasswordFormProps {
  /** Where a successful sign-in returns to, as the panel's `next`. */
  next?: string;
  /** Whether this browser last signed in with a password. */
  lastUsed: boolean;
  /** Called at each submit, so the panel clears its own error. */
  onStart?: () => void;
}

export interface PasskeyButtonProps {
  /** Where a successful sign-in returns to, as SignInPanelProps' `next`. */
  next?: string;
  /** Whether this browser last signed in with a passkey. */
  lastUsed: boolean;
}
