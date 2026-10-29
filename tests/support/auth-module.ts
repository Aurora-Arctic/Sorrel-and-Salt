import { vi } from 'vitest';
import type { AuthInstance } from './types';

/**
 * `@/lib/auth` built afresh under `env`, for a file's `beforeAll`: the module reads its secret, providers,
 * origin and flags once, at import. `env` applies for the import alone, so every test in the file sees the
 * same environment (claude-docs/auth/tests.md, "Tests").
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
