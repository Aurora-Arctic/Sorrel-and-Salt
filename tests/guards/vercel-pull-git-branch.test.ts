import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { fromRoot } from '../support/paths';

// MB.27 — `vercel pull` only resolves branch-scoped environment variables when
// it is told which branch it is resolving for. Without `--git-branch`, a push
// to `staging` pulls the Preview-wide `DATABASE_URL` the Neon integration
// injects rather than the branch-scoped override pinned to `staging` — which
// is the entire mechanism keeping staging's database out of the pool of
// per-deployment ephemeral ones (claude-docs/design-decisions/
// m1.1-neon-branch-strategy.md).
//
// Nothing fails when the flag is missing. The pull succeeds, the deploy
// succeeds, and the build simply talks to the wrong database — so this is a
// guard rather than a test of behaviour: the mechanism can only be made
// *absent*, never impossible (CLAUDE.md's sweep-task rule). The sweep below is
// deliberately over the whole workflow directory rather than the two files
// this task edits, because the next `vercel pull` to be added is exactly where
// the flag gets dropped again.

interface Step {
  name?: string;
  run?: string;
  env?: Record<string, string>;
}

interface Job {
  outputs?: Record<string, string>;
  steps?: Step[];
  with?: Record<string, string | boolean>;
}

interface Workflow {
  on?: { workflow_call?: { inputs?: Record<string, { required?: boolean; type?: string }> } };
  jobs: Record<string, Job>;
}

const WORKFLOWS_DIR = fromRoot('.github/workflows');

function workflow(file: string): Workflow {
  return parse(readFileSync(`${WORKFLOWS_DIR}/${file}`, 'utf8')) as Workflow;
}

function stepNamed(job: Job, name: string): Step {
  const step = job.steps?.find((candidate) => candidate.name === name);
  if (!step) throw new Error(`no step named "${name}"`);
  return step;
}

/**
 * A line that *runs* `vercel pull` — at the start of a command, or after a
 * shell operator. `migrate.yml` also mentions the command inside an `echo`,
 * and an error message is not an invocation.
 */
const INVOCATION = /(?:^|&&|\|\||;|\|)\s*vercel pull\b/;

/** Every `run:` line that invokes `vercel pull`, across every workflow. */
function everyVercelPull(): { file: string; job: string; command: string }[] {
  return readdirSync(WORKFLOWS_DIR)
    .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
    .flatMap((file) =>
      Object.entries(workflow(file).jobs ?? {}).flatMap(([job, definition]) =>
        (definition.steps ?? [])
          .flatMap((step) => (step.run ?? '').split('\n'))
          .map((line) => line.trim())
          .filter((line) => INVOCATION.test(line))
          .map((command) => ({ file, job, command })),
      ),
    );
}

