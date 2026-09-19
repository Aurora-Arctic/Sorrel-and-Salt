/**
 * Open the connection ourselves, so a failure has a cause. `drizzle-kit
 * migrate` catches whatever postgres.js throws and exits 1 without printing
 * it, so an unreachable host, a wrong password, an `sslmode` mismatch and a
 * `channel_binding` parameter are byte-identical in its output. This runs
 * first, connects, runs `select 1`, and on failure prints the driver's own
 * error code and message (claude-docs/ci.md, "Deploy").
 *
 * Two disciplines shared with scripts/assert-pulled-env.ts: the URL arrives
 * as a FILE PATH, never on argv (visible to `ps`, echoed by `set -x`); and
 * nothing printed carries the credentials — the driver's message may quote
 * the connection string, so it is scrubbed rather than trusted. The hostname
 * is kept: `ENOTFOUND` without the name it failed to resolve says nothing.
 */

import { readFileSync } from 'node:fs';

import postgres from 'postgres';

import { parseEnvFile, validateDatabaseUrl } from './assert-pulled-env.ts';

/**
 * What to do about each failure whose code alone would still mean reading a
 * Postgres error table mid-incident. Keyed by the driver's own code so the log
 * is searchable by the string it prints.
 */
export const probeHints: Record<string, string> = {
  '42704':
    'The server does not recognise a parameter it was sent. postgres.js does not consume ' +
    'libpq client-side options — it forwards every query parameter it does not recognise as a ' +
    "Postgres startup parameter. `channel_binding`, which Neon's console adds by default, is " +
    'the usual one. Delete it from the URL; `sslmode=require` alone still requests TLS.',
  '28P01':
    'The password is wrong for this user. Check the DATABASE_URL_PRODUCTION / ' +
    'DATABASE_URL_STAGING secret against the Neon branch it is meant to name — a ' +
    'connection string copied from the wrong branch authenticates against the wrong role.',
  '3D000':
    'The database name after the last `/` does not exist on this server. A Neon URL ends ' +
    '`/neondb`; dropping the path entirely leaves postgres.js defaulting to the username.',
  '42501': 'The role connected but is not permitted to do this. Check its grants on the schema.',
  '53300':
    'The server refused a new connection because it is at its limit. Use the `-pooler` ' +
    'endpoint, which is what the pooled Neon host is for.',
  ENOTFOUND:
    'The hostname does not resolve. It is usually a typo in the host, or a Neon endpoint ' +
    'belonging to a branch that has since been deleted.',
  ECONNREFUSED:
    'The host resolved but refused the connection on that port — nothing is listening there, ' +
    'or the port is wrong.',
  ETIMEDOUT:
    'The connection attempt timed out. The host resolved and did not refuse, which usually ' +
    'means a firewall is dropping the packets rather than rejecting them.',
  CONNECT_TIMEOUT:
    'postgres.js gave up waiting for the server to answer. Same shape as ETIMEDOUT: reachable ' +
    'enough to accept a socket, not enough to complete a handshake.',
};

/**
 * Every spelling of the credentials that could appear in a driver's message,
 * longest first so the full URL goes before its own substrings. `split`/`join`
 * rather than a regex: a password may contain metacharacters, and escaping
 * them is a second bug in the one function whose failure is a leaked secret.
 */
export function scrub(text: string, url: string | undefined): string {
  if (!url) return text;

  const secrets = new Set<string>([url]);

  try {
    const parsed = new URL(url);
    for (const part of [parsed.password, decodeURIComponent(parsed.password)]) {
      if (part) secrets.add(part);
    }
    if (parsed.username && parsed.password) {
      secrets.add(`${parsed.username}:${parsed.password}`);
      secrets.add(`${parsed.username}:${decodeURIComponent(parsed.password)}`);
    }
  } catch {
    // Not a parseable URL; the whole string is still scrubbed.
  }

  let scrubbed = text;
  for (const secret of [...secrets].sort((a, b) => b.length - a.length)) {
    if (secret.length < 3) continue;
    scrubbed = scrubbed.split(secret).join('[redacted]');
  }

  return scrubbed;
}

