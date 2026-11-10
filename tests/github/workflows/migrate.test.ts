import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { fromRoot } from '../../support/paths';

const SHA = 'abc1234def5678';
const SNAPSHOT = 'snapshot-abc1234';

interface Step {
  id?: string;
  run?: string;
}

function stepScript(id: string): string {
  const workflow = parse(readFileSync(fromRoot('.github/workflows/migrate.yml'), 'utf8')) as {
    jobs: Record<string, { steps: Step[] }>;
  };
  const step = Object.values(workflow.jobs)
    .flatMap((job) => job.steps)
    .find((candidate) => candidate.id === id);
  if (!step?.run) throw new Error(`migrate.yml has no step with id "${id}"`);
  return step.run;
}

// Like real curl, a failure prints the body only under --fail-with-body.
const STUB_CURL = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$STUB_CALLS"
if [[ " $* " == *" POST "* ]]; then
  if [ -n "$STUB_POST_FAILS" ]; then
    [[ " $* " == *" --fail-with-body "* ]] && printf '%s' "$STUB_POST_BODY"
    exit 22
  fi
  printf '%s' "$STUB_POST_BODY"
else
  printf '%s' "$STUB_BRANCHES"
fi
`;

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'migrate-snapshot-'));
  writeFileSync(join(dir, 'curl'), STUB_CURL);
  chmodSync(join(dir, 'curl'), 0o755);
  writeFileSync(join(dir, 'step.sh'), stepScript('snapshot'));
  writeFileSync(join(dir, 'output'), '');
  writeFileSync(join(dir, 'calls'), '');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function runStep(stub: { branches: string[]; postFails?: boolean; postBody?: string }) {
  const result = spawnSync('bash', ['-e', join(dir, 'step.sh')], {
    cwd: dir,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${dir}:${process.env.PATH}`,
      GITHUB_SHA: SHA,
      GITHUB_OUTPUT: join(dir, 'output'),
      NEON_API_KEY: 'test-key',
      NEON_PROJECT_ID: 'test-project',
      STUB_CALLS: join(dir, 'calls'),
      STUB_BRANCHES: JSON.stringify({
        branches: stub.branches.map((name, index) => ({ name, id: `br-${index}` })),
      }),
      STUB_POST_FAILS: stub.postFails ? '1' : '',
      STUB_POST_BODY: stub.postBody ?? '{"branch":{}}',
    },
  });
  const calls = readFileSync(join(dir, 'calls'), 'utf8').split('\n').filter(Boolean);
  return {
    status: result.status,
    log: result.stdout + result.stderr,
    output: readFileSync(join(dir, 'output'), 'utf8'),
    posts: calls.filter((call) => / POST /.test(` ${call} `)),
  };
}

describe('the production snapshot step', () => {
  it('keeps the snapshot an earlier attempt at the same commit created, creating no branch', () => {
    // Neon refuses a second branch of the same name, which is how a rerun used to fail.
    const run = runStep({
      branches: ['main', SNAPSHOT],
      postFails: true,
      postBody: '{"message":"branch already exists"}',
    });

    expect(run.status).toBe(0);
    expect(run.posts).toEqual([]);
    expect(run.output).toContain('verb=Kept');
    expect(run.output).toContain(`branch_name=${SNAPSHOT}`);
  });

  it('creates the snapshot from main when none exists for the commit', () => {
    const run = runStep({ branches: ['main', 'snapshot-0000000'] });

    expect(run.status).toBe(0);
    expect(run.posts).toHaveLength(1);
    expect(run.posts[0]).toContain(`"name": "${SNAPSHOT}"`);
    expect(run.posts[0]).toContain('"parent_id": "br-0"');
    expect(run.output).toContain('verb=Created');
  });

  it("fails with Neon's error message in the log when Neon refuses the snapshot", () => {
    const run = runStep({
      branches: ['main'],
      postFails: true,
      postBody: '{"message":"branches limit exceeded"}',
    });

    expect(run.posts).toHaveLength(1);
    expect(run.status).not.toBe(0);
    expect(run.log).toContain('branches limit exceeded');
  });
});

const STUB_NPM = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$STUB_CALLS"
calls=$(wc -l < "$STUB_CALLS")
if [ "$calls" -le "$STUB_FAILURES" ]; then
  echo "migration attempt $calls failed"
  exit 1
fi
echo "migrations applied"
`;

const STUB_SLEEP = `#!/usr/bin/env bash
printf '%s\\n' "$1" >> "$STUB_SLEEPS"
`;

function runMigrateStep(failures: number) {
  const migrateDir = mkdtempSync(join(tmpdir(), 'migrate-retry-'));
  try {
    for (const [name, body] of [
      ['npm', STUB_NPM],
      ['sleep', STUB_SLEEP],
    ]) {
      writeFileSync(join(migrateDir, name), body);
      chmodSync(join(migrateDir, name), 0o755);
    }
    writeFileSync(join(migrateDir, 'step.sh'), stepScript('migrate'));
    writeFileSync(join(migrateDir, 'calls'), '');
    writeFileSync(join(migrateDir, 'sleeps'), '');
    // `bash -e`, as GitHub runs a `run:` step.
    const result = spawnSync('bash', ['-e', join(migrateDir, 'step.sh')], {
      cwd: migrateDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${migrateDir}:${process.env.PATH}`,
        STUB_CALLS: join(migrateDir, 'calls'),
        STUB_SLEEPS: join(migrateDir, 'sleeps'),
        STUB_FAILURES: String(failures),
      },
    });
    const lines = (file: string) =>
      readFileSync(join(migrateDir, file), 'utf8').split('\n').filter(Boolean);
    return {
      status: result.status,
      attempts: lines('calls'),
      sleeps: lines('sleeps').map(Number),
      log: readFileSync(join(migrateDir, 'migrate.log'), 'utf8'),
    };
  } finally {
    rmSync(migrateDir, { recursive: true, force: true });
  }
}

describe('the migrate step', () => {
  it('migrates once when the first attempt succeeds', () => {
    const run = runMigrateStep(0);

    expect(run.status).toBe(0);
    expect(run.attempts).toEqual(['run db:migrate']);
    expect(run.sleeps).toEqual([]);
  });

  it('retries a failed attempt after a growing wait and succeeds when a later attempt does', () => {
    const run = runMigrateStep(2);

    expect(run.status).toBe(0);
    expect(run.attempts).toHaveLength(3);
    expect(run.sleeps).toHaveLength(2);
    expect(run.sleeps[1]).toBeGreaterThan(run.sleeps[0]);
    expect(run.log).toContain('migration attempt 1 failed');
    expect(run.log).toContain('migrations applied');
  });

  it('fails the step once every attempt has failed, with no wait after the last', () => {
    const run = runMigrateStep(99);

    expect(run.status).not.toBe(0);
    expect(run.attempts).toHaveLength(3);
    expect(run.sleeps).toHaveLength(2);
  });
});
