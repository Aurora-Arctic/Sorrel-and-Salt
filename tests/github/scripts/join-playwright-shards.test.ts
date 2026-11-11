import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mergedPlaywrightReport, runScript } from '../../support/github-scripts';

// The join runs as its own process. `npx` is a stub that records its arguments and writes the
// merged report a real `merge-reports` would, since the real one needs the blobs of a real run.

let dir: string;
let blobs: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'join-shards-'));
  blobs = join(dir, 'blobs');
  mkdirSync(blobs);
  mkdirSync(join(dir, 'bin'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const blobsLanded = (count: number) => {
  for (let shard = 1; shard <= count; shard++)
    writeFileSync(join(blobs, `report-${shard}.zip`), '');
};

// The stub copies `merged.json` to the json report's path and logs its arguments.
const stubMerge = (report: unknown, status = 0) => {
  writeFileSync(join(dir, 'merged.json'), JSON.stringify(report));
  const stub = join(dir, 'bin', 'npx');
  writeFileSync(
    stub,
    `#!/bin/sh\necho "$@" >> "${dir}/npx.log"\ncp "${dir}/merged.json" "$PLAYWRIGHT_JSON_OUTPUT_NAME"\nexit ${status}\n`,
  );
  chmodSync(stub, 0o755);
};

const passing = mergedPlaywrightReport(
  [{ file: 'a.spec.ts', tests: [{ title: 'passes', ms: 10 }] }],
  10,
);
const failing = mergedPlaywrightReport(
  [{ file: 'a.spec.ts', tests: [{ title: 'fails', ms: 10, failed: 'boom' }] }],
  10,
);

const joined = (suite: 'gate' | 'stories', extra: Record<string, string> = {}) =>
  runScript(
    'join-playwright-shards.mjs',
    {
      SUITE: suite,
      BLOBS_DIR: blobs,
      PLAYWRIGHT_JSON_OUTPUT_NAME: join(dir, 'results.json'),
      PATH: `${join(dir, 'bin')}${delimiter}${process.env.PATH ?? ''}`,
      ...extra,
    },
    dir,
  ).outputs;

describe('join-playwright-shards', () => {
  it('passes when every gate shard left a blob and no test failed', () => {
    blobsLanded(3);
    stubMerge(passing);
    expect(joined('gate').failed).toBe('false');
  });

  it('fails when a gate shard left no blob, though the others passed', () => {
    blobsLanded(2);
    stubMerge(passing);
    expect(joined('gate').failed).toBe('true');
  });

  it('fails when the merged report holds an unexpected test, though merge-reports exited 0', () => {
    blobsLanded(3);
    stubMerge(failing, 0);
    expect(joined('gate').failed).toBe('true');
  });

  it('fails when no blob landed at all, without merging', () => {
    stubMerge(passing);
    expect(joined('gate').failed).toBe('true');
  });

  it('expects two story shards, not three', () => {
    blobsLanded(2);
    stubMerge(passing);
    expect(joined('stories').failed).toBe('false');
  });

  it('fails the stories when one blob is missing', () => {
    blobsLanded(1);
    stubMerge(passing);
    expect(joined('stories').failed).toBe('true');
  });

  it('fails the stories when the stories report counts a failed story', () => {
    blobsLanded(2);
    stubMerge(passing);
    const stories = join(dir, 'stories.json');
    writeFileSync(stories, JSON.stringify({ counts: { failed: 1 } }));
    expect(joined('stories', { STORIES_JSON: stories }).failed).toBe('true');
  });

  it('merges each suite with its own config', () => {
    blobsLanded(3);
    stubMerge(passing);
    joined('gate');
    blobsLanded(3);
    joined('stories');
    const log = readFileSync(join(dir, 'npx.log'), 'utf8');
    expect(log).toContain('--config playwright.config.ts');
    expect(log).toContain('--config playwright.stories.config.ts');
  });
});
