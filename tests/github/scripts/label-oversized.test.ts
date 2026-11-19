import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runScript } from '../../support/github-scripts';

// The size check runs as its own process on a file list, as the label workflow runs it.

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'label-oversized-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

type File = { filename: string; additions: number; deletions: number };

const sizeOf = (files: File[], labels: string[] = []) => {
  const path = join(dir, 'files.ndjson');
  writeFileSync(path, files.map((file) => JSON.stringify(file)).join('\n'));
  return runScript(
    'label-oversized.mjs',
    { FILES_PATH: path, CURRENT_LABELS: JSON.stringify(labels) },
    dir,
  ).outputs;
};

const file = (filename: string, additions: number, deletions = 0): File => ({
  filename,
  additions,
  deletions,
});

describe('the oversized label', () => {
  it('is added when a pull request changes more than the limit and does not carry it', () => {
    const outputs = sizeOf([file('src/a.ts', 300, 101)]);
    expect(outputs.lines).toBe('401');
    expect(outputs.action).toBe('add');
  });

  it('is left alone at exactly the limit', () => {
    expect(sizeOf([file('src/a.ts', 200, 200)]).action).toBe('none');
  });

  it('is removed when a later push brings the pull request back under the limit', () => {
    expect(sizeOf([file('src/a.ts', 399, 2)], ['oversized', 'bug']).action).toBe('none');
    expect(sizeOf([file('src/a.ts', 399, 1)], ['oversized', 'bug']).action).toBe('remove');
  });

  it('is not added twice', () => {
    expect(sizeOf([file('src/a.ts', 900)], ['oversized']).action).toBe('none');
  });

  it('does not count lockfiles, generated client types, the schema snapshot or migration snapshots', () => {
    const outputs = sizeOf([
      file('src/a.ts', 100),
      file('package-lock.json', 5000),
      file('src/gql/graphql.ts', 5000),
      file('src/graphql/schema.graphql', 5000),
      file('src/db/migrations/meta/0145_snapshot.json', 5000),
    ]);
    expect(outputs.lines).toBe('100');
    expect(outputs.action).toBe('none');
  });

  it('counts a file that only looks generated', () => {
    expect(sizeOf([file('src/lib/gql-helpers.ts', 500)]).action).toBe('add');
  });

  it('states the limit it used', () => {
    expect(sizeOf([]).limit).toBe('400');
  });
});
