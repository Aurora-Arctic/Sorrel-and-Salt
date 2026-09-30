import type { LinkedAccount, ProviderId } from '../../lib/types';

export interface SignInMethodsProps {
  /** The signed-in user's provider accounts, from `linkedAccounts()`. */
  linked: readonly LinkedAccount[];
  /** Providers this environment has credentials for; the rest cannot be added. */
  configured: readonly ProviderId[];
  /** A readable sentence for a failed link, from linkErrorMessage — never a raw code. */
  error?: string;
}
