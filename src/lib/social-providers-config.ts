// Server-only: which environment variables back each provider's credentials.
// Kept out of social-providers.ts on purpose — that file is imported by
// SignInPanel ('use client'), and even the env var *names* have no reason to
// reach a browser bundle. Only src/lib/auth.ts and a server component may
// import this (.oxlintrc.json's no-restricted-imports enforces it; each
// legitimate import carries an oxlint-disable-next-line saying why, the same
// convention as the database client boundary — CLAUDE.md rule 2).
import { SOCIAL_PROVIDERS, type ProviderId } from './social-providers';

const ENV_VARS: Record<ProviderId, readonly [clientId: string, clientSecret: string]> = {
  google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  discord: ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET'],
  facebook: ['FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET'],
  microsoft: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
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
