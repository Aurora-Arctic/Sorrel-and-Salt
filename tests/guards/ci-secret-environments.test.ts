import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { fromRoot } from '../support/paths';

// `DATABASE_URL` and `BETTER_AUTH_SECRET` are marked Sensitive in Vercel, so
// `vercel pull` writes `[SENSITIVE]` in their place and CI keeps its own copy
// of each as a repository secret named per target (claude-docs/ci.md,
// "Deploy"). What this file guards is the selection: `secrets.X` for a secret
// that does not exist resolves to the empty string rather than erroring, so a
// typo or a missed arm migrates the wrong database with nothing failing.

const WORKFLOWS_DIR = fromRoot('.github/workflows');

interface Step {
  name?: string;
  if?: string;
  run?: string;
  env?: Record<string, string>;
}

interface Job {
  steps?: Step[];
}

interface Workflow {
  jobs: Record<string, Job>;
}

function workflow(file: string): Workflow {
  return parse(readFileSync(`${WORKFLOWS_DIR}/${file}`, 'utf8')) as Workflow;
}

function stepNamed(job: Job, name: string): Step {
  const step = job.steps?.find((candidate) => candidate.name === name);
  if (!step) throw new Error(`no step named "${name}"`);
  return step;
}

/** The two long-lived databases, each with a secret of its own. */
const SECRETS = {
  production: '${{ secrets.DATABASE_URL_PRODUCTION }}',
  staging: '${{ secrets.DATABASE_URL_STAGING }}',
} as const;

describe('migrate.yml resolving DATABASE_URL', () => {
  const job = workflow('migrate.yml').jobs.migrate;
  const step = stepNamed(job, 'Resolve DATABASE_URL');
  const run = step.run ?? '';

  it('is handed both named secrets', () => {
    expect(step.env?.DATABASE_URL_PRODUCTION).toBe(SECRETS.production);
    expect(step.env?.DATABASE_URL_STAGING).toBe(SECRETS.staging);
  });

  // Production is decided by the Vercel environment rather than the branch
  // name — `main` is the only push that resolves `production`. Through `env:`
  // rather than interpolated: a branch name may legally carry shell
  // metacharacters, and a hotfix branch's name arrives from a pull request.
  it('picks production by the environment, not by the branch name', () => {
    expect(step.env?.ENVIRONMENT).toBe('${{ inputs.environment }}');
    expect(run).toContain('"$ENVIRONMENT" = "production"');
    expect(run).toContain('DATABASE_URL_PRODUCTION');
  });

  it('picks staging by the branch it is migrating', () => {
    expect(run).toContain('DATABASE_URL_STAGING');
    expect(run).toMatch(/GIT_BRANCH.*staging|staging.*GIT_BRANCH/);
  });

  // The one target no static secret can name: a hotfix preview's Neon branch
  // is created per deployment. The integration writes it into the pulled file
  // as POSTGRES_URL, which is not marked Sensitive.
  it('falls back to the integration-provided POSTGRES_URL', () => {
    expect(run).toContain('POSTGRES_URL');
  });

  it('fails rather than migrating nothing when every source is empty', () => {
    expect(run).toContain('::error::');
    expect(run).toContain('exit 1');
  });

  it('masks whichever one it used before exporting it', () => {
    expect(run).toContain('::add-mask::');
    expect(run.indexOf('::add-mask::')).toBeLessThan(run.indexOf('GITHUB_ENV'));
  });

  // Every candidate is masked, so only the source's name can say which
  // database was chosen — and the name is not a secret.
  it('says which source it used', () => {
    expect(run).toMatch(/Resolved DATABASE_URL from/);
  });
});

describe('deploy.yml overriding what the pull could not read', () => {
  const deploy = workflow('deploy.yml');
  const job = deploy.jobs.deploy;
  const step = stepNamed(job, 'Override what the pull could not read');

  it('is handed both named secrets and the shared auth secret', () => {
    expect(step.env?.DATABASE_URL_PRODUCTION).toBe(SECRETS.production);
    expect(step.env?.DATABASE_URL_STAGING).toBe(SECRETS.staging);
    expect(step.env?.BETTER_AUTH_SECRET).toBe('${{ secrets.BETTER_AUTH_SECRET }}');
  });

  // `vercel build` reads the pulled dotfile. A step-level `env:` would not
  // reach the Next build, so the values have to be written into the file.
  it('writes into the pulled env file', () => {
    expect(step.run ?? '').toContain('ENV_FILE');
    expect(step.env?.ENV_FILE).toContain('.vercel/.env.');
  });

  it('runs after the pull and before the build', () => {
    const names = (job.steps ?? []).map((candidate) => candidate.name);
    const override = names.indexOf('Override what the pull could not read');
    expect(override).toBeGreaterThan(names.indexOf('Pull Vercel environment (preview)'));
    expect(override).toBeLessThan(names.indexOf('Build'));
  });

  // The assertion checks the file the build will read, so it has to run after
  // the overrides rather than on values about to be replaced.
  it('runs before the assertion that checks its work', () => {
    const names = (job.steps ?? []).map((candidate) => candidate.name);
    expect(names.indexOf('Override what the pull could not read')).toBeLessThan(
      names.indexOf('Assert the pulled environment'),
    );
  });
});

// Both workflows choose between the same two secrets and must choose the same
// way, or the migration runs against one database while the deploy serves another.
describe('both workflows', () => {
  const migrateRun =
    stepNamed(workflow('migrate.yml').jobs.migrate, 'Resolve DATABASE_URL').run ?? '';
  const deployRun =
    stepNamed(workflow('deploy.yml').jobs.deploy, 'Override what the pull could not read').run ??
    '';

  it.each([
    ['DATABASE_URL_PRODUCTION', 'production'],
    ['DATABASE_URL_STAGING', 'staging'],
  ])('reach for %s on the same target', (secret) => {
    expect(migrateRun).toContain(secret);
    expect(deployRun).toContain(secret);
  });
});
