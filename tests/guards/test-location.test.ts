import picomatch from 'picomatch';
import { describe, expect, inject, it } from 'vitest';

import config from '../../vitest.config.mts';

// Every Vitest file lives under tests/, and every Playwright spec under
// tests/e2e/ (claude-docs/testing/where-tests-live.md, "Where tests live"). The failure is
// silent either way: Vitest's `include` is scoped to `tests/` and Playwright's
// `testDir` to `tests/e2e/`, so a test written beside its code is a file
// nothing runs.
//
// The scan is the unit project's shared listing (MB.184): the index plus the
// untracked files git would not ignore, on disk, so a test written beside its
// code fails in the diff that adds it, before it is staged. Until MB.42 this
// guard read the index alone, because CI's container kept every file deleted
// since its image was built and an untracked scan reported all of them; the
// image carries no source layer now (image-source-layer.test.ts).

const TEST_FILE = /\.test\.tsx?$/;
const SPEC_FILE = /\.spec\.ts$/;
const HOME = 'tests/';
const SPEC_HOME = 'tests/e2e/';
/** Playwright's and the acceptance suite's, which no project in the main config runs. */
const NOT_A_PROJECTS = ['tests/e2e/', 'tests/acceptance/'];

/** Every file the repo holds, staged or not yet. */
const tracked = inject('repoFiles');

describe('MB.41: Vitest files live under tests/', () => {
  const files = tracked.filter((file) => TEST_FILE.test(file));

  // Precondition: an empty scan also says "no file was outside tests/" — a
  // broken listing, a regex matching no real filename, a wrong `cwd`.
  it('finds the suite, including this file', () => {
    expect(files.length).toBeGreaterThan(30);
    expect(files).toContain('tests/guards/test-location.test.ts');
  });

  it('has no test file outside tests/', () => {
    expect(files.filter((file) => !file.startsWith(HOME))).toEqual([]);
  });
});

describe('MB.64: Playwright specs live under tests/e2e/', () => {
  const specs = tracked.filter((file) => SPEC_FILE.test(file));

  // The same precondition: a scan that found no spec would pass the next test.
  it('finds the specs', () => {
    expect(specs.length).toBeGreaterThan(3);
    expect(specs).toContain('tests/e2e/smoke.spec.ts');
  });

  it('has no spec outside tests/e2e/', () => {
    expect(specs.filter((file) => !file.startsWith(SPEC_HOME))).toEqual([]);
  });
});

// The projects split on path globs, so a file can land in none of them — a
// test nothing runs — or in two, run twice with nobody the wiser. Evaluated
// against the config itself rather than a copy of its globs, with picomatch,
// which is what Vitest's own globber is built on.
describe('MB.97: every test file runs in exactly one project', () => {
  interface Project {
    test: { name: string; include: string[]; exclude?: string[] };
  }
  const projects = (config.test?.projects ?? []) as Project[];
  // A leading `!` in `include` negates, as it does for Vitest's globber.
  const matcher = (patterns: string[]) => {
    const positive = picomatch(patterns.filter((pattern) => !pattern.startsWith('!')));
    const negative = picomatch(
      patterns.filter((pattern) => pattern.startsWith('!')).map((pattern) => pattern.slice(1)),
    );
    return (file: string) => positive(file) && !negative(file);
  };
  const matchers = projects.map(({ test }) => {
    const included = matcher(test.include);
    const excluded = matcher(test.exclude ?? []);
    return { name: test.name, matches: (file: string) => included(file) && !excluded(file) };
  });
  const files = tracked.filter(
    (file) => TEST_FILE.test(file) && !NOT_A_PROJECTS.some((dir) => file.startsWith(dir)),
  );
  const homes = (file: string) =>
    matchers.filter(({ matches }) => matches(file)).map((m) => m.name);

  // Preconditions: the config was read (four named projects) and the scan
  // found the suite, this file included — otherwise "no file is in two
  // projects" is true of nothing.
  it('reads the four projects and finds the suite', () => {
    expect(matchers.map((m) => m.name).sort()).toEqual(['db', 'dom', 'rsc', 'unit']);
    expect(files.length).toBeGreaterThan(30);
    expect(homes('tests/guards/test-location.test.ts')).toEqual(['unit']);
    expect(homes('tests/support/vitest-setup.test.tsx')).toEqual(['dom']);
  });

  it('has no test file outside every project', () => {
    expect(files.filter((file) => homes(file).length === 0)).toEqual([]);
  });

  it('has no test file inside two projects', () => {
    expect(files.filter((file) => homes(file).length > 1)).toEqual([]);
  });
});