/** The driver's code and message, scrubbed, plus the hint if there is one. */
export function describeConnectionError(error: unknown, url: string | undefined): string {
  if (!(error instanceof Error)) {
    return scrub(String(error), url);
  }
  // `code` is not a property of `Error`, and every layer puts something
  // different there — Node's socket errors `ECONNREFUSED`/`ENOTFOUND`,
  // postgres.js the server's five-character SQLSTATE. Read defensively: an
  // error carrying no code at all still has to be reported.
  const raw: unknown = (error as unknown as Record<string, unknown>).code;
  const code = typeof raw === 'string' ? raw : undefined;

  const parts = [code ? `${code}: ${scrub(error.message, url)}` : scrub(error.message, url)];

  // postgres.js puts the server's own detail and hint on the error; they go
  // through the same scrub rather than being trusted.
  for (const field of ['detail', 'hint', 'routine'] as const) {
    const value = (error as unknown as Record<string, unknown>)[field];
    if (typeof value === 'string' && value) parts.push(`${field}: ${scrub(value, url)}`);
  }

  if (code && probeHints[code]) parts.push(`\n  → ${probeHints[code]}`);

  return parts.join('\n  ');
}

export interface ProbeResult {
  ok: boolean;
  /** Present on success — which database actually answered. */
  identity?: { database: string; user: string; version: string };
  /** Present on failure — already scrubbed, safe to print. */
  description?: string;
}

/**
 * `select 1`, then who answered it. Two workflows each choose the long-lived
 * database by a `$ENVIRONMENT` / `$GIT_BRANCH` branch, and a mis-picked secret
 * migrates the wrong one silently; printing the role and server reached is
 * the cheapest check that the branch chose what it meant to.
 */
export async function probe(url: string): Promise<ProbeResult> {
  let sql: ReturnType<typeof postgres> | undefined;

  try {
    // `postgres()` parses the URL eagerly, so a malformed value throws here
    // rather than on the query. connect_timeout is short on purpose: a probe
    // hanging for the driver's 30s default replaces a silent failure with a slow one.
    sql = postgres(url, {
      max: 1,
      connect_timeout: 10,
      idle_timeout: 1,
      prepare: false,
      onnotice: () => {},
    });

    const [row] = await sql<
      { database: string; user: string; version: string }[]
    >`select current_database() as database, current_user as user, version() as version`;

    return { ok: true, identity: row };
  } catch (error) {
    return { ok: false, description: describeConnectionError(error, url) };
  } finally {
    // `await`ed so the process exits on its own rather than with an open
    // socket, but never allowed to mask the real failure.
    try {
      await sql?.end({ timeout: 5 });
    } catch {
      /* the connection never opened; there is nothing to close */
    }
  }
}

function usage(): never {
  console.error(
    'usage: probe-database.ts --file <path> [--key DATABASE_URL] [--on-failure fail|warn]\n\n' +
      'Reads a connection string from a dotenv-shaped file, opens it, and runs\n' +
      "`select 1`. On failure prints the driver's own error code and message —\n" +
      'never the connection string.',
  );
  process.exit(2);
}

function flag(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  const file = flag(argv, '--file');
  if (!file) usage();

  const key = flag(argv, '--key') ?? 'DATABASE_URL';
  const onFailure = flag(argv, '--on-failure') ?? 'fail';
  if (onFailure !== 'fail' && onFailure !== 'warn') usage();

  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    console.error(`::error::${file} not found — nothing to probe`);
    process.exit(1);
  }

  const url = parseEnvFile(text).get(key);

  // Whatever source won — a GitHub secret or the pulled file — the value is
  // validated before anything tries to open it.
  const verdict = validateDatabaseUrl(url);
  if (!verdict.ok) {
    console.error(`::error::${key} (${verdict.code}) — ${verdict.message}`);
    process.exit(1);
  }

  console.log(`Probing ${key} (${(url as string).length} chars) with \`select 1\`...`);
  const result = await probe(url as string);

  if (result.ok) {
    const { database, user, version } = result.identity as NonNullable<ProbeResult['identity']>;
    console.log(`Connected as ${user} to ${database}`);
    console.log(`  ${version}`);
    return;
  }

  const severity = onFailure === 'warn' ? 'warning' : 'error';
  console.error(`::${severity}::Could not open ${key} — ${result.description}`);

  if (onFailure === 'warn') {
    console.error(
      'Continuing: this step is advisory here. The build issues no query, so it can ' +
        'succeed against a database it cannot reach — but the deployed app will not.',
    );
    return;
  }

  process.exit(1);
}

if (import.meta.main) {
  await main();
}
