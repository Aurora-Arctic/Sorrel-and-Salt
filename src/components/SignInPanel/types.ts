import type { ProviderId } from '../../lib/types';

export type SignInAttempt = ProviderId | 'passkey';

export interface SignInPanelProps {
  /** Already run through safeReturnPath; absent, the landing is the account role's. */
  next?: string;
  /** A readable sentence for a failed callback, from signInErrorMessage — never a raw code. */
  error?: string;
  configured: readonly ProviderId[];
}

export interface ProviderButtonProps {
  provider: { id: ProviderId; label: string };
  available: boolean;
  /** Whether this browser last signed in with it. */
  lastUsed: boolean;
  signingIn: SignInAttempt | null;
  onSignIn: (providerId: ProviderId) => Promise<string | undefined>;
}

export interface PasswordFormProps {
  next?: string;
  /** Whether this browser last signed in with a password. */
  lastUsed: boolean;
  /** The address typed, held by the panel so it survives a trip back to the provider buttons. */
  email: string;
  onEmailChange: (email: string) => void;
  onBack: () => void;
  /** Called at each submit, so the panel clears its own error. */
  onStart?: () => void;
  /** Called when the code step opens (true) or closes (false), so the panel can show it alone. */
  onCodeStep?: (open: boolean) => void;
}

export interface PasskeyButtonProps {
  next?: string;
  /** Whether this browser last signed in with a passkey. */
  lastUsed: boolean;
  signingIn: SignInAttempt | null;
  /** Records the prompt opening (`'passkey'`) or failing (`null`), so the panel holds every other control. */
  onSigningIn: (attempt: 'passkey' | null) => void;
}

export interface TwoFactorStepProps {
  next?: string;
  onRestart: (reason?: string) => void;
}
