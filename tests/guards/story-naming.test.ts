import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { storyNamingViolations } from '../support/story-naming';
import { REPO_ROOT } from '../support/paths';

// Every top-level describe under tests/acceptance/ names a v1 story
// (claude-docs/testing.md, "Acceptance"). A suite that leaves its story off is
// not a red line on the checklist — it is a line that never appears.
//
// Tracked plus untracked, as slug-rule.test.ts scans: the file this guard
// exists to catch was just written. Scoped to `*.test.ts(x)` by name rather
// than by walking the disk.

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

  // Precondition: an empty list is what a wrong path or a broken `git
  // ls-files` returns too, so the thing asserted to exist is the tracked README.
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
