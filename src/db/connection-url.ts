/**
 * libpq parameters postgres.js does not consume, and so forwards. Its
 * `parseOptions` deletes `sslmode`, reads the keys in its own `defaults`, and
 * sends every remaining query parameter to the server verbatim as a *startup
 * parameter* — which the server rejects with 42704. `channel_binding` is the
 * confirmed one, and Neon's console and its Vercel integration both add it.
 * Listed rather than derived: deriving would mean reading node_modules at
 * runtime.
 *
 * Deliberately NOT here: `sslmode` (consumed, mapped to `ssl`),
 * `application_name` and `options` (real server parameters), and the keys
 * postgres.js names itself — `connect_timeout`, `target_session_attrs`,
 * `sslnegotiation`, `prepare`, `max`, `fetch_types`.
 */
export const CLIENT_ONLY_PARAMS = [
  'channel_binding',
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
 * Vercel integration, which adds `channel_binding=require` and rewrites the
 * variable itself, so nobody can delete it by hand. Nothing is lost:
 * postgres.js never enforced channel binding, and `sslmode=require` is what
 * requests TLS (claude-docs/ci/deploy.md, "Deploy").
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
