import postgres from 'postgres';
import type { ClientOptions } from './types';

// What `import postgres from 'postgres'` resolves to in the `db` project: postgres.js with every pool capped
// at TEST_POOL_MAX, so the app's client and each file's own do not exceed Postgres's slots. A lower `max` set
// at a call site is kept. Resolved by tests/support/db-project.mts's plugin, as postgres.js's env var for `max`
// makes any value a pool of one (claude-docs/testing/db-harness.md, "Connections per run").

/** The most connections one client under test may open, one term of the run's connection budget. */
export const TEST_POOL_MAX = 4;

function bounded(first?: string | ClientOptions, second?: ClientOptions) {
  const [url, options] = typeof first === 'string' ? [first, second] : [undefined, first];
  // NOTICE-level messages are dropped unless a caller passes its own handler: a
  // truncate that cascades prints one per table, ~3,000 lines a run. A WARNING
  // or anything else the server says still prints, as postgres.js would.
  const capped = {
    onnotice: (notice: postgres.Notice) => {
      // oxlint-disable-next-line no-console -- a deliberate diagnostic: a server WARNING must still reach the run's output
      if (notice.severity !== 'NOTICE') console.log(notice);
    },
    ...options,
    max: Math.min(options?.max ?? TEST_POOL_MAX, TEST_POOL_MAX),
  };
  return url === undefined ? postgres(capped) : postgres(url, capped);
}

// The namespace members (`PostgresError`, the case helpers) ride along, so a
// caller sees the whole package; the cast is the overloads, which a wrapper
// taking either shape cannot restate.
export default Object.assign(bounded, postgres) as typeof postgres;
