import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { fromRoot } from '../support/paths';

// A closed PR's gate run gates nothing, so it is cancelled rather than run
// out, and an edited PR's gate run must not cancel the one in flight, since
// an edit changes nothing the gate checks unless it retargeted the base
// (claude-docs/ci.md, "Aggregating workflows"). Nothing fails if that drifts —
// a dropped trigger or a reordered step only spends CI again, and on a metered
// runner that is a bill. This reads the workflow as data: it proves what the
// file says, not that GitHub evaluates it as written.

interface Step {
  if?: string;
  run?: string;
}

interface Job {
  if?: string;
  needs?: string | string[];
  permissions?: Record<string, string>;
  concurrency?: { group: string; 'cancel-in-progress'?: boolean | string };
  steps?: Step[];
}

interface Workflow {
  on: { pull_request: { types: string[] } };
  concurrency: { group: string; 'cancel-in-progress': boolean | string };
  jobs: Record<string, Job>;
}

/** The first step of `changes`: the one place a run decides not to gate. */
const SELF_CANCEL_IF =
  "github.event.pull_request.state == 'closed' || (github.event.action == 'edited' && github.event.changes.base == null)";

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
  // hotfix's twin PR from the same branch keeps its run. The cancel is an
  // expression rather than `true` because an edit joins the group without
  // cancelling (below); a close, a push and a reopen still cancel.
  it('is started by closing the PR, inside the group that cancels its other runs', () => {
    expect(gate.on.pull_request.types).toEqual(expect.arrayContaining(['closed', 'edited']));
    expect(gate.concurrency.group).toContain('github.event.pull_request.number');
    expect(gate.concurrency['cancel-in-progress']).toBe("${{ github.event.action != 'edited' }}");
  });

  // `edited` fires on a closed PR too, which is how one bulk edit of old PR
  // bodies started 130 gate runs.
  it('cancels itself in the first step of `changes`, before the path filter', () => {
    const first = gate.jobs.changes?.steps?.[0];

    expect(first?.if).toBe(SELF_CANCEL_IF);
    expect(first?.run).toContain('gh run cancel "$GITHUB_RUN_ID"');
    expect(gate.jobs.changes?.permissions?.actions).toBe('write');
  });
});

describe('a gate run for an edited PR', () => {
  // Blacksmith's [code]smith edits every new PR's body a few seconds after it
  // opens, and a person edits a description while the gate runs. Neither
  // changes what the gate checks, so neither may cancel the run in flight:
  // an edit's run waits in the group and cancels itself when its turn comes.
  it('joins the group without cancelling the run in flight', () => {
    expect(gate.concurrency['cancel-in-progress']).toContain("github.event.action != 'edited'");
  });

  // The one edit the gate cares about is a retarget, which the payload
  // reports as `changes.base`; that run goes on to gate against the new base.
  it('cancels itself in `changes` unless the edit retargeted the base', () => {
    expect(gate.jobs.changes?.steps?.[0]?.if).toBe(SELF_CANCEL_IF);
  });

  // What makes cancelling in `changes` enough, on an open PR: a job that had
  // started would leave a cancelled check run under its own name, newer than
  // the real run's, and a required check reads the newest. So nothing starts
  // before `changes` has decided — the builds and gitflow included.
  it('starts no job before `changes` has decided', () => {
    const others = jobs.map(([name]) => name).filter((name) => name !== 'changes');

    expect(others.length).toBeGreaterThan(0);
    for (const name of others) expect(needs(name), `${name} needs changes`).toContain('changes');
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
