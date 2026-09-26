import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { fromRoot } from '../support/paths';

// Staging serves the component workshop from public/workshop/, behind the
// proxy's admin gate on /workshop (claude-docs/workshop.md, "On staging").
// Nothing fails if the build step drifts: a wrong `--base` ships a page whose
// assets 404, a wrong `--outDir` ships no workshop at all, and a widened `if:`
// ships it to production. This reads the step as data — it proves what the
// workflow says, not that GitHub evaluates it as written.

interface Step {
  name?: string;
  if?: string;
  run?: string;
}

const deploy = parse(readFileSync(fromRoot('.github/workflows/deploy.yml'), 'utf8')) as {
  jobs: Record<string, { steps?: Step[] }>;
};
const steps = deploy.jobs.deploy?.steps ?? [];
const WORKSHOP_BUILD = /\bnpm run workshop:build\b/;

describe('the staging workshop build', () => {
  const index = steps.findIndex((step) => WORKSHOP_BUILD.test(step.run ?? ''));
  const step = steps[index];

  it('is a step of the deploy job', () => {
    expect(step, 'no deploy step runs `npm run workshop:build`').toBeDefined();
  });

  it('builds for the path the proxy gates, into the directory Next serves it from', () => {
    expect(step?.run).toMatch(/\s--base \/workshop\/(\s|$)/);
    expect(step?.run).toMatch(/\s--outDir public\/workshop(\s|$)/);
  });

  it('runs on a staging deploy only', () => {
    expect(step?.if).toContain("needs.resolve-target.outputs.git_branch == 'staging'");
    expect(step?.if).toContain("steps.guard.outputs.enabled == 'true'");
    expect(step?.if).not.toMatch(/\|\|/);
  });

  it('runs before `vercel build`, which is what reads public/', () => {
    const build = steps.findIndex((candidate) => /\bvercel build\b/.test(candidate.run ?? ''));
    expect(build).toBeGreaterThan(-1);
    expect(index).toBeGreaterThan(-1);
    expect(index).toBeLessThan(build);
  });
});
