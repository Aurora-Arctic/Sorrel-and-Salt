import { describe, expect, it } from 'vitest';
import { workerDatabaseName, workerDatabaseUrl } from './worker-database';

// The name comes from VITEST_POOL_ID, the pool slot, never VITEST_WORKER_ID,
// the per-file counter that runs past `maxWorkers`; see worker-database.ts.
const base = 'postgres://sorrel:sorrel@postgres:5432/sorrel';

describe('workerDatabaseUrl', () => {
  it('names the database after the pool slot', () => {
    const url = workerDatabaseUrl({ DATABASE_URL: base, VITEST_POOL_ID: '2' });

    expect(new URL(url).pathname).toBe('/sorrel_test_2');
  });

  it('ignores VITEST_WORKER_ID, however far it has run ahead of the slot', () => {
    const url = workerDatabaseUrl({
      DATABASE_URL: base,
      VITEST_POOL_ID: '3',
      VITEST_WORKER_ID: '11',
    });

    expect(new URL(url).pathname).toBe('/sorrel_test_3');
  });

  it('keeps the host and credentials, rewriting only the database', () => {
    const url = new URL(workerDatabaseUrl({ DATABASE_URL: base, VITEST_POOL_ID: '1' }));

    expect(url.host).toBe('postgres:5432');
    expect(url.username).toBe('sorrel');
    expect(url.password).toBe('sorrel');
  });

  // `sorrel_test_undefined` would surface one connection later as a Postgres error.
  it('fails as a harness error when DATABASE_URL is unset', () => {
    expect(() => workerDatabaseUrl({ VITEST_POOL_ID: '1' })).toThrow(/DATABASE_URL/);
  });

  it('fails as a harness error when VITEST_POOL_ID is unset', () => {
    expect(() => workerDatabaseUrl({ DATABASE_URL: base })).toThrow(/VITEST_POOL_ID/);
  });
});

describe('workerDatabaseName', () => {
  it('is the name globalSetup clones and db-setup connects to', () => {
    expect(workerDatabaseName(1)).toBe('sorrel_test_1');
    expect(workerDatabaseName('2')).toBe('sorrel_test_2');
  });
});
