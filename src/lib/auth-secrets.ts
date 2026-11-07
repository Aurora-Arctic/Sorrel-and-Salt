import type { BetterAuthOptions } from 'better-auth';

/** Read once at import; unset, `BETTER_AUTH_SECRET` alone is version 1 (claude-docs/auth/config.md, "Rotating the secret"). */
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

/** Better Auth's own fallback when no secret is set, outside production only. */
const BETTER_AUTH_DEFAULT_SECRET = 'better-auth-secret-12345678901234567890';

/** Chosen as Better Auth chooses `ctx.secret`. A job's step signs with it, as it holds no Better Auth context. */
export function verificationSigningSecret(env: NodeJS.ProcessEnv = process.env): string {
  return (
    authSecrets(env)?.[0]?.value ||
    env.BETTER_AUTH_SECRET ||
    env.AUTH_SECRET ||
    BETTER_AUTH_DEFAULT_SECRET
  );
}
