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

// The suite's shard count reaches the script as SHARDS, from the shard job's output; the script reads no
// workflow file.
const joined = (
  suite: 'gate' | 'stories',
  shards: string | undefined,
  extra: Record<string, string> = {},
) =>
  runScript(
    'join-playwright-shards.mjs',
    {
      SUITE: suite,
      BLOBS_DIR: blobs,
      PLAYWRIGHT_JSON_OUTPUT_NAME: join(dir, 'results.json'),
      PATH: `${join(dir, 'bin')}${delimiter}${process.env.PATH ?? ''}`,
      ...(shards === undefined ? {} : { SHARDS: shards }),
      ...extra,
    },
    dir,
  ).outputs;

describe('join-playwright-shards', () => {
  it('passes when every shard it is told of left a blob and no test failed', () => {
    blobsLanded(3);
    stubMerge(passing);
    expect(joined('gate', '3').failed).toBe('false');
  });

  it.each([
    ['gate', 2],
    ['gate', 4],
    ['stories', 1],
    ['stories', 3],
  ] as const)(
    'expects the %s shard count it is given, %i, whatever the matrix says',
    (suite, count) => {
      blobsLanded(count);
      stubMerge(passing);
      expect(joined(suite, String(count)).failed).toBe('false');
      rmSync(join(blobs, `report-${count}.zip`));
      expect(joined(suite, String(count)).failed).toBe('true');
    },
  );

  it('fails when a shard left no blob, though the others passed', () => {
    blobsLanded(2);
    stubMerge(passing);
    expect(joined('gate', '3').failed).toBe('true');
  });

  it.each([
    ['no', undefined],
    ['an empty', ''],
    ['a non-numeric', 'three'],
    ['a fractional', '2.5'],
    ['a zero', '0'],
  ])(
    'fails, though every blob landed and no test failed, when given %s shard count',
    (_, shards) => {
      blobsLanded(3);
      stubMerge(passing);
      expect(joined('gate', shards).failed).toBe('true');
    },
  );

  it('reads no workflow file for the count', () => {
    blobsLanded(3);
    stubMerge(passing);
    expect(
      joined('gate', '3', { PLAYWRIGHT_WORKFLOW: join(dir, 'no-such-workflow.yml') }).failed,
    ).toBe('false');
  });

  it('fails when the merged report holds an unexpected test, though merge-reports exited 0', () => {
    blobsLanded(3);
    stubMerge(failing, 0);
    expect(joined('gate', '3').failed).toBe('true');
  });

  it('fails when no blob landed at all, without merging', () => {
    stubMerge(passing);
    expect(joined('gate', '3').failed).toBe('true');
  });

  it('fails the stories when the stories report counts a failed story', () => {
    blobsLanded(2);
    stubMerge(passing);
    const stories = join(dir, 'stories.json');
    writeFileSync(stories, JSON.stringify({ counts: { failed: 1 } }));
    expect(joined('stories', '2', { STORIES_JSON: stories }).failed).toBe('true');
  });

  it('merges each suite with its own config', () => {
    blobsLanded(3);
    stubMerge(passing);
    joined('gate', '3');
    joined('stories', '3');
    const log = readFileSync(join(dir, 'npx.log'), 'utf8');
    expect(log).toContain('--config playwright.config.ts');
    expect(log).toContain('--config playwright.stories.config.ts');
  });
});
