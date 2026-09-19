import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import { REPO_ROOT } from '../support/paths';

// MB.41 — every Vitest file lives under tests/.
//
// The failure is silent: `vitest.config.mts`'s `include` glob is scoped to
// `tests/`, so a `*.test.ts` written beside the code it covers is not a failing
// test, it is a file nothing runs. A test rather than an Oxlint rule for the
// reason workshop-guards.ts gives: Oxlint has no custom-rule API, and "this file
// is in the wrong directory" is a statement about the tree.
//
// The scan reads the *index* — `--cached`, so a staged file counts before it is
// committed. It deliberately does **not** pass `--others`, which
// slug-rule.test.ts does: that guard reads file *contents*, where a duplicate is
// harmless, while this one enumerates *locations*, where a stray copy is the
// whole finding — and a file untracked because it was just written is
// indistinguishable from one untracked because it was deleted. See
// claude-docs/testing.md, "Where tests live".
//
// Playwright's specs are outside this by construction — they end `.spec.ts`,
// which is what keeps `e2e/` from having to be named as an exception here.

const TEST_FILE = /\.test\.tsx?$/;
const HOME = 'tests/';

/** Every test file the repo holds — the index, so staged counts as held. */
function testFiles(): string[] {
  return execFileSync('git', ['-c', 'safe.directory=*', 'ls-files', '--cached'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
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
