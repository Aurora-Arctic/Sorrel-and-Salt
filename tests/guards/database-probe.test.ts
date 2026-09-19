import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { describeConnectionError, probeHints, scrub } from '../../scripts/probe-database';
import { fromRoot } from '../support/paths';

// MB.49 — drizzle-kit fails silently, so a bad DATABASE_URL has no cause.
//
// Staging's migration produced exactly this, and nothing else:
//
//   Using 'postgres' driver for database querying
//   [⣟] applying migrations...
//   ##[error]Process completed with exit code 1.
//
// No error, no code, no message. drizzle-kit catches whatever postgres.js threw
// and exits 1. Reproduced locally, ALL of these produce byte-identical output —
// an unreachable host, a wrong password, `sslmode=require` against a server with
// no TLS, and `channel_binding=require`. Four different fixes, one indi-
// stinguishable failure, which is why MB.45–47 ended on a guess.
//
// So the probe is not a health check. It is the step that makes the difference
// between those four visible, by opening the connection itself and printing the
// driver's own error before drizzle-kit gets a chance to swallow it.
//
// What this file pins is the part that has to be right when it fires: that the
// output NAMES the cause, and that it never carries the credentials. Both are
// asserted against a realistic connection string rather than intended — the
// value is masked in CI, so a message that leaked it would print `***` and be
// exactly as useless as the silence it replaced.

const NEON =
  'postgresql://sorrel:np_x9Kq2@ep-cool-bird-a1b2c3-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';
const PASSWORD = 'np_x9Kq2';

/** A driver error shaped the way postgres.js and Node actually throw them. */
function driverError(fields: Record<string, unknown>): Error {
  return Object.assign(new Error(String(fields.message ?? 'failed')), fields);
}

