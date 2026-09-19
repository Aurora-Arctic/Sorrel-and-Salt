import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { storyNamingViolations } from '../support/story-naming';
import { REPO_ROOT } from '../support/paths';

// M1.28 — every top-level describe under tests/acceptance/ names a v1 story.
//
// DESIGN.md §11: "Each test carries its story id, so a failure points at a
// requirement rather than an implementation detail." The checklist
// (tests/support/story-checklist.ts) is built from those names, so a suite
// that leaves its story off is not a red line on the checklist — it is a
// line that never appears, and a story that reads "no test yet" while a
// test for it is failing. The sweep-task rule says a mechanism lands with a
// guard, as early as it can be written, and each later acceptance scaffold
// (M2.1, M5.1, …) adopts it in its own PR.
//
// Tracked plus untracked, as slug-rule.test.ts scans: the file this guard
// exists to catch is the one just written, which is untracked until it is
// committed. The directory's README is tracked, so the scan of a directory
// that CI's container may have polluted with deleted files (MB.42) is scoped
// to `*.test.ts(x)` and read by name rather than by walking the disk.

const ACCEPTANCE_DIR = 'tests/acceptance';
const TEST_FILE = /\.test\.tsx?$/;

function acceptanceFiles(): string[] {
  const args = ['-c', 'safe.directory=*', 'ls-files', '--cached', '--others', '--exclude-standard'];
  return execFileSync('git', [...args, ACCEPTANCE_DIR], { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\n')
    .filter((file) => TEST_FILE.test(file));
}

describe('M1.28: acceptance tests name their story', () => {
  const files = acceptanceFiles();

  // The precondition. An empty list is what a wrong path or a broken
  // `git ls-files` returns too, and the directory has no test files until
  // M2.1 — so the thing asserted to exist is the directory's own README,
  // which is tracked, and the scan is shown to reach the directory at all.
  it('finds the acceptance directory', () => {
    const listed = execFileSync('git', ['-c', 'safe.directory=*', 'ls-files', ACCEPTANCE_DIR], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    expect(listed).toContain(`${ACCEPTANCE_DIR}/README.md`);
  });

  it('has no acceptance test file with an unnamed or non-v1 top-level block', () => {
    const violations = files.flatMap((file) =>
      storyNamingViolations(readFileSync(join(REPO_ROOT, file), 'utf8')).map(
        (violation) => `${file}: ${violation}`,
      ),
    );

    expect(violations).toEqual([]);
  });
});
