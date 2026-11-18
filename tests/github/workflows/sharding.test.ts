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
import { dirname, join, matchesGlob } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  runJob,
  runStepScript,
  runWorkflow,
  stringify,
  underRoot,
  uploadsOf,
  workflowResult,
} from '../../support/github-workflow';
import {
  type TimedTest,
  countNote,
  mergedPlaywrightReport,
  resultFacts,
} from '../../support/github-scripts';
import { fromRoot } from '../../support/paths';
import {
  context as commentContext,
  core,
  fakeGitHub,
  headingNotesOf,
  lib,
  rowsOf,
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

/** The accessibility sweep, the gate spec that runs in a job of its own. */
const SWEEP = 'tests/e2e/axe.spec.ts';

/** One shard job's call of its suite: the npm script, the arguments it hands Playwright, and its environment. */
type SuiteCall = { script: string; args: string[]; env: Record<string, string> };

// npm, recording each call's arguments and environment as one JSON line in $STUB_CALLS.
const RECORDING_NPM = `#!${process.execPath}
require('node:fs').appendFileSync(process.env.STUB_CALLS, JSON.stringify({ argv: process.argv.slice(2), env: process.env }) + '\\n');
`;

/** Each job of one caller of playwright.yml that runs, in matrix order, with the call its run step makes. */
function suiteCalls(caller: 'playwright' | 'stories' | 'warm') {
  const inputs = playwrightInputs(caller);
  return jobRuns(PLAYWRIGHT, inputs)
    .filter(({ job, context }) => job.strategy?.matrix && holds(job.if, context, PASS))
    .map(({ job, context }, index) => {
      const runStep = (job.steps ?? []).find((step) => /\bnpm run\b/.test(step.run ?? ''));
      expect(runStep, 'the shard job has a step that runs the suite').toBeDefined();
      const calls = join(root, `calls-${caller}-${index}`);
      writeFileSync(calls, '');
      const run = runStepScript(runStep as Step, {
        context: { ...context, steps: {} },
        root,
        stubs: { npm: RECORDING_NPM },
        baseEnv: Object.fromEntries(
          Object.entries(evaluateMap(job.env, context)).map(([key, value]) => [
            key,
            stringify(value),
          ]),
        ),
        env: { STUB_CALLS: calls },
      });
      expect(run.status, run.log).toBe(0);
      const lines = readFileSync(calls, 'utf8').split('\n').filter(Boolean);
      expect(lines, 'the run step calls npm once').toHaveLength(1);
      const { argv, env } = JSON.parse(lines[0]) as { argv: string[]; env: Record<string, string> };
      expect(argv[0]).toBe('run');
      const dashes = argv.indexOf('--');
      const call: SuiteCall = {
        script: argv[1],
        args: dashes === -1 ? [] : argv.slice(dashes + 1),
        env,
      };
      return { context, call, shard: flagValue(call.args, '--shard') };
    });
}

/** A flag's value, from `--flag value` or `--flag=value`; undefined when the flag is not given. */
function flagValue(args: string[], name: string): string | undefined {
  const at = args.findIndex((arg) => arg === name || arg.startsWith(`${name}=`));
  if (at === -1) return undefined;
  return args[at].includes('=') ? args[at].slice(name.length + 1) : args[at + 1];
}

// Playwright CLI flags that take a value, so their value is not read as a file filter.
const VALUE_FLAGS = new Set([
  '--shard',
  '--reporter',
  '--grep',
  '-g',
  '--grep-invert',
  '--project',
  '--config',
  '-c',
  '--workers',
  '-j',
  '--retries',
  '--repeat-each',
  '--max-failures',
  '--timeout',
  '--output',
  '--global-timeout',
  '--trace',
  '--tsconfig',
]);

const DEFAULT_TEST_MATCH = /\.(spec|test)\.[cm]?[jt]sx?$/;

type Matcher = RegExp | string | (RegExp | string)[] | undefined;

/** Whether a config's testMatch or testIgnore matches a file, as Playwright reads a RegExp or a glob. */
function matcherHolds(matcher: Matcher, absolute: string, relative: string): boolean {
  if (matcher === undefined) return false;
  return [matcher]
    .flat()
    .some((one) =>
      typeof one === 'string'
        ? matchesGlob(relative, one) || matchesGlob(relative, `**/${one}`)
        : one.test(absolute),
    );
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && !entry.parentPath.includes('node_modules'))
    .map((entry) => join(entry.parentPath, entry.name));
}

/**
 * The spec files a call of the e2e or story suite runs, as Playwright selects them: its config (the npm
 * script's, loaded under the call's environment) by each project's testMatch and testIgnore, then the
 * command line's file filters, `--project`, `--grep` and `--grep-invert`. A grep is matched against what
 * Playwright matches it against that a whole file shares: the project name, the file's path and the tags the
 * file writes. Sharding is left out: a `--shard` takes its share of whatever this selects.
 */
