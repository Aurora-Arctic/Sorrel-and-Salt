import { describe, expect, it } from 'vitest';
import { specialServersFor } from './server-selection';

const run = (...args: string[]) => ['node', '/x/playwright/cli.js', 'test', ...args];
const BOTH = ['configured-providers', 'compendium-cache'];

describe('specialServersFor', () => {
  it('starts both for a run with no file named', () => {
    expect(specialServersFor(run())).toEqual(BOTH);
  });

  it('starts none when every named file is an ordinary spec', () => {
    expect(
      specialServersFor(
        run('tests/e2e/skeleton-layout.spec.ts', 'tests/e2e/navigation-wait.spec.ts'),
      ),
    ).toEqual([]);
  });

  it('starts the one a named spec needs', () => {
    expect(specialServersFor(run('tests/e2e/compendium-cache.spec.ts'))).toEqual([
      'compendium-cache',
    ]);
    expect(
      specialServersFor(
        run('tests/e2e/a.spec.ts', 'tests/e2e/sign-in-configured-providers.spec.ts'),
      ),
    ).toEqual(['configured-providers']);
  });

  it('reads a filter as a pattern, with a line suffix dropped', () => {
    expect(specialServersFor(run('compendium-cache'))).toEqual(['compendium-cache']);
    expect(specialServersFor(run('tests/e2e/compendium-cache.spec.ts:12'))).toEqual([
      'compendium-cache',
    ]);
    expect(specialServersFor(run('tests/e2e/'))).toEqual(BOTH);
  });

  it('starts both when a filter is not a valid pattern', () => {
    expect(specialServersFor(run('tests/e2e/(a.spec.ts'))).toEqual(BOTH);
  });

  it('starts both for any option that can widen the selection', () => {
    for (const option of ['--project', '--grep', '-g', '--last-failed', '--ui', '--shard=1/2']) {
      expect(specialServersFor(run('tests/e2e/a.spec.ts', option))).toEqual(BOTH);
    }
  });

  it('allows options that change how a run reports', () => {
    expect(specialServersFor(run('--reporter=line', '--headed', 'tests/e2e/a.spec.ts'))).toEqual(
      [],
    );
  });

  it('starts both when the command is not a test run', () => {
    expect(specialServersFor(['node', '/x/worker.js'])).toEqual(BOTH);
    expect(specialServersFor(['node', 'cli.js', 'show-report', 'a.spec.ts'])).toEqual(BOTH);
  });
});
