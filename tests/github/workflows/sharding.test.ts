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
  type Workflow,
  RECORDING_STUB,
  actionEnv,
  callWith,
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
  stringify,
  underRoot,
  uploadsOf,
} from '../../support/github-workflow';
import { mergedPlaywrightReport } from '../../support/github-scripts';
import { fromRoot } from '../../support/paths';
import { context as commentContext, core, fakeGitHub, lib } from '../../support/pr-comment';

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

/** playwright.yml's job that needs the shards and runs `playwright merge-reports`. */
function mergeJob(): [string, Job] {
  const [shardName] = shardJob();
  const found = Object.entries(PLAYWRIGHT.jobs).find(
    ([, job]) =>
      needsOf(job).includes(shardName) &&
      (job.steps ?? []).some((step) => step.run?.includes('merge-reports')),
  );
  expect(
    found,
    'playwright.yml has a job that needs the shards and runs merge-reports',
  ).toBeDefined();
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

  it('joins the shards in the merge-reports job, which runs after a failed shard and not when the suite is off', () => {
    const [shardName] = shardJob();
    const [, merge] = mergeJob();
    const runsAfter = (result: string, shouldRun: boolean) => {
      const inputs = { ...playwrightInputs('playwright'), 'should-run': shouldRun };
      const needs = { [shardName]: { result, outputs: {} } };
      return holds(merge.if, { ...base, inputs, needs }, jobStatus(needs));
    };

    expect(runsAfter('success', true)).toBe(true);
    expect(runsAfter('failure', true)).toBe(true);
    expect(runsAfter('skipped', false)).toBe(false);
  });

  it('fails the merge-reports job when a shard failed, and not for that reason when every shard passed', () => {
    const [shardName] = shardJob();
    const [, merge] = mergeJob();
    const inputs = playwrightInputs('playwright');
    const attempt = (step: Step, result: string) => {
      const context = {
        ...base,
        inputs,
        needs: { [shardName]: { result, outputs: {} } },
        steps: {},
      };
      if (!holds(step.if, context, { success: true, failure: false })) return 'skipped';
      const calls = join(root, 'calls');
      writeFileSync(calls, '');
      const run = runStepScript(step, {
        context,
        root,
        stubs: { npm: RECORDING_STUB, npx: RECORDING_STUB },
        env: { STUB_CALLS: calls },
      });
      return run.status === 0 ? 'passed' : 'failed';
    };
    const failsTheJob = (merge.steps ?? []).filter(
      (step) =>
        step.run && attempt(step, 'failure') === 'failed' && attempt(step, 'success') !== 'failed',
    );

    expect(failsTheJob.length).toBeGreaterThan(0);
  });

  it("gives the suite's outcome from the merge-reports job, so the last shard to finish cannot hide a failure", () => {
    const [shardName] = shardJob();
    const [mergeName] = mergeJob();
    const value = PLAYWRIGHT.on.workflow_call?.outputs?.outcome?.value;
    const jobs = {
      [shardName]: { result: 'success', outputs: { outcome: 'success' } },
      [mergeName]: { result: 'failure', outputs: { outcome: 'failure' } },
    };

    expect(evaluateValue(value, { jobs })).toBe('failure');
  });

  it.each([
    ['playwright', 'gate'],
    ['stories', 'stories'],
  ] as const)(
    "writes the %s suite's comment section once, from the merge-reports job",
    (caller, section) => {
      const [mergeName] = mergeJob();
      const writes = jobRuns(PLAYWRIGHT, playwrightInputs(caller)).flatMap(
        ({ name, job, context }) =>
          (job.steps ?? [])
            .filter(usesComment)
            .filter((step) => holds(step.if, context, { success: true, failure: false }))
            .map((step) => ({
              name,
              section: stringify(evaluateValue(step.with?.section, context)),
            })),
      );

      expect(writes).toEqual([{ name: mergeName, section }]);
    },
  );

  it("downloads every shard's blob of its own suite into the merge, and none of the other suite's", () => {
    const [shardName, shard] = shardJob();
    const [, merge] = mergeJob();
    const uploads = (caller: 'playwright' | 'stories') =>
      jobRuns(PLAYWRIGHT, playwrightInputs(caller))
        .filter(({ name }) => name === shardName)
        .flatMap(({ context }) => uploadsOf(shard.steps, context));
    const everyName = [...uploads('playwright'), ...uploads('stories')].map(({ name }) => name);

    for (const caller of ['playwright', 'stories'] as const) {
      const inputs = playwrightInputs(caller);
      const context = { ...base, inputs, needs: { [shardName]: { result: 'success' } }, steps: {} };
      const fetched = downloadsOf(merge.steps, context).map((download) =>
        fetchedBy(download, everyName).sort(),
      );
      // The blobs are one upload step's artifacts: one per shard of this suite.
      const own = uploads(caller);
      const perStep = [...new Set(own.map(({ step }) => step))].map((step) =>
        own
          .filter((upload) => upload.step === step)
          .map(({ name }) => name)
          .sort(),
      );
      const shards = matrixRuns(shard, { ...base, inputs }).length;

      expect(shards).toBeGreaterThan(1);
      expect(
        fetched.some(
          (names) =>
            names.length === shards && perStep.some((step) => step.join() === names.join()),
        ),
      ).toBe(true);
    }
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

/** The merge job's downloads, into its own /app, of the artifacts the run holds. */
function downloadInto(job: Job, artifacts: Artifact[], context: Context) {
  for (const download of downloadsOf(job.steps, context)) {
    const fetched = fetchedBy(
      download,
      artifacts.map(({ name }) => name),
    );
    for (const artifact of artifacts.filter(({ name }) => fetched.includes(name))) {
      const landed = landings([download], fetched).get(artifact.name) ?? [];
      for (const folder of landed) {
        const at = underRoot(folder, root);
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
  const scenario = (results: Record<string, Need>) => {
    const needs = { ...gateNeeds(), ...results };
    return {
      runs: holds(
        job.if,
        { ...base, needs },
        jobStatus(Object.fromEntries(needsOf(job).map((name) => [name, needs[name]]))),
      ),
      failed: callWith(job, COVERAGE, { ...base, needs })['suites-failed'],
    };
  };

  it('runs after a failed suite, and is told one failed', () => {
    const passed = { result: 'success', outputs: { outcome: 'success' } };
    const failed = { result: 'failure', outputs: { outcome: 'failure' } };

    expect(scenario({ playwright: passed, stories: passed })).toEqual({
      runs: true,
      failed: false,
    });
    expect(scenario({ playwright: failed, stories: passed })).toEqual({ runs: true, failed: true });
    // The story suite's jobs pass whatever its stories did; its outcome says.
    expect(
      scenario({
        playwright: passed,
        stories: { result: 'success', outputs: { outcome: 'failure' } },
      }),
    ).toEqual({
      runs: true,
      failed: true,
    });
  });
});

// ---------------------------------------------------------------------------
// The Playwright comment, end to end: what the joining steps write, through the pr-comment action, into the
// comment on the pull request.

const PASS = { success: true, failure: false };

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
    const inputs = playwrightInputs('playwright');
    const writers = jobRuns(PLAYWRIGHT, inputs).filter(({ job }) =>
      (job.steps ?? []).some((step) => step.run?.includes('summarize-playwright')),
    );
    const report = join(root, 'testwort-report.json');
    writeFileSync(
      report,
      JSON.stringify(
        mergedPlaywrightReport(
          [
            {
              file: SLOW,
              tests: [
                { title: 'Testwort boils', ms: 25_000 },
                { title: 'Testwort cools', ms: 20_000 },
              ],
            },
            {
              file: 'tests/e2e/testwort-over.spec.ts',
              tests: [{ title: 'Testwort simmers', ms: 31_000 }],
            },
          ],
          250_000,
        ),
      ),
    );

    const bodies: string[] = [];
    for (const { job, context: jobContext } of writers) {
      const context = {
        ...jobContext,
        needs: Object.fromEntries(
          needsOf(job).map((need) => [need, { result: 'success', outputs: {} }]),
        ),
      };
      const summarise = (job.steps ?? []).find((step) =>
        step.run?.includes('summarize-playwright'),
      ) as Step;
      const summary = runStepScript(summarise, {
        context: { ...context, steps: passedSteps(job) },
        root,
        env: { PLAYWRIGHT_JSON_OUTPUT_NAME: report },
      });
      expect(summary.status, summary.log).toBe(0);
      const steps = passedSteps(job, { [summarise.id as string]: summary.outputs });
      for (const step of (job.steps ?? []).filter(usesComment)) {
        const at = { ...context, steps };
        if (!holds(step.if, at, PASS) || evaluateValue(step.with?.section, at) !== 'gate') continue;
        bodies.push(await commentFrom(step, at));
      }
    }

    expect(bodies).toHaveLength(1);
    const lines = bodies[0].split('\n');
    expect(bodies[0]).toContain('4m 10s');
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
