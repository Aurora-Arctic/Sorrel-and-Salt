import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { fromRoot } from '../support/paths';
import type { Job, Step, Workflow } from './types';

// The reference vocabularies reach a deployed database only through CI
// (claude-docs/ci/deploy.md, "Deploy"): `migrate.yml` runs each seed target,
// and `deploy.yml` asks it to only when the push changed a seed's files. A
// target missing from either fails nothing — the vocabulary just never
// arrives, or never updates — so each `db:seed:<target>` script is held to
// both, and so is each shared `*-vocabulary.ts` helper a seed writes through.

const WORKFLOWS_DIR = fromRoot('.github/workflows');

function workflow(file: string): Workflow {
  return parse(readFileSync(`${WORKFLOWS_DIR}/${file}`, 'utf8')) as Workflow;
}

function stepNamed(job: Job | undefined, name: string): Step {
  const step = job?.steps?.find((candidate) => candidate.name === name);
  if (!step?.run) throw new Error(`no step named "${name}" with a run script`);
  return step;
}

const scripts = (
  JSON.parse(readFileSync(fromRoot('package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  }
).scripts;

/** `db:seed:forms` → `forms`: every target but the scenario and the drop. */
const TARGETS = Object.keys(scripts)
  .map((name) => /^db:seed:(.+)$/.exec(name)?.[1])
  .filter((target): target is string => target !== undefined);

const HELPERS = readdirSync(fromRoot('src/db/seed'))
  .filter((file) => file.endsWith('-vocabulary.ts'))
  .map((file) => `src/db/seed/${file}`);

const SEED_STEP = stepNamed(workflow('migrate.yml').jobs.migrate, 'Seed the reference vocabularies')
  .run as string;

const CHANGED_STEP = stepNamed(
  workflow('deploy.yml').jobs['seed-changed'],
  'Look for changes to the seed',
).run as string;

describe('the reference seed targets', () => {
  // Precondition: an empty listing would pass every loop below.
  it('are read from package.json, and the helpers from src/db/seed', () => {
    expect(TARGETS).toEqual(expect.arrayContaining(['categories', 'forms', 'deities']));
    expect(HELPERS).toEqual(expect.arrayContaining(['src/db/seed/two-tier-vocabulary.ts']));
  });

  it('each runs in migrate.yml’s reference-seed step', () => {
    const missing = TARGETS.filter(
      (target) => !SEED_STEP.split('\n').some((line) => line.includes(`npm run db:seed:${target}`)),
    );

    expect(missing).toEqual([]);
  });

  it('each re-seeds when its own file changes', () => {
    const missing = TARGETS.map((target) => `src/db/seed/${target}.ts`).filter(
      (path) => !CHANGED_STEP.includes(path),
    );

    expect(missing).toEqual([]);
  });

  it('re-seed when a shared vocabulary helper changes', () => {
    expect(HELPERS.filter((path) => !CHANGED_STEP.includes(path))).toEqual([]);
  });
});
