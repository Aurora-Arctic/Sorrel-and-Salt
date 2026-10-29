// Server-only: the environment variables backing each provider's credentials, and what src/lib/auth.ts needs to register it. Not in social-providers.ts,
// which SignInPanel ('use client') imports and whose bundle should not carry even the variable names. Only auth.ts and a server component may import it (.oxlintrc.json).
import { SOCIAL_PROVIDERS } from './social-providers';
import type { ProviderId, ProviderProfiles } from './types';

const ENV_VARS: Record<ProviderId, readonly [clientId: string, clientSecret: string]> = {
  google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  discord: ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET'],
  facebook: ['FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET'],
  microsoft: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
};

/**
 * What differs between the providers' Better Auth registrations; `mapProfile` in src/lib/auth.ts builds each from it. Facebook and Microsoft never vouch for an
 * address at sign-in (claude-docs/auth/admin-bootstrap.md, "First-party verification"), so a true `emailVerified` means Google, Discord or our own mail.
 */
export const PROFILE: ProviderProfiles = {
  google: { accountId: ['sub'], vouches: true },
  discord: { accountId: ['id'], vouches: true },
  // An id-token profile names the account `sub`; the Graph one, `id`.
  facebook: { accountId: ['sub', 'id'], vouches: false },
  microsoft: {
    accountId: ['oid'],
    vouches: false,
    // The tenant is stated, not left to Better Auth's "common" default, which a dependency bump could narrow and so fail every personal-account sign-in
    // unseen. The app registration must also allow personal accounts (claude-docs/secrets.md).
    extra: () => ({ tenantId: process.env.MICROSOFT_TENANT_ID || 'common' }),
  },
};

/** A provider's credentials, or undefined when either half is unset — never an empty string. */
export function clientCredentials(
  id: ProviderId,
): { clientId: string; clientSecret: string } | undefined {
  const [clientIdVar, clientSecretVar] = ENV_VARS[id];
  const clientId = process.env[clientIdVar];
  const clientSecret = process.env[clientSecretVar];
  if (!clientId || !clientSecret) return undefined;
  return { clientId, clientSecret };
}

/** Providers with both env vars set, in roster order. */
export function configuredProviders(): ProviderId[] {
  return SOCIAL_PROVIDERS.filter((provider) => clientCredentials(provider.id) !== undefined).map(
    (provider) => provider.id,
  );
}
