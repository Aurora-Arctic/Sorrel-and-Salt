import { describe, expect, it } from 'vitest';
import { buildChecklist, formatChecklist } from './story-checklist';
import type { ReportedModule, SuiteState } from './story-checklist';

// The inputs are the narrow shape the builder reads off Vitest's TestModule,
// so the cases are plain objects rather than a run.

function module(relativeModuleId: string, suites: Array<[string, SuiteState]>): ReportedModule {
  return {
    relativeModuleId,
    children: {
      allSuites: () => suites.map(([name, state]) => ({ name, state: () => state })),
    },
  };
}

describe('buildChecklist', () => {
  it('lists every v1 story as untested when nothing has run', () => {
    const checklist = buildChecklist([]);

    expect(checklist.total).toBe(45);
    expect(checklist.stories).toHaveLength(45);
    expect(checklist.stories.every((story) => story.status === 'untested')).toBe(true);
    expect(checklist.counts).toEqual({ passed: 0, failed: 0, skipped: 0, untested: 45 });
    expect(checklist.unknown).toEqual([]);
  });

  it('gives each story the state of the suite that names it, in story order', () => {
    const checklist = buildChecklist([
      module('tests/acceptance/01-accounts.test.ts', [
        ['Story 3: create a workspace', 'failed'],
        ['Story 1: sign in', 'passed'],
        ['Story 2: told what to do next', 'skipped'],
      ]),
    ]);

    expect(checklist.stories.slice(0, 4).map(({ id, status }) => ({ id, status }))).toEqual([
      { id: 1, status: 'passed' },
      { id: 2, status: 'skipped' },
      { id: 3, status: 'failed' },
      { id: 4, status: 'untested' },
    ]);
    expect(checklist.counts).toEqual({ passed: 1, failed: 1, skipped: 1, untested: 42 });
  });

  it('keeps the §10 title on each line, not the describe wording', () => {
    const checklist = buildChecklist([
      module('tests/acceptance/01-accounts.test.ts', [['Story 1: sign in', 'passed']]),
    ]);

    expect(checklist.stories[0].title).toBe(
      "Sign in with Google or GitHub, so I don't manage another password.",
    );
    expect(checklist.stories[0].suites).toEqual(['tests/acceptance/01-accounts.test.ts']);
  });

  it('records where a story is tested, across files', () => {
    const checklist = buildChecklist([
      module('tests/acceptance/01-accounts.test.ts', [['Story 12: viewer reads', 'passed']]),
      module('tests/acceptance/06-grimoire.test.ts', [['Story 12: viewer reads spells', 'passed']]),
    ]);

    expect(checklist.stories.find((story) => story.id === 12)?.suites).toEqual([
      'tests/acceptance/01-accounts.test.ts',
      'tests/acceptance/06-grimoire.test.ts',
    ]);
  });

  it('passes a story only when every suite naming it passed', () => {
    // 'pending' is what an interrupted run leaves behind and must never read as green.
    const status = (states: SuiteState[]) =>
      buildChecklist([
        module(
          'x.test.ts',
          states.map((s, i) => [`Story 1: case ${i}`, s]),
        ),
      ]).stories[0].status;

    expect(status(['passed', 'passed'])).toBe('passed');
    expect(status(['passed', 'failed'])).toBe('failed');
    expect(status(['passed', 'skipped'])).toBe('skipped');
    expect(status(['skipped', 'failed'])).toBe('failed');
    expect(status(['passed', 'pending'])).toBe('failed');
  });

  it('sets aside a suite that names a number outside v1, and ignores suites that name none', () => {
    const checklist = buildChecklist([
      module('tests/acceptance/05-notes.test.ts', [
        ['Story 40: a v2 notes story', 'passed'],
        ['helpers', 'passed'],
      ]),
    ]);

    expect(checklist.unknown).toEqual([
      { id: 40, name: 'Story 40: a v2 notes story', module: 'tests/acceptance/05-notes.test.ts' },
    ]);
    expect(checklist.counts.passed).toBe(0);
  });
});

describe('formatChecklist', () => {
  const checklist = buildChecklist([
    module('tests/acceptance/01-accounts.test.ts', [
      ['Story 1: sign in', 'passed'],
      ['Story 2: told what next', 'failed'],
      ['Story 3: create a workspace', 'skipped'],
      ['Story 40: not v1', 'passed'],
    ]),
  ]);
  const text = formatChecklist(checklist);
  const lines = text.split('\n');

  it('prints one line per story with its id, title and status', () => {
    expect(lines).toContain(
      "[x] Story 1: Sign in with Google or GitHub, so I don't manage another password.",
    );
    expect(lines.find((line) => line.startsWith('[ ] Story 2:'))).toMatch(/— FAILING$/);
    expect(lines.find((line) => line.startsWith('[ ] Story 3:'))).toMatch(/— skipped$/);
    expect(lines.find((line) => line.startsWith('[ ] Story 4:'))).toMatch(/— no test yet$/);
    expect(lines.filter((line) => /^\[[x ]\] Story \d+:/.test(line))).toHaveLength(45);
  });

  it('ends with the tally', () => {
    expect(lines[lines.length - 1]).toBe(
      '1 of 45 stories passing · 1 failing · 1 skipped · 42 without a test',
    );
  });

  it('calls out a suite naming a number that is not a v1 story', () => {
    expect(text).toContain(
      'Not a v1 story: "Story 40: not v1" in tests/acceptance/01-accounts.test.ts',
    );
  });

  it('omits the tally parts that are zero, except the passing count', () => {
    expect(formatChecklist(buildChecklist([])).split('\n').pop()).toBe(
      '0 of 45 stories passing · 45 without a test',
    );
  });
});