async function specsRun({ script, args, env }: SuiteCall): Promise<string[]> {
  const scripts = JSON.parse(readFileSync(fromRoot('package.json'), 'utf8')).scripts as Record<
    string,
    string
  >;
  const scriptArgs = (scripts[script] ?? '').split(/\s+/);
  const configFile =
    flagValue(args, '--config') ??
    flagValue(args, '-c') ??
    flagValue(scriptArgs, '--config') ??
    flagValue(scriptArgs, '-c') ??
    'playwright.config.ts';
  const allArgs = [...scriptArgs.slice(scriptArgs.indexOf('test') + 1), ...args];

  // The variables the call set that this process does not hold alike, CI's own bookkeeping aside.
  const set = Object.entries(env).filter(
    ([key, value]) =>
      process.env[key] !== value &&
      !/^(GITHUB_|RUNNER_|STUB_|PATH$|PWD$|OLDPWD$|SHLVL$|_$)/.test(key),
  );
  vi.resetModules();
  for (const [key, value] of set) vi.stubEnv(key, value);
  let config: {
    testDir?: string;
    testMatch?: Matcher;
    testIgnore?: Matcher;
    projects?: { name?: string; testDir?: string; testMatch?: Matcher; testIgnore?: Matcher }[];
  };
  try {
    config = ((await import(fromRoot(configFile))) as { default: typeof config }).default;
  } finally {
    vi.unstubAllEnvs();
  }

  const positional: string[] = [];
  const greps: RegExp[] = [];
  const inverts: RegExp[] = [];
  const projectNames: string[] = [];
  for (let i = 0; i < allArgs.length; i++) {
    const arg = allArgs[i];
    if (!arg) continue;
    const [name, inline] = arg.startsWith('--') && arg.includes('=') ? arg.split(/=(.*)/s) : [arg];
    if (VALUE_FLAGS.has(name)) {
      const value = inline ?? allArgs[++i];
      if (name === '--grep' || name === '-g') greps.push(new RegExp(value));
      if (name === '--grep-invert') inverts.push(new RegExp(value));
      if (name === '--project') projectNames.push(value);
    } else if (!arg.startsWith('-')) positional.push(arg);
  }

  const run = new Set<string>();
  for (const project of config.projects ?? [{}]) {
    if (projectNames.length && !projectNames.includes(project.name ?? '')) continue;
    const testDir = fromRoot(project.testDir ?? config.testDir ?? '.');
    const testMatch = project.testMatch ?? config.testMatch ?? DEFAULT_TEST_MATCH;
    const testIgnore = project.testIgnore ?? config.testIgnore;
    for (const absolute of filesUnder(testDir)) {
      const fromTestDir = absolute.slice(testDir.length + 1);
      const fromRepo = absolute.slice(fromRoot('.').replace(/\/?$/, '/').length);
      if (!matcherHolds(testMatch, absolute, fromTestDir)) continue;
      if (matcherHolds(testIgnore, absolute, fromTestDir)) continue;
      if (positional.length && !positional.some((filter) => new RegExp(filter).test(absolute)))
        continue;
      const tags = [...readFileSync(absolute, 'utf8').matchAll(/['"`](@[\w:-]+)['"`]/g)].map(
        ([, tag]) => tag,
      );
      const titled = [project.name ?? '', fromTestDir, fromRepo, ...tags].join(' ');
      if (greps.length && !greps.some((grep) => grep.test(titled))) continue;
      if (inverts.some((grep) => grep.test(titled))) continue;
      run.add(fromRepo);
    }
  }
  return [...run].sort();
}

/** A suite's specs as a plain call of its npm script runs them, with no filter, on the shard job's own environment. */
async function wholeSuite(caller: 'playwright' | 'stories') {
  const [{ context }] = suiteCalls(caller);
  const [, job] = shardJob();
  const env = Object.fromEntries(
    Object.entries(evaluateMap(job.env, context)).map(([key, value]) => [key, stringify(value)]),
  );
  return specsRun({ script: caller === 'playwright' ? 'e2e' : 'test:stories', args: [], env });
}

describe('the Playwright suites, sharded', () => {
  it.each([
    ['gate', 'playwright', 'e2e', ['1/3', '2/3', '3/3', undefined]],
    ['story', 'stories', 'test:stories', ['1/2', '2/2']],
  ] as const)(
    'runs the %s suite as these jobs in matrix order, each with this --shard: %j',
    (_, caller, script, shards) => {
      const calls = suiteCalls(caller);

      expect(calls.map(({ call }) => call.script)).toEqual(shards.map(() => script));
      expect(calls.map(({ shard }) => shard)).toEqual(shards);
      // Each job is one of the matrix's, so its artifacts and its comment row take their index from it.
      expect(calls.map(({ context }) => context.strategy?.['job-index'])).toEqual(
        shards.map((__, index) => index),
      );
    },
  );

  it('runs the accessibility sweep alone in the last gate job, and every other gate spec in each of the three shard jobs alike', async () => {
    const whole = await wholeSuite('playwright');
    const calls = suiteCalls('playwright');
    // Preconditions: a plain `npm run e2e` runs the sweep among many other specs, and the gate has four jobs.
    expect(whole).toContain(SWEEP);
    expect(whole.length).toBeGreaterThan(10);
    expect(calls).toHaveLength(4);

    const runs = await Promise.all(calls.map(({ call }) => specsRun(call)));
    const rest = whole.filter((spec) => spec !== SWEEP);

    expect(runs[3]).toEqual([SWEEP]);
    expect(calls[3].shard).toBeUndefined();
    for (const [index, specs] of runs.slice(0, 3).entries()) {
      expect(specs, `gate job ${index + 1}`).toEqual(rest);
      expect(calls[index].shard).toBe(`${index + 1}/3`);
    }
  });

  it('leaves no story out of either story job, and runs no spec under build-only', async () => {
    const stories = await wholeSuite('stories');
    const storyRuns = await Promise.all(suiteCalls('stories').map(({ call }) => specsRun(call)));
    const warm = suiteCalls('warm');
    // Precondition: the story suite has specs to leave out.
    expect(stories.length).toBeGreaterThan(0);

    expect(storyRuns).toEqual([stories, stories]);
    expect(warm).toHaveLength(1);
    expect(await specsRun(warm[0].call)).toEqual([]);
  });

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

  it('runs no shard of a suite the path filter rules out', () => {
    const shards = (filters: Record<string, string>, caller: 'playwright' | 'stories') =>
      jobRuns(
        PLAYWRIGHT,
        callWith(PR_GATE.jobs[caller], PLAYWRIGHT, { ...base, needs: gateNeeds(filters) }),
      ).filter(({ job, context }) => holds(job.if, context, PASS));

    expect(shards({}, 'playwright')).toHaveLength(4);
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

    expect(left('playwright')).toEqual({ runs: 4, uploads: 8 });
    expect(left('warm')).toEqual({ runs: 1, uploads: 0 });
  });
});

describe("the accessibility sweep's gate job, to everything downstream", () => {
  it('is the fourth of four gate shards: its blob and coverage carry index 4, and the join counts four', async () => {
    const calls = suiteCalls('playwright');
    const runs = await Promise.all(calls.map(({ call }) => specsRun(call)));
    const at = runs.findIndex((specs) => specs.length === 1 && specs[0] === SWEEP);
    expect(at, 'a gate job runs the sweep alone').toBeGreaterThanOrEqual(0);
    const [, job] = shardJob();
    const context = { ...calls[at].context, steps: {} };

    const uploads = uploadsOf(job.steps, context)
      .filter(({ step }) => holds(step.if, context, PASS))
      .map(({ name }) => name);

    expect(context.strategy?.['job-index']).toBe(3);
    expect(context.strategy?.['job-total']).toBe(4);
    expect(uploads).toContain('playwright-blob-e2e-4');
    expect(uploads).toContain('playwright-coverage-gate-4');
    expect(calledOutputs(PLAYWRIGHT, playwrightInputs('playwright'), base).shards).toBe('4');
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
    expect(coverageOf('playwright')).toHaveLength(4);
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

    expect(artifacts).toHaveLength(6);
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

    // Precondition: the scan found pr-gate's reads of its called workflows' outputs, each suite's shard
    // count among them.
    const gateReads = refs.filter(({ file }) => file === 'pr-gate.yml');
    expect(gateReads).toContainEqual(
      expect.objectContaining({ caller: 'playwright', output: 'shards' }),
    );
    expect(gateReads).toContainEqual(
      expect.objectContaining({ caller: 'stories', output: 'shards' }),
    );
    expect(unbacked).toEqual([]);
  });

  it("is a matrix job's output only where every shard writes it alike, as the last shard to finish wins", () => {
    const workflow = {
      on: {
        workflow_call: {
          outputs: {
            total: { value: '${{ jobs.shard.outputs.total }}' },
            index: { value: '${{ jobs.shard.outputs.index }}' },
            step: { value: '${{ jobs.shard.outputs.step }}' },
          },
        },
      },
      jobs: {
        shard: {
          strategy: { matrix: { n: [1, 2, 3, 4] } },
          outputs: {
            total: '${{ strategy.job-total }}',
            index: '${{ matrix.n }}',
            step: '${{ steps.run.outputs.value }}',
          },
          steps: [],
        },
      },
    } as unknown as Workflow;

    expect(calledOutputs(workflow, {}, base)).toEqual({ total: '4', index: '', step: '' });
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
// Node itself, but for the coverage merge, which the last describe below runs for real: here it reports
// that it merged, or fails when COVERAGE_MERGE_FAILS is set. The download check runs for real, which asks
// GitHub nothing while every download succeeded; with COVERAGE_LOST set it names that artifact missing,
// as it does for one the run holds but could not download.
const STUB_NODE = `#!/usr/bin/env bash
case "$1" in
  *merge-playwright-coverage.mjs)
    if [ -n "$COVERAGE_MERGE_FAILS" ]; then echo 'Testwort coverage merge failed' >&2; exit 1; fi
    printf 'ran=true\\nsummary=Testwort coverage\\ndetails=\\n' >> "$GITHUB_OUTPUT" ;;
  *check-coverage-downloads.mjs)
    if [ -n "$COVERAGE_LOST" ]; then printf 'missing=%s\\n' "$COVERAGE_LOST" >> "$GITHUB_OUTPUT"; exit 0; fi
    exec "$REAL_NODE" "$@" ;;
  *) exec "$REAL_NODE" "$@" ;;
esac
`;

/** The blob and coverage artifacts one suite's shards leave in the run, each shard's from `shards`. */
function shardArtifacts(
  suite: Suite,
  needs: Record<string, Need>,
  shards: Shards,
  playwright = PLAYWRIGHT,
): Artifact[] {
  const inputs = callWith(PR_GATE.jobs[suite], playwright, { ...base, needs });
  return jobRuns(playwright, inputs)
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
  /** playwright.yml as the run has it, the repository's unless given. */
  playwright?: Workflow;
  /** Outputs of a suite's called workflow set over what it gives. */
  outputs?: Partial<Record<Suite, Record<string, string>>>;
  /** Coverage downloads that fail, by their artifact pattern. */
  lostDownloads?: string[];
  env?: Record<string, string>;
}

/**
 * pr-gate's `playwright-coverage` job, run: its inputs from the suites' results and what their called
 * workflow outputs, every job of playwright-coverage.yml run against the artifacts the shards left, and the
 * Playwright comment its steps write.
 */
async function runJoin({
  filters = {},
  results = {},
  shards = {},
  playwright = PLAYWRIGHT,
  outputs = {},
  lostDownloads = [],
  env = {},
}: Join = {}) {
  const gate = gateNeeds(filters);
  const suiteNeed = (suite: Suite): Need => ({
    result: results[suite] ?? 'success',
    outputs: {
      ...calledOutputs(
        playwright,
        callWith(PR_GATE.jobs[suite], playwright, { ...base, needs: gate }),
        base,
      ),
      ...outputs[suite],
    },
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
    shardArtifacts(suite, gate, shards[suite] ?? passing[suite], playwright),
  );
  const { github, comments } = fakeGitHub([]);
  const written: string[] = [];
  // A folder of its own, so a test may run the join more than once.
  const at = mkdtempSync(join(root, 'join-'));
  const merges = join(at, 'merge-calls');
  writeFileSync(merges, '');
  const uses: UsesHandler = async (step, context, jobRoot) => {
    if (step.uses?.startsWith('actions/download-artifact')) {
      const pattern = stringify(evaluateValue(step.with?.pattern ?? step.with?.name, context));
      if (lostDownloads.includes(pattern)) return { outcome: 'failure' };
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
    root: at,
    stubs: { npx: STUB_MERGE_NPX, node: STUB_NODE },
    env: { MERGE_CALLS: merges, REAL_NODE: process.execPath, ...env },
    uses,
  });
  const merged = readFileSync(merges, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { config: string; files: string[]; specs: string[] });

  expect(comments.length, 'one Playwright comment at most').toBeLessThanOrEqual(1);
  return {
    needs,
    // The run's result as pr-gate's `playwright-coverage` job reads it.
    failed: workflowResult(jobs) === 'failure',
    // Each job's own result, its check's.
    results: Object.fromEntries(Object.entries(jobs).map(([name, { result }]) => [name, result])),
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
    body: comments[0]?.body ?? '',
  };
}

const specsOf = (suite: Suite, count: number) =>
  Array.from({ length: count }, (_, index) => passing[suite](index)?.files[0].file).sort();

describe('the Playwright shards, joined in playwright-coverage', () => {
  it("merges each suite once, with its own config, from every shard's blob of that suite alone", async () => {
    const run = await runJoin();

    expect(run.merges.gate).toHaveLength(1);
    expect(run.merges.stories).toHaveLength(1);
    expect(run.merges.gate[0].specs).toEqual(specsOf('playwright', 4));
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
      expect(Object.values(run.results), run.log).toContain(fails ? 'failure' : 'success');
      expect(Object.values(run.results), run.log).not.toContain(fails ? 'success' : 'failure');
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
      const caller = (section: 'gate' | 'stories') =>
        section === 'gate' ? 'playwright' : 'stories';

      // The suite that did not run gives no shard count, and the one that ran gives its own.
      expect(run.needs[caller(dropped)].outputs?.shards).toBe('');
      expect(run.needs[caller(kept)].outputs?.shards).toBe(String(kept === 'gate' ? 4 : 2));
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

/** The shard counts playwright.yml's matrix gives each of pr-gate's two suites. */
const shardCounts = (playwright: Workflow) =>
  Object.fromEntries(
    (['playwright', 'stories'] as const).map((suite) => [
      suite,
      jobRuns(
        playwright,
        callWith(PR_GATE.jobs[suite], playwright, { ...base, needs: gateNeeds() }),
      ).filter(({ job, context }) => job.strategy?.matrix && holds(job.if, context, PASS)).length,
    ]),
  ) as Record<Suite, number>;

/** playwright.yml with one suite's matrix a shard larger, and nothing else changed. */
function withOneMoreShard(suite: Suite): Workflow {
  const workflow = structuredClone(PLAYWRIGHT);
  const job = Object.values(workflow.jobs).find((found) => found.strategy?.matrix) as Job;
  const matrix = job.strategy?.matrix as Record<string, string>;
  const count = shardCounts(PLAYWRIGHT)[suite];
  const list = (size: number) =>
    `'${JSON.stringify(Array.from({ length: size }, (_, index) => index + 1))}'`;
  matrix.shard = matrix.shard.replace(list(count), list(count + 1));
  return workflow;
}

describe("each suite's shard count, as the join expects it", () => {
  it.each(['playwright', 'stories'] as const)(
    'follows the %s matrix with no other edit: every shard of the larger matrix passes, one fewer does not',
    async (suite) => {
      const playwright = withOneMoreShard(suite);
      const before = shardCounts(PLAYWRIGHT);
      const after = shardCounts(playwright);
      const section = suite === 'playwright' ? 'gate' : 'stories';
      // Precondition: only this suite's matrix grew.
      expect(after).toEqual({ ...before, [suite]: before[suite] + 1 });

      const every = await runJoin({ playwright });
      const short = await runJoin({
        playwright,
        shards: {
          [suite]: (index: number) => (index === after[suite] - 1 ? null : passing[suite](index)),
        },
      });

      expect(every.needs[suite].outputs?.shards).toBe(String(after[suite]));
      expect(every.merges[section][0]?.specs).toHaveLength(after[suite]);
      expect(every.failed, every.log).toBe(false);
      expect(every.sections[section]?.status, every.log).toBe('passed');
      expect(short.merges[section][0]?.specs).toHaveLength(before[suite]);
      expect(short.sections[section]?.status, short.log).toBe('failed');
      expect(short.failed, short.log).toBe(suite === 'playwright');
    },
  );

  it.each([
    ['no', ''],
    ['a non-numeric', 'three'],
  ])(
    'fails the gate, though every shard left a blob and passed, when the gate suite ran and gave %s shard count',
    async (_, shards) => {
      const run = await runJoin({ outputs: { playwright: { shards } } });

      expect(run.merges.gate).toHaveLength(1);
      expect(run.failed, run.log).toBe(true);
      expect(run.results['playwright-coverage'], run.log).toBe('failure');
      expect(run.sections.gate?.status, run.log).toBe('failed');
    },
  );

  it('marks the stories failed, and fails nothing, when the story suite ran and gave no shard count', async () => {
    const run = await runJoin({ outputs: { stories: { shards: '' } } });

    expect(run.merges.stories).toHaveLength(1);
    expect(run.failed, run.log).toBe(false);
    expect(run.sections.stories?.status, run.log).toBe('failed');
    expect(run.sections.gate?.status, run.log).toBe('passed');
  });
});

describe("the playwright-coverage job's own result", () => {
  it('is failure when the gate failed, so the failure fails the run pr-gate reads', async () => {
    const run = await runJoin({
      shards: { playwright: (index) => gateShard(index + 1, index === 0) },
    });

    expect(run.results['playwright-coverage'], run.log).toBe('failure');
    expect(run.failed, run.log).toBe(true);
  });

  it.each([
    [
      'a coverage artifact was lost in download',
      {
        lostDownloads: ['playwright-coverage-gate-*'],
        env: { COVERAGE_LOST: 'playwright-coverage-gate-*' },
      },
    ],
    ['the coverage merge failed', { env: { COVERAGE_MERGE_FAILS: '1' } }],
  ] as [string, Join][])(
    'is success, both suites having passed, when %s, the coverage section saying so',
    async (_, scenario) => {
      const run = await runJoin(scenario);

      // Precondition: the suites passed, and the coverage problem reached the comment.
      expect(run.sections.gate?.status, run.log).toBe('passed');
      expect(run.sections.stories?.status, run.log).toBe('passed');
      expect(run.sections.coverage?.status, run.log).toBe('failed');
      expect(run.results['playwright-coverage'], run.log).toBe('success');
      expect(run.failed, run.log).toBe(false);
    },
  );

  it('is success when a story failed', async () => {
    const run = await runJoin({
      shards: { stories: (index) => storyShard(index + 1, index === 0) },
    });

    expect(run.sections.stories?.status, run.log).toBe('failed');
    expect(run.results['playwright-coverage'], run.log).toBe('success');
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
  it("shows the gate suite's duration and its count of tests over 30 s, and leaves the slowest files to the final section", async () => {
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
      // The accessibility sweep's job: shorter than the slowest shard, and no test over 30 s.
      {
        files: [{ file: SWEEP, tests: [{ title: 'Testwort sweep', ms: 1_000 }] }],
        duration: 60_000,
      },
    ];

    const run = await runJoin({ shards: { playwright: (index) => shards[index] } });

    expect(run.written.filter((section) => section === 'gate')).toHaveLength(1);
    const gate = run.sections.gate;
    const text = `${gate?.summary ?? ''}\n${gate?.block ?? ''}`;
    const lines = text.split('\n');
    expect(resultFacts(gate?.summary ?? '')).toMatchObject({ duration: '4m 10s', over: 1 });
    expect(lines.some((line) => line.includes(`\`${SLOW}\``))).toBe(false);
    expect(lines.some((line) => line.includes('⚠'))).toBe(false);
  });

  /**
   * playwright-coverage's real coverage merge over every shard's raw coverage, and the comment its one writing
   * step makes. `reports` are the suites' merged Playwright reports, written where the join steps write them.
   */
  async function mergedCoverageComment(reports: { gate?: unknown; stories?: unknown } = {}) {
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

    expect(gate).toHaveLength(4);
    expect(stories).toHaveLength(2);
    // The gate's shards each call a function of their own; both story shards call the same one; none calls D.
    const called: Record<string, string[]> = {
      [gate[0]]: ['A'],
      [gate[1]]: ['B'],
      [gate[2]]: [],
      [gate[3]]: [],
      [stories[0]]: ['C'],
      [stories[1]]: ['C'],
    };
    const landed = landings(downloadsOf(job.steps, context), Object.keys(called));
    for (const [artifact, names] of Object.entries(called)) {
      for (const folder of landed.get(artifact) ?? [])
        await writeRawCoverage(underRoot(folder, root), names);
    }

    for (const [id, report] of Object.entries(reports)) {
      const join = (job.steps ?? []).find((step) => step.id === id) as Step;
      const to = underRoot(
        stringify(evaluateValue(join.env?.PLAYWRIGHT_JSON_OUTPUT_NAME, context)),
        root,
      );
      mkdirSync(dirname(to), { recursive: true });
      writeFileSync(to, JSON.stringify(report));
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
    return sectionsOf(await commentFrom(writing[0], { ...context, steps }));
  }

  it("shows the gate and story coverage merged from every shard, and the stories' own figure on a line of its own", async () => {
    const { coverage } = await mergedCoverageComment();
    const lines = `${coverage.summary}\n${coverage.block}`.split('\n');

    expect(lines.some((line) => line.includes('75% functions'))).toBe(true);
    const storyLines = lines.filter(
      (line) => /stor(y|ies)/i.test(line) && line.includes('% functions'),
    );
    expect(storyLines.some((line) => line.includes('25% functions') && !line.includes('75%'))).toBe(
      true,
    );
  });

  it("lists both suites' slowest files in the final section, after the coverage, and counts their tests over 30 s in its summary", async () => {
    const GATE_FILE = 'tests/e2e/testwort-gate.spec.ts';
    const STORY_FILE = 'tests/e2e/stories/testwort-walk.spec.ts';
    const { coverage } = await mergedCoverageComment({
      gate: mergedPlaywrightReport(
        [
          {
            file: GATE_FILE,
            tests: [
              { title: 'Testwort simmers', ms: 31_000 },
              { title: 'Testwort steeps', ms: 2_000 },
            ],
          },
        ],
        40_000,
      ),
      stories: mergedPlaywrightReport(
        [
          {
            file: STORY_FILE,
            tests: [{ title: 'Testwort story walk', ms: 35_000, tags: ['story-91'] }],
          },
        ],
        40_000,
      ),
    });
    const lines = coverage.block.split('\n');
    const at = (test: (line: string) => boolean) => lines.findIndex(test);

    // Precondition: the coverage is there, as the test above proves it.
    const covered = at((line) => line.includes('75% functions'));
    expect(covered).toBeGreaterThan(-1);
    expect(
      at((line) => line.includes(`\`${STORY_FILE}\``) && line.includes('35.0 s')),
    ).toBeGreaterThan(covered);
    expect(
      at((line) => line.includes(`\`${GATE_FILE}\``) && line.includes('33.0 s')),
    ).toBeGreaterThan(covered);
    expect(
      lines.filter((line) => line.includes('⚠') && /Testwort (simmers|story walk)/.test(line)),
    ).toHaveLength(2);
    expect(resultFacts(coverage.summary)).toMatchObject({ over: 2, budget: 'test' });
  });

  it('writes the slowest files into the final section when neither suite left coverage', async () => {
    const job = COVERAGE.jobs['playwright-coverage'];
    const merge = (job.steps ?? []).find((step) =>
      step.run?.includes('merge-playwright-coverage'),
    ) as Step;
    const context: Context = { ...base, inputs: { 'should-run': true }, needs: {}, steps: {} };
    const steps = passedSteps(job, {
      check: { missing: '' },
      [merge.id as string]: { ran: 'false', summary: '', details: 'Testwort slowest files' },
    });
    const writing = (job.steps ?? [])
      .filter(usesComment)
      .filter((step) => holds(step.if, { ...context, steps }, PASS));

    // Precondition: the one step that writes this case is the coverage section's.
    expect(writing).toHaveLength(1);
    expect(stringify(evaluateValue(writing[0].with?.section, context))).toBe('coverage');
    const { coverage } = sectionsOf(await commentFrom(writing[0], { ...context, steps }));
    expect(coverage.status).toBe('failed');
    expect(coverage.block).toContain('Testwort slowest files');
  });
});

describe("each suite's row in the Playwright comment, as the end job writes it", () => {
  // Shard 1 of each suite ran a test over the 30 s test budget.
  const slow = (report: ShardReport): ShardReport => ({
    ...report,
    files: report.files.map((file) => ({
      ...file,
      tests: file.tests.map((test) => ({ ...test, ms: 31_000 })),
    })),
  });

  it("gives its counts, the suite's duration and its tests over 30 s, as a Vitest part's row does", async () => {
    const run = await runJoin({
      shards: {
        playwright: (index) => (index === 0 ? slow(gateShard(1)) : gateShard(index + 1)),
        stories: (index) => (index === 0 ? slow(storyShard(1)) : storyShard(index + 1)),
      },
    });

    expect(resultFacts(run.sections.gate?.summary ?? '')).toMatchObject({
      passed: 4,
      failed: null,
      duration: '1m 0s',
      over: 1,
      budget: 'test',
      inOrder: true,
    });
    expect(resultFacts(run.sections.stories?.summary ?? '')).toMatchObject({
      stories: { passing: 2, of: 2 },
      duration: '1m 0s',
      over: 1,
      budget: 'test',
      inOrder: true,
    });
  });
});

/** What one shard's run leaves: its Playwright JSON report, for a story shard its checklist, and whether it failed. */
type ShardRun = { report: unknown; checklist?: unknown; failed?: boolean };

// `npm run e2e` or `npm run test:stories` in the matrix job $STUB_JOB (1-based), as Playwright behaves: the JSON
// reporter writes that job's report to PLAYWRIGHT_JSON_OUTPUT_NAME, and the story checklist reporter its checklist to
// STORIES_JSON, each only when `--reporter` names it. It exits 1 when the shard failed.
const STUB_SHARD_NPM = `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const flag = (name) => {
  const at = args.findIndex((arg) => arg === name || arg.startsWith(name + '='));
  if (at === -1) return '';
  return args[at].includes('=') ? args[at].slice(name.length + 1) : args[at + 1] ?? '';
};
const reporters = flag('--reporter').split(',');
const index = Number(process.env.STUB_JOB);
const fixture = JSON.parse(fs.readFileSync(process.env.STUB_SHARDS, 'utf8'))[index - 1];
if (!fixture) process.exit(0);
const write = (to, value) => {
  fs.mkdirSync(path.dirname(path.resolve(to)), { recursive: true });
  fs.writeFileSync(path.resolve(to), JSON.stringify(value));
};
if (reporters.includes('json') && process.env.PLAYWRIGHT_JSON_OUTPUT_NAME)
  write(process.env.PLAYWRIGHT_JSON_OUTPUT_NAME, fixture.report);
if (reporters.some((reporter) => reporter.includes('story-playwright-reporter')) && process.env.STORIES_JSON && fixture.checklist)
  write(process.env.STORIES_JSON, fixture.checklist);
process.exit(fixture.failed ? 1 : 0);
`;

const SHARD_LOG = 'Testwort shard log line';

/** Every shard job one caller of playwright.yml runs, each run step by step with its own `runs` entry, writing into `github`. */
async function runShards(
  caller: 'playwright' | 'stories' | 'warm',
  runs: ShardRun[],
  github: unknown,
) {
  const shards = jobRuns(PLAYWRIGHT, playwrightInputs(caller)).filter(({ job, context }) =>
    holds(job.if, context, PASS),
  );
  const writes: Record<string, string>[] = [];
  for (const { job, context } of shards) {
    const at = mkdtempSync(join(root, 'shard-'));
    symlinkSync(fromRoot('.github'), join(at, '.github'));
    const fixtures = join(at, 'shard-runs.json');
    writeFileSync(fixtures, JSON.stringify(runs));
    const uses: UsesHandler = async (step, stepContext) => {
      if (usesComment(step)) {
        const env = actionEnv(step, stepContext);
        writes.push(env);
        const result = await lib.postComment({
          github,
          context: commentContext,
          core,
          inputs: lib.inputsFromEnv(env),
          readFile: () => SHARD_LOG,
          sleep: async () => {},
          random: () => 0,
        });
        return { outcome: result === 'written' ? 'success' : 'failure' };
      }
      if (step.uses === './.github/actions/job-summary') return { outcome: 'success' };
      return undefined;
    };
    await runJob(job, {
      context,
      root: at,
      stubs: { npm: STUB_SHARD_NPM },
      env: {
        STUB_SHARDS: fixtures,
        STUB_JOB: String(Number(context.strategy?.['job-index'] ?? 0) + 1),
      },
      uses,
    });
  }
  return { shards: shards.length, writes };
}

const shardReport = (file: string, tests: TimedTest[], duration: number) =>
  mergedPlaywrightReport([{ file, tests }], duration);

const GATE_RUNS: ShardRun[] = [
  { report: shardReport('tests/e2e/testwort-1.spec.ts', [{ title: 'one', ms: 1_000 }], 20_000) },
  {
    report: shardReport(
      'tests/e2e/testwort-2.spec.ts',
      [{ title: 'two', ms: 1_000, failed: FAILURE }],
      40_000,
    ),
    failed: true,
  },
  {
    report: shardReport(
      'tests/e2e/testwort-3.spec.ts',
      [
        { title: 'three', ms: 1_000 },
        { title: 'three slowly', ms: 31_000 },
      ],
      60_000,
    ),
  },
  { report: shardReport(SWEEP, [{ title: 'sweep', ms: 1_000 }], 80_000) },
];

// Each story shard's checklist lists every v1 story, as the reporter writes it: the ones it did not run untested.
const storyRun = (n: number, failed: boolean, duration: number): ShardRun => {
  const stories = [91, 92].map((id) => ({
    id,
    title: `Testwort story ${id}`,
    section: 'Testwort',
    status: id !== 90 + n ? 'untested' : failed ? 'failed' : 'passed',
  }));
  const count = (status: string) => stories.filter((story) => story.status === status).length;
  return {
    report: shardReport(
      `tests/e2e/stories/testwort-${n}.spec.ts`,
      [
        {
          title: `Testwort story 9${n}`,
          ms: 1_000,
          tags: [`story-9${n}`],
          ...(failed ? { failed: FAILURE } : {}),
        },
      ],
      duration,
    ),
    checklist: {
      stories,
      unknown: [],
      untagged: [],
      counts: { passed: count('passed'), failed: count('failed'), skipped: 0, untested: 1 },
      total: stories.length,
    },
    failed,
  };
};
const STORY_RUNS = [storyRun(1, false, 30_000), storyRun(2, true, 50_000)];

describe("each shard's row in the Playwright comment", () => {
  it("is written by every shard of both suites, under !cancelled(), with its own result, beneath its suite's row", async () => {
    const { github, comments } = fakeGitHub([]);

    expect((await runShards('playwright', GATE_RUNS, github)).shards).toBe(4);
    expect((await runShards('stories', STORY_RUNS, github)).shards).toBe(2);

    expect(comments).toHaveLength(1);
    const body = comments[0].body;
    const rows = rowsOf(body);
    expect(
      rows.map(({ label, shard, status }) => [
        shard ?? (/Gate/.test(label) ? 'gate' : /Stories/.test(label) ? 'stories' : label),
        status,
      ]),
    ).toEqual([
      ['gate', 'Failed'],
      [1, 'Passed'],
      [2, 'Failed'],
      [3, 'Passed'],
      ['sweep', 'Passed'],
      ['stories', 'Failed'],
      [1, 'Passed'],
      [2, 'Failed'],
    ]);
    const facts = rows.map(({ result }) => resultFacts(result));
    expect(facts[1]).toMatchObject({ passed: 1, failed: null, duration: '20s', over: null });
    expect(facts[2]).toMatchObject({ passed: 0, failed: 1, duration: '40s', over: null });
    expect(facts[3]).toMatchObject({ passed: 2, duration: '1m 0s', over: 1, inOrder: true });
    // A story shard counts the stories it ran, not the ones the other shard ran.
    expect(facts[4]).toMatchObject({ passed: 1, failed: null, duration: '1m 20s', over: null });
    expect(facts[6]).toMatchObject({ stories: { passing: 1, of: 1 }, duration: '30s' });
    expect(facts[7]).toMatchObject({ stories: { passing: 0, of: 1 }, duration: '50s' });
    // A shard writes no log: the suite's block, from the end job, carries it.
    expect(body).not.toContain(SHARD_LOG);
  });

  it('is labelled Accessibility Sweep for the gate job that runs the sweep file, and Shard i of 3 for the three others', async () => {
    const calls = suiteCalls('playwright');
    const specs = await Promise.all(calls.map(({ call }) => specsRun(call)));
    const sweepJob = specs.findIndex((run) => run.length === 1 && run[0] === SWEEP);
    expect(sweepJob, 'a gate job runs the sweep alone').toBeGreaterThanOrEqual(0);
    // Each job's run lasts its own whole number of minutes, so a row's duration names the job that wrote it.
    const runs = calls.map((_, index) => ({
      report: shardReport(
        `tests/e2e/testwort-${index + 1}.spec.ts`,
        [{ title: 'one', ms: 1_000 }],
        (index + 1) * 60_000,
      ),
    }));
    const { github, comments } = fakeGitHub([]);

    await runShards('playwright', runs, github);

    const rows = rowsOf(comments[0]?.body ?? '').filter(({ shard }) => shard !== null);
    const minutes = (row: (typeof rows)[number]) => resultFacts(row.result).duration;
    expect(rows.map(({ label }) => label)).toEqual([
      '↳ Shard 1 of 3',
      '↳ Shard 2 of 3',
      '↳ Shard 3 of 3',
      '↳ Accessibility Sweep',
    ]);
    expect(minutes(rows[3])).toBe(`${sweepJob + 1}m 0s`);
    const shardJobs = calls.map((_, index) => index).filter((index) => index !== sweepJob);
    expect(rows.slice(0, 3).map(minutes)).toEqual(shardJobs.map((index) => `${index + 1}m 0s`));
  });

  it('is written by no shard of the build-only run, which has no pull request', async () => {
    const { github, comments } = fakeGitHub([]);
    const gate = await runShards('playwright', GATE_RUNS, fakeGitHub([]).github);

    const warm = await runShards('warm', [], github);

    // Precondition: a gate run's shards do write.
    expect(gate.writes.length).toBeGreaterThan(0);
    expect(warm.shards).toBe(1);
    expect(warm.writes).toEqual([]);
    expect(comments).toEqual([]);
  });
});

describe("playwright.yml's permissions", () => {
  const LEVEL: Record<string, number> = { none: 0, read: 1, write: 2 };

  it('ask pull-requests: write, and every caller grants each permission it asks', () => {
    const asked = PLAYWRIGHT.permissions ?? {};
    expect(asked['pull-requests']).toBe('write');

    const callers = [
      ['pr-gate playwright', PR_GATE, PR_GATE.jobs.playwright],
      ['pr-gate stories', PR_GATE, PR_GATE.jobs.stories],
      ['e2e-cache warm', E2E_CACHE, E2E_CACHE.jobs.warm],
    ] as const;
    for (const [name, workflow, job] of callers) {
      const granted = job.permissions ?? workflow.permissions ?? {};
      for (const [scope, level] of Object.entries(asked)) {
        expect(
          LEVEL[granted[scope] ?? 'none'],
          `${name} grants ${scope}: ${level}`,
        ).toBeGreaterThanOrEqual(LEVEL[level]);
      }
    }
  });
});

describe("the Playwright comment's heading note, as the end job writes it", () => {
  it("names the gate suite's test count, then the story count, for the suites that ran", async () => {
    const notes = async (join: Join) => headingNotesOf((await runJoin(join)).body).map(countNote);

    expect(await notes({})).toEqual([
      { count: 4, noun: 'tests' },
      { count: 2, noun: 'stories' },
    ]);
    expect(await notes({ filters: { stories: 'false' } })).toEqual([{ count: 4, noun: 'tests' }]);
    expect(await notes({ filters: { playwright: 'false' } })).toEqual([
      { count: 2, noun: 'stories' },
    ]);
  });
});

// A Playwright row whose run failed with no failed test says so, as a Vitest part's row does.
describe('a Playwright row that failed with no failed test', () => {
  it("says so on the gate suite's row when a shard left no blob, and not when a test failed", async () => {
    const lost = await runJoin({
      results: { playwright: 'failure' },
      shards: { playwright: (index) => (index === 1 ? null : gateShard(index + 1)) },
    });
    const failed = await runJoin({
      results: { playwright: 'failure' },
      shards: { playwright: (index) => gateShard(index + 1, index === 1) },
    });

    // Precondition: the suite failed both times.
    expect(lost.sections.gate?.status).toBe('failed');
    expect(failed.sections.gate?.status).toBe('failed');
    expect(resultFacts(lost.sections.gate?.summary ?? '')).toMatchObject({
      failed: null,
      unexplained: true,
    });
    expect(resultFacts(failed.sections.gate?.summary ?? '')).toMatchObject({
      failed: 1,
      unexplained: false,
    });
  });

  it("says so on the story suite's row when a story shard left no blob, and not when every story passed", async () => {
    const lost = await runJoin({
      shards: { stories: (index) => (index === 1 ? null : storyShard(index + 1)) },
    });
    const passed = await runJoin();

    expect(lost.sections.stories?.status).toBe('failed');
    expect(resultFacts(lost.sections.stories?.summary ?? '')).toMatchObject({ unexplained: true });
    expect(passed.sections.stories?.status).toBe('passed');
    expect(resultFacts(passed.sections.stories?.summary ?? '').unexplained).toBe(false);
  });

  it("says so on a gate or story shard's row whose run failed with every test passing", async () => {
    const { github, comments } = fakeGitHub([]);
    await runShards(
      'playwright',
      [GATE_RUNS[0], { ...GATE_RUNS[0], failed: true }, GATE_RUNS[1], GATE_RUNS[3]],
      github,
    );
    // The story run step has continue-on-error, so the row's status and note come from its outcome.
    await runShards(
      'stories',
      [storyRun(1, false, 30_000), { ...storyRun(2, false, 50_000), failed: true }],
      github,
    );

    expect(comments).toHaveLength(1);
    expect(
      rowsOf(comments[0].body)
        .filter(({ shard }) => shard !== null)
        .map(({ status, result }) => [status, resultFacts(result).unexplained]),
    ).toEqual([
      ['Passed', false],
      ['Failed', true],
      ['Failed', false],
      ['Passed', false],
      ['Passed', false],
      ['Failed', true],
    ]);
  });
});
