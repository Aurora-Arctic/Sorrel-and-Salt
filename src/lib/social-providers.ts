import type { ProviderId, SocialProvider } from './types';
// The roster src/lib/auth.ts registers providers from and /sign-in greys buttons from, one source so no button is live for an unregistered provider. Id and label only:
// SignInPanel ('use client') imports it, and a client bundle should not carry the names of the variables behind a secret, which live in social-providers-config.ts.
// Adding a provider is an id in `ProviderId` and its two entries there; Apple was dropped (claude-docs/auth/social-providers.md, "Social providers").

export const SOCIAL_PROVIDERS: readonly SocialProvider[] = [
  { id: 'discord', label: 'Discord' },
  { id: 'google', label: 'Google' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'microsoft', label: 'Microsoft' },
];

// Why a provider's button is greyed, on /sign-in and on the account page's
// sign-in methods alike: this environment has no credentials for it.
export const UNAVAILABLE_NOTE = "This sign-in method isn't available right now.";

/**
 * Whether a Better Auth account's `providerId` is one of ours. Its tables
 * type the column as any string, so this is the check rather than a cast.
 */
export function isRosterProvider(providerId: string): providerId is ProviderId {
  return SOCIAL_PROVIDERS.some((provider) => provider.id === providerId);
}
