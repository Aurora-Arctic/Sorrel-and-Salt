import { describe, expect, it } from 'vitest';

import {
  assertPulledEnv,
  parseEnvFile,
  reportLines,
  validateDatabaseUrl,
} from '../../scripts/assert-pulled-env';

// What CI prints about a pulled Vercel environment never carries a value
// (claude-docs/ci/deploy.md, "Deploy"): a secret in a public repo's logs is
// the one failure of this script an operator cannot take back. The value is
// masked in CI, so a message quoting it would read `***` there and leak it
// anywhere else.

const NEON =
  'postgresql://sorrel:np_x9Kq2@ep-cool-bird-a1b2c3-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';
const LOCAL = 'postgres://sorrel:sorrel@postgres:5432/sorrel';

describe('no secret reaches the log', () => {
  it.each([
    ['a quoted Neon URL', `"${NEON}"`, 'np_x9Kq2'],
    ['a psql-wrapped local URL', `psql '${LOCAL}'`, 'sorrel:sorrel'],
    ['a leading-space Neon URL', ` ${NEON}`, 'neon.tech'],
  ])('never quotes the URL it rejected — %s', (_label, raw, secret) => {
    const verdict = validateDatabaseUrl(raw);
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.message).not.toContain(secret);
    expect(verdict.message).not.toContain(raw);
  });

  // The parameter name is safe to print; the credentials beside it are not.
  it('never quotes the credentials beside a client-only parameter it rejected', () => {
    const verdict = validateDatabaseUrl(`${NEON}&channel_binding=require`);
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.message).not.toContain('np_x9Kq2');
    expect(verdict.message).not.toContain('ep-cool-bird');
  });

  it('never prints a value in the per-key report', () => {
    const lines = reportLines(
      parseEnvFile([`DATABASE_URL="${NEON}"`, 'BETTER_AUTH_SECRET="[SENSITIVE]"'].join('\n')),
    );
    // Precondition: the report names the key whose value it must not print.
    expect(lines.some((line) => line.includes('DATABASE_URL'))).toBe(true);

    const text = lines.join('\n');
    expect(text).not.toContain(NEON);
    expect(text).not.toContain('np_x9Kq2');
    expect(text).not.toContain('neon.tech');
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
