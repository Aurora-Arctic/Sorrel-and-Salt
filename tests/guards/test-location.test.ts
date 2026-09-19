import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import { REPO_ROOT } from '../support/paths';

// Every Vitest file lives under tests/ (claude-docs/testing.md, "Where tests
// live"). The failure is silent: `include` is scoped to `tests/`, so a test
// written beside its code is a file nothing runs.
//
// The scan reads the index (`--cached`, so a staged file counts) and not
// `--others`: this guard enumerates *locations*, where a stray copy is the
// whole finding, and a file untracked because it was just written is
// indistinguishable from one untracked because it was deleted. Playwright's
// specs end `.spec.ts`, so `e2e/` needs no exception.

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
