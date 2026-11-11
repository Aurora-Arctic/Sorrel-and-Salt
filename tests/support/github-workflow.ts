import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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

type Token =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'name'; value: string }
  | { kind: 'op'; value: string };

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let at = 0;
  while (at < source.length) {
    const rest = source.slice(at);
    const space = /^\s+/.exec(rest);
    if (space) {
      at += space[0].length;
      continue;
    }
    if (rest[0] === "'") {
      let value = '';
      let end = 1;
      for (;;) {
        if (end >= rest.length) throw new Error(`Unclosed string in: ${source}`);
        if (rest[end] === "'") {
          if (rest[end + 1] === "'") {
            value += "'";
            end += 2;
            continue;
          }
          break;
        }
        value += rest[end];
        end++;
      }
      tokens.push({ kind: 'string', value });
      at += end + 1;
      continue;
    }
    const number = /^(?:0x[0-9a-f]+|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)/i.exec(rest);
    const previous = tokens[tokens.length - 1];
    const afterDot = previous?.kind === 'op' && previous.value === '.';
    if (number && !afterDot) {
      tokens.push({ kind: 'number', value: Number(number[0]) });
      at += number[0].length;
      continue;
    }
    const name = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(rest);
    if (name) {
      tokens.push({ kind: 'name', value: name[0] });
      at += name[0].length;
      continue;
    }
    const op = /^(?:==|!=|<=|>=|&&|\|\||[!<>()[\].,*])/.exec(rest);
    if (!op) throw new Error(`Cannot read "${rest.slice(0, 20)}" in: ${source}`);
    tokens.push({ kind: 'op', value: op[0] });
    at += op[0].length;
  }
  return tokens;
}

/** The result of a `*` filter: property access on it maps over its items. */
class Filtered extends Array<Value> {}

function isObject(value: Value): value is Record<string, Value> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function property(target: Value, key: string): Value {
  if (target instanceof Filtered) {
    const mapped = new Filtered();
    for (const item of target) {
      const value = property(item, key);
      if (value !== null) mapped.push(value);
    }
    return mapped;
  }
  if (Array.isArray(target)) {
    const index = Number(key);
    return Number.isInteger(index) ? (target[index] ?? null) : null;
  }
  if (!isObject(target)) return null;
  if (key in target) return target[key] ?? null;
  const match = Object.keys(target).find(
    (candidate) => candidate.toLowerCase() === key.toLowerCase(),
  );
  return match === undefined ? null : (target[match] ?? null);
}

function star(target: Value): Value {
  const items = new Filtered();
  if (target instanceof Filtered) {
    for (const item of target) {
      if (Array.isArray(item)) items.push(...item);
      else if (isObject(item)) items.push(...Object.values(item));
    }
  } else if (Array.isArray(target)) items.push(...target);
  else if (isObject(target)) items.push(...Object.values(target));
  return items;
}

export function truthy(value: Value): boolean {
  if (value === null || value === undefined || value === false || value === '') return false;
  if (typeof value === 'number') return value !== 0 && !Number.isNaN(value);
  return true;
}

function toNumber(value: Value): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value.trim() === '' ? 0 : Number(value);
  return Number.NaN;
}

function looseEquals(left: Value, right: Value): boolean {
  if (typeof left === 'string' && typeof right === 'string') {
    return left.toLowerCase() === right.toLowerCase();
  }
  const objectish = (value: Value) => value !== null && typeof value === 'object';
  if (objectish(left) || objectish(right)) return left === right;
  if (typeof left === typeof right && left !== null) return left === right;
  if ((left ?? null) === null && (right ?? null) === null) return true;
  return toNumber(left) === toNumber(right);
}

function compare(left: Value, right: Value): number {
  if (typeof left === 'string' && typeof right === 'string') {
    const a = left.toLowerCase();
    const b = right.toLowerCase();
    return a < b ? -1 : a > b ? 1 : 0;
  }
  const a = toNumber(left);
  const b = toNumber(right);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.NaN;
  return a - b;
}

/** A value as GitHub writes it into a string: an env var, a `with:` input or a script. */
export function stringify(value: Value): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

