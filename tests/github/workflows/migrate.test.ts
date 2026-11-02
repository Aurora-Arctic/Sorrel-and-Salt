import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { fromRoot } from '../../support/paths';

// Runs the production snapshot step's own script under bash, with a stub `curl` first on PATH
// standing in for the Neon API, so what the step does on a rerun is checked without a Neon project.

const SHA = 'abc1234def5678';
const SNAPSHOT = 'snapshot-abc1234';

interface Step {
  id?: string;
  run?: string;
}

function snapshotScript(): string {
  const workflow = parse(readFileSync(fromRoot('.github/workflows/migrate.yml'), 'utf8')) as {
    jobs: Record<string, { steps: Step[] }>;
  };
  const step = Object.values(workflow.jobs)
    .flatMap((job) => job.steps)
    .find((candidate) => candidate.id === 'snapshot');
  if (!step?.run) throw new Error('migrate.yml has no step with id "snapshot"');
  return step.run;
}

// Answers GET with $STUB_BRANCHES; answers POST with $STUB_POST_BODY, failing with curl's HTTP
// error exit (22) when $STUB_POST_FAILS is set. Like real curl, a failure prints the body only
// under --fail-with-body. Every call's arguments are appended to $STUB_CALLS.
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
  writeFileSync(join(dir, 'step.sh'), snapshotScript());
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
