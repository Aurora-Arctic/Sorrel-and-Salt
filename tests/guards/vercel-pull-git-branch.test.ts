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
//
// MB.45 — and the flag is legal on exactly one target. Branch-scoped overrides
// are a Preview-only Vercel feature; a production pull carrying one is rejected
// outright:
//
//   Error: Invalid request: `target` must be "preview" when specifying a `gitBranch`
//
// MB.27 added it unconditionally and broke every production deploy. So each
// workflow now pulls through two steps, one per target, and this file asserts
// both halves: preview must carry the flag, production must not. Two steps
// rather than one command with an optional flag, because a command that merely
// *might* carry `--git-branch` cannot satisfy the preview half — and because a
// YAML `if:` is data this test can read, where a shell `if` is a string it
// would have to parse.
//
// Honest limit: a YAML `if:` is still text to this test. What it proves is that
// the two conditions are complementary and correctly paired with their flags.
// What it cannot prove is that GitHub evaluates them as written — that needs a
// live deploy, which is precisely the step MB.27 skipped.

interface Step {
  name?: string;
  // MB.45 — the condition is now part of the mechanism, not decoration around
  // it: it is what ties an invocation to the one target its flags are legal on.
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
 * A line that *runs* `vercel pull` — at the start of a command, or after a
 * shell operator. `migrate.yml` also mentions the command inside an `echo`,
 * and an error message is not an invocation.
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
 * Which target an invocation is for, read from the command itself rather than
 * from its `if:`. Each arm must spell its `--environment` literally — an
 * invocation that interpolates the environment cannot be classified, and an
 * unclassifiable pull is one whose flags nothing can check.
 */
const isProductionPull = (pull: Pull) => pull.command.includes('--environment=production');
const isPreviewPull = (pull: Pull) => pull.command.includes('--environment=preview');

describe('every `vercel pull` in CI', () => {
  const pulls = everyVercelPull();

  // The precondition for every assertion below: the sweep actually found the
  // pulls it claims to be checking. Without this, a rename of `run:` or a move
  // of the deploy steps would empty the list and leave the suite green.
  //
  // Two per file as of MB.45 — one arm per target. A file that has lost an arm
  // fails here rather than leaving the assertions below vacuously true over
  // whichever arm survived.
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

  // MB.27's assertion, narrowed by MB.45 to the target it is true on. Dropping
  // the flag here still costs nothing at run time and still silently puts
  // staging on the Preview-wide `DATABASE_URL`.
  it('names the branch every preview pull is resolving for', () => {
    const previews = pulls.filter(isPreviewPull);
    expect(previews.length).toBeGreaterThan(0);

    for (const { file, job, command } of previews) {
      expect(command, `${file} (${job})`).toContain('--git-branch="$GIT_BRANCH"');
    }
  });

  // A hardcoded branch would satisfy the assertion above and still pull the
  // wrong variables for two of the three deploy targets. The value comes from
  // the resolved target — `resolve-target`'s output in `deploy.yml`, the
  // caller's input in `migrate.yml` — and through `env:` rather than
  // interpolated into the command, because a branch name may legally contain
  // `$`, a backtick or a `;`, and a hotfix branch's name arrives from a PR.
  it('takes that branch from the resolved target', () => {
    for (const { file, job, step } of pulls.filter(isPreviewPull)) {
      expect(step.env?.GIT_BRANCH, `${file} (${job})`).toMatch(
        /^\$\{\{\s*(needs\.resolve-target\.outputs\.git_branch|inputs\.git-branch)\s*\}\}$/,
      );
    }
  });

  // MB.45's own half. Unlike the flag going missing on preview, this one fails
  // loudly — but it fails the entire production deploy, so it is worth catching
  // in the diff that reintroduces it rather than on the push to `main`.
  it('never passes --git-branch on the production target', () => {
    const production = pulls.filter(isProductionPull);
    expect(production.length).toBeGreaterThan(0);

    for (const { file, job, command } of production) {
      expect(command, `${file} (${job})`).not.toContain('--git-branch');
    }
  });

  // What makes the pairing structural rather than two `run:` lines that happen
  // to agree: each arm is reachable only for the target its command names. Swap
  // either condition and this fails.
  //
  // `== 'preview'` rather than `!= 'production'` is deliberate — a third
  // environment then skips both arms and fails at migrate.yml's existing
  // "$env_file not found after vercel pull", which is a named failure rather
  // than a silent pull of the wrong environment.
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

  // Each arm of the resolver answers for one deploy target, and a target
  // without a branch pulls Preview-wide variables — so the two must be written
  // together or not at all.
  it('answers with a branch in every arm that answers with an environment', () => {
    const environments = script.match(/echo "environment=/g) ?? [];
    const branches = script.match(/echo "git_branch=/g) ?? [];

    expect(environments.length).toBeGreaterThan(1);
    expect(branches).toHaveLength(environments.length);
  });

  // MB.45 — `--environment=production` is now the classifier the pull steps are
  // selected by, so which arms answer `production` has to be pinned. Two
  // preview arms (hotfix PR, pushed branch) and exactly one production arm.
  it('answers production for exactly one arm and preview for the rest', () => {
    expect(script.match(/echo "environment=production"/g) ?? []).toHaveLength(1);
    expect(script.match(/echo "environment=preview"/g) ?? []).toHaveLength(2);
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

  describe('the preview pull', () => {
    const step = stepNamed(deploy.jobs.deploy, 'Pull Vercel environment (preview)');

    // Through `env:` and quoted, not interpolated into the command: a branch
    // name may legally contain `$`, a backtick or a `;`, and a hotfix branch's
    // name reaches this step from a pull request.
    it('pulls for the branch resolve-target named', () => {
      expect(step.run ?? '').toContain('--git-branch="$GIT_BRANCH"');
      expect(step.env?.GIT_BRANCH).toBe('${{ needs.resolve-target.outputs.git_branch }}');
    });

    // The precondition: this is still the real pull step, environment and all —
    // not a step that has lost its `--environment` and would pull development
    // variables while passing the assertion above.
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
    // that loses its token fails at run time with an auth error rather than
    // here.
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

  // The other half of MB.27's defect. `vercel pull --git-branch` fixes what the
  // *build* sees; the deployment's own environment is resolved from its branch
  // association, which the CLI infers from the checkout — and actions/checkout
  // leaves a detached HEAD, which has none. Without the metadata the running app
  // reads the Preview-wide DATABASE_URL however the build was pulled, so this is
  // not decoration either.
  //
  // It stays on *every* arm, production included: this is deployment metadata,
  // not environment resolution, and Vercel does not reject it the way it rejects
  // `gitBranch` on a non-preview target.
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

  // Required rather than defaulted, and required even though the production arm
  // ignores it: a caller that cannot say which branch it is migrating cannot be
  // trusted with the preview arm either, and defaulting is how it would quietly
  // migrate whatever branch-agnostic DATABASE_URL came back.
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
