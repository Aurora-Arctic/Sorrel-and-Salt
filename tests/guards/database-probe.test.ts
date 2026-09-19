import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { describeConnectionError, probeHints, scrub } from '../../scripts/probe-database';
import { fromRoot } from '../support/paths';

// drizzle-kit swallows the driver's error and exits 1, so an unreachable host,
// a wrong password, an `sslmode` mismatch and a `channel_binding` parameter
// fail identically; the probe opens the connection itself and prints the
// driver's own error first (claude-docs/ci.md, "Deploy"). What this file pins
// is that the output NAMES the cause and never carries the credentials — the
// value is masked in CI, so a message that leaked it would print `***`.

const NEON =
  'postgresql://sorrel:np_x9Kq2@ep-cool-bird-a1b2c3-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';
const PASSWORD = 'np_x9Kq2';

/** A driver error shaped the way postgres.js and Node actually throw them. */
function driverError(fields: Record<string, unknown>): Error {
  return Object.assign(new Error(String(fields.message ?? 'failed')), fields);
}

describe('describeConnectionError', () => {
  // Each is a different fix — a firewall, a password, a database name, a URL parameter.
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

  // A code alone still means reading a Postgres error table mid-incident.
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

// The driver's message can contain whatever the driver chose to put in it,
// including the connection string it was given; scrubbing is the only thing
// between a verbose driver and a password in a public log.
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

  // Kept deliberately: `ENOTFOUND` without the name it failed to resolve says
  // nothing, and a hostname is not a credential.
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

// The no-leak property end to end: whatever the driver threw, nothing that
// comes out carries a credential.
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

// The sweep: every job that migrates or builds probes first, so the next
// workflow fails in the diff that adds it rather than in the outage after it.
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

  // drizzle-kit receives the value `Resolve DATABASE_URL` picked — possibly a
  // GitHub secret, not anything the pull returned — so the probe in the
  // migrating job must be pointed at the resolved file, not `.vercel/.env.*`.
  it('validates the resolved DATABASE_URL, not only the pulled file', () => {
    const [migrating] = jobsRunning(MIGRATE);
    const resolve = migrating.steps.find((step) => /Resolve DATABASE_URL/.test(step.name ?? ''));
    expect(resolve, 'migrate.yml no longer resolves DATABASE_URL').toBeDefined();

    expect(resolve?.run).toMatch(/RESOLVED_ENV_FILE|resolved\.env/);

    const probe = migrating.steps.find((step) => PROBE.test(step.run ?? ''));
    expect(probe?.run).toMatch(/RESOLVED_ENV_FILE|resolved\.env/);
    expect(probe?.run).not.toMatch(/\.vercel\/\.env/);
  });

  // A probe that warned would leave the migration as silent as before; in the
  // build job it is advisory — a build issues no query, and failing a deploy on
  // a transient blip trades one outage for another.
  it('is fatal in the migrating job and advisory in the building one', () => {
    const [migrating] = jobsRunning(MIGRATE);
    const [building] = jobsRunning(BUILD);

    const migrateProbe = migrating.steps.find((step) => PROBE.test(step.run ?? ''));
    const buildProbe = building.steps.find((step) => PROBE.test(step.run ?? ''));

    expect(migrateProbe?.run).not.toMatch(/--on-failure[= ]warn/);
    expect(buildProbe?.run).toMatch(/--on-failure[= ]warn/);
  });

  // The URL reaches the script as a FILE PATH: argv is visible to `ps` and
  // echoed by `set -x`, and a step-level `env:` is printed in the step's own env block.
  it('never passes the connection string on the command line', () => {
    for (const { steps } of [...jobsRunning(MIGRATE), ...jobsRunning(BUILD)]) {
      const probe = steps.find((step) => PROBE.test(step.run ?? ''));
      expect(probe?.run).toMatch(/--file/);
      expect(probe?.run).not.toMatch(/--url|postgres:\/\/|postgresql:\/\//);
    }
  });
});
