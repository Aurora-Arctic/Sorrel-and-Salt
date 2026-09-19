import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import {
  assertPulledEnv,
  classify,
  parseEnvFile,
  PLACEHOLDERS,
  reportLines,
  validateDatabaseUrl,
} from '../../scripts/assert-pulled-env';
import { fromRoot } from '../support/paths';

// MB.46 — `vercel pull` writes a dotfile and CI trusts it. `migrate.yml`'s only
// guard was `[ -z "$db_url" ]`, so every value that is not a connection string
// but is also not empty — Vercel's `[SENSITIVE]` placeholder, a `psql '…'`
// wrapper, a quote the extraction failed to strip — reached drizzle-kit, which
// died on `new URL()` with the value masked out of its own stack trace.
// `deploy.yml` was worse: it never read the file at all, handing it straight to
// `vercel build`, which died on `BETTER_AUTH_SECRET is not set`.
//
// So this file pins two different things, and the second is the point.
//
// The ASSERTION — a required key that is missing, empty, a placeholder, or not
// a postgres URL fails the job with its own named cause, rather than an
// `ERR_INVALID_URL` forty frames down.
//
// The REPORT — every key the pull returned, with a classification and never a
// value. CI could not previously answer "what did the pull actually return?",
// which is why `--git-branch` silently dropping variables took a production
// outage to notice. Key names are not secret; they are already enumerated in
// claude-docs/secrets.md. Values never appear, and that is asserted here rather
// than merely intended.

const NEON =
  'postgresql://sorrel:np_x9Kq2@ep-cool-bird-a1b2c3-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';
const LOCAL = 'postgres://sorrel:sorrel@postgres:5432/sorrel';
const ESCAPED = 'postgresql://sorrel:p%40ss%2Fword@db.example.com:5432/sorrel';

describe('validateDatabaseUrl', () => {
  it.each([
    ['a Neon pooled URL', NEON],
    ['the local compose URL', LOCAL],
    ['a percent-escaped password', ESCAPED],
  ])('accepts %s', (_label, url) => {
    expect(validateDatabaseUrl(url)).toEqual({ ok: true });
  });

  it.each([
    ['MISSING', undefined],
    ['EMPTY', '   '],
    ['PLACEHOLDER', '[SENSITIVE]'],
    ['PLACEHOLDER', '[REDACTED]'],
    ['NOT_A_POSTGRES_URL', 'https://example.com/db'],
    ['NOT_A_POSTGRES_URL', 'psql "postgresql://sorrel:sorrel@host/db"'],
    ['INCOMPLETE', 'postgresql://'],
    ['INCOMPLETE', 'postgres://nohostpart'],
    ['UNTRIMMED', `"${LOCAL}"`],
    ['UNTRIMMED', `'${LOCAL}'`],
    ['UNTRIMMED', ` ${LOCAL}`],
  ])('rejects with %s', (code, raw) => {
    const verdict = validateDatabaseUrl(raw as string | undefined);
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.code).toBe(code);
    expect(verdict.message.length).toBeGreaterThan(0);
  });

  // The whole reason the original bug was invisible: the value is masked, so an
  // error carrying it reads `***` and tells you nothing. Every message describes
  // shape, and none may quote what it rejected — including the cases where the
  // rejected value is a real connection string wearing a wrapper.
  it.each([
    ['a quoted Neon URL', `"${NEON}"`, 'np_x9Kq2'],
    ['a psql-wrapped local URL', `psql '${LOCAL}'`, 'sorrel:sorrel'],
    ['a leading-space Neon URL', ` ${NEON}`, 'neon.tech'],
  ])('never quotes the value it rejected — %s', (_label, raw, secret) => {
    const verdict = validateDatabaseUrl(raw);
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.message).not.toContain(secret);
    expect(verdict.message).not.toContain(raw);
  });

  // A placeholder is not a transient failure and a retry cannot fix it — the
  // message has to say so, or the next person reruns the job twice before
  // reading it.
  it('explains that a placeholder is unreadable by design', () => {
    const verdict = validateDatabaseUrl('[SENSITIVE]');
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.message).toMatch(/sensitive/i);
    expect(verdict.message).toMatch(/design|cannot be read|retry/i);
  });
});

describe('parseEnvFile', () => {
  it('reads the shape `vercel pull` writes — quoted values, one per line', () => {
    const parsed = parseEnvFile(
      [`DATABASE_URL="${LOCAL}"`, 'BETTER_AUTH_SECRET="s3cret"', 'EMPTY=""'].join('\n'),
    );
    expect([...parsed.keys()]).toEqual(['DATABASE_URL', 'BETTER_AUTH_SECRET', 'EMPTY']);
    expect(parsed.get('DATABASE_URL')).toBe(LOCAL);
  });

  it('keeps `=` inside a value, which a password may legally contain', () => {
    expect(parseEnvFile('K="a=b=c"').get('K')).toBe('a=b=c');
  });

  it('ignores comments and blank lines rather than treating them as keys', () => {
    const parsed = parseEnvFile('# a comment\n\nK="v"\n');
    expect([...parsed.keys()]).toEqual(['K']);
  });
});

describe('classify', () => {
  it.each([
    [undefined, 'missing'],
    ['', 'empty'],
    ['   ', 'empty'],
    ['[SENSITIVE]', 'placeholder'],
    ['[REDACTED]', 'placeholder'],
    ['anything else', 'present'],
  ])('calls %s → %s', (value, expected) => {
    expect(classify(value as string | undefined)).toBe(expected);
  });

  it('names every placeholder spelling it knows, so the list is reviewable', () => {
    expect(PLACEHOLDERS).toContain('[SENSITIVE]');
    expect(PLACEHOLDERS).toContain('[REDACTED]');
  });
});

