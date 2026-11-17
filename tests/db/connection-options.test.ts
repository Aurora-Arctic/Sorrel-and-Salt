import { afterEach, describe, expect, it, vi } from 'vitest';

// A connection nothing uses is closed by the client, not left to the host: an open connection keeps a serverless
// database host awake, and its compute hours are billed.

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('postgres');
});

describe('the application database client', () => {
  it('closes a connection left idle', async () => {
    const postgres = vi.fn(() => Object.assign(() => undefined, { options: {} }));
    vi.doMock('postgres', () => ({ default: postgres }));
    vi.doMock('drizzle-orm/postgres-js', () => ({ drizzle: vi.fn() }));
    vi.stubEnv('DATABASE_URL', 'postgres://fixture:fixture@127.0.0.1:1/fixture');
    (globalThis as { __sorrelPostgresClients?: unknown }).__sorrelPostgresClients = undefined;

    // oxlint-disable-next-line no-restricted-imports
    await import('@/db/connection');

    // Precondition: the client was built by the mocked driver, so the options below are the ones it was given.
    expect(postgres).toHaveBeenCalledTimes(1);
    const options = (postgres.mock.calls[0] as unknown as [string, { idle_timeout?: number }])[1];
    expect(options.idle_timeout).toBeGreaterThan(0);
    vi.unstubAllEnvs();
  });
});
