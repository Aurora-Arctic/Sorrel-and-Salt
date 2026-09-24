// The roster src/lib/auth.ts registers providers from and /sign-in greys
// buttons from — one source, so a button cannot be live for a provider
// Better Auth never registered, or greyed for one that works. Adding or
// removing a provider is one entry here, not a change in two files.
//
// Deliberately id/label only, with no env var names anywhere in this file:
// SignInPanel ('use client') imports this to render its buttons, and a
// client bundle should never carry the *names* of the environment variables
// that back a secret, even though it never sees their values. That mapping
// lives in social-providers-config.ts, which nothing client-side may import
// (.oxlintrc.json's no-restricted-imports).
//
// Apple was considered and dropped (claude-docs/auth.md, "Social providers"):
// its client secret is a JWT Apple caps at six months, expiring silently
// rather than failing loudly, on top of a paid Developer Program membership
// the other four don't need.

export type ProviderId = 'google' | 'discord' | 'facebook' | 'microsoft';

export interface SocialProvider {
  id: ProviderId;
  label: string;
}

export const SOCIAL_PROVIDERS: readonly SocialProvider[] = [
  { id: 'discord', label: 'Discord' },
  { id: 'google', label: 'Google' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'microsoft', label: 'Microsoft' },
];
