import { vi } from 'vitest';
import type { AuthInstance } from './types';

/**
 * `@/lib/auth` built afresh under `env`, for a file's `beforeAll`: the module reads its secret, providers,
 * origin and flags once, at import. `env` applies for the import alone, so every test in the file sees the
 * same environment (claude-docs/auth/tests.md, "Tests").
 *
 * Its `handler` and `api` calls return once the background tasks they started, its mails among them, have
 * settled: outside a request those tasks are held rather than run after a response (`src/lib/background-tasks.ts`).
 */
export async function importAuth(env: Readonly<Record<string, string>>): Promise<AuthInstance> {
  vi.resetModules();
  const previous = Object.fromEntries(Object.keys(env).map((name) => [name, process.env[name]]));
  Object.assign(process.env, env);
  try {
    const { auth } = await import('@/lib/auth');
    // Imported after `@/lib/auth`, from the same fresh registry, so it is the store auth hands its tasks to.
    const { settleHeldTasks } = await import('@/lib/background-tasks');
    const settled =
      <A extends unknown[], R>(call: (...args: A) => Promise<R>) =>
      async (...args: A): Promise<R> => {
        try {
          return await call(...args);
        } finally {
          await settleHeldTasks();
        }
      };
    const api = new Proxy(auth.api, {
      get(target, name, receiver) {
        const value = Reflect.get(target, name, receiver);
        return typeof value === 'function' ? Object.assign(settled(value), value) : value;
      },
    });
    return { ...auth, handler: settled(auth.handler), api } as AuthInstance;
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}
