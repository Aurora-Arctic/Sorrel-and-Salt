import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  type Context,
  type Step,
  evaluateMap,
  evaluateValue,
  holds,
  loadWorkflow,
  runStepScript,
} from '../../support/github-workflow';

// The `changes` job of the PR gate, evaluated as GitHub evaluates it: the step that finds the pull
// request's place in its stack is run, and the job's outputs and the filter step's inputs are read
// back from what it wrote.

const FILTERS = [
  'lint',
  'typecheck',
  'build',
  'destructive_ddl',
  'destructive_ddl_migrations_files',
  'migration_order',
  'vitest',
  'playwright',
  'stories',
  'workshop',
];
const SLOW = ['build', 'vitest', 'playwright', 'stories', 'workshop'];
const PASSING = { success: true, failure: false, cancelled: false, always: true };

const changes = loadWorkflow('pr-gate.yml').jobs.changes;
const step = (id: string) => (changes.steps ?? []).find((candidate) => candidate.id === id) as Step;
const checkout = (changes.steps ?? []).find((candidate) =>
  candidate.uses?.startsWith('actions/checkout'),
) as Step;

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'pr-gate-stack-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

type Stack = { position: number; size: number; base: { sha: string } } | null;

const gate = (stack: Stack) => {
  const event: Context = {
    pull_request: {
      number: 7,
      head: { sha: 'headsha' },
      ...(stack ? { stack } : { stack: null }),
    },
  };
  const base: Context = {
    github: { event, token: 'the-token' },
    steps: { 'stand-down': { outputs: {} } },
  };
  const found = runStepScript(step('stack'), { context: base, root });
  expect(found.status, found.log).toBe(0);
  const withStack: Context = {
    ...base,
    steps: { ...(base.steps as Context), stack: { outputs: found.outputs } },
  };
  const everyFilterMatches = Object.fromEntries(
    FILTERS.map((name) => [name, name.endsWith('_files') ? '[]' : 'true']),
  );
  const context: Context = {
    ...withStack,
    steps: { ...(withStack.steps as Context), filter: { outputs: everyFilterMatches } },
  };
  return {
    role: found.outputs.role,
    outputs: evaluateMap(changes.outputs as Record<string, unknown>, context),
    filter: evaluateMap(step('filter').with, withStack),
    checksOut: holds(checkout.if, withStack, PASSING),
    checkoutRef: evaluateValue(checkout.with?.ref, withStack),
  };
};

const stack = (position: number, size: number): Stack => ({
  position,
  size,
  base: { sha: 'stackbasesha' },
});

describe('the gate on a pull request outside a stack', () => {
  it.each([
    ['no stack in the payload', null],
    ['a stack with no size yet', { position: 1, size: '', base: { sha: '' } } as unknown as Stack],
  ])('passes every filter result through unchanged: %s', (_, shape) => {
    const run = gate(shape);
    expect(run.role).toBe('none');
    for (const name of [...SLOW, 'lint', 'typecheck', 'destructive_ddl', 'migration_order'])
      expect(run.outputs[name], name).toBe('true');
    expect(run.outputs['stack-role']).toBe('none');
  });

  it('lists the files through the API with its own token, as before', () => {
    const run = gate(null);
    expect(run.filter.token).toBe('the-token');
    expect(run.filter.base).toBe('');
    expect(run.checksOut).toBe(false);
  });
});

describe('the gate on the top layer of a stack', () => {
  it('runs every job the filters ask for', () => {
    const run = gate(stack(3, 3));
    expect(run.role).toBe('top');
    for (const name of SLOW) expect(run.outputs[name], name).toBe('true');
  });

  it('diffs the stack base against the checked-out head with no token', () => {
    const run = gate(stack(3, 3));
    expect(run.filter.token).toBe('');
    expect(run.filter.base).toBe('stackbasesha');
    expect(run.checksOut).toBe(true);
    expect(run.checkoutRef).toBe('headsha');
  });

  it('treats a stack of one as its top layer', () => {
    expect(gate(stack(1, 1)).role).toBe('top');
  });
});

describe('the gate on a layer below the top', () => {
  it('leaves only the format, lint and type checks to run', () => {
    const run = gate(stack(2, 3));
    expect(run.role).toBe('lower');
    for (const name of SLOW) expect(run.outputs[name], name).toBe('false');
    expect(run.outputs.lint).toBe('true');
    expect(run.outputs.typecheck).toBe('true');
  });

  it('reads the files through the API, as a layer outside a stack does', () => {
    const run = gate(stack(1, 3));
    expect(run.filter.token).toBe('the-token');
    expect(run.filter.base).toBe('');
    expect(run.checksOut).toBe(false);
  });
});

describe('the aggregate checks', () => {
  it('keep the outputs the other jobs read, under the same names', () => {
    const outputs = Object.keys(changes.outputs as Record<string, unknown>);
    for (const name of ['stand-down', ...FILTERS]) expect(outputs).toContain(name);
  });
});
