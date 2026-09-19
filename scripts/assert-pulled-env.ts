/**
 * Assert, and report on, the environment `vercel pull` wrote — run by
 * deploy.yml and migrate.yml before anything consumes that file
 * (claude-docs/ci.md, "Deploy").
 *
 * A required key that is missing, empty, a placeholder or not a connection
 * string fails the job with its own named cause; every key the pull returned
 * is reported with a classification and never a value, even when the run is
 * about to fail. The input is a FILE PATH, never argv or an environment
 * variable carrying the value: argv is visible to `ps` and echoed by `set -x`.
 */

import { readFileSync } from 'node:fs';

/**
 * What `vercel pull` writes in place of a value it cannot read back. Listed
 * rather than pattern-matched so the set is reviewable — the CLI has used
 * more than one spelling across versions.
 */
export const PLACEHOLDERS = ['[SENSITIVE]', '[REDACTED]', '<REDACTED>'] as const;

export type Classification = 'missing' | 'empty' | 'placeholder' | 'present';

export type Verdict = { ok: true } | { ok: false; code: string; message: string };

export interface Failure {
  key: string;
  code: string;
  message: string;
}

export interface AssertionResult {
  ok: boolean;
  report: string[];
  failures: Failure[];
}

/**
 * The dotenv shape `vercel pull` writes: `KEY="value"`, one per line. Split on
 * the *first* `=` only — a password may legally contain one.
 */
export function parseEnvFile(text: string): Map<string, string> {
  const entries = new Map<string, string>();

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;

    const key = trimmed.slice(0, separator);
    const raw = trimmed.slice(separator + 1);
    // Only a *matched* pair of wrapping quotes is the file's own syntax; a
    // stray quote on one side is the malformed value `validateDatabaseUrl` reports.
    const unwrapped =
      (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) ||
      (raw.startsWith("'") && raw.endsWith("'") && raw.length >= 2)
        ? raw.slice(1, -1)
        : raw;

    entries.set(key, unwrapped);
  }

  return entries;
}

export function classify(value: string | undefined): Classification {
  if (value === undefined) return 'missing';
  const trimmed = value.trim();
  if (trimmed === '') return 'empty';
  if ((PLACEHOLDERS as readonly string[]).includes(trimmed)) return 'placeholder';
  return 'present';
}

const PLACEHOLDER_EXPLANATION =
  'A variable marked Sensitive in Vercel cannot be read back by `vercel pull` — ' +
  'that is what the setting means, and the pull already said so ' +
  '("Secret values cannot be pulled from the <env> Environment"). ' +
  'This is not transient: a retry will return the same placeholder. ' +
  'Fix it at the source — see claude-docs/secrets.md.';

