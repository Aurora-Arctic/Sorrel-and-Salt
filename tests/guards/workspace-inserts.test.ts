import { describe, expect, inject, it } from 'vitest';
import { fromRoot } from '../support/paths';
import { readFileSync } from 'node:fs';

// A test seeds a coven through tests/support/db/insert-workspace.ts; a local helper that inserts the
// workspaces row, or a local `insertCoven`/`makeCoven`, is a second copy that drifts.

const HELPER = 'tests/support/db/insert-workspace.ts';
const HELPER_NAME = /(?:function|const)\s+(?:insertCoven|makeCoven)\b/;
// The one wrapper that delegates: it adds only the e2e database connection.
const DELEGATES = new Set(['tests/e2e/stories/accounts-setup.ts']);

function testFiles(): string[] {
  return inject('repoFiles').filter(
    (file) => file.startsWith('tests/') && /\.(ts|tsx)$/.test(file),
  );
}

describe('coven-insert helpers', () => {
  it('scans the shared helper', () => {
    expect(testFiles()).toContain(HELPER);
  });

  it('refuses a local insertCoven or makeCoven that does not delegate', () => {
    const offenders = testFiles().filter((file) => {
      if (file === HELPER) return false;
      const source = readFileSync(fromRoot(file), 'utf8');
      if (!HELPER_NAME.test(source)) return false;
      return !(DELEGATES.has(file) && source.includes('insertWorkspaceWithSlug'));
    });
    expect(offenders).toEqual([]);
  });
});
