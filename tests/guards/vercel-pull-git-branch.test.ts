import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { fromRoot } from '../support/paths';

// Every preview `vercel pull` passes `--git-branch`, and no production one
// does (claude-docs/ci.md, "Deploy"). Without the flag nothing fails: the pull
// succeeds, the deploy succeeds, and staging quietly builds against the
// Preview-wide `DATABASE_URL` rather than its branch-scoped override. With it
// on production the API rejects the pull outright. So each workflow pulls
// through two steps, one per target, selected by a YAML `if:` this test can
// read as data — it proves the two conditions are paired with their flags,
// not that GitHub evaluates them as written.

interface Step {
  name?: string;
  /** Ties an invocation to the one target its flags are legal on. */
  if?: string;
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
 * A line that *runs* `vercel pull` — at the start of a command or after a
 * shell operator; `migrate.yml` also mentions it inside an `echo`.
 */
const INVOCATION = /(?:^|&&|\|\||;|\|)\s*vercel pull\b/;

interface Pull {
  file: string;
  job: string;
  /** The step the invocation lives in, so its `if:` can be read alongside it. */
  step: Step;
  command: string;
}

/** Every `run:` line that invokes `vercel pull`, across every workflow. */
function everyVercelPull(): Pull[] {
  return readdirSync(WORKFLOWS_DIR)
    .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
    .flatMap((file) =>
      Object.entries(workflow(file).jobs ?? {}).flatMap(([job, definition]) =>
        (definition.steps ?? []).flatMap((step) =>
          (step.run ?? '')
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => INVOCATION.test(line))
            .map((command) => ({ file, job, step, command })),
        ),
      ),
    );
}

/**
 * The target, read from the command rather than its `if:`. Each arm spells
 * `--environment` literally: an invocation that interpolates it cannot be
 * classified, and an unclassifiable pull is one whose flags nothing can check.
 */
const isProductionPull = (pull: Pull) => pull.command.includes('--environment=production');
const isPreviewPull = (pull: Pull) => pull.command.includes('--environment=preview');

describe('every `vercel pull` in CI', () => {
  const pulls = everyVercelPull();

  // Precondition: the sweep found the pulls it checks — a renamed `run:` would
  // empty the list and leave the suite green. Two per file, one arm per
  // target, so a file that lost an arm fails here rather than leaving the
  // assertions below vacuous over the survivor.
  it('is found by the sweep — deploy.yml and migrate.yml each pull once per target', () => {
    expect(pulls.map(({ file }) => file).sort()).toEqual([
      'deploy.yml',
      'deploy.yml',
      'migrate.yml',
      'migrate.yml',
    ]);
  });

  it('names its target literally, so every invocation is classifiable', () => {
    for (const pull of pulls) {
      expect(
        isPreviewPull(pull) !== isProductionPull(pull),
        `${pull.file} (${pull.job}) is neither exactly preview nor exactly production: ${pull.command}`,
      ).toBe(true);
    }
  });

  it('pulls each target exactly once per workflow', () => {
    expect(
      pulls
        .filter(isProductionPull)
        .map(({ file }) => file)
        .sort(),
    ).toEqual(['deploy.yml', 'migrate.yml']);
    expect(
      pulls
        .filter(isPreviewPull)
        .map(({ file }) => file)
        .sort(),
    ).toEqual(['deploy.yml', 'migrate.yml']);
  });

  // Dropping the flag costs nothing at run time; see above.
  it('names the branch every preview pull is resolving for', () => {
    const previews = pulls.filter(isPreviewPull);
    expect(previews.length).toBeGreaterThan(0);

    for (const { file, job, command } of previews) {
      expect(command, `${file} (${job})`).toContain('--git-branch="$GIT_BRANCH"');
    }
  });

  // A hardcoded branch would satisfy the assertion above and still pull the
  // wrong variables for two of three targets. Through `env:` rather than
  // interpolated: a branch name may legally contain `$`, a backtick or `;`,
  // and a hotfix branch's name arrives from a PR.
  it('takes that branch from the resolved target', () => {
    for (const { file, job, step } of pulls.filter(isPreviewPull)) {
      expect(step.env?.GIT_BRANCH, `${file} (${job})`).toMatch(
        /^\$\{\{\s*(needs\.resolve-target\.outputs\.git_branch|inputs\.git-branch)\s*\}\}$/,
      );
    }
  });

  // This one fails loudly — the entire production deploy — so it is caught in
  // the diff rather than on the push to `main`.
  it('never passes --git-branch on the production target', () => {
    const production = pulls.filter(isProductionPull);
    expect(production.length).toBeGreaterThan(0);

    for (const { file, job, command } of production) {
      expect(command, `${file} (${job})`).not.toContain('--git-branch');
    }
  });

  // What makes the pairing structural: each arm is reachable only for the
  // target its command names. `== 'preview'` rather than `!= 'production'`: a
  // third environment then skips both arms and fails at migrate.yml's
  // "$env_file not found" rather than silently pulling the wrong environment.
  it('runs each arm only for the environment its command names', () => {
    for (const pull of pulls) {
      const target = isProductionPull(pull) ? 'production' : 'preview';
      expect(pull.step.if, `${pull.file} (${pull.job})`).toMatch(
        new RegExp(
          `(needs\\.resolve-target\\.outputs\\.environment|inputs\\.environment)\\s*==\\s*'${target}'`,
        ),
      );
    }
  });
});

