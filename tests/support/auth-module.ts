import { vi } from 'vitest';
import type { AuthInstance } from './types';

/**
 * `@/lib/auth` built afresh under `env`, for a file's `beforeAll`: the module
 * reads its secret, provider credentials, origin, limiter and impersonation
 * flags once, at import, so a file whose env does not change pays for the
 * import once rather than per test. `env` is applied for the import alone and
 * restored after, so every test in the file sees the same environment; a
 * variable read per request — `ADMIN_BOOTSTRAP_EMAIL` — is stubbed by the test
 * or describe that varies it. Modules imported after this call share its graph
 * (claude-docs/auth/tests.md, "Tests").
 */
export async function importAuth(env: Readonly<Record<string, string>>): Promise<AuthInstance> {
  vi.resetModules();
  const previous = Object.fromEntries(Object.keys(env).map((name) => [name, process.env[name]]));
  Object.assign(process.env, env);
  try {
    return (await import('@/lib/auth')).auth;
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}