const STATUS_FUNCTIONS = /\b(?:always|success|failure|cancelled)\s*\(/;

class Parser {
  private at = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly context: Context,
    private readonly status: Status,
    private readonly source: string,
  ) {}

  parse(): Value {
    const value = this.or();
    if (this.at !== this.tokens.length) throw new Error(`Unexpected token in: ${this.source}`);
    return value;
  }

  private peek(value: string): boolean {
    const token = this.tokens[this.at];
    return token?.kind === 'op' && token.value === value;
  }

  private expect(value: string) {
    if (!this.peek(value)) throw new Error(`Expected "${value}" in: ${this.source}`);
    this.at++;
  }

  private or(): Value {
    let left = this.and();
    while (this.peek('||')) {
      this.at++;
      const right = this.and();
      left = truthy(left) ? left : right;
    }
    return left;
  }

  private and(): Value {
    let left = this.equality();
    while (this.peek('&&')) {
      this.at++;
      const right = this.equality();
      left = truthy(left) ? right : left;
    }
    return left;
  }

  private equality(): Value {
    let left = this.comparison();
    for (;;) {
      if (this.peek('==') || this.peek('!=')) {
        const negate = this.peek('!=');
        this.at++;
        const equal = looseEquals(left, this.comparison());
        left = negate ? !equal : equal;
      } else return left;
    }
  }

  private comparison(): Value {
    let left = this.unary();
    for (;;) {
      const op = ['<=', '>=', '<', '>'].find((candidate) => this.peek(candidate));
      if (!op) return left;
      this.at++;
      const order = compare(left, this.unary());
      if (Number.isNaN(order)) left = false;
      else if (op === '<') left = order < 0;
      else if (op === '>') left = order > 0;
      else if (op === '<=') left = order <= 0;
      else left = order >= 0;
    }
  }

  private unary(): Value {
    if (this.peek('!')) {
      this.at++;
      return !truthy(this.unary());
    }
    return this.postfix(this.primary());
  }

  private postfix(start: Value): Value {
    let value = start;
    for (;;) {
      if (this.peek('.')) {
        this.at++;
        if (this.peek('*')) {
          this.at++;
          value = star(value);
          continue;
        }
        const token = this.tokens[this.at++];
        if (token?.kind !== 'name' && token?.kind !== 'number') {
          throw new Error(`Expected a property name in: ${this.source}`);
        }
        value = property(value, String(token.value));
      } else if (this.peek('[')) {
        this.at++;
        if (this.peek('*')) {
          this.at++;
          this.expect(']');
          value = star(value);
          continue;
        }
        const key = this.or();
        this.expect(']');
        value = property(value, stringify(key));
      } else return value;
    }
  }

  private primary(): Value {
    const token = this.tokens[this.at++];
    if (!token) throw new Error(`Unexpected end of: ${this.source}`);
    if (token.kind === 'number' || token.kind === 'string') return token.value;
    if (token.kind === 'op') {
      if (token.value !== '(') throw new Error(`Unexpected "${token.value}" in: ${this.source}`);
      const value = this.or();
      this.expect(')');
      return value;
    }
    const name = token.value;
    if (name === 'true') return true;
    if (name === 'false') return false;
    if (name === 'null') return null;
    if (this.peek('(')) {
      this.at++;
      const args: Value[] = [];
      while (!this.peek(')')) {
        args.push(this.or());
        if (this.peek(',')) this.at++;
        else break;
      }
      this.expect(')');
      return this.call(name, args);
    }
    return property(this.context, name);
  }

  private call(name: string, args: Value[]): Value {
    const text = (index: number) => stringify(args[index]).toLowerCase();
    switch (name.toLowerCase()) {
      case 'always':
        return true;
      case 'success':
        return this.status.success && !this.status.cancelled;
      case 'failure':
        return this.status.failure;
      case 'cancelled':
        return Boolean(this.status.cancelled);
      case 'contains':
        return Array.isArray(args[0])
          ? args[0].some((item) => looseEquals(item, args[1]))
          : text(0).includes(text(1));
      case 'startswith':
        return text(0).startsWith(text(1));
      case 'endswith':
        return text(0).endsWith(text(1));
      case 'format':
        return stringify(args[0])
          .replace(/\{(\d+)\}/g, (_, index: string) => stringify(args[Number(index) + 1]))
          .replace(/\{\{/g, '{')
          .replace(/\}\}/g, '}');
      case 'join':
        return Array.isArray(args[0])
          ? args[0].map(stringify).join(args.length > 1 ? stringify(args[1]) : ',')
          : stringify(args[0]);
      case 'tojson':
        return JSON.stringify(args[0] ?? null, null, 2);
      case 'fromjson':
        return JSON.parse(stringify(args[0])) as Value;
      case 'hashfiles':
        return 'testwort-hash';
      default:
        throw new Error(`Unknown function ${name}() in: ${this.source}`);
    }
  }
}

const PASSING: Status = { success: true, failure: false };

/** One expression, without its `${{ }}`. */
export function evaluate(expression: string, context: Context, status: Status = PASSING): Value {
  return new Parser(tokenize(expression), context, status, expression).parse();
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
