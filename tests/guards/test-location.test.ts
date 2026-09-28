import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import { REPO_ROOT } from '../support/paths';

// Every Vitest file lives under tests/, and every Playwright spec under
// tests/e2e/ (claude-docs/testing.md, "Where tests live"). The failure is
// silent either way: Vitest's `include` is scoped to `tests/` and Playwright's
// `testDir` to `tests/e2e/`, so a test written beside its code is a file
// nothing runs.
//
// The scan reads the index (`--cached`, so a staged file counts) and not
// `--others`: this guard enumerates *locations*, where a stray copy is the
// whole finding, and a file untracked because it was just written is
// indistinguishable from one untracked because it was deleted.

const TEST_FILE = /\.test\.tsx?$/;
const SPEC_FILE = /\.spec\.ts$/;
const HOME = 'tests/';
const SPEC_HOME = 'tests/e2e/';

/** Every file the repo holds — the index, so staged counts as held. */
function trackedFiles(): string[] {
  return execFileSync('git', ['-c', 'safe.directory=*', 'ls-files', '--cached'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).split('\n');
}

describe('MB.41: Vitest files live under tests/', () => {
  const files = trackedFiles().filter((file) => TEST_FILE.test(file));

  // Precondition: an empty scan also says "no file was outside tests/" — a
  // broken `git ls-files`, a regex matching no real filename, a wrong `cwd`.
  it('finds the suite, including this file', () => {
    expect(files.length).toBeGreaterThan(30);
    expect(files).toContain('tests/guards/test-location.test.ts');
  });

  it('has no test file outside tests/', () => {
    expect(files.filter((file) => !file.startsWith(HOME))).toEqual([]);
  });
});

describe('MB.64: Playwright specs live under tests/e2e/', () => {
  const specs = trackedFiles().filter((file) => SPEC_FILE.test(file));

  // The same precondition: a scan that found no spec would pass the next test.
  it('finds the specs', () => {
    expect(specs.length).toBeGreaterThan(3);
    expect(specs).toContain('tests/e2e/smoke.spec.ts');
  });

  it('has no spec outside tests/e2e/', () => {
    expect(specs.filter((file) => !file.startsWith(SPEC_HOME))).toEqual([]);
  });
});
