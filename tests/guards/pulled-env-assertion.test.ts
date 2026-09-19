import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import {
  assertPulledEnv,
  CLIENT_ONLY_PARAMS,
  classify,
  parseEnvFile,
  PLACEHOLDERS,
  reportLines,
  validateDatabaseUrl,
} from '../../scripts/assert-pulled-env';
import { fromRoot } from '../support/paths';

// What the pulled environment file has to satisfy before CI trusts it
// (claude-docs/ci.md, "Deploy"). Two things are pinned: a required key that
// is missing, empty, a placeholder or not a postgres URL fails with its own
// named cause; and every key the pull returned is reported with a
// classification and never a value — asserted, not intended.

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

  // The value is masked in CI, so an error carrying it reads `***`. Every
  // message describes shape, and none may quote what it rejected — even when
  // that is a real connection string wearing a wrapper.
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

  // A placeholder is not transient and a retry cannot fix it; the message has
  // to say so.
  it('explains that a placeholder is unreadable by design', () => {
    const verdict = validateDatabaseUrl('[SENSITIVE]');
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.message).toMatch(/sensitive/i);
    expect(verdict.message).toMatch(/design|cannot be read|retry/i);
  });
});

// postgres.js consumes `sslmode` and the keys in its own `defaults`, then
// forwards every remaining query parameter verbatim as a startup parameter;
// the server answers `42704 unrecognized configuration parameter` and
// drizzle-kit swallows it. Neon's console adds `channel_binding=require` by
// default, so this is the difference between a migration that fails saying
// nothing and one that names a parameter you can delete.
describe('validateDatabaseUrl — libpq client-only parameters', () => {
  it('rejects the `channel_binding=require` Neon hands out by default', () => {
    const verdict = validateDatabaseUrl(`${NEON}&channel_binding=require`);
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.code).toBe('CLIENT_ONLY_PARAM');
    expect(verdict.message).toContain('channel_binding');
  });

  // postgres.js forwards the parameter whatever its value, so the server
  // rejects the NAME; a rule matching only `=require` would pass a URL that
  // fails identically.
  it.each(['require', 'disable', 'prefer'])(
    'rejects channel_binding=%s — the name is what Postgres refuses',
    (value) => {
      const verdict = validateDatabaseUrl(`${NEON}&channel_binding=${value}`);
      expect(verdict.ok).toBe(false);
    },
  );

  it('names the error the server actually returns, so the log is searchable', () => {
    const verdict = validateDatabaseUrl(`${NEON}&channel_binding=require`);
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.message).toContain('42704');
  });

  // `sslmode` is the one TLS parameter postgres.js DOES consume (mapped to
  // `ssl`), so a URL carrying it alone must stay valid.
  it('accepts `sslmode=require` alone — postgres.js consumes that one', () => {
    expect(validateDatabaseUrl(NEON)).toEqual({ ok: true });
    expect(validateDatabaseUrl(`${LOCAL}?sslmode=disable`)).toEqual({ ok: true });
  });

  it('accepts a URL with no query string at all', () => {
    expect(validateDatabaseUrl(LOCAL)).toEqual({ ok: true });
  });

  // Every member of the list is the same defect; the list is exported so it
  // can be pinned rather than duplicated as a literal.
  it.each(CLIENT_ONLY_PARAMS)('rejects `%s`, which postgres.js also forwards', (param) => {
    const verdict = validateDatabaseUrl(`${NEON}&${param}=something`);
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.code).toBe('CLIENT_ONLY_PARAM');
    expect(verdict.message).toContain(param);
  });

  it('does not name a parameter the URL does not carry', () => {
    const verdict = validateDatabaseUrl(`${NEON}&channel_binding=require`);
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.message).not.toContain('passfile');
  });

  // The parameter name is safe to print; the credentials beside it are not.
  it('never quotes the value it rejected', () => {
    const verdict = validateDatabaseUrl(`${NEON}&channel_binding=require`);
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.message).not.toContain('np_x9Kq2');
    expect(verdict.message).not.toContain('ep-cool-bird');
  });

  // A value both quoted and carrying the parameter is an extraction fault
  // first; reporting the inner defect of an outer one sends you to the wrong file.
  it('reports UNTRIMMED ahead of the parameter it wraps', () => {
    const verdict = validateDatabaseUrl(`"${NEON}&channel_binding=require"`);
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.code).toBe('UNTRIMMED');
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

  // Not "we intend not to leak" — no line contains the value.
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

  // The report must survive the failure that makes it interesting.
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

// The sweep: a pull whose result nothing checks is the defect, so the check is
// tied to every pull in the directory rather than to two named workflows.
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
