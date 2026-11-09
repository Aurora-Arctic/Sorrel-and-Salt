import type { ProviderId } from '../../lib/types';

export type SignInAttempt = ProviderId | 'passkey';

/** Signing in to an account, or creating one. */
export type SignInMode = 'sign-in' | 'sign-up';

export interface SignInPanelProps {
  /** Already run through safeReturnPath; absent, the landing is the account role's. */
  next?: string;
  /** A readable sentence for a failed callback, from signInErrorMessage — never a raw code. */
  error?: string;
  configured: readonly ProviderId[];
  /** The mode it opens on; signing in when absent. */
  mode?: SignInMode;
  /** Told of each switch between the modes, so a dialog can retitle itself. */
  onModeChange?: (mode: SignInMode) => void;
  /** Inside a dialog: the dialog's title heads it, its headings sit a level under that title, and the email view is held here rather than in the address of the page beneath. */
  inDialog?: boolean;
  /** `next` itself tells a new, unverified account to check its inbox, so an email sign-up loads it directly rather than through the sign-in page, which would send the account to the email page. */
  signUpLandsOnNext?: boolean;
  /** Given, a new email account stays on the page, signed in, and this is called in place of the navigation. */
  onSignedUp?: () => void;
  /** Told when the email view opens (true) or closes (false), so a dialog can title itself for the view. */
  onEmailViewChange?: (open: boolean) => void;
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
  mode: SignInMode;
  onModeChange: (mode: SignInMode) => void;
  /** The level of the view's heading: h1 on the sign-in page, h3 under a dialog's title. */
  headingLevel: 'h1' | 'h3';
  /** False in a dialog, whose title is the view's heading: the form then draws none, and puts its Last Used mark under that title. */
  ownHeading: boolean;
  signUpLandsOnNext?: boolean;
  onSignedUp?: () => void;
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
  headingLevel?: 'h1' | 'h3';
  onRestart: (reason?: string) => void;
}

export interface ModeSwitchProps {
  mode: SignInMode;
  onSwitch: (mode: SignInMode) => void;
}
