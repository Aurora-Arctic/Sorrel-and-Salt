/**
 * MB.46 — assert (and report on) the environment `vercel pull` wrote.
 *
 * `vercel pull` writes `.vercel/.env.<environment>.local` and CI has been
 * trusting it. Two failures came out of that trust:
 *
 *   - `migrate.yml` extracted `DATABASE_URL` and guarded it with `[ -z ]`
 *     alone, so Vercel's `[SENSITIVE]` placeholder — or a quote the extraction
 *     failed to strip, or a `psql '…'` wrapper — reached drizzle-kit, which
 *     died on `new URL()` with the value masked out of its own stack trace.
 *   - `deploy.yml` never read the file at all. It handed it to `vercel build`,
 *     which died on `BETTER_AUTH_SECRET is not set`.
 *
 * Both are the same defect: nothing between the pull and its consumer could
 * say what the pull returned. That is why `--git-branch` dropping variables
 * (MB.27, found by MB.45) took a production outage to notice.
 *
 * So this script does two things, and the second is the one worth having:
 *
 *   ASSERT — a required key that is missing, empty, a placeholder, or not a
 *   connection string fails the job with its own named cause.
 *
 *   REPORT — every key the pull returned, with a classification and never a
 *   value. Key names are not secret; claude-docs/secrets.md already enumerates
 *   them. Values never appear in output, which
 *   tests/guards/pulled-env-assertion.test.ts asserts rather than assumes.
 *
 * The input is read from a FILE PATH, never from argv and never from an
 * environment variable carrying the value: argv is visible to `ps` and is
 * echoed by `set -x`.
 */

import { readFileSync } from 'node:fs';

/**
 * What `vercel pull` writes in place of a value it cannot read back. Listed
 * rather than pattern-matched so the set is reviewable: the CLI has used more
 * than one spelling across versions, and a placeholder that goes unrecognised
 * is precisely the failure this script exists to end.
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
 * the *first* `=` only — a password may legally contain one, and `cut -f2-`
 * was doing the same thing in shell.
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
    // Only a *matched* pair of wrapping quotes is the file's own syntax.
    // A stray quote on one side is a malformed value, and unwrapping it here
    // would hide exactly what `validateDatabaseUrl` is meant to catch.
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
 * Ordered, and the order is load-bearing. `"postgres://…"` is a quoted URL
 * rather than a non-URL, and saying so is the difference between "fix the
 * extraction" and "fix the value" — so UNTRIMMED is judged before the scheme.
 *
 * No message interpolates the value. The value is masked in CI, so a message
 * that quoted it would print `***` and say nothing — which is how the original
 * failure managed to be both loud and uninformative.
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
 * key only has to be a real value. Every failure is collected rather than
 * thrown on the first, because a run that names one missing variable and hides
 * the next costs a second round trip to learn the same thing.
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

  // The report prints first and prints always. A failure that does not say
  // what the pull returned leaves you exactly where MB.45 started.
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
