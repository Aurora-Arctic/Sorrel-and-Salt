import type { ChainedError } from './types';
// Reads a unique-index violation (SQLSTATE 23505 and the index name) off a thrown error without importing the
// database layer; Drizzle wraps the driver's error as `cause`.

const UNIQUE_VIOLATION = '23505';

/** The unique index `error` says a write broke, or `undefined` for any other error. */
export function violatedUniqueIndex(error: unknown): string | undefined {
  for (let current = error; current instanceof Error; current = (current as ChainedError).cause) {
    const { code, constraint_name: index } = current as ChainedError;
    if (code === UNIQUE_VIOLATION && typeof index === 'string') return index;
  }
  return undefined;
}