describe('describeConnectionError', () => {
  // Each of these is a different fix — a firewall, a password, a database name,
  // a URL parameter. Today they are the same spinner frame.
  it.each([
    ['ECONNREFUSED', driverError({ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED' })],
    ['ENOTFOUND', driverError({ code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND' })],
    ['ETIMEDOUT', driverError({ code: 'ETIMEDOUT', message: 'connect ETIMEDOUT' })],
    ['28P01', driverError({ code: '28P01', message: 'password authentication failed' })],
    ['3D000', driverError({ code: '3D000', message: 'database "nope" does not exist' })],
    ['42704', driverError({ code: '42704', message: 'unrecognized configuration parameter' })],
    ['CONNECT_TIMEOUT', driverError({ code: 'CONNECT_TIMEOUT', message: 'write CONNECT_TIMEOUT' })],
  ])('names %s in its output', (code, error) => {
    const described = describeConnectionError(error, NEON);
    expect(described).toContain(code);
  });

  it("carries the driver's own message, not a paraphrase of it", () => {
    const described = describeConnectionError(
      driverError({ code: '28P01', message: 'password authentication failed for user "sorrel"' }),
      NEON,
    );
    expect(described).toContain('password authentication failed for user');
  });

  // The failures that are worth a sentence get one. A code alone still means
  // reading a Postgres error table mid-incident.
  it.each([
    ['42704', /channel_binding|startup parameter|does not consume/i],
    ['28P01', /password|DATABASE_URL_/i],
    ['3D000', /database name|does not exist/i],
    ['ENOTFOUND', /host|hostname/i],
    ['ECONNREFUSED', /reachable|refused|port/i],
  ])('adds an actionable hint for %s', (code, pattern) => {
    expect(probeHints[code]).toBeDefined();
    expect(probeHints[code]).toMatch(pattern);
  });

  it('still reports an error carrying no code at all', () => {
    const described = describeConnectionError(new Error('socket hang up'), NEON);
    expect(described).toContain('socket hang up');
    expect(described.length).toBeGreaterThan(0);
  });

  it('reports a thrown non-Error without crashing on it', () => {
    expect(() => describeConnectionError('just a string', NEON)).not.toThrow();
    expect(describeConnectionError('just a string', NEON)).toContain('just a string');
  });
});

// The whole point of printing the driver's error is that it is the driver's —
// which means it can contain whatever the driver chose to put in it, including
// the connection string it was given. Scrubbing is therefore not belt-and-braces
// around our own formatting; it is the only thing standing between a verbose
// driver and a password in a public log.
describe('scrub', () => {
  it('removes the whole connection string when an error quotes it', () => {
    const scrubbed = scrub(`failed to connect to ${NEON}`, NEON);
    expect(scrubbed).not.toContain(NEON);
    expect(scrubbed).not.toContain(PASSWORD);
  });

  it('removes the password on its own, which is how postgres.js reports auth', () => {
    const scrubbed = scrub(`bad password ${PASSWORD} for sorrel`, NEON);
    expect(scrubbed).not.toContain(PASSWORD);
  });

  it('removes `user:password` as a pair', () => {
    const scrubbed = scrub(`userinfo sorrel:${PASSWORD} rejected`, NEON);
    expect(scrubbed).not.toContain(PASSWORD);
  });

  // Kept deliberately. `ENOTFOUND` without the name it failed to resolve is the
  // same silence this task exists to end, and a hostname is not a credential —
  // `claude-docs/secrets.md` names the Neon endpoints in prose already.
  it('keeps the hostname, without which ENOTFOUND says nothing', () => {
    const scrubbed = scrub(
      'getaddrinfo ENOTFOUND ep-cool-bird-a1b2c3-pooler.us-east-2.aws.neon.tech',
      NEON,
    );
    expect(scrubbed).toContain('ep-cool-bird-a1b2c3-pooler');
  });

  it('leaves a message that never mentioned the URL untouched', () => {
    expect(scrub('connect ECONNREFUSED 10.0.0.1:5432', NEON)).toBe(
      'connect ECONNREFUSED 10.0.0.1:5432',
    );
  });

  it('survives a URL it cannot parse rather than throwing', () => {
    expect(() => scrub('anything at all', 'not-a-url')).not.toThrow();
  });

  it('survives an undefined URL', () => {
    expect(() => scrub('anything at all', undefined)).not.toThrow();
  });
});

// The no-leak property, asserted end to end rather than per-helper: whatever
// the driver threw, what comes out carries no credential.
describe('describeConnectionError never leaks the credentials', () => {
  it.each([
    ['an error quoting the whole URL', `could not connect using ${NEON}`],
    ['an error quoting the password', `authentication failed with ${PASSWORD}`],
    ['an error quoting the userinfo', `rejected sorrel:${PASSWORD}`],
  ])('%s', (_label, message) => {
    const described = describeConnectionError(driverError({ code: '28P01', message }), NEON);
    expect(described).not.toContain(PASSWORD);
    expect(described).not.toContain(NEON);
  });
});

// The sweep. MB.46's assertion covered the file `vercel pull` wrote; MB.47 then
// took DATABASE_URL from a GitHub secret instead and handed it straight to
// drizzle-kit, reopening the gap one task after it was closed. So the guard is
// not "the probe exists" but "every job that runs a migration or a build probes
// first" — which is the form that catches the next workflow in the diff that
// adds it rather than in the outage that follows it.
describe('every workflow that consumes DATABASE_URL', () => {
  const WORKFLOWS = fromRoot('.github/workflows');

  interface Step {
    name?: string;
    run?: string;
    if?: string;
    with?: Record<string, unknown>;
  }
  interface Job {
    steps?: Step[];
  }

  function workflow(file: string): { jobs?: Record<string, Job> } {
    return parse(readFileSync(fromRoot('.github/workflows', file), 'utf8')) as {
      jobs?: Record<string, Job>;
    };
  }

  const PROBE = /probe-database\.ts/;
  const MIGRATE = /npm run db:migrate|drizzle-kit migrate/;
  const BUILD = /vercel build/;

  function jobsRunning(pattern: RegExp): { file: string; job: string; steps: Step[] }[] {
    const found: { file: string; job: string; steps: Step[] }[] = [];

    for (const file of readdirSync(WORKFLOWS).filter((f) => f.endsWith('.yml'))) {
      const jobs = workflow(file).jobs ?? {};
      for (const [job, definition] of Object.entries(jobs)) {
        const steps = definition.steps ?? [];
        if (steps.some((step) => pattern.test(step.run ?? ''))) found.push({ file, job, steps });
      }
    }

    return found;
  }

  it('is found by the sweep — a migrating job and a building job both exist', () => {
    expect(jobsRunning(MIGRATE).map((j) => j.file)).toEqual(['migrate.yml']);
    expect(jobsRunning(BUILD).map((j) => j.file)).toEqual(['deploy.yml']);
  });

  it.each([
    ['migrates', MIGRATE],
    ['builds', BUILD],
  ])('probes the connection before it %s', (_label, consumer) => {
    for (const { file, job, steps } of jobsRunning(consumer)) {
      const probeAt = steps.findIndex((step) => PROBE.test(step.run ?? ''));
      const consumerAt = steps.findIndex((step) => consumer.test(step.run ?? ''));

      expect(probeAt, `${file}:${job} runs no probe`).toBeGreaterThanOrEqual(0);
      expect(probeAt, `${file}:${job} probes after it consumes the URL`).toBeLessThan(consumerAt);
    }
  });

  // MB.49 acceptance criterion 2. The value drizzle-kit receives is the one
  // `Resolve DATABASE_URL` picked, which may be a GitHub secret rather than
  // anything the pull returned — so the validator has to see THAT value, not
  // only the pulled file. The probe reads a file it is pointed at, so what this
  // asserts is that the file it is pointed at in the migrating job is the
  // resolved one.
  it('validates the resolved DATABASE_URL, not only the pulled file', () => {
    const [migrating] = jobsRunning(MIGRATE);
    const resolve = migrating.steps.find((step) => /Resolve DATABASE_URL/.test(step.name ?? ''));
    expect(resolve, 'migrate.yml no longer resolves DATABASE_URL').toBeDefined();

    // It writes the resolved value somewhere the probe can read it...
    expect(resolve?.run).toMatch(/RESOLVED_ENV_FILE|resolved\.env/);

    // ...and the probe is pointed at that, rather than at `.vercel/.env.*`.
    const probe = migrating.steps.find((step) => PROBE.test(step.run ?? ''));
    expect(probe?.run).toMatch(/RESOLVED_ENV_FILE|resolved\.env/);
    expect(probe?.run).not.toMatch(/\.vercel\/\.env/);
  });

  // A probe that warns and carries on would leave the migration exactly as
  // silent as it is today. In the build job it is advisory by design — a build
  // issues no query, and failing a deploy on a transient network blip trades one
  // outage for another — so the two are asserted apart rather than together.
  it('is fatal in the migrating job and advisory in the building one', () => {
    const [migrating] = jobsRunning(MIGRATE);
    const [building] = jobsRunning(BUILD);

    const migrateProbe = migrating.steps.find((step) => PROBE.test(step.run ?? ''));
    const buildProbe = building.steps.find((step) => PROBE.test(step.run ?? ''));

    expect(migrateProbe?.run).not.toMatch(/--on-failure[= ]warn/);
    expect(buildProbe?.run).toMatch(/--on-failure[= ]warn/);
  });

  // Same discipline as MB.46: the URL reaches the script as a FILE PATH. argv is
  // visible to `ps` and is echoed by `set -x`, and a step-level `env:` carrying
  // the value would be printed in the step's own env block.
  it('never passes the connection string on the command line', () => {
    for (const { steps } of [...jobsRunning(MIGRATE), ...jobsRunning(BUILD)]) {
      const probe = steps.find((step) => PROBE.test(step.run ?? ''));
      expect(probe?.run).toMatch(/--file/);
      expect(probe?.run).not.toMatch(/--url|postgres:\/\/|postgresql:\/\//);
    }
  });
});
