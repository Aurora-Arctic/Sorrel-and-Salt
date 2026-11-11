// Joins one Playwright suite's shards: counts the blob reports that landed
// against the shard count the suite's jobs report, merges them with
// the suite's own config, and reads the merged report. `playwright
// merge-reports` exits 0 whatever the tests did, so the verdict is read from
// the joined data here.
//
// Reads SUITE (`gate` or `stories`), SHARDS (the suite's shard count), BLOBS_DIR
// (the folder holding the suite's blobs, flat) and, for the report the merge writes, CI and
// PLAYWRIGHT_JSON_OUTPUT_NAME (and STORIES_JSON for the stories). Sets the
// `failed` output: `true` when a blob is missing, the merge itself failed, or
// a test or story failed. Exits 0 either way; the caller decides what a
// failure fails.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { setOutput } from './lib/github-output.mjs';

const CONFIGS = { gate: 'playwright.config.ts', stories: 'playwright.stories.config.ts' };

// The shard count the suite's jobs ran as, from their `shards` output: a positive integer, or nothing
// to judge a blob count by.
function shardCount(text) {
  return /^[1-9]\d*$/.test(text ?? '') ? Number(text) : undefined;
}

// Blobs at the top of the folder, where `merge-reports` reads them.
function blobsIn(dir) {
  return fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isFile()).length
    : 0;
}

function main() {
  const { SUITE: suite, BLOBS_DIR: dir } = process.env;
  if (!(suite in CONFIGS)) throw new Error('SUITE must be gate or stories');
  const expected = shardCount(process.env.SHARDS);
  const found = blobsIn(dir);
  const reasons = [];

  if (expected === undefined) reasons.push('the suite gave no shard count');
  else if (found !== expected) reasons.push(`${found} of ${expected} shards left a blob report`);
  if (found > 0) {
    const merged = spawnSync(
      'npx',
      ['playwright', 'merge-reports', '--config', CONFIGS[suite], dir],
      {
        stdio: 'inherit',
      },
    );
    if (merged.status !== 0) reasons.push('the merge of the blob reports failed');
  }

  const resultsPath = process.env.PLAYWRIGHT_JSON_OUTPUT_NAME;
  if (found > 0 && resultsPath && fs.existsSync(resultsPath)) {
    const { unexpected = 0 } = JSON.parse(fs.readFileSync(resultsPath, 'utf8')).stats ?? {};
    if (unexpected > 0) reasons.push(`${unexpected} tests failed`);
  } else if (found > 0) {
    reasons.push('the merge wrote no report');
  }
  const storiesPath = process.env.STORIES_JSON;
  if (suite === 'stories' && found > 0 && storiesPath && fs.existsSync(storiesPath)) {
    const { counts = {} } = JSON.parse(fs.readFileSync(storiesPath, 'utf8'));
    if (counts.failed > 0) reasons.push(`${counts.failed} stories failed`);
  }

  for (const reason of reasons) console.log(`${suite}: ${reason}`);
  setOutput('failed', reasons.length > 0 ? 'true' : 'false');
}

main();
