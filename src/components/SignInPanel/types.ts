import type { ProviderId } from '../../lib/types';

export type SignInAttempt = ProviderId | 'passkey';

/** Signing in to an account, or creating one. */
export type SignInMode = 'sign-in' | 'sign-up';

/** The page's address, bare or with a query. */
export type SignInAddress = '/sign-in' | `/sign-in?${string}`;

/** One sentence per mode, under the title, on the sign-in page and in a dialog alike. */
export type SignInLedes = Partial<Record<SignInMode, string>>;

/** The buttons, the email form, or the two-factor code step that follows a right password. */
export type SignInView = 'buttons' | 'email' | 'code';

/** What heads the panel in its current mode and view, from `signInHeader` (./header.tsx). */
export interface SignInHeader {
  title: string;
  /** Back shows above the title, returning from the email form to the buttons. */
  back: boolean;
  /** The Last Used mark goes with the title. */
  lastUsed: boolean;
  lede?: string;
  /** The focus lands on the title as the view opens; otherwise the panel or the view places it. */
  focusTitle: boolean;
}

export interface SignInPanelProps {
  /** Already run through safeReturnPath; absent, the landing is the account role's. */
  next?: string;
  /** A readable sentence for a failed callback, from signInErrorMessage — never a raw code. */
  error?: string;
  configured: readonly ProviderId[];
  /** The mode it opens on; signing in when absent. */
  mode?: SignInMode;
  /** The sentence under the title in each mode; none when absent. */
  ledes?: SignInLedes;
  /** Told of each switch between the modes, so a dialog can retitle itself. */
  onModeChange?: (mode: SignInMode) => void;
  /** Inside a dialog: the panel draws no head, reporting it through `onHeaderChange` for the dialog to draw, and the email view is held here rather than in the address of the page beneath. */
  inDialog?: boolean;
  /** `next` itself tells a new, unverified account to check its inbox, so an email sign-up loads it directly rather than through the sign-in page, which would send the account to the email page. */
  signUpLandsOnNext?: boolean;
  /** Given, a new email account stays on the page, signed in, and this is called in place of the navigation. */
  onSignedUp?: () => void;
  /** In a dialog, told the head at the start and at each change, with the one Back that returns from the email form. `back` keeps its identity. */
  onHeaderChange?: (header: SignInHeader, back: () => void) => void;
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
  signUpLandsOnNext?: boolean;
  onSignedUp?: () => void;
  /** The address typed, held by the panel so it survives a trip back to the provider buttons. */
  email: string;
  onEmailChange: (email: string) => void;
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

export interface ModeSwitchProps {
  mode: SignInMode;
  onSwitch: (mode: SignInMode) => void;
}
