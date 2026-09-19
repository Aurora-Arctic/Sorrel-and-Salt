import { describe, expect, it } from 'vitest';
import { workerDatabaseName, workerDatabaseUrl } from './worker-database';

// MB.14's regression guard. The per-worker database name must come from
// VITEST_POOL_ID — the pool *slot*, which Vitest documents as "between
// 1-maxWorkers" — and never from VITEST_WORKER_ID, which is a monotonic
// per-test-file counter over the whole run's sorted spec list and so runs
// past maxWorkers as soon as there are more test files than workers. Keying
// off the latter is how three db tests asked CI for a `sorrel_test_4` that
// db-global-setup.ts had never cloned.
const base = 'postgres://sorrel:sorrel@postgres:5432/sorrel';

describe('workerDatabaseUrl', () => {
  it('names the database after the pool slot', () => {
    const url = workerDatabaseUrl({ DATABASE_URL: base, VITEST_POOL_ID: '2' });

    expect(new URL(url).pathname).toBe('/sorrel_test_2');
  });

  // The bug itself: with eleven test files and three workers, VITEST_WORKER_ID
  // reaches 11 while only sorrel_test_1..3 exist.
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

  // A missing variable used to produce `sorrel_test_undefined` and surface one
  // connection later as a Postgres error, which reads as a broken database
  // rather than a broken harness.
  it('fails as a harness error when DATABASE_URL is unset', () => {
    expect(() => workerDatabaseUrl({ VITEST_POOL_ID: '1' })).toThrow(/DATABASE_URL/);
  });

  it('fails as a harness error when VITEST_POOL_ID is unset', () => {
    expect(() => workerDatabaseUrl({ DATABASE_URL: base })).toThrow(/VITEST_POOL_ID/);
  });
});

describe('workerDatabaseName', () => {
  // One spelling, shared by the setup that creates the databases and the
  // setup that connects to them — they disagreed before, which is the bug.
  it('is the name globalSetup clones and db-setup connects to', () => {
    expect(workerDatabaseName(1)).toBe('sorrel_test_1');
    expect(workerDatabaseName('2')).toBe('sorrel_test_2');
  });
});