describe('deploy.yml resolve-target', () => {
  const job = workflow('deploy.yml').jobs['resolve-target'];
  const script = stepNamed(job, 'Resolve deploy target').run ?? '';

  it('publishes the branch being deployed as an output', () => {
    expect(job.outputs).toHaveProperty('git_branch');
    expect(job.outputs?.git_branch).toContain('steps.target.outputs.git_branch');
  });

  // A target without a branch pulls Preview-wide variables, so the two are
  // written together or not at all.
  it('answers with a branch in every arm that answers with an environment', () => {
    const environments = script.match(/echo "environment=/g) ?? [];
    const branches = script.match(/echo "git_branch=/g) ?? [];

    expect(environments.length).toBeGreaterThan(1);
    expect(branches).toHaveLength(environments.length);
  });

  // `--environment=production` is the classifier the pull steps are selected
  // by, so which arms answer it is pinned: two preview (hotfix PR, pushed
  // branch), one production.
  it('answers production for exactly one arm and preview for the rest', () => {
    expect(script.match(/echo "environment=production"/g) ?? []).toHaveLength(1);
    expect(script.match(/echo "environment=preview"/g) ?? []).toHaveLength(2);
  });

  // `github.ref_name` on a pull_request is the merge ref (`123/merge`), which
  // nothing is scoped to; the deployed branch is the head.
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

  describe('the preview pull', () => {
    const step = stepNamed(deploy.jobs.deploy, 'Pull Vercel environment (preview)');

    // Through `env:` and quoted, not interpolated (see above).
    it('pulls for the branch resolve-target named', () => {
      expect(step.run ?? '').toContain('--git-branch="$GIT_BRANCH"');
      expect(step.env?.GIT_BRANCH).toBe('${{ needs.resolve-target.outputs.git_branch }}');
    });

    // Precondition: still the real pull step, not one that lost its
    // `--environment` and would pull development variables.
    it('still pulls for the preview environment', () => {
      expect(step.run ?? '').toContain('--environment=preview');
    });
  });

  describe('the production pull', () => {
    const step = stepNamed(deploy.jobs.deploy, 'Pull Vercel environment (production)');

    it('pulls production without naming a branch', () => {
      expect(step.run ?? '').toContain('--environment=production');
      expect(step.run ?? '').not.toContain('--git-branch');
    });

    // The duplicated `env:` block is the drift risk two steps introduce: an arm
    // that loses its token fails at run time rather than here.
    it('still has the token it authenticates with', () => {
      expect(step.env?.VERCEL_DEPLOY_TOKEN).toBe('${{ secrets.VERCEL_DEPLOY_TOKEN }}');
    });
  });

  it('gives both arms the token they authenticate with', () => {
    for (const name of [
      'Pull Vercel environment (preview)',
      'Pull Vercel environment (production)',
    ]) {
      expect(stepNamed(deploy.jobs.deploy, name).env?.VERCEL_DEPLOY_TOKEN).toBe(
        '${{ secrets.VERCEL_DEPLOY_TOKEN }}',
      );
    }
  });

  // The deploy-side half: `--git-branch` fixes what the *build* pulls, but the
  // deployment resolves its own environment from its branch association, which
  // the CLI infers from the checkout — and actions/checkout leaves a detached
  // HEAD. On every arm, production included: it is metadata, not environment
  // resolution, and Vercel does not reject it there.
  describe('the deploy itself', () => {
    const step = stepNamed(deploy.jobs.deploy, 'Deploy');
    const command = step.run ?? '';

    it('tells Vercel which branch the deployment belongs to', () => {
      expect(command).toContain('--meta githubDeployment=1');
      expect(command).toContain('--meta githubCommitRef="$GIT_BRANCH"');
      expect(step.env?.GIT_BRANCH).toBe('${{ needs.resolve-target.outputs.git_branch }}');
    });

    // Precondition: still the command that actually ships the build.
    it('is still the prebuilt deploy', () => {
      expect(command).toContain('vercel deploy --prebuilt');
    });
  });

  // migrate must resolve DATABASE_URL the same way deploy does, or the
  // migration runs against one database and the deploy serves another.
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

  // Required even though the production arm ignores it: a caller that cannot
  // name its branch cannot be trusted with preview either, and a default is
  // how it would quietly migrate a branch-agnostic DATABASE_URL.
  it('requires its caller to name the branch', () => {
    expect(inputs['git-branch']).toMatchObject({ required: true, type: 'string' });
  });

  describe('the preview pull', () => {
    const step = stepNamed(migrate.jobs.migrate, 'Pull Vercel environment (preview)');

    it('pulls for the branch its caller named', () => {
      expect(step.run ?? '').toContain('--git-branch="$GIT_BRANCH"');
      expect(step.env?.GIT_BRANCH).toBe('${{ inputs.git-branch }}');
    });

    it('still pulls for the preview environment', () => {
      expect(step.run ?? '').toContain('--environment=preview');
    });
  });

  describe('the production pull', () => {
    const step = stepNamed(migrate.jobs.migrate, 'Pull Vercel environment (production)');

    it('pulls production without naming a branch', () => {
      expect(step.run ?? '').toContain('--environment=production');
      expect(step.run ?? '').not.toContain('--git-branch');
    });

    it('still has the token it authenticates with', () => {
      expect(step.env?.VERCEL_DEPLOY_TOKEN).toBe('${{ secrets.VERCEL_DEPLOY_TOKEN }}');
    });
  });
});
