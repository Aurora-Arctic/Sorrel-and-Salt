import type { ProviderId, SocialProvider } from './types';
// One source so no button is live for an unregistered provider. Id and label only: SignInPanel ('use client') imports it, and a client bundle should not carry the variable names behind a secret (social-providers-config.ts; claude-docs/auth/config.md, "Social providers").

export const SOCIAL_PROVIDERS: readonly SocialProvider[] = [
  { id: 'discord', label: 'Discord' },
  { id: 'google', label: 'Google' },
  // Hidden from the sign-in screens for now; claude-docs/auth/config.md says
  // why and how it returns.
  { id: 'facebook', label: 'Facebook', hidden: true },
  { id: 'microsoft', label: 'Microsoft' },
];

// Why a provider's button is greyed, on /sign-in and on the account page's
// sign-in methods alike: this environment has no credentials for it.
export const UNAVAILABLE_NOTE = "This sign-in method isn't available right now.";

/** Its tables type the column as any string, so this is the check rather than a cast. */
export function isRosterProvider(providerId: string): providerId is ProviderId {
  return SOCIAL_PROVIDERS.some((provider) => provider.id === providerId);
}
