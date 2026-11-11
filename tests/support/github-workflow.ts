import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { Evaluator, Lexer, Parser, data } from '@actions/expressions';
import type { FunctionDefinition } from '@actions/expressions/funcs/info';
import picomatch from 'picomatch';
import { parse } from 'yaml';

import { fromRoot } from './paths';

// The workflows under .github/, read as GitHub Actions reads them: `${{ }}` expressions evaluated against
// the contexts a test sets up, a matrix expanded into its jobs, an `if:` with its implicit `success()`,
// and a `run:` script executed by bash with stub commands on PATH. Paths under /app, where every job
// checks the repository out, are rewritten to a directory the test owns.

export type Value = unknown;
export type Context = Record<string, Value>;

/** The job's or the step's state that the status functions read. */
export interface Status {
  success: boolean;
  failure: boolean;
  cancelled?: boolean;
}

export interface Step {
  id?: string;
  name?: string;
  if?: string | boolean;
  uses?: string;
  run?: string;
  with?: Record<string, Value>;
  env?: Record<string, Value>;
  'continue-on-error'?: Value;
}

export interface Job {
  if?: string | boolean;
  needs?: string | string[];
  uses?: string;
  with?: Record<string, Value>;
  strategy?: { matrix?: Record<string, Value> | string; 'fail-fast'?: Value };
  outputs?: Record<string, string>;
  env?: Record<string, Value>;
  steps?: Step[];
}

export interface Input {
  type?: string;
  default?: Value;
  required?: boolean;
}

export interface Workflow {
  on: {
    workflow_call?: {
      inputs?: Record<string, Input>;
      outputs?: Record<string, { value: string }>;
    };
  };
  jobs: Record<string, Job>;
}

export interface Action {
  inputs?: Record<string, Input>;
  runs: { steps: Step[] };
}

export function loadWorkflow(file: string): Workflow {
  return parse(readFileSync(fromRoot('.github/workflows', file), 'utf8')) as Workflow;
}

