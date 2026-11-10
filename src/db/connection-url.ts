/**
 * libpq parameters postgres.js forwards to the server as startup parameters, which it rejects with 42704; listed, not
 * derived (claude-docs/db/repository-files.md, "Connection URL parameters").
 */
export const CLIENT_ONLY_PARAMS = [
  'gssencmode',
  'krbsrvname',
  'passfile',
  'requiressl',
  'service',
  'sslcert',
  'sslcompression',
  'sslcrl',
  'sslkey',
] as const;

/**
 * The URL without those parameters; imports nothing, because scripts under Node load it too
 * (claude-docs/db/repository-files.md, "Connection URL parameters").
 */
export function withoutClientOnlyParams(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const present = CLIENT_ONLY_PARAMS.filter((name) => parsed.searchParams.has(name));
  if (present.length === 0) return url;
  for (const name of present) parsed.searchParams.delete(name);
  return parsed.toString();
}

/**
 * How long a migration's statement waits for a lock before failing. Long enough for a
 * request's own transaction to finish, short enough that reads queued behind the wait come to no harm.
 */
export const MIGRATION_LOCK_TIMEOUT = '5s';

/**
 * The URL with `-c lock_timeout=…` added to its `options` startup parameter, after any options it already
 * carries. Neon's pooled endpoint refuses the parameter at connect, so a migration needs the direct URL
 * (claude-docs/db/expand-contract.md, "A migration gives up a lock it cannot take").
 */
export function withMigrationLockTimeout(url: string): string {
  const parsed = new URL(url);
  const existing = parsed.searchParams.get('options');
  const option = `-c lock_timeout=${MIGRATION_LOCK_TIMEOUT}`;
  parsed.searchParams.set('options', existing ? `${existing} ${option}` : option);
  return parsed.toString();
}
