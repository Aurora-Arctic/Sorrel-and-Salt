import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, inject, it } from 'vitest';

import { storyNamingViolations } from '../support/story-naming';
import { REPO_ROOT } from '../support/paths';

// Every top-level describe under tests/acceptance/ names a v1 story
// (claude-docs/testing/acceptance.md, "Acceptance"). A suite that leaves its story off is
// not a red line on the checklist — it is a line that never appears.
//
// Tracked plus untracked, as slug-rule.test.ts scans — the unit project's
// shared listing (MB.184): the file this guard exists to catch was just
// written. Scoped to `*.test.ts(x)` by name rather than by walking the disk.

const ACCEPTANCE_DIR = 'tests/acceptance';
const TEST_FILE = /\.test\.tsx?$/;

describe('M1.28: acceptance tests name their story', () => {
  const listed = inject('repoFiles').filter((file) => file.startsWith(`${ACCEPTANCE_DIR}/`));
  const files = listed.filter((file) => TEST_FILE.test(file));

  // Precondition: an empty list is what a wrong path or a broken listing
  // returns too, so the thing asserted to exist is the tracked README.
  it('finds the acceptance directory', () => {
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