describe('every `vercel pull` in CI', () => {
  const pulls = everyVercelPull();

  // The precondition for the assertion below: the sweep actually found the
  // pulls it claims to be checking. Without this, a rename of `run:` or a move
  // of the deploy steps would empty the list and leave the suite green.
  it('is found by the sweep — deploy.yml and migrate.yml both pull', () => {
    expect(pulls.map(({ file }) => file).sort()).toEqual(['deploy.yml', 'migrate.yml']);
  });

  it.each(pulls)('names the branch it is resolving for ($file, $job)', ({ command }) => {
    expect(command).toContain('--git-branch=');
  });

  // A hardcoded branch would satisfy the assertion above and still pull the
  // wrong variables for two of the three deploy targets. The value is either a
  // workflow expression or a shell variable the step's `env:` defines — the
  // two forms the steps below are asserted against individually.
  it.each(pulls)('takes that branch from the resolved target ($file, $job)', ({ command }) => {
    expect(command).toMatch(/--git-branch="?(\$\{\{|\$[A-Z_]+)/);
  });
});

describe('deploy.yml resolve-target', () => {
  const job = workflow('deploy.yml').jobs['resolve-target'];
  const script = stepNamed(job, 'Resolve deploy target').run ?? '';

  it('publishes the branch being deployed as an output', () => {
    expect(job.outputs).toHaveProperty('git_branch');
    expect(job.outputs?.git_branch).toContain('steps.target.outputs.git_branch');
  });

  // Each arm of the resolver answers for one deploy target, and a target
  // without a branch pulls Preview-wide variables — so the two must be written
  // together or not at all.
  it('answers with a branch in every arm that answers with an environment', () => {
    const environments = script.match(/echo "environment=/g) ?? [];
    const branches = script.match(/echo "git_branch=/g) ?? [];

    expect(environments.length).toBeGreaterThan(1);
    expect(branches).toHaveLength(environments.length);
  });

  // `github.ref_name` on a pull_request is the PR's merge ref (`123/merge`),
  // which is not a branch anything is scoped to; the deployed branch is the
  // head.
  it('uses the head branch for a hotfix PR and the pushed branch otherwise', () => {
    expect(script).toMatch(/git_branch=\$?\{?HEAD_REF\}?/);
    expect(script).toMatch(/git_branch=\$?\{?REF_NAME\}?/);
  });

  it('has both refs available to it', () => {
    expect(script).toBeTruthy();
    const step = stepNamed(job, 'Resolve deploy target') as Step & {
      env?: Record<string, string>;
    };
    expect(step.env).toMatchObject({
      REF_NAME: '${{ github.ref_name }}',
      HEAD_REF: '${{ github.head_ref }}',
    });
  });
});

describe('deploy.yml', () => {
  const deploy = workflow('deploy.yml');
  const step = stepNamed(deploy.jobs.deploy, 'Pull Vercel environment');
  const pull = step.run ?? '';

  // Through `env:` and quoted, not interpolated into the command: a branch
  // name may legally contain `$`, a backtick or a `;`, and a hotfix branch's
  // name reaches this step from a pull request.
  it('pulls for the branch resolve-target named', () => {
    expect(pull).toContain('--git-branch="$GIT_BRANCH"');
    expect(step.env?.GIT_BRANCH).toBe('${{ needs.resolve-target.outputs.git_branch }}');
  });

  // The precondition: this is still the real pull step, environment and all —
  // not a step that has lost its `--environment` and would pull development
  // variables while passing the assertion above.
  it('still pulls for the resolved environment', () => {
    expect(pull).toContain('--environment=${{ needs.resolve-target.outputs.environment }}');
  });

  // The other half of the same defect. `vercel pull --git-branch` fixes what
  // the *build* sees; the deployment's own environment is resolved from its
  // branch association, which the CLI infers from the checkout — and
  // actions/checkout leaves a detached HEAD, which has none. Without the
  // metadata the running app reads the Preview-wide DATABASE_URL however the
  // build was pulled, so this is not decoration either.
  describe('the deploy itself', () => {
    const step = stepNamed(deploy.jobs.deploy, 'Deploy');
    const command = step.run ?? '';

    it('tells Vercel which branch the deployment belongs to', () => {
      expect(command).toContain('--meta githubDeployment=1');
      expect(command).toContain('--meta githubCommitRef="$GIT_BRANCH"');
      expect(step.env?.GIT_BRANCH).toBe('${{ needs.resolve-target.outputs.git_branch }}');
    });

    // The precondition: this is still the prebuilt deploy, so the assertion
    // above is about the command that actually ships the build.
    it('is still the prebuilt deploy', () => {
      expect(command).toContain('vercel deploy --prebuilt');
    });
  });

  // M1.1's "Cross-task impact": migrate must resolve DATABASE_URL the same way
  // deploy does, or the migration runs against one database and the deploy
  // serves another.
  it('hands the same branch to migrate.yml', () => {
    expect(deploy.jobs.migrate.with).toMatchObject({
      environment: '${{ needs.resolve-target.outputs.environment }}',
      'git-branch': '${{ needs.resolve-target.outputs.git_branch }}',
    });
  });
});

describe('migrate.yml', () => {
  const migrate = workflow('migrate.yml');
  const inputs = migrate.on?.workflow_call?.inputs ?? {};
  const step = stepNamed(migrate.jobs.migrate, 'Pull Vercel environment');
  const pull = step.run ?? '';

  // Required rather than defaulted: a caller that forgets it should fail to
  // start, not quietly migrate whatever branch-agnostic DATABASE_URL comes
  // back.
  it('requires its caller to name the branch', () => {
    expect(inputs['git-branch']).toMatchObject({ required: true, type: 'string' });
  });

  it('pulls for that branch', () => {
    expect(pull).toContain('--git-branch="$GIT_BRANCH"');
    expect(step.env?.GIT_BRANCH).toBe('${{ inputs.git-branch }}');
  });

  it('still pulls for the environment it was given', () => {
    expect(pull).toContain('--environment=${{ inputs.environment }}');
  });
});
