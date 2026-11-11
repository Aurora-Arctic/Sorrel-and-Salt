import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import MCR from 'monocart-coverage-reports';
import {
  type Context,
  type Job,
  type Step,
  type UsesHandler,
  type Workflow,
  RECORDING_STUB,
  actionEnv,
  callWith,
  calledOutputs,
  downloadsOf,
  evaluateMap,
  evaluateValue,
  fetchedBy,
  holds,
  inputsFor,
  jobStatus,
  landings,
  loadAction,
  loadWorkflow,
  matrixRuns,
  needsOf,
  runStepScript,
  runWorkflow,
  stringify,
  underRoot,
  uploadsOf,
} from '../../support/github-workflow';
import { type TimedTest, mergedPlaywrightReport } from '../../support/github-scripts';
import { fromRoot } from '../../support/paths';
import {
  context as commentContext,
  core,
  fakeGitHub,
  lib,
  sectionsOf,
} from '../../support/pr-comment';

// The CI test jobs split into shards (claude-docs/ci/runner-budget.md): each shard's jobs and steps
// evaluated as GitHub Actions evaluates them, and their `run:` scripts executed with stub commands, so
// each case is proved by what the run would do, not by the YAML's wording.

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'sharding-'));
  // A step that runs `node .github/scripts/...` from /app finds the scripts here.
  symlinkSync(fromRoot('.github'), join(root, '.github'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const PR_GATE = loadWorkflow('pr-gate.yml');
const PLAYWRIGHT = loadWorkflow('playwright.yml');
const COVERAGE = loadWorkflow('playwright-coverage.yml');
const VITEST = loadWorkflow('vitest.yml');
const E2E_CACHE = loadWorkflow('e2e-cache.yml');

const github = {
  actor: 'testwort',
  event: { pull_request: { number: 7 } },
  ref: 'refs/pull/7/merge',
  sha: 'abc1234',
};
const base = { github, runner: { os: 'Linux' }, secrets: { GITHUB_TOKEN: 'testwort-token' } };

type Need = { result: string; outputs?: Record<string, string> };

/** pr-gate's jobs before the suites, every filter on unless `filters` says otherwise. */
function gateNeeds(
  filters: Record<string, string> = {},
  gitflow = 'success',
): Record<string, Need> {
  const done = (outputs: Record<string, string> = {}) => ({ result: 'success', outputs });
  return {
    changes: done({
      'stand-down': 'false',
      vitest: 'true',
      playwright: 'true',
      stories: 'true',
      ...filters,
    }),
    gitflow: { result: gitflow, outputs: {} },
    'build-image': done({ image: 'testwort-image' }),
    'build-e2e-image': done({ image: 'testwort-e2e-image' }),
    'build-db-image': done({ image: 'testwort-db-image' }),
  };
}

/** What a pr-gate job hands playwright.yml, the e2e-cache warm job's build-only call included. */
function playwrightInputs(caller: 'playwright' | 'stories' | 'warm') {
  if (caller === 'warm') {
    const needs = {
      'e2e-image': { result: 'success', outputs: { image: 'testwort-e2e-image' } },
      'db-image': { result: 'success', outputs: { image: 'testwort-db-image' } },
    };
    return callWith(E2E_CACHE.jobs.warm, PLAYWRIGHT, { ...base, needs });
  }
  return callWith(PR_GATE.jobs[caller], PLAYWRIGHT, { ...base, needs: gateNeeds() });
}

/** playwright.yml's job with a matrix: one job per shard. */
function shardJob(): [string, Job] {
  const found = Object.entries(PLAYWRIGHT.jobs).find(([, job]) => job.strategy?.matrix);
  expect(found, 'playwright.yml has a job with a strategy.matrix').toBeDefined();
  return found as [string, Job];
}

/** Each job one called workflow runs, with its matrix and strategy contexts. */
function jobRuns(workflow: Workflow, inputs: Context, needs: Record<string, Need> = {}) {
  return Object.entries(workflow.jobs).flatMap(([name, job]) => {
    const context: Context = { ...base, inputs, needs, steps: {}, env: job.env ?? {} };
    return matrixRuns(job, context).map((run) => ({
      name,
      job,
      context: { ...context, matrix: run.matrix, strategy: run.strategy },
    }));
  });
}

const usesComment = (step: Step) => step.uses === './.github/actions/pr-comment';

const PASS = { success: true, failure: false };

/** Where a shard's blob reporter writes, which tells its blob upload from its other uploads. */
const BLOB = /blob-report/;

/** A job's steps with every local composite action's own steps in its place, the pr-comment action kept. */
function flatSteps(steps: Step[] | undefined): Step[] {
  return (steps ?? []).flatMap((step) =>
    step.uses?.startsWith('./.github/actions/') && !usesComment(step)
      ? flatSteps(loadAction(step.uses).runs.steps)
      : [step],
  );
}

describe('the Playwright suites, sharded', () => {
  it.each([
    ['playwright', 3, /\be2e\b/],
    ['stories', 2, /\btest:stories\b/],
  ] as const)(
    'runs the %s suite as %i shards, each running its own share with --shard',
    (caller, count, script) => {
      const [, job] = shardJob();
      const inputs = playwrightInputs(caller);
      const runs = matrixRuns(job, { ...base, inputs });
      const runStep = (job.steps ?? []).find((step) => /\bnpm run\b/.test(step.run ?? ''));
      expect(runStep, 'the shard job has a step that runs the suite').toBeDefined();

      const shards = runs.map(({ matrix, strategy }, index) => {
        const calls = join(root, `calls-${index}`);
        writeFileSync(calls, '');
        const run = runStepScript(runStep as Step, {
          context: { ...base, inputs, matrix, strategy, steps: {}, env: job.env ?? {} },
          root,
          stubs: { npm: RECORDING_STUB },
          env: { STUB_CALLS: calls },
        });
        expect(run.status, run.log).toBe(0);
        const [call = ''] = readFileSync(calls, 'utf8').split('\n').filter(Boolean);
        expect(call).toMatch(script);
        return /--shard[= ](\d+\/\d+)/.exec(call)?.[1];
      });

      expect(runs).toHaveLength(count);
      expect([...shards].sort()).toEqual(
        Array.from({ length: count }, (_, index) => `${index + 1}/${count}`),
      );
    },
  );

  it('runs every shard to its end when another fails, so the merge has each one’s results', () => {
    const [, job] = shardJob();
    const [run] = matrixRuns(job, { ...base, inputs: playwrightInputs('playwright') });

    expect(run.strategy['job-total']).toBeGreaterThan(1);
    expect(run.strategy['fail-fast']).toBe(false);
  });

  it('saves the e2e build cache from one job of the build-only run, and from none of a gate run', () => {
    const saves = (caller: 'playwright' | 'warm') =>
      jobRuns(PLAYWRIGHT, playwrightInputs(caller)).filter(({ job, context }) =>
        (job.steps ?? []).some(
          (step) =>
            step.uses?.startsWith('actions/cache/save') &&
            holds(
              step.if,
              { ...context, steps: { 'e2e-cache': { outputs: { 'cache-hit': 'false' } } } },
              {
                success: true,
                failure: false,
              },
            ),
        ),
      );

    expect(saves('warm')).toHaveLength(1);
    expect(saves('playwright')).toEqual([]);
  });

  it('has one job, the shards, named playwright, so each check reads "playwright / playwright (n)"', () => {
    const [name, job] = shardJob();

    expect(Object.keys(PLAYWRIGHT.jobs)).toEqual([name]);
    expect(
      evaluateValue(job.name ?? name, { ...base, inputs: playwrightInputs('playwright') }),
    ).toBe('playwright');
  });

  it('writes no comment section from playwright.yml for either suite: playwright-coverage writes them', () => {
    for (const caller of ['playwright', 'stories'] as const) {
      const runs = jobRuns(PLAYWRIGHT, playwrightInputs(caller)).filter(({ job, context }) =>
        holds(job.if, context, PASS),
      );
      const writes = runs.flatMap(({ context, job }) =>
        flatSteps(job.steps).filter(
          (step) => usesComment(step) && holds(step.if, { ...context, steps: {} }, PASS),
        ),
      );

      expect(runs.length).toBeGreaterThan(1);
      expect(writes).toEqual([]);
    }
  });

  it('runs no shard of a suite the path filter rules out', () => {
    const shards = (filters: Record<string, string>, caller: 'playwright' | 'stories') =>
      jobRuns(
        PLAYWRIGHT,
        callWith(PR_GATE.jobs[caller], PLAYWRIGHT, { ...base, needs: gateNeeds(filters) }),
      ).filter(({ job, context }) => holds(job.if, context, PASS));

    expect(shards({}, 'playwright')).toHaveLength(3);
    expect(shards({}, 'stories')).toHaveLength(2);
    expect(shards({ playwright: 'false' }, 'playwright')).toEqual([]);
    expect(shards({ stories: 'false' }, 'stories')).toEqual([]);
  });

  it('runs one shard under build-only and leaves no blob or coverage to merge', () => {
    const left = (caller: 'playwright' | 'warm') => {
      const runs = jobRuns(PLAYWRIGHT, playwrightInputs(caller)).filter(({ job, context }) =>
        holds(job.if, context, PASS),
      );
      const uploads = runs.flatMap(({ job, context }) =>
        uploadsOf(job.steps, context).filter(
          ({ step, path }) =>
            (BLOB.test(path) || path.includes('coverage-e2e')) &&
            holds(step.if, { ...context, steps: {} }, PASS),
        ),
      );
      return { runs: runs.length, uploads: uploads.length };
    };

    expect(left('playwright')).toEqual({ runs: 3, uploads: 6 });
    expect(left('warm')).toEqual({ runs: 1, uploads: 0 });
  });
});

describe('every artifact one pull request run uploads', () => {
  it('has a name of its own, every shard’s coverage among them', () => {
    const playwright = (caller: 'playwright' | 'stories') =>
      jobRuns(PLAYWRIGHT, playwrightInputs(caller)).flatMap(({ job, context }) =>
        uploadsOf(job.steps, context),
      );
    const coverageOf = (caller: 'playwright' | 'stories') =>
      playwright(caller).filter(({ path }) => path.includes('coverage-e2e'));
    const vitestInputs = callWith(PR_GATE.jobs.vitest, VITEST, { ...base, needs: gateNeeds() });
    const coverageInputs = callWith(PR_GATE.jobs['playwright-coverage'], COVERAGE, {
      ...base,
      needs: gateNeeds(),
    });
    const names = [
      ...playwright('playwright'),
      ...playwright('stories'),
      ...jobRuns(VITEST, vitestInputs).flatMap(({ job, context }) => uploadsOf(job.steps, context)),
      ...jobRuns(COVERAGE, coverageInputs).flatMap(({ job, context }) =>
        uploadsOf(job.steps, context),
      ),
    ].map(({ name }) => name);

    // Preconditions: the scan found each suite's shards and the Vitest parts.
    expect(coverageOf('playwright')).toHaveLength(3);
    expect(coverageOf('stories')).toHaveLength(2);
    expect(names.filter((name) => name.startsWith('vitest-blob-')).length).toBeGreaterThanOrEqual(
      3,
    );
    expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([]);
  });
});

/** Every coverage artifact a pull request run of playwright.yml uploads, by the suite that uploads it. */
function coverageArtifacts() {
  return (['playwright', 'stories'] as const).flatMap((caller) =>
    jobRuns(PLAYWRIGHT, playwrightInputs(caller))
      .flatMap(({ job, context }) => uploadsOf(job.steps, context))
      .filter(({ path }) => path.includes('coverage-e2e'))
      .map(({ name }) => ({ caller, name })),
  );
}

describe('the merged Playwright coverage', () => {
  it("downloads every shard's coverage artifact of both suites, each into a folder of its own", () => {
    const artifacts = coverageArtifacts().map(({ name }) => name);
    const inputs = inputsFor(COVERAGE.on.workflow_call?.inputs, {
      image: 'testwort-image',
      'pr-number': '7',
      'should-run': true,
      'suites-failed': false,
    });
    const job = COVERAGE.jobs['playwright-coverage'];
    const landed = landings(downloadsOf(job.steps, { ...base, inputs, steps: {} }), artifacts);
    const folders = artifacts.flatMap((artifact) => landed.get(artifact) ?? []);

    expect(artifacts).toHaveLength(5);
    expect(artifacts.filter((artifact) => !landed.has(artifact))).toEqual([]);
    expect(new Set(folders).size).toBe(artifacts.length);
    expect(folders.every((folder) => folder.startsWith('/app/.reports/coverage-downloads/'))).toBe(
      true,
    );
  });
});

// ---------------------------------------------------------------------------
// Vitest: the parts, their blobs, and the merge that joins them.

/** The jobs that run a Vitest part, by name. */
function partJobs(workflow: Workflow) {
  return Object.entries(workflow.jobs).filter(([, job]) =>
    (job.steps ?? []).some((step) => step.uses === './.github/actions/vitest-part'),
  );
}

function vitestInputs() {
  return callWith(PR_GATE.jobs.vitest, VITEST, { ...base, needs: gateNeeds() });
}

// Writes the blob Vitest's blob reporter would, at the path the part asks for.
const STUB_PART_NPX = `#!/usr/bin/env bash
for arg in "$@"; do
  case "$arg" in
    --outputFile.blob=*) blob="\${arg#--outputFile.blob=}" ;;
  esac
done
[ -n "$blob" ] || { echo "no blob path in: $*"; exit 2; }
mkdir -p "$(dirname "$blob")"
printf '{"part":"%s"}' "$blob" > "$blob"
`;

type Artifact = { name: string; files: Record<string, string> };

/** Runs each part's Vitest step, as each matrix job would, and returns the blobs each uploads. */
function runParts(workflow: Workflow): { artifacts: Artifact[]; parts: string[] } {
  const inputs = vitestInputs();
  const artifacts: Artifact[] = [];
  for (const [name, job] of partJobs(workflow)) {
    for (const run of matrixRuns(job, { ...base, inputs })) {
      const context: Context = {
        ...base,
        inputs,
        matrix: run.matrix,
        strategy: run.strategy,
        steps: {},
      };
      const partStep = (job.steps ?? []).find(
        (step) => step.uses === './.github/actions/vitest-part',
      ) as Step;
      const action = loadAction('vitest-part');
      const actionContext = {
        ...context,
        inputs: inputsFor(action.inputs, evaluateMap(partStep.with, context)),
      };
      const partRoot = mkdtempSync(join(root, `${name}-`));
      const vitestStep = action.runs.steps.find((step) => step.run?.includes('vitest run')) as Step;
      const result = runStepScript(vitestStep, {
        context: actionContext,
        root: partRoot,
        stubs: { npx: STUB_PART_NPX },
      });
      expect(result.status, result.log).toBe(0);
      for (const upload of uploadsOf(action.runs.steps, actionContext)) {
        if (!upload.name.startsWith('vitest-blob')) continue;
        const folder = underRoot(upload.path, partRoot);
        const files = Object.fromEntries(
          readdirSync(folder).map((file) => [file, readFileSync(join(folder, file), 'utf8')]),
        );
        artifacts.push({ name: upload.name, files });
      }
    }
  }
  return { artifacts, parts: partJobs(workflow).map(([name]) => name) };
}

/** A job's downloads, into its own /app (`into`, the test's root by default), of the artifacts the run holds. */
function downloadInto(job: Job, artifacts: Artifact[], context: Context, into = root) {
  for (const download of downloadsOf(job.steps, context)) {
    const fetched = fetchedBy(
      download,
      artifacts.map(({ name }) => name),
    );
    for (const artifact of artifacts.filter(({ name }) => fetched.includes(name))) {
      const landed = landings([download], fetched).get(artifact.name) ?? [];
      for (const folder of landed) {
        const at = underRoot(folder, into);
        mkdirSync(at, { recursive: true });
        for (const [file, body] of Object.entries(artifact.files))
          writeFileSync(join(at, file), body);
      }
    }
  }
}

/** Runs the merge job's download and its merging step; `results` are its needs' results by job. */
function runMerge(workflow: Workflow, artifacts: Artifact[], results: Record<string, string>) {
  const merge = workflow.jobs.vitest;
  const needs = Object.fromEntries(
    Object.entries(results).map(([name, result]) => [name, { result, outputs: {} }]),
  );
  const context: Context = { ...base, inputs: vitestInputs(), needs, steps: {} };
  downloadInto(merge, artifacts, context);
  const step = (merge.steps ?? []).find((candidate) =>
    candidate.run?.includes('--mergeReports'),
  ) as Step;
  expect(step, 'the vitest job has a step that runs --mergeReports').toBeDefined();
  const calls = join(root, 'calls');
  writeFileSync(calls, '');
  const run = runStepScript(step, {
    context,
    root,
    stubs: { npx: RECORDING_STUB },
    env: { STUB_CALLS: calls },
  });
  return {
    ...run,
    merged: readFileSync(calls, 'utf8')
      .split('\n')
      .some((call) => call.includes('--mergeReports')),
  };
}

const allPassed = (parts: string[]) => Object.fromEntries(parts.map((part) => [part, 'success']));

/** vitest.yml with one part job taken out (`drop`), or one added (`add`), wherever the merge job names it. */
function withParts(change: 'drop' | 'add'): Workflow {
  const workflow = structuredClone(VITEST);
  const merge = workflow.jobs.vitest;
  if (change === 'drop') {
    delete workflow.jobs['vitest-db'];
    merge.needs = needsOf(merge).filter((need) => need !== 'vitest-db');
  } else {
    const extra = structuredClone(workflow.jobs['vitest-node']);
    const step = (extra.steps ?? []).find(
      (candidate) => candidate.uses === './.github/actions/vitest-part',
    ) as Step;
    step.with = { ...step.with, name: 'testwort', projects: 'unit' };
    workflow.jobs['vitest-testwort'] = extra;
    merge.needs = [...needsOf(merge), 'vitest-testwort'];
  }
  return workflow;
}

describe('the Vitest parts and their merge', () => {
  it('needs every part, runs after a failed one, and is skipped with the parts', () => {
    const merge = VITEST.jobs.vitest;
    const parts = partJobs(VITEST).map(([name]) => name);
    const inputs = vitestInputs();
    const needs = {
      ...Object.fromEntries(parts.map((part) => [part, { result: 'success' }])),
      [parts[0]]: { result: 'failure' },
    };

    expect(parts.length).toBeGreaterThanOrEqual(3);
    expect(parts.filter((part) => !needsOf(merge).includes(part))).toEqual([]);
    expect(holds(merge.if, { ...base, inputs, needs }, jobStatus(needs))).toBe(true);
    const off = Object.fromEntries(parts.map((part) => [part, { result: 'skipped' }]));
    expect(
      holds(
        merge.if,
        { ...base, inputs: { ...inputs, 'should-run': false }, needs: off },
        jobStatus(off),
      ),
    ).toBe(false);
  });

  it('gives every part a blob of its own name, so the download merges none over another', () => {
    const { artifacts } = runParts(VITEST);
    const files = artifacts.flatMap(({ files: held }) => Object.keys(held));

    expect(artifacts.length).toBeGreaterThanOrEqual(3);
    expect(files).toHaveLength(artifacts.length);
    expect(new Set(files).size).toBe(files.length);
  });

  it("merges when every part left its blob, a failed part's among them", () => {
    const { artifacts, parts } = runParts(VITEST);
    const run = runMerge(VITEST, artifacts, { ...allPassed(parts), [parts[0]]: 'failure' });

    expect(run.status, run.log).toBe(0);
    expect(run.merged).toBe(true);
    expect(run.outputs['blobs-missing']).not.toBe('true');
  });

  it.each(['vitest-dom', 'vitest-node', 'vitest-db'])(
    'merges nothing, and says a blob is missing, when %s left none',
    (lost) => {
      const { artifacts, parts } = runParts(VITEST);
      const kept = artifacts.filter(({ name }) => !name.includes(lost.replace('vitest-', '')));
      const run = runMerge(VITEST, kept, { ...allPassed(parts), [lost]: 'failure' });

      expect(kept.length).toBeLessThan(artifacts.length);
      expect(run.status).not.toBe(0);
      expect(run.merged).toBe(false);
      expect(run.outputs['blobs-missing']).toBe('true');
    },
  );

  it.each([
    ['is dropped', 'drop'],
    ['is added', 'add'],
  ] as const)(
    'counts the blobs from the parts it needs, not a fixed three, when a part %s',
    (_, change) => {
      const workflow = withParts(change);
      const { artifacts, parts } = runParts(workflow);
      const run = runMerge(workflow, artifacts, allPassed(parts));

      expect(parts).toHaveLength(change === 'drop' ? 2 : 4);
      expect(run.status, run.log).toBe(0);
      expect(run.merged).toBe(true);
    },
  );

  it.each([
    ['is dropped', 'drop'],
    ['is added', 'add'],
  ] as const)('still refuses a missing blob when a part %s', (_, change) => {
    const workflow = withParts(change);
    const { artifacts, parts } = runParts(workflow);
    const run = runMerge(workflow, artifacts.slice(1), {
      ...allPassed(parts),
      [parts[0]]: 'failure',
    });

    expect(artifacts.length).toBe(parts.length);
    expect(run.merged).toBe(false);
    expect(run.outputs['blobs-missing']).toBe('true');
  });

  describe("the merged run's alert for failures no part's row shows", () => {
    const vitestResults = {
      numPassedTests: 0,
      numFailedTests: 1,
      numTotalTests: 1,
      startTime: 1000,
      testResults: [
        {
          name: '/app/tests/testwort.test.ts',
          status: 'failed',
          startTime: 1000,
          endTime: 2000,
          assertionResults: [
            {
              status: 'failed',
              fullName: 'Testwort fails',
              failureMessages: ['expected Testwort'],
            },
          ],
        },
      ],
    };
    const alertWhen = (workflow: Workflow, results: Record<string, string>) => {
      const merge = workflow.jobs.vitest;
      const step = (merge.steps ?? []).find((candidate) =>
        candidate.run?.includes('summarize-vitest.mjs'),
      ) as Step;
      const needs = Object.fromEntries(
        Object.entries(results).map(([name, result]) => [name, { result, outputs: {} }]),
      );
      writeFileSync(join(root, 'vitest-results.json'), JSON.stringify(vitestResults));
      writeFileSync(join(root, 'output.log'), 'Testwort merge log');
      const run = runStepScript(step, {
        context: {
          ...base,
          inputs: vitestInputs(),
          needs,
          steps: { run: { outcome: 'failure', outputs: {} } },
        },
        root,
        env: { VITEST_RESULTS: join(root, 'vitest-results.json') },
      });
      expect(run.status, run.log).toBe(0);
      return run.outputs.alert ?? '';
    };
    const parts = partJobs(VITEST).map(([name]) => name);

    it('is raised when every part passed and the merged run found a failure', () => {
      expect(alertWhen(VITEST, allPassed(parts))).not.toBe('');
    });

    it.each(parts)('is not raised when %s failed, since its row shows the failure', (failed) => {
      expect(alertWhen(VITEST, allPassed(parts))).not.toBe('');
      expect(alertWhen(VITEST, { ...allPassed(parts), [failed]: 'failure' })).toBe('');
    });

    it('is not raised when a part the job needs beyond the first three failed', () => {
      const workflow = withParts('add');
      const added = partJobs(workflow).map(([name]) => name);

      expect(added).toContain('vitest-testwort');
      expect(alertWhen(workflow, allPassed(added))).not.toBe('');
      expect(alertWhen(workflow, { ...allPassed(added), 'vitest-testwort': 'failure' })).toBe('');
    });
  });
});

// The pull request gate's view of the suites.

describe('the merged Playwright coverage job, as pr-gate calls it', () => {
  const job = PR_GATE.jobs['playwright-coverage'];
  const runs = (results: Record<string, Need>) => {
    const needs = { ...gateNeeds(), ...results };
    return holds(
      job.if,
      { ...base, needs },
      jobStatus(Object.fromEntries(needsOf(job).map((name) => [name, needs[name]]))),
    );
  };

  it('runs after a failed suite, and not on a stand-down', () => {
    const passed = { result: 'success', outputs: {} };
    const failed = { result: 'failure', outputs: {} };

    expect(runs({ playwright: passed, stories: passed })).toBe(true);
    expect(runs({ playwright: failed, stories: passed })).toBe(true);
    expect(
      runs({
        changes: { result: 'success', outputs: { 'stand-down': 'true' } },
        playwright: { result: 'skipped' },
        stories: { result: 'skipped' },
      }),
    ).toBe(false);
  });
});

describe('what a workflow reads from the workflows it calls', () => {
  it('is an output each called workflow declares, from an output one of its jobs declares', () => {
    const refs = readdirSync(fromRoot('.github/workflows'))
      .filter((file) => /\.ya?ml$/.test(file))
      .flatMap((file) => {
        const workflow = loadWorkflow(file);
        const text = JSON.stringify(workflow);
        return Object.entries(workflow.jobs)
          .filter(([, job]) => job.uses?.startsWith('./.github/workflows/'))
          .flatMap(([caller, job]) =>
            [...text.matchAll(new RegExp(`needs\\.${caller}\\.outputs\\.([\\w-]+)`, 'g'))].map(
              ([, output]) => ({
                file,
                caller,
                called: (job.uses as string).replace('./.github/workflows/', ''),
                output,
              }),
            ),
          );
      });
    const unbacked = refs.filter(({ called, output }) => {
      const workflow = loadWorkflow(called);
      const value = workflow.on.workflow_call?.outputs?.[output]?.value ?? '';
      const from = /jobs\.([\w-]+)\.outputs\.([\w-]+)/.exec(value);
      return !from || workflow.jobs[from[1]]?.outputs?.[from[2]] === undefined;
    });

    // Precondition: the scan found pr-gate's reads of its called workflows' outputs.
    expect(refs.filter(({ file }) => file === 'pr-gate.yml').length).toBeGreaterThan(0);
    expect(unbacked).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The Playwright shards, joined in playwright-coverage.yml, as pr-gate calls it after both suites: each
// suite's blobs merged with its own config, its comment section written, and the job failed when the gate
// suite failed and never for the stories.

type Suite = 'playwright' | 'stories';
type Story = { id: string; title: string; status: 'passed' | 'failed'; section: string };
/** One shard's blob: its share of the report, and for the stories its share of the checklist. */
type ShardReport = {
  files: { file: string; tests: TimedTest[] }[];
  duration: number;
  stories?: Story[];
};

const FAILURE = 'expected Testwort to boil';

/** Shard `n` of the gate suite: one spec file of its own, its one test failing when `failed`. */
const gateShard = (n: number, failed = false): ShardReport => ({
  files: [
    {
      file: `tests/e2e/testwort-${n}.spec.ts`,
      tests: [
        failed
          ? { title: `Testwort ${n} fails`, ms: 1_000, failed: FAILURE }
          : { title: `Testwort ${n} passes`, ms: 1_000 },
      ],
    },
  ],
  duration: 60_000,
});

/** Shard `n` of the story suite: one story of its own, failing when `failed`. */
const storyShard = (n: number, failed = false): ShardReport => ({
  files: [
    {
      file: `tests/e2e/stories/testwort-${n}.spec.ts`,
      tests: [
        {
          title: `Testwort story ${n}`,
          ms: 1_000,
          tags: [`story-9${n}`],
          ...(failed ? { failed: FAILURE } : {}),
        },
      ],
    },
  ],
  duration: 60_000,
  stories: [
    {
      id: `9${n}`,
      title: `Testwort story ${n}`,
      status: failed ? 'failed' : 'passed',
      section: 'Testwort',
    },
  ],
});

/** What each shard (by its 0-based index) left as its blob; `null` when it left none. */
type Shards = (index: number) => ShardReport | null;
const passing: Record<Suite, Shards> = {
  playwright: (index) => gateShard(index + 1),
  stories: (index) => storyShard(index + 1),
};

// `playwright merge-reports` as the CLI behaves: it reads the report files at the top of the folder it is
// given, fails when there are none, and writes the config's reporters — the json report under CI to
// PLAYWRIGHT_JSON_OUTPUT_NAME, and for the story config the checklist to STORIES_JSON. It exits 0 whatever
// the tests did. Each call is recorded in $MERGE_CALLS with the config, the files and the spec files merged.
const STUB_MERGE_NPX = `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const at = args.indexOf('merge-reports');
if (args[0] !== 'playwright' || at === -1) process.exit(0);
let config = 'playwright.config.ts';
const positional = [];
for (let i = at + 1; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--config' || arg === '-c') config = args[++i];
  else if (arg.startsWith('--config=')) config = arg.slice('--config='.length);
  else if (arg === '--reporter') i++;
  else if (!arg.startsWith('-')) positional.push(arg);
}
const dir = positional[positional.length - 1];
const files = dir && fs.existsSync(dir)
  ? fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name).sort()
  : [];
const blobs = files.map((file) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
fs.appendFileSync(process.env.MERGE_CALLS, JSON.stringify({
  config: path.basename(config),
  files,
  specs: blobs.flatMap((blob) => blob.suites.map((suite) => suite.file)).sort(),
}) + '\\n');
if (files.length === 0) {
  console.error('Error: no report files found in ' + dir);
  process.exit(1);
}
const sum = (key) => blobs.reduce((total, blob) => total + blob.stats[key], 0);
const report = {
  stats: {
    startTime: blobs[0].stats.startTime,
    duration: Math.max(...blobs.map((blob) => blob.stats.duration)),
    expected: sum('expected'),
    unexpected: sum('unexpected'),
    skipped: sum('skipped'),
    flaky: sum('flaky'),
  },
  suites: blobs.flatMap((blob) => blob.suites),
};
const write = (to, value) => {
  fs.mkdirSync(path.dirname(path.resolve(to)), { recursive: true });
  fs.writeFileSync(path.resolve(to), JSON.stringify(value));
};
if (process.env.CI && process.env.PLAYWRIGHT_JSON_OUTPUT_NAME) write(process.env.PLAYWRIGHT_JSON_OUTPUT_NAME, report);
if (/stories/.test(path.basename(config)) && process.env.STORIES_JSON) {
  const stories = blobs.flatMap((blob) => blob.stories ?? []);
  const count = (status) => stories.filter((story) => story.status === status).length;
  write(process.env.STORIES_JSON, {
    stories,
    unknown: [],
    untagged: [],
    counts: { passed: count('passed'), failed: count('failed'), skipped: 0, untested: 0 },
    total: stories.length,
  });
}
console.log('Merged ' + files.length + ' reports');
`;

// Node itself, but for the coverage merge, which the last describe below runs for real: here it reports
// that it merged.
const STUB_NODE = `#!/usr/bin/env bash
case "$1" in
  *merge-playwright-coverage.mjs) printf 'ran=true\\nsummary=Testwort coverage\\ndetails=\\n' >> "$GITHUB_OUTPUT" ;;
  *) exec "$REAL_NODE" "$@" ;;
esac
`;

/** The blob and coverage artifacts one suite's shards leave in the run, each shard's from `shards`. */
function shardArtifacts(suite: Suite, needs: Record<string, Need>, shards: Shards): Artifact[] {
  const inputs = callWith(PR_GATE.jobs[suite], PLAYWRIGHT, { ...base, needs });
  return jobRuns(PLAYWRIGHT, inputs)
    .filter(({ job, context }) => job.strategy?.matrix && holds(job.if, context, PASS))
    .flatMap(({ job, context }, index) => {
      const report = shards(index);
      if (report === null) return [];
      const at = { ...context, steps: {} };
      return uploadsOf(job.steps, at)
        .filter(({ step }) => holds(step.if, at, PASS))
        .flatMap(({ name, path }): Artifact[] => {
          if (BLOB.test(path)) {
            const blob = {
              ...mergedPlaywrightReport(report.files, report.duration),
              stories: report.stories,
            };
            return [{ name, files: { [`report-${index + 1}.zip`]: JSON.stringify(blob) } }];
          }
          if (path.includes('coverage-e2e')) return [{ name, files: { 'testwort.json': '{}' } }];
          return [];
        });
    });
}

interface Join {
  /** pr-gate's path filters, each on unless given. */
  filters?: Record<string, string>;
  /** The result of pr-gate's `playwright` and `stories` jobs, success unless given. */
  results?: Partial<Record<Suite, string>>;
  shards?: Partial<Record<Suite, Shards>>;
}

/**
 * pr-gate's `playwright-coverage` job, run: its inputs from the suites' results and what their called
 * workflow outputs, every job of playwright-coverage.yml run against the artifacts the shards left, and the
 * Playwright comment its steps write.
 */
async function runJoin({ filters = {}, results = {}, shards = {} }: Join = {}) {
  const gate = gateNeeds(filters);
  const suiteNeed = (suite: Suite): Need => ({
    result: results[suite] ?? 'success',
    outputs: calledOutputs(
      PLAYWRIGHT,
      callWith(PR_GATE.jobs[suite], PLAYWRIGHT, { ...base, needs: gate }),
      base,
    ),
  });
  const needs: Record<string, Need> = {
    ...gate,
    playwright: suiteNeed('playwright'),
    stories: suiteNeed('stories'),
  };
  const caller = PR_GATE.jobs['playwright-coverage'];
  expect(
    holds(
      caller.if,
      { ...base, needs },
      jobStatus(Object.fromEntries(needsOf(caller).map((name) => [name, needs[name]]))),
    ),
    'pr-gate runs playwright-coverage',
  ).toBe(true);

  const artifacts = (['playwright', 'stories'] as const).flatMap((suite) =>
    shardArtifacts(suite, gate, shards[suite] ?? passing[suite]),
  );
  const { github, comments } = fakeGitHub([]);
  const written: string[] = [];
  const merges = join(root, 'merge-calls');
  writeFileSync(merges, '');
  const uses: UsesHandler = async (step, context, jobRoot) => {
    if (step.uses?.startsWith('actions/download-artifact')) {
      downloadInto({ steps: [step] }, artifacts, context, jobRoot);
      return { outcome: 'success' };
    }
    if (usesComment(step)) {
      written.push(stringify(evaluateValue(step.with?.section, context)));
      const result = await lib.postComment({
        github,
        context: commentContext,
        core,
        inputs: lib.inputsFromEnv(actionEnv(step, context)),
        readFile: () => 'Testwort log line',
        sleep: async () => {},
        random: () => 0,
      });
      return { outcome: result === 'written' ? 'success' : 'failure' };
    }
    if (step.uses === './.github/actions/job-summary') return { outcome: 'success' };
    return undefined;
  };
  const jobs = await runWorkflow(COVERAGE, {
    context: { ...base, inputs: callWith(caller, COVERAGE, { ...base, needs }) },
    root,
    stubs: { npx: STUB_MERGE_NPX, node: STUB_NODE },
    env: { MERGE_CALLS: merges, REAL_NODE: process.execPath },
    uses,
  });
  const merged = readFileSync(merges, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { config: string; files: string[]; specs: string[] });

  expect(comments.length, 'one Playwright comment at most').toBeLessThanOrEqual(1);
  return {
    failed: Object.values(jobs).some(({ result }) => result === 'failure'),
    log: Object.values(jobs)
      .map(({ log }) => log)
      .join('\n'),
    merges: Object.fromEntries(
      (['playwright.config.ts', 'playwright.stories.config.ts'] as const).map((config) => [
        config === 'playwright.config.ts' ? 'gate' : 'stories',
        merged.filter((call) => call.config === config),
      ]),
    ) as Record<'gate' | 'stories', typeof merged>,
    written,
    sections: comments.length ? sectionsOf(comments[0].body) : {},
  };
}

const specsOf = (suite: Suite, count: number) =>
  Array.from({ length: count }, (_, index) => passing[suite](index)?.files[0].file).sort();

describe('the Playwright shards, joined in playwright-coverage', () => {
  it("merges each suite once, with its own config, from every shard's blob of that suite alone", async () => {
    const run = await runJoin();

    expect(run.merges.gate).toHaveLength(1);
    expect(run.merges.stories).toHaveLength(1);
    expect(run.merges.gate[0].specs).toEqual(specsOf('playwright', 3));
    expect(run.merges.stories[0].specs).toEqual(specsOf('stories', 2));
    expect(run.written.filter((section) => section === 'gate')).toHaveLength(1);
    expect(run.written.filter((section) => section === 'stories')).toHaveLength(1);
    // The story section is the checklist of every shard's stories, as summarize-stories writes it.
    expect(run.sections.stories?.block).toContain('Testwort story 1');
    expect(run.sections.stories?.block).toContain('Testwort story 2');
  });

  const failGate: Shards = (index) => gateShard(index + 1, index === 1);
  const loseGate: Shards = (index) => (index === 1 ? null : gateShard(index + 1));
  const failStory: Shards = (index) => storyShard(index + 1, index === 1);
  const loseStory: Shards = (index) => (index === 1 ? null : storyShard(index + 1));
  const none: Shards = () => null;

  it.each([
    [
      'passes, every section passed, when both suites passed',
      {},
      { fails: false, gate: 'passed', stories: 'passed', coverage: 'passed' },
    ],
    [
      'fails, the gate section failed, when a gate test failed',
      { results: { playwright: 'failure' }, shards: { playwright: failGate } },
      { fails: true, gate: 'failed', stories: 'passed', coverage: 'failed' },
    ],
    [
      'fails, the gate section failed, when a gate shard left no blob',
      { results: { playwright: 'failure' }, shards: { playwright: loseGate } },
      { fails: true, gate: 'failed', stories: 'passed' },
    ],
    [
      'fails, the gate section failed, when no gate shard left a blob',
      { results: { playwright: 'failure' }, shards: { playwright: none } },
      { fails: true, gate: 'failed', stories: 'passed' },
    ],
    [
      'fails when a gate shard left no blob though every shard job passed',
      { shards: { playwright: loseGate } },
      { fails: true, gate: 'failed' },
    ],
    [
      'fails when the merged gate report holds a failed test though every shard job passed',
      { shards: { playwright: failGate } },
      { fails: true, gate: 'failed' },
    ],
    [
      'passes, the stories section failed, when a story failed',
      { shards: { stories: failStory } },
      { fails: false, gate: 'passed', stories: 'failed', coverage: 'failed' },
    ],
    [
      'passes, the stories section failed, when a story shard left no blob',
      { shards: { stories: loseStory } },
      { fails: false, gate: 'passed', stories: 'failed' },
    ],
    [
      'passes, the stories section failed, when no story shard left a blob',
      { shards: { stories: none } },
      { fails: false, gate: 'passed', stories: 'failed' },
    ],
  ] as [string, Join, { fails: boolean; gate?: string; stories?: string; coverage?: string }][])(
    '%s',
    async (_, scenario, expected) => {
      const run = await runJoin(scenario);
      const { fails, ...statuses } = expected;

      expect(run.failed, run.log).toBe(fails);
      for (const [section, status] of Object.entries(statuses)) {
        expect(
          run.written.filter((key) => key === section),
          section,
        ).toHaveLength(1);
        expect(run.sections[section]?.status, section).toBe(status);
      }
    },
  );

  it('lists the failed gate test in the gate section, from the shard that ran it', async () => {
    const run = await runJoin({
      results: { playwright: 'failure' },
      shards: { playwright: (index) => gateShard(index + 1, index === 1) },
    });

    expect(run.sections.gate?.block).toContain('Testwort 2 fails');
    expect(run.sections.gate?.block).not.toContain('Testwort 1 passes');
  });

  it.each([
    ['gate', { playwright: 'false' }, 'stories'],
    ['story', { stories: 'false' }, 'gate'],
  ] as const)(
    'merges and writes only the other suite, and fails nothing, when the path filter rules the %s suite out',
    async (_, filters, kept) => {
      const run = await runJoin({ filters });
      const dropped = kept === 'gate' ? 'stories' : 'gate';

      expect(run.failed, run.log).toBe(false);
      expect(run.merges[kept]).toHaveLength(1);
      expect(run.merges[dropped]).toEqual([]);
      expect(run.written).toContain(kept);
      expect(run.written).not.toContain(dropped);
      expect(run.sections[kept]?.status).toBe('passed');
    },
  );

  it('merges nothing, writes nothing and fails nothing when the path filter rules both suites out', async () => {
    const run = await runJoin({ filters: { playwright: 'false', stories: 'false' } });

    expect(run.failed, run.log).toBe(false);
    expect(run.merges).toEqual({ gate: [], stories: [] });
    expect(run.written).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The Playwright comment, end to end: what the joining steps write, through the pr-comment action, into the
// comment on the pull request.

/** Each of a job's steps with an id, as a passed step leaves it, with the outputs given for some. */
function passedSteps(job: Job, outputs: Record<string, Record<string, string>> = {}) {
  return Object.fromEntries(
    (job.steps ?? [])
      .filter((step) => step.id)
      .map((step) => [
        step.id,
        { outcome: 'success', conclusion: 'success', outputs: outputs[step.id as string] ?? {} },
      ]),
  );
}

/** The comment one pr-comment step writes into a pull request that has none. */
async function commentFrom(step: Step, context: Context) {
  const { github, comments } = fakeGitHub([]);
  const result = await lib.postComment({
    github,
    context: commentContext,
    core,
    inputs: lib.inputsFromEnv(actionEnv(step, context)),
    readFile: () => 'Testwort log line',
    sleep: async () => {},
    random: () => 0,
  });

  expect(result).toBe('written');
  expect(comments).toHaveLength(1);
  return comments[0].body;
}

const SOURCE = ['A', 'B', 'C', 'D']
  .map((name) => `function testwort${name}() { return 1; }\n`)
  .join('');

/** One shard's raw monocart coverage of one script, its named functions called or not. */
async function writeRawCoverage(outputDir: string, called: readonly string[]) {
  const functions = ['A', 'B', 'C', 'D'].map((name) => {
    const startOffset = SOURCE.indexOf(`function testwort${name}`);
    const endOffset = SOURCE.indexOf('}', startOffset) + 1;
    return {
      functionName: `testwort${name}`,
      ranges: [{ startOffset, endOffset, count: called.includes(name) ? 1 : 0 }],
      isBlockCoverage: false,
    };
  });
  const report = MCR({
    outputDir,
    reports: ['raw', 'json-summary'],
    sourceFilter: { '**/node_modules/**': false, '**/src/**': true },
    logging: 'error',
  });
  await report.add([
    {
      url: 'http://localhost:8001/_next/static/chunks/src/lib/testwort.js',
      scriptId: '1',
      source: SOURCE,
      functions: [
        {
          functionName: '',
          ranges: [{ startOffset: 0, endOffset: SOURCE.length, count: 1 }],
          isBlockCoverage: false,
        },
        ...functions,
      ],
    },
  ]);
  await report.generate();
}

describe('the Playwright comment, from the sharded suites', () => {
  it("shows the gate suite's duration, its slowest files and each test over 30 s, from every shard's report", async () => {
    const SLOW = 'tests/e2e/testwort-slow.spec.ts';
    const shards: ShardReport[] = [
      {
        files: [
          {
            file: SLOW,
            tests: [
              { title: 'Testwort boils', ms: 25_000 },
              { title: 'Testwort cools', ms: 20_000 },
            ],
          },
        ],
        duration: 250_000,
      },
      {
        files: [
          {
            file: 'tests/e2e/testwort-over.spec.ts',
            tests: [{ title: 'Testwort simmers', ms: 31_000 }],
          },
        ],
        duration: 120_000,
      },
      gateShard(3),
    ];

    const run = await runJoin({ shards: { playwright: (index) => shards[index] } });

    expect(run.written.filter((section) => section === 'gate')).toHaveLength(1);
    const gate = run.sections.gate;
    const text = `${gate?.summary ?? ''}\n${gate?.block ?? ''}`;
    const lines = text.split('\n');
    expect(text).toContain('4m 10s');
    expect(lines.some((line) => line.includes(`\`${SLOW}\``) && line.includes('45.0 s'))).toBe(
      true,
    );
    expect(lines.some((line) => line.includes('⚠') && line.includes('Testwort simmers'))).toBe(
      true,
    );
    expect(lines.some((line) => line.includes('⚠') && /Testwort (boils|cools)/.test(line))).toBe(
      false,
    );
  });

  it("shows the gate and story coverage merged from every shard, and the stories' own figure on a line of its own", async () => {
    const artifacts = coverageArtifacts();
    const gate = artifacts.filter(({ caller }) => caller === 'playwright').map(({ name }) => name);
    const stories = artifacts.filter(({ caller }) => caller === 'stories').map(({ name }) => name);
    const job = COVERAGE.jobs['playwright-coverage'];
    const inputs = callWith(PR_GATE.jobs['playwright-coverage'], COVERAGE, {
      ...base,
      needs: {
        ...gateNeeds(),
        playwright: { result: 'success', outputs: { outcome: 'success' } },
        stories: { result: 'success', outputs: { outcome: 'success' } },
      },
    });
    const context: Context = { ...base, inputs, needs: {}, steps: {} };

    expect(gate).toHaveLength(3);
    expect(stories).toHaveLength(2);
    // The gate's shards each call a function of their own; both story shards call the same one; none calls D.
    const called: Record<string, string[]> = {
      [gate[0]]: ['A'],
      [gate[1]]: ['B'],
      [gate[2]]: [],
      [stories[0]]: ['C'],
      [stories[1]]: ['C'],
    };
    const landed = landings(downloadsOf(job.steps, context), Object.keys(called));
    for (const [artifact, names] of Object.entries(called)) {
      for (const folder of landed.get(artifact) ?? [])
        await writeRawCoverage(underRoot(folder, root), names);
    }

    const merge = (job.steps ?? []).find((step) =>
      step.run?.includes('merge-playwright-coverage'),
    ) as Step;
    const checked = passedSteps(job, { check: { missing: '' } });
    const merged = runStepScript(merge, {
      context: { ...context, steps: checked },
      root,
      env: {
        DOWNLOAD_DIR: underRoot('/app/.reports/coverage-downloads', root),
        MERGED_OUTPUT_DIR: underRoot('/app/.reports/coverage-e2e-merged', root),
        REPO_ROOT: root,
      },
    });
    expect(merged.status, merged.log).toBe(0);
    expect(merged.outputs.ran).toBe('true');

    const steps = passedSteps(job, {
      check: { missing: '' },
      [merge.id as string]: merged.outputs,
    });
    const writing = (job.steps ?? [])
      .filter(usesComment)
      .filter((step) => holds(step.if, { ...context, steps }, PASS));
    expect(writing).toHaveLength(1);
    const lines = (await commentFrom(writing[0], { ...context, steps })).split('\n');

    expect(lines.some((line) => line.includes('75% functions'))).toBe(true);
    const storyLines = lines.filter(
      (line) => /stor(y|ies)/i.test(line) && line.includes('% functions'),
    );
    expect(storyLines.some((line) => line.includes('25% functions') && !line.includes('75%'))).toBe(
      true,
    );
  });
});
