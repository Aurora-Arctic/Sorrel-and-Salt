import picomatch from 'picomatch';
import { describe, expect, inject, it } from 'vitest';

import config from '../../vitest.config.mts';

// Every Vitest file lives under tests/ and runs in exactly one project, and
// every Playwright spec under tests/e2e/ (claude-docs/testing/where-tests-live.md,
// "Where tests live"). The failure is silent otherwise: a test beside its code,
// or in no project's globs, is a file nothing runs, and one in two projects
// runs twice. The scan is the unit project's shared listing (MB.184) — the
// index plus the untracked files git would not ignore — so a misplaced test
// fails in the diff that adds it, before it is staged. The globs are the
// config's own, matched with picomatch, which Vitest's globber is built on.

const TEST_FILE = /\.test\.tsx?$/;
/** Playwright's and the acceptance suite's, which no project in the main config runs. */
const NOT_A_PROJECTS = ['tests/e2e/', 'tests/acceptance/'];

interface Project {
  test: { name: string; include: string[]; exclude?: string[] };
}

describe('MB.41, MB.64, MB.97: where a test file lives', () => {
  it('puts every test file in exactly one project, and every spec under tests/e2e/', () => {
    const files = inject('repoFiles');
    const projects = (config.test?.projects ?? []) as Project[];
    // A leading `!` in `include` negates, as it does for Vitest's globber.
    const matcher = (patterns: string[]) => {
      const positive = picomatch(patterns.filter((pattern) => !pattern.startsWith('!')));
      const negative = picomatch(
        patterns.filter((pattern) => pattern.startsWith('!')).map((pattern) => pattern.slice(1)),
      );
      return (file: string) => positive(file) && !negative(file);
    };
    const matchers = projects.map(({ test }) => {
      const included = matcher(test.include);
      const excluded = matcher(test.exclude ?? []);
      return { name: test.name, matches: (file: string) => included(file) && !excluded(file) };
    });
    const homes = (file: string) =>
      matchers.filter(({ matches }) => matches(file)).map((m) => m.name);
    const tests = files.filter(
      (file) => TEST_FILE.test(file) && !NOT_A_PROJECTS.some((dir) => file.startsWith(dir)),
    );

    // Preconditions: the config was read and the scan found the suite, this
    // file included — otherwise "no file is misplaced" is true of nothing.
    expect(matchers.map((m) => m.name).sort()).toEqual(['db', 'dom', 'rsc', 'unit']);
    expect(tests.length).toBeGreaterThan(30);
    expect(homes('tests/guards/test-location.test.ts')).toEqual(['unit']);

    expect(tests.filter((file) => homes(file).length !== 1)).toEqual([]);
    expect(
      files.filter((file) => file.endsWith('.spec.ts') && !file.startsWith('tests/e2e/')),
    ).toEqual([]);
  });
});
