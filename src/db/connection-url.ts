/**
 * libpq parameters postgres.js does not consume, and so forwards. Its
 * `parseOptions` deletes `sslmode`, reads the keys in its own `defaults`, and
 * sends every remaining query parameter to the server verbatim as a *startup
 * parameter*, which the server rejects with 42704. Listed rather than derived:
 * deriving would mean reading node_modules at runtime.
 *
 * Deliberately NOT here: `sslmode` (consumed, mapped to `ssl`),
 * `channel_binding` (the driver reads it, enforces `require` and defaults to
 * `prefer`), `application_name` and `options` (real server parameters), and
 * the keys postgres.js names itself: `connect_timeout`,
 * `target_session_attrs`, `sslnegotiation`, `prepare`, `max`, `fetch_types`.
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
 * The URL without the parameters above, applied wherever a connection opens.
 * It strips rather than rejects because a hotfix's URL is written by Neon's
 * Vercel integration, which rewrites the variable itself, so nobody can
 * delete a parameter by hand. `channel_binding` is kept: the driver enforces
 * it, and `sslmode=require` is what requests TLS
 * (claude-docs/ci/deploy.md, "Deploy").
 *
 * Imports nothing, because scripts run directly under Node load it as well as
 * Next. A URL with nothing to remove, or one `new URL` cannot parse, comes
 * back as it came, so postgres.js still reports its own error for the latter.
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
