import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { fromRoot } from '../support/paths';

// A closed PR's gate run gates nothing, so it is cancelled rather than run
// out (claude-docs/ci.md, "Aggregating workflows"). Nothing fails if that
// drifts — a dropped trigger or a reordered step only spends CI again, and on
// a metered runner that is a bill. This reads the workflow as data: it proves
// what the file says, not that GitHub evaluates it as written.

interface Step {
  if?: string;
  run?: string;
}

interface Job {
  if?: string;
  needs?: string | string[];
  permissions?: Record<string, string>;
  concurrency?: { group: string; 'cancel-in-progress'?: boolean };
  steps?: Step[];
}

interface Workflow {
  on: { pull_request: { types: string[] } };
  concurrency: { group: string; 'cancel-in-progress': boolean };
  jobs: Record<string, Job>;
}

const gate = parse(readFileSync(fromRoot('.github/workflows/pr-gate.yml'), 'utf8')) as Workflow;
const jobs = Object.entries(gate.jobs);

function needs(name: string): string[] {
  const value = gate.jobs[name]?.needs ?? [];
  return typeof value === 'string' ? [value] : value;
}

describe('pr-gate.yml', () => {
  // The header's rule: a job-level `if:` renames a required check, so every
  // job runs and skips through its inputs instead.
  it('carries no job-level `if:`', () => {
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs.filter(([, job]) => job.if !== undefined).map(([name]) => name)).toEqual([]);
  });
});

describe('a gate run for a closed PR', () => {
  // Closing a PR starts a run in that PR's group, and joining the group is
  // what cancels the PR's queued and running gate runs — by PR number, so a
  // hotfix's twin PR from the same branch keeps its run.
  it('is started by closing the PR, inside the group that cancels its other runs', () => {
    expect(gate.on.pull_request.types).toEqual(expect.arrayContaining(['closed', 'edited']));
    expect(gate.concurrency.group).toContain('github.event.pull_request.number');
    expect(gate.concurrency['cancel-in-progress']).toBe(true);
  });

  // `edited` fires on a closed PR too, which is how one bulk edit of old PR
  // bodies started 130 gate runs.
  it('cancels itself in the first step of `changes`, before the path filter', () => {
    const first = gate.jobs.changes?.steps?.[0];

    expect(first?.if).toBe("github.event.pull_request.state == 'closed'");
    expect(first?.run).toContain('gh run cancel "$GITHUB_RUN_ID"');
    expect(gate.jobs.changes?.permissions?.actions).toBe('write');
  });

  // What makes cancelling in `changes` enough: nothing that runs a check can
  // start before it.
  it.each(['checks', 'vitest', 'playwright'])('holds `%s` behind `changes`', (name) => {
    expect(needs(name)).toContain('changes');
  });
});

describe('the image builds', () => {
  // The workflow's group cancels the whole run whatever a job's own group
  // says, so `false` on a job claims a protection it cannot give.
  it('carry no job-level group that claims to survive cancellation', () => {
    const uncancellable = jobs.filter(
      ([, job]) => job.concurrency?.['cancel-in-progress'] === false,
    );

    expect(uncancellable.map(([name]) => name)).toEqual([]);
  });
});
