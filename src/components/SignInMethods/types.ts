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
  /** Providers this environment has credentials for; the rest cannot be added. */
  configured: readonly ProviderId[];
  /** A failed link's callback, from linkErrorMessage and the callback's `?provider=`. */
  error?: SignInMethodError;
}

/**
 * Where a provider stands with this account: linked to it, ready to add, or
 * not addable here because this environment has no credentials for it.
 */
export type ProviderRowState = 'linked' | 'addable' | 'unavailable';

export interface ProviderRowProps {
  provider: SocialProvider;
  state: ProviderRowState;
  /** Linked only: another method is left, so this one may go. */
  removable: boolean;
  /** A removal is in flight somewhere in the list, so every Remove waits for it. */
  pending: boolean;
  /** This provider's own failure, shown in its row. */
  error?: string;
  onAdd: () => void;
  onRemove: () => void;
}
