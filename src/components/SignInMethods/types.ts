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
  linked: readonly LinkedAccount[];
  passwordHeld: boolean;
  passkeyCount: number;
  /** Providers this environment has credentials for; the rest cannot be added. */
  configured: readonly ProviderId[];
  error?: SignInMethodError;
  fresh?: boolean;
}

/**
 * Where a provider stands with this account: linked to it, ready to add, or
 * not addable here because this environment has no credentials for it.
 */
export type ProviderRowState = 'linked' | 'addable' | 'unavailable';

export type ProviderRemoval = 'offered' | 'last' | 'withheld';

export interface ProviderRowProps {
  provider: SocialProvider;
  state: ProviderRowState;
  removal: ProviderRemoval;
  pending: boolean;
  busy: boolean;
  error?: string;
  onAdd: () => Promise<string | undefined>;
  onRemove: () => Promise<string | undefined>;
}

export interface SectionRowProps {
  label: string;
  status: string;
  href: string;
  linkLabel: string;
}
