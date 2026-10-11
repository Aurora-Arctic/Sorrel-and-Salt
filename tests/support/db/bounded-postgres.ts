import postgres from 'postgres';
import type { ClientOptions } from './types';

// What `import postgres from 'postgres'` resolves to inside the `db` project
// and the acceptance suite: postgres.js itself, every pool capped at
// TEST_POOL_MAX. The app's client in src/db/connection.ts and the client each
// test file opens would otherwise each default to ten, and eleven workers of
// those are more than Postgres's slots once another run or an idle e2e server
// shares them (MB.179). A cap rather than a default, so a call site cannot
// raise it; one lowering its own `max` (postgres.js's ordering guarantee is
// `max: 1`) keeps the lower number. Resolved here by
// tests/support/db-project.mts's plugin rather than passed at every call —
// sixty files open a client of their own, and the env var postgres.js would
// read for `max` is undocumented and hands a string to `Array()`, which makes
// any value a pool of one (claude-docs/testing/db-harness.md, "Connections per run").

/** The most connections one client under test may open, one term of the run's connection budget. */
export const TEST_POOL_MAX = 4;

function bounded(first?: string | ClientOptions, second?: ClientOptions) {
  const [url, options] = typeof first === 'string' ? [first, second] : [undefined, first];
  const capped = { ...options, max: Math.min(options?.max ?? TEST_POOL_MAX, TEST_POOL_MAX) };
  return url === undefined ? postgres(capped) : postgres(url, capped);
}

// The namespace members (`PostgresError`, the case helpers) ride along, so a
// caller sees the whole package; the cast is the overloads, which a wrapper
// taking either shape cannot restate.
export default Object.assign(bounded, postgres) as typeof postgres;
