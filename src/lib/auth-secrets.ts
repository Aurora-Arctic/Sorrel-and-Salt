import type { BetterAuthOptions } from 'better-auth';

/**
 * The keys Better Auth signs cookies with and encrypts stored secrets under, newest first, read once at import. Each
 * encrypted value names the version it was written under, so adding a key leaves every older value readable until its
 * version is removed (claude-docs/auth/config.md, "Rotating the secret").
 *
 * `BETTER_AUTH_SECRETS` is Better Auth's own format, `<version>:<secret>` entries separated by commas, the first the
 * current one. Unset, `BETTER_AUTH_SECRET` alone is version 1, so even the first value encrypted names its version;
 * Better Auth's own fallback would write it unversioned, readable only while that one secret stays.
 */
export function authSecrets(env: NodeJS.ProcessEnv = process.env): BetterAuthOptions['secrets'] {
  const list = env.BETTER_AUTH_SECRETS?.trim();
  if (list) {
    return list.split(',').map((entry) => {
      const colon = entry.indexOf(':');
      if (colon === -1) throw new Error('BETTER_AUTH_SECRETS: every entry is <version>:<secret>');
      return {
        version: Number(entry.slice(0, colon).trim()),
        value: entry.slice(colon + 1).trim(),
      };
    });
  }
  const single = env.BETTER_AUTH_SECRET;
  return single ? [{ version: 1, value: single }] : undefined;
}