/** A local composite action, by the `uses:` that names it (`./.github/actions/<name>`) or its name. */
export function loadAction(uses: string): Action {
  const name = uses.replace(/^\.\/\.github\/actions\//, '');
  return parse(readFileSync(fromRoot('.github/actions', name, 'action.yml'), 'utf8')) as Action;
}

export function needsOf(job: Job): string[] {
  if (job.needs === undefined) return [];
  return Array.isArray(job.needs) ? job.needs : [job.needs];
}

// ---------------------------------------------------------------------------
// The expression language (docs.github.com, "Evaluate expressions in workflows and actions").

export function truthy(value: Value): boolean {
  if (value === null || value === undefined || value === false || value === '') return false;
  if (typeof value === 'number') return value !== 0 && !Number.isNaN(value);
  return true;
}

/** A value as GitHub writes it into a string: an env var, a `with:` input or a script. */
export function stringify(value: Value): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

const STATUS_FUNCTIONS = /\b(?:always|success|failure|cancelled)\s*\(/;

const PASSING: Status = { success: true, failure: false };

// The package evaluates the language; the status functions and hashFiles() are the model's, since they
// depend on the job being tested and on files a test does not have.
function extraFunctions(status: Status): Map<string, FunctionDefinition> {
  const flag = (name: string, value: boolean): [string, FunctionDefinition] => [
    name,
    { name, minArgs: 0, maxArgs: 0, call: () => new data.BooleanData(value) },
  ];
  return new Map([
    flag('success', status.success && !status.cancelled),
    flag('failure', status.failure),
    flag('always', true),
    flag('cancelled', Boolean(status.cancelled)),
    [
      'hashfiles',
      {
        name: 'hashFiles',
        minArgs: 1,
        maxArgs: 255,
        call: () => new data.StringData('testwort-hash'),
      },
    ],
  ]);
}

/** One expression, without its `${{ }}`. */
export function evaluate(expression: string, context: Context, status: Status = PASSING): Value {
  const functions = extraFunctions(status);
  const lexed = new Lexer(expression).lex();
  const parsed = new Parser(lexed.tokens, Object.keys(context), [...functions.values()]).parse();
  const scope = JSON.parse(JSON.stringify(context), data.reviver) as data.Dictionary;
  const result = new Evaluator(parsed, scope, functions).evaluate();
  return JSON.parse(JSON.stringify(result, data.replacer)) as Value;
}

/** Whether GitHub's `==` finds two values equal. */
function looseEquals(left: Value, right: Value): boolean {
  return evaluate('left == right', { left, right }) === true;
}

const TEMPLATE = /\$\{\{([\s\S]*?)\}\}/g;

/**
 * A YAML value as GitHub reads it: a string that is one `${{ }}` and nothing else keeps the
 * expression's type, a string with text around its expressions becomes text, anything else is literal.
 */
export function evaluateValue(value: Value, context: Context, status: Status = PASSING): Value {
  if (typeof value !== 'string') return value;
  const whole = /^\s*\$\{\{([\s\S]*?)\}\}\s*$/.exec(value);
  if (whole && !whole[1].includes('}}')) return evaluate(whole[1], context, status);
  return value.replace(TEMPLATE, (_, expression: string) =>
    stringify(evaluate(expression, context, status)),
  );
}

export function evaluateMap(
  map: Record<string, Value> | undefined,
  context: Context,
  status: Status = PASSING,
): Record<string, Value> {
  return Object.fromEntries(
    Object.entries(map ?? {}).map(([key, value]) => [key, evaluateValue(value, context, status)]),
  );
}

/** Whether an `if:` holds. With no status function in it, GitHub ANDs it with `success()`. */
export function holds(
  condition: string | boolean | undefined,
  context: Context,
  status: Status,
): boolean {
  if (condition === undefined) return status.success && !status.cancelled;
  if (typeof condition === 'boolean') return condition && status.success && !status.cancelled;
  const whole = /^\s*\$\{\{([\s\S]*)\}\}\s*$/.exec(condition);
  const expression = whole ? whole[1] : condition;
  const value = evaluate(expression, context, status);
  return STATUS_FUNCTIONS.test(expression)
    ? truthy(value)
    : status.success && !status.cancelled && truthy(value);
}

/** A job's status for its own `if:`, from the results of the jobs it needs. */
export function jobStatus(needs: Record<string, { result: string }>, cancelled = false): Status {
  const results = Object.values(needs).map(({ result }) => result);
  return {
    success: results.every((result) => result === 'success'),
    failure: results.some((result) => result === 'failure'),
    cancelled,
  };
}

// ---------------------------------------------------------------------------
// Inputs and matrices.

function coerce(value: Value, type: string | undefined): Value {
  if (type === 'boolean' && typeof value === 'string') return value.toLowerCase() === 'true';
  if (type === 'number' && typeof value === 'string') return Number(value);
  if (type === 'string' && value !== null && typeof value !== 'string') return stringify(value);
  return value;
}

/** A called workflow's or an action's `inputs`, from its caller's `with:` and its own defaults. */
export function inputsFor(
  declared: Record<string, Input> | undefined,
  given: Record<string, Value> = {},
): Record<string, Value> {
  const inputs: Record<string, Value> = {};
  for (const [name, input] of Object.entries(declared ?? {})) {
    const value =
      name in given ? given[name] : (input.default ?? (input.type === 'boolean' ? false : ''));
    inputs[name] = coerce(value, input.type);
  }
  return inputs;
}

/** What a caller job passes a reusable workflow, evaluated against the caller's contexts. */
export function callWith(caller: Job, called: Workflow, context: Context): Record<string, Value> {
  return inputsFor(called.on.workflow_call?.inputs, evaluateMap(caller.with, context));
}

export interface MatrixRun {
  matrix: Record<string, Value>;
  strategy: Record<string, Value>;
}

function matches(
  combination: Record<string, Value>,
  filter: Record<string, Value>,
  keys: string[],
) {
  return keys.every((key) => !(key in filter) || looseEquals(combination[key], filter[key]));
}

/** The jobs a `strategy.matrix` expands into, each with its `matrix` and `strategy` contexts. */
export function matrixRuns(job: Job, context: Context): MatrixRun[] {
  const declared = job.strategy?.matrix;
  const strategyOf = (index: number, total: number) => ({
    'fail-fast': evaluateValue(job.strategy?.['fail-fast'] ?? true, context),
    'job-index': index,
    'job-total': total,
    'max-parallel': total,
  });
  if (declared === undefined) return [{ matrix: {}, strategy: strategyOf(0, 1) }];
  const matrix = evaluateValue(declared, context) as Record<string, Value>;
  const { include, exclude, ...axes } = Object.fromEntries(
    Object.entries(matrix).map(([key, value]) => [key, evaluateValue(value, context)]),
  ) as Record<string, Value>;
  const keys = Object.keys(axes);
  let combinations: Record<string, Value>[] = keys.length ? [{}] : [];
  for (const key of keys) {
    const values = axes[key];
    if (!Array.isArray(values)) throw new Error(`matrix.${key} is not a list`);
    combinations = combinations.flatMap((combination) =>
      values.map((value: Value) => ({ ...combination, [key]: value })),
    );
  }
  for (const filter of (exclude as Record<string, Value>[] | undefined) ?? []) {
    combinations = combinations.filter((combination) => !matches(combination, filter, keys));
  }
  // An `include` entry extends the combinations its original keys match, or else adds one.
  for (const extra of (include as Record<string, Value>[] | undefined) ?? []) {
    const original = keys.some((key) => key in extra);
    const targets = original
      ? combinations.filter((combination) => matches(combination, extra, keys))
      : combinations;
    if (targets.length) for (const target of targets) Object.assign(target, extra);
    else combinations.push({ ...extra });
  }
  return combinations.map((combination, index) => ({
    matrix: combination,
    strategy: strategyOf(index, combinations.length),
  }));
}

// ---------------------------------------------------------------------------
// Running a step's script.

/** Every /app path, where each job checks the repository out, moved under `root`. */
export function underRoot(text: string, root: string): string {
  return text.replace(/(?<![\w./-])\/app(?=[/\s"'`;)|]|$)/gm, root);
}

/** GITHUB_OUTPUT as a shell step writes it: `name=value` lines and `name<<DELIM` blocks. */
export function parseStepOutputs(text: string): Record<string, string> {
  const outputs: Record<string, string> = {};
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const block = /^([^=<]+)<<(.+)$/.exec(line);
    if (block) {
      const end = lines.indexOf(block[2], index + 1);
      outputs[block[1]] = lines.slice(index + 1, end).join('\n');
      index = end;
      continue;
    }
    const pair = /^([^=]+)=(.*)$/.exec(line);
    if (pair) outputs[pair[1]] = pair[2];
  }
  return outputs;
}

export interface ScriptRun {
  status: number | null;
  log: string;
  outputs: Record<string, string>;
}

/**
 * Runs a `run:` script as GitHub does, under `bash -e`, after its expressions are evaluated, with
 * /app moved under `root`. `stubs` are executables put first on PATH, by name. The step's own `env:`
 * is evaluated against `context` and joined to `env`. Scripts that call `node .github/scripts/...`
 * find them through a link from `root`.
 */
export function runStepScript(
  step: Step,
  {
    context,
    root,
    stubs = {},
    env = {},
    status = PASSING,
  }: {
    context: Context;
    root: string;
    stubs?: Record<string, string>;
    env?: Record<string, string>;
    status?: Status;
  },
): ScriptRun {
  if (!step.run) throw new Error(`Step "${step.name ?? step.id}" has no run script`);
  const bin = join(root, '.stub-bin');
  mkdirSync(bin, { recursive: true });
  for (const [name, body] of Object.entries(stubs)) {
    writeFileSync(join(bin, name), body);
    chmodSync(join(bin, name), 0o755);
  }
  const script = join(root, '.step.sh');
  writeFileSync(script, underRoot(stringify(evaluateValue(step.run, context, status)), root));
  const output = join(root, '.github-output');
  writeFileSync(output, '');
  const stepEnv = Object.fromEntries(
    Object.entries(evaluateMap(step.env, context, status)).map(([key, value]) => [
      key,
      underRoot(stringify(value), root),
    ]),
  );
  const result = spawnSync('bash', ['-e', script], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...stepEnv,
      ...env,
      PATH: `${bin}:${process.env.PATH ?? ''}`,
      GITHUB_OUTPUT: output,
    },
  });
  return {
    status: result.status,
    log: result.stdout + result.stderr,
    outputs: parseStepOutputs(readFileSync(output, 'utf8')),
  };
}

/** A stub that records each call's arguments, one line per call, in `$STUB_CALLS`. */
export const RECORDING_STUB = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$STUB_CALLS"
`;

// ---------------------------------------------------------------------------
// Artifacts.

export interface Upload {
  /** The step that uploads, inside a local composite action when one wraps it. */
  step: Step;
  name: string;
  path: string;
}

/**
 * The artifacts a job's steps upload, names and paths evaluated against `context`, looking inside the
 * local composite actions the job uses with the inputs it passes them.
 */
export function uploadsOf(steps: Step[] | undefined, context: Context): Upload[] {
  return (steps ?? []).flatMap((step): Upload[] => {
    if (step.uses?.startsWith('actions/upload-artifact')) {
      const given = evaluateMap(step.with, context);
      return [{ step, name: stringify(given.name), path: stringify(given.path) }];
    }
    if (step.uses?.startsWith('./.github/actions/')) {
      const action = loadAction(step.uses);
      const inputs = inputsFor(action.inputs, evaluateMap(step.with, context));
      return uploadsOf(action.runs.steps, { ...context, inputs, steps: {} });
    }
    return [];
  });
}

export interface Download {
  step: Step;
  name: string;
  pattern: string;
  path: string;
  mergeMultiple: boolean;
}

export function downloadsOf(steps: Step[] | undefined, context: Context): Download[] {
  return (steps ?? [])
    .filter((step) => step.uses?.startsWith('actions/download-artifact'))
    .map((step) => {
      const given = evaluateMap(step.with, context);
      return {
        step,
        name: stringify(given.name),
        pattern: stringify(given.pattern),
        path: stringify(given.path),
        mergeMultiple:
          truthy(given['merge-multiple']) && stringify(given['merge-multiple']) !== 'false',
      };
    });
}

/** The artifacts, of those the run holds, that one download fetches. */
export function fetchedBy(download: Download, artifacts: readonly string[]): string[] {
  if (download.name) return artifacts.filter((artifact) => artifact === download.name);
  if (!download.pattern) return [...artifacts];
  const match = picomatch(download.pattern);
  return artifacts.filter((artifact) => match(artifact));
}

/**
 * Where each fetched artifact lands, as actions/download-artifact puts it: a download by name into its
 * `path`; a download by pattern into a folder named for the artifact under `path`, except that
 * `merge-multiple`, or a pattern that matched one artifact alone, extracts straight into `path`.
 */
export function landings(
  downloads: readonly Download[],
  artifacts: readonly string[],
): Map<string, string[]> {
  const landed = new Map<string, string[]>();
  for (const download of downloads) {
    const fetched = fetchedBy(download, artifacts);
    for (const artifact of fetched) {
      const straight = download.name || download.mergeMultiple || fetched.length === 1;
      const at = straight ? download.path.replace(/\/$/, '') : join(download.path, artifact);
      landed.set(artifact, [...(landed.get(artifact) ?? []), at]);
    }
  }
  return landed;
}

/**
 * The environment a step's local composite action gives its first step: the action's inputs from the
 * step's `with:` and its defaults, then that step's `env:` evaluated against them, every value a string
 * as a process sees it.
 */
export function actionEnv(step: Step, context: Context): Record<string, string> {
  if (!step.uses?.startsWith('./.github/actions/'))
    throw new Error(`"${step.name}" uses no local action`);
  const action = loadAction(step.uses);
  const inputs = inputsFor(action.inputs, evaluateMap(step.with, context));
  const [first] = action.runs.steps;
  return Object.fromEntries(
    Object.entries(evaluateMap(first?.env, { ...context, inputs })).map(([key, value]) => [
      key,
      stringify(value),
    ]),
  );
}
