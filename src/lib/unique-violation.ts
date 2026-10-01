import type { ChainedError } from './types';
// Reads a unique-index violation off a thrown error without importing the
// database layer, which a service may not (MB.33): Postgres reports SQLSTATE
// 23505 with the index's name, and Drizzle rethrows the driver's error as the
// `cause` of its own. A service matches the name to the field that caused it.

const UNIQUE_VIOLATION = '23505';

/** The unique index `error` says a write broke, or `undefined` for any other error. */
export function violatedUniqueIndex(error: unknown): string | undefined {
  for (let current = error; current instanceof Error; current = (current as ChainedError).cause) {
    const { code, constraint_name: index } = current as ChainedError;
    if (code === UNIQUE_VIOLATION && typeof index === 'string') return index;
  }
  return undefined;
}
