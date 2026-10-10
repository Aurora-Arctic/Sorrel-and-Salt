// Server-only: which environment variables back each provider's credentials,
// and what src/lib/auth.ts needs to register it. Kept out of
// social-providers.ts on purpose — that file is imported by SignInPanel ('use
// client'), and even the env var *names* have no reason to reach a browser
// bundle. Only src/lib/auth.ts and a server component may import this
// (.oxlintrc.json's no-restricted-imports enforces it; each legitimate import
// carries an oxlint-disable-next-line saying why, the same convention as the
// database client boundary — CLAUDE.md rule 2).
import { SOCIAL_PROVIDERS } from './social-providers';
import type { ProviderId, ProviderProfiles } from './types';

const ENV_VARS: Record<ProviderId, readonly [clientId: string, clientSecret: string]> = {
  google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  discord: ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET'],
  facebook: ['FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET'],
  microsoft: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
};

/**
 * What differs between the providers' Better Auth registrations, one entry
 * each; `mapProfile` in src/lib/auth.ts builds every one from it. Facebook
 * and Microsoft never vouch for an address at sign-in
 * (claude-docs/auth/admin-bootstrap.md, "First-party verification"), so a
 * true users.emailVerified means Google, Discord or our own mail did.
 */
export const PROFILE: ProviderProfiles = {
  google: { accountId: ['sub'], vouches: true },
  discord: { accountId: ['id'], vouches: true },
  // An id-token profile names the account `sub`; the Graph one, `id`.
  facebook: { accountId: ['sub', 'id'], vouches: false },
  microsoft: {
    accountId: ['oid'],
    vouches: false,
    // Personal Microsoft accounts must be able to sign in, so the tenant is
    // stated explicitly rather than left to Better Auth's own "common"
    // default — a dependency bump silently narrowing that default would
    // otherwise fail every personal-account sign-in with no code change
    // here to review. The app registration itself must also allow personal
    // accounts (claude-docs/secrets.md); the tenant alone can't grant that.
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