describe('reportLines', () => {
  const env = parseEnvFile(
    [`DATABASE_URL="${NEON}"`, 'BETTER_AUTH_SECRET="[SENSITIVE]"', 'GOOGLE_CLIENT_SECRET=""'].join(
      '\n',
    ),
  );
  const lines = reportLines(env);

  it('names every key the pull returned', () => {
    const text = lines.join('\n');
    for (const key of ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'GOOGLE_CLIENT_SECRET']) {
      expect(text).toContain(key);
    }
  });

  it('classifies each one', () => {
    expect(lines.find((line) => line.includes('DATABASE_URL'))).toContain('present');
    expect(lines.find((line) => line.includes('BETTER_AUTH_SECRET'))).toContain('placeholder');
    expect(lines.find((line) => line.includes('GOOGLE_CLIENT_SECRET'))).toContain('empty');
  });

  // The assertion that makes the report safe to print in a log anyone can read.
  // Not "we intend not to leak" — "no line contains the value".
  it('never prints a value', () => {
    const text = lines.join('\n');
    expect(text).not.toContain(NEON);
    expect(text).not.toContain('np_x9Kq2');
    expect(text).not.toContain('neon.tech');
  });
});

describe('assertPulledEnv', () => {
  const good = [`DATABASE_URL="${LOCAL}"`, 'BETTER_AUTH_SECRET="a-real-secret"'].join('\n');

  it('passes when every required key is usable', () => {
    expect(assertPulledEnv(good, ['DATABASE_URL', 'BETTER_AUTH_SECRET']).ok).toBe(true);
  });

  it('fails naming the key and the cause, not just that something was wrong', () => {
    const result = assertPulledEnv(`DATABASE_URL="${LOCAL}"`, ['BETTER_AUTH_SECRET']);
    expect(result.ok).toBe(false);
    expect(result.failures.map((failure) => failure.key)).toEqual(['BETTER_AUTH_SECRET']);
    expect(result.failures[0].code).toBe('MISSING');
  });

  it('applies the URL rules to DATABASE_URL and presence rules to the rest', () => {
    const result = assertPulledEnv(
      ['DATABASE_URL="not-a-url"', 'BETTER_AUTH_SECRET="fine"'].join('\n'),
      ['DATABASE_URL', 'BETTER_AUTH_SECRET'],
    );
    expect(result.ok).toBe(false);
    expect(result.failures.map((failure) => failure.key)).toEqual(['DATABASE_URL']);
  });

  // The report is the point of this task, so it must survive the failure that
  // makes it interesting. A run that fails without saying what it saw is the
  // state this task exists to end.
  it('reports every key even when it is about to fail', () => {
    const result = assertPulledEnv('BETTER_AUTH_SECRET="[SENSITIVE]"', ['DATABASE_URL']);
    expect(result.ok).toBe(false);
    expect(result.report.join('\n')).toContain('BETTER_AUTH_SECRET');
  });

  it('collects every failure rather than stopping at the first', () => {
    const result = assertPulledEnv('DATABASE_URL="[SENSITIVE]"', [
      'DATABASE_URL',
      'BETTER_AUTH_SECRET',
    ]);
    expect(result.failures.map((failure) => failure.key).sort()).toEqual([
      'BETTER_AUTH_SECRET',
      'DATABASE_URL',
    ]);
  });

  it('never leaks a value through a failure message', () => {
    const result = assertPulledEnv(`DATABASE_URL="psql '${NEON}'"`, ['DATABASE_URL']);
    expect(result.ok).toBe(false);
    const text = [...result.report, ...result.failures.map((failure) => failure.message)].join(
      '\n',
    );
    expect(text).not.toContain('np_x9Kq2');
    expect(text).not.toContain(NEON);
  });
});

// The sweep, in the shape tests/guards/vercel-pull-git-branch.test.ts
// established: a pull whose result nothing checks is the defect, so the check is
// tied to the pull across the whole directory rather than to the two workflows
// this task happens to edit.
describe('every workflow that pulls a Vercel environment', () => {
  const WORKFLOWS_DIR = fromRoot('.github/workflows');
  const INVOCATION = /(?:^|&&|\|\||;|\|)\s*vercel pull\b/;

  interface Step {
    name?: string;
    run?: string;
  }

  const jobsThatPull = readdirSync(WORKFLOWS_DIR)
    .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
    .flatMap((file) => {
      const doc = parse(readFileSync(`${WORKFLOWS_DIR}/${file}`, 'utf8')) as {
        jobs?: Record<string, { steps?: Step[] }>;
      };
      return Object.entries(doc.jobs ?? {})
        .filter(([, job]) =>
          (job.steps ?? []).some((step) =>
            (step.run ?? '').split('\n').some((line) => INVOCATION.test(line.trim())),
          ),
        )
        .map(([job, definition]) => ({ file, job, definition }));
    });

  it('is found by the sweep — deploy.yml and migrate.yml both pull', () => {
    expect(jobsThatPull.map(({ file }) => file).sort()).toEqual(['deploy.yml', 'migrate.yml']);
  });

  it('asserts the pulled environment in the same job', () => {
    for (const { file, job, definition } of jobsThatPull) {
      const runs = (definition.steps ?? []).map((step) => step.run ?? '').join('\n');
      expect(runs, `${file} (${job})`).toContain('assert-pulled-env');
    }
  });

  it('requires BETTER_AUTH_SECRET where the build reads it', () => {
    const deploy = jobsThatPull.find(({ file }) => file === 'deploy.yml');
    const runs = (deploy?.definition.steps ?? []).map((step) => step.run ?? '').join('\n');
    expect(runs).toContain('BETTER_AUTH_SECRET');
  });
});