/** Wrapped in matching quotes, or carrying leading/trailing whitespace. */
function isUntrimmed(raw: string): boolean {
  if (raw !== raw.trim()) return true;
  const wrapped =
    (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"));
  return wrapped && raw.length >= 2;
}

const SCHEME = /^postgres(?:ql)?:\/\//;
/** scheme, then `user[:password]@host[:port]/database`. */
const CONNECTION = /^postgres(?:ql)?:\/\/[^\s/@]+(?::[^\s/@]*)?@[^\s/:]+(?::\d+)?\/[^\s?]+/;

/**
 * libpq parameters postgres.js does not consume, and so forwards. Its
 * `parseOptions` deletes `sslmode`, reads the keys in its own `defaults`, and
 * sends every remaining query parameter to the server verbatim as a *startup
 * parameter* — which the server rejects with 42704. `channel_binding` is the
 * confirmed one, and Neon's console adds it by default. Listed rather than
 * derived: deriving would mean reading node_modules at runtime.
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
 * Which of the above a URL carries, in list order so the message is stable.
 * `[]` for a URL with no query string, and for one `new URL` cannot parse —
 * `CONNECTION` has already matched, so a parse failure is not this rule's.
 */
function clientOnlyParams(value: string): string[] {
  let params: URLSearchParams;
  try {
    params = new URL(value).searchParams;
  } catch {
    return [];
  }
  return CLIENT_ONLY_PARAMS.filter((name) => params.has(name));
}

/**
 * Ordered, and the order is load-bearing: `"postgres://…"` is a quoted URL
 * rather than a non-URL, so UNTRIMMED is judged before the scheme. No message
 * interpolates the value — it is masked in CI, so quoting it prints `***`.
 */
export function validateDatabaseUrl(raw: string | undefined): Verdict {
  const kind = classify(raw);

  if (kind === 'missing') {
    return {
      ok: false,
      code: 'MISSING',
      message: 'DATABASE_URL is not present in the pulled environment file.',
    };
  }
  if (kind === 'empty') {
    return { ok: false, code: 'EMPTY', message: 'DATABASE_URL is present but empty.' };
  }
  if (kind === 'placeholder') {
    return {
      ok: false,
      code: 'PLACEHOLDER',
      message: `DATABASE_URL came back as a placeholder, not a connection string. ${PLACEHOLDER_EXPLANATION}`,
    };
  }

  const value = raw as string;

  if (isUntrimmed(value)) {
    return {
      ok: false,
      code: 'UNTRIMMED',
      message:
        'DATABASE_URL is wrapped in quotes or padded with whitespace. ' +
        'The value itself may be fine — what failed is the extraction around it.',
    };
  }
  if (!SCHEME.test(value)) {
    return {
      ok: false,
      code: 'NOT_A_POSTGRES_URL',
      message:
        'DATABASE_URL does not begin `postgres://` or `postgresql://`. ' +
        "A Neon console copy button can hand you a `psql '…'` command rather than the URL it wraps.",
    };
  }
  if (!CONNECTION.test(value)) {
    return {
      ok: false,
      code: 'INCOMPLETE',
      message:
        'DATABASE_URL has a postgres scheme but no `user@host/database`. ' +
        'postgres.js parses the URL eagerly and would throw ERR_INVALID_URL on it.',
    };
  }

  // Last: the only rule that needs a well-formed URL to apply.
  const forwarded = clientOnlyParams(value);
  if (forwarded.length > 0) {
    return {
      ok: false,
      code: 'CLIENT_ONLY_PARAM',
      message:
        `DATABASE_URL carries ${forwarded.join(', ')}, which postgres.js does not consume. ` +
        'It forwards every query parameter it does not recognise as a Postgres startup ' +
        'parameter, and the server answers `42704 unrecognized configuration parameter`. ' +
        'drizzle-kit swallows that error and exits 1 in silence. ' +
        "Neon's console adds `channel_binding=require` by default — delete it from the URL; " +
        '`sslmode=require` on its own is fine and is what actually requests TLS.',
    };
  }
  return { ok: true };
}

/** One line per key: its name, its classification, its length. Never its value. */
export function reportLines(env: Map<string, string>): string[] {
  const keys = [...env.keys()].sort();
  const width = keys.reduce((longest, key) => Math.max(longest, key.length), 0);

  return keys.map((key) => {
    const value = env.get(key) as string;
    return `  ${key.padEnd(width)}  ${classify(value).padEnd(11)}  ${value.length} chars`;
  });
}

/**
 * `DATABASE_URL` is held to the connection-string rules; every other required
 * key only has to be present. Every failure is collected rather than thrown
 * at the first, so one run names them all.
 */
export function assertPulledEnv(text: string, required: string[]): AssertionResult {
  const env = parseEnvFile(text);
  const report = reportLines(env);
  const failures: Failure[] = [];

  for (const key of required) {
    const value = env.get(key);

    if (key === 'DATABASE_URL') {
      const verdict = validateDatabaseUrl(value);
      if (!verdict.ok) failures.push({ key, code: verdict.code, message: verdict.message });
      continue;
    }

    const kind = classify(value);
    if (kind === 'present') continue;

    failures.push({
      key,
      code: kind.toUpperCase(),
      message:
        kind === 'placeholder'
          ? `${key} came back as a placeholder. ${PLACEHOLDER_EXPLANATION}`
          : `${key} is ${kind} in the pulled environment file.`,
    });
  }

  return { ok: failures.length === 0, report, failures };
}

function usage(): never {
  console.error(
    'usage: assert-pulled-env.ts --file <path> [--require KEY[,KEY...]]\n\n' +
      'Reports every key in the pulled environment file with a classification\n' +
      '(never a value), then fails if any required key is unusable.',
  );
  process.exit(2);
}

function main(): void {
  const argv = process.argv.slice(2);

  const fileIndex = argv.indexOf('--file');
  if (fileIndex === -1 || !argv[fileIndex + 1]) usage();
  const file = argv[fileIndex + 1];

  const requireIndex = argv.indexOf('--require');
  const required =
    requireIndex === -1 || !argv[requireIndex + 1]
      ? []
      : argv[requireIndex + 1]
          .split(',')
          .map((key) => key.trim())
          .filter(Boolean);

  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    console.error(`::error::${file} not found after vercel pull`);
    process.exit(1);
  }

  const result = assertPulledEnv(text, required);

  // The report prints first and always: a failure that does not say what the
  // pull returned is the defect this script exists to end.
  console.log(`Pulled environment (${file}) — ${result.report.length} variable(s):\n`);
  for (const line of result.report) console.log(line);
  console.log('');

  if (result.ok) {
    console.log(
      required.length === 0
        ? 'No required keys given — reported only.'
        : `All required keys usable: ${required.join(', ')}`,
    );
    return;
  }

  for (const failure of result.failures) {
    console.error(`::error::${failure.key} (${failure.code}) — ${failure.message}`);
  }
  process.exit(1);
}

if (import.meta.main) {
  main();
}
