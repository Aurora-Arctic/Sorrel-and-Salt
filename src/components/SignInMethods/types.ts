import type { LinkedAccount, ProviderId, SocialProvider } from '../../lib/types';

/**
 * A failure to show in the list: a readable sentence, never a raw code, and
 * the provider it concerns where that is known, so it lands in that
 * provider's row rather than at the head of the list.
 */
export interface SignInMethodError {
  providerId?: ProviderId;
  message: string;
}

export interface SignInMethodsProps {
  /** The signed-in user's provider accounts, from `linkedAccounts()`. */
  linked: readonly LinkedAccount[];
  /** Whether the account holds a password, which is a way in beside the providers. */
  passwordHeld: boolean;
  /** How many passkeys the account holds, each a way in beside the providers. */
  passkeyCount: number;
  /** Providers this environment has credentials for; the rest cannot be added. */
  configured: readonly ProviderId[];
  /** A failed link's callback, from linkErrorMessage and the callback's `?provider=`. */
  error?: SignInMethodError;
  /**
   * The session is recent enough for Better Auth to remove a method
   * (`sessionIsFresh()`). False withholds every Remove and offers Sign In
   * Again instead. Defaults to true: the refusal is Better Auth's either way.
   */
  fresh?: boolean;
}

/**
 * Where a provider stands with this account: linked to it, ready to add, or
 * not addable here because this environment has no credentials for it.
 */
export type ProviderRowState = 'linked' | 'addable' | 'unavailable';

/**
 * Whether a linked row offers Remove: `offered` while another method is
 * left and the session is fresh; `last` when it is the only method, which
 * the row says; `withheld` while the session is too old, which the list
 * says once above the rows.
 */
export type ProviderRemoval = 'offered' | 'last' | 'withheld';

export interface ProviderRowProps {
  provider: SocialProvider;
  state: ProviderRowState;
  /** Linked only: whether this row offers Remove, and if not, why. */
  removal: ProviderRemoval;
  /** A removal is in flight somewhere in the list, so every Remove waits for it. */
  pending: boolean;
  /** This row's own action is in flight: its button shows the spinner and `aria-busy`. */
  busy: boolean;
  /** A failed link's callback error for this provider, from the server, shown in its row. */
  error?: string;
  /** Each answers the failure to say under its control, or nothing on success. */
  onAdd: () => Promise<string | undefined>;
  onRemove: () => Promise<string | undefined>;
}

export interface SectionRowProps {
  label: string;
  /** Where the method stands, in words. */
  status: string;
  /** The in-page link to the section that manages it. */
  href: string;
  linkLabel: string;
}
