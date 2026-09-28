// Reads a unique-index violation off a thrown error without importing the
// database layer, which a service may not (MB.33): Postgres reports SQLSTATE
// 23505 with the index's name, and Drizzle rethrows the driver's error as the
// `cause` of its own. A service matches the name to the field that caused it.

const UNIQUE_VIOLATION = '23505';

/** What is read off each error in the chain; `cause` is typed on `Error` only from ES2022's lib. */
interface Fields {
  cause?: unknown;
  code?: unknown;
  constraint_name?: unknown;
}

/** The unique index `error` says a write broke, or `undefined` for any other error. */
export function violatedUniqueIndex(error: unknown): string | undefined {
  for (let current = error; current instanceof Error; current = (current as Fields).cause) {
    const { code, constraint_name: index } = current as Fields;
    if (code === UNIQUE_VIOLATION && typeof index === 'string') return index;
  }
  return undefined;
}
