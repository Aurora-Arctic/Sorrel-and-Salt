import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';
import { LINTED_FILES, PROBE_SETS } from '../support/lint-probes';
import { fromRoot } from '../support/paths';

// The guards share one git listing and one oxlint run, provided by
// tests/support/unit-global-setup.ts (MB.184; claude-docs/testing/layer-ownership.md,
// "The owning layer"). This file holds the setup to what it provides, and holds
// every other test to reading it rather than spawning its own: the fixed cost
// of a scan is paid per run, and a guard that spawned again would pay it per
// file unnoticed.

// Assembled, so this file does not match its own search. A test spawns only
// through `node:child_process`; a mention of the linter in a comment or a
// disable directive is not a run.
const LS_FILES = ['ls', 'files'].join('-');
const LINTER = ['.bin/ox', 'lint'].join('');
const SPAWN = new RegExp(`from '${['node', 'child_process'].join(':')}'`);

/** The one file allowed to spawn either. */
const SETUP = 'tests/support/unit-global-setup.ts';

const files = inject('repoFiles');

describe('MB.184: one listing for every guard', () => {
  // Precondition for everything below: the listing is the repo, not an empty
  // array or a wrong directory.
  it('holds the repo, this file included', () => {
    expect(files.length).toBeGreaterThan(500);
    expect(files).toEqual(
      expect.arrayContaining([
        'package.json',
        'src/app/layout.tsx',
        'tests/guards/shared-scan.test.ts',
        SETUP,
      ]),
    );
  });

  it('lists each file once, on disk, and no lint probe', () => {
    expect(new Set(files).size).toBe(files.length);
    expect(files.filter((file) => !existsSync(fromRoot(file)))).toEqual([]);
    expect(files.filter((file) => /__lint-probe[^/]*__/.test(file))).toEqual([]);
  });

  it('is the only listing a test takes', () => {
    const tests = files.filter((file) => /^tests\/.*\.m?tsx?$/.test(file) && file !== SETUP);
    expect(tests.length).toBeGreaterThan(100);

    const spawning = tests.filter((file) => {
      const text = readFileSync(fromRoot(file), 'utf8');
      return SPAWN.test(text) && text.includes(LS_FILES);
    });

    expect(spawning).toEqual([]);
  });
});

describe('MB.184: one lint run for every lint guard', () => {
  const diagnostics = inject('lintDiagnostics');
  const linted = inject('lintedFiles');

  it('was pointed at every probe set, and drew a diagnostic from each', () => {
    expect(PROBE_SETS.length).toBe(5);
    expect(linted).toEqual(LINTED_FILES);
    for (const set of PROBE_SETS) {
      const probes = [...set.probes.keys()];
      expect(probes.length, set.name).toBeGreaterThan(0);
      expect(linted, set.name).toEqual(expect.arrayContaining([...probes, ...set.files]));
      expect(
        diagnostics.some((d) => probes.includes(d.filename)),
        set.name,
      ).toBe(true);
    }
  });

  // Removed as soon as oxlint has read them, so nothing walking src/ meets one.
  it('left no probe on disk', () => {
    const left = PROBE_SETS.flatMap((set) => set.directories).filter((dir) =>
      existsSync(fromRoot(dir)),
    );
    expect(left).toEqual([]);
  });

  it('reports on linted files only', () => {
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.filter((d) => !linted.includes(d.filename))).toEqual([]);
  });

  it('is the only run a test makes', () => {
    const tests = files.filter((file) => /^tests\/.*\.m?tsx?$/.test(file) && file !== SETUP);
    const spawning = tests.filter((file) => {
      const text = readFileSync(fromRoot(file), 'utf8');
      return SPAWN.test(text) && text.includes(LINTER);
    });

    expect(spawning).toEqual([]);
  });
});
