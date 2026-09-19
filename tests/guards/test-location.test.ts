import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import { REPO_ROOT } from '../support/paths';

// MB.41 — every Vitest file lives under tests/.
//
// The mechanism that puts a test in a run is `vitest.config.mts`'s `include`
// glob, and it is scoped to `tests/`. That makes the failure mode silent in
// the worst way: a `*.test.ts` written next to the code it covers is not a
// failing test, it is a file nothing ever runs, and a suite that never runs
// is indistinguishable from one that passes. Reviewing a diff for it means
// noticing an absence.
//
// This is a test rather than an Oxlint rule for the reason workshop-guards.ts
// gives: Oxlint has no custom-rule API, and "this file is in the wrong
// directory" is a statement about the tree rather than about the contents of
// any one file, which a single-file linter cannot express.
//
// The scan reads tracked *and* untracked files, as slug-rule.test.ts does, so
// a misplaced test fails in the diff that adds it rather than after it lands.
// Playwright's specs are outside this by construction — they end `.spec.ts`,
// which is what keeps `e2e/` from having to be named as an exception here.

const TEST_FILE = /\.test\.tsx?$/;
const HOME = 'tests/';

/** Every test file in the working tree, committed or not. */
function testFiles(): string[] {
  return execFileSync(
    'git',
    ['-c', 'safe.directory=*', 'ls-files', '--cached', '--others', '--exclude-standard'],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  )
    .split('\n')
    .filter((file) => TEST_FILE.test(file));
}

describe('MB.41: Vitest files live under tests/', () => {
  const files = testFiles();

  // The preconditions. "No file was outside tests/" is also what an empty
  // scan says, and an empty scan is the one result that proves nothing —
  // a broken `git ls-files`, a regex that matches no real filename, a wrong
  // `cwd`. Assert the scan found the suite before trusting where it is.
  it('finds the suite, including this file', () => {
    expect(files.length).toBeGreaterThan(30);
    expect(files).toContain('tests/guards/test-location.test.ts');
  });

  it('has no test file outside tests/', () => {
    expect(files.filter((file) => !file.startsWith(HOME))).toEqual([]);
  });
});
