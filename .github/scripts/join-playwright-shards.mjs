// Joins one Playwright suite's shards: counts the blob reports that landed
// against the shard count playwright.yml's matrix declares, merges them with
// the suite's own config, and reads the merged report. `playwright
// merge-reports` exits 0 whatever the tests did, so the verdict is read from
// the joined data here.
//
// Reads SUITE (`gate` or `stories`), BLOBS_DIR (the folder holding the suite's
// blobs, flat) and, for the report the merge writes, CI and
// PLAYWRIGHT_JSON_OUTPUT_NAME (and STORIES_JSON for the stories). Sets the
// `failed` output: `true` when a blob is missing, the merge itself failed, or
// a test or story failed. Exits 0 either way; the caller decides what a
// failure fails.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { setOutput } from './lib/github-output.mjs';

const WORKFLOW = process.env.PLAYWRIGHT_WORKFLOW || '.github/workflows/playwright.yml';
const CONFIGS = { gate: 'playwright.config.ts', stories: 'playwright.stories.config.ts' };

// The shard counts are written once, in playwright.yml's matrix expression:
// the `[1,2]` after `inputs.suite == 'stories' &&`, and the last array, the gate's.
function shardCount(workflowText, suite) {
  const matrix = /shard:\s*\$\{\{\s*fromJSON\(([^\n]*)\)\s*\}\}/.exec(workflowText)?.[1];
  const arrays = [...(matrix ?? '').matchAll(/'(\[[\d,\s]*\])'/g)].map((found) => found[1]);
  const stories = /inputs\.suite == 'stories' && '(\[[\d,\s]*\])'/.exec(matrix ?? '')?.[1];
  const list = suite === 'stories' ? stories : arrays.at(-1);
  if (!list) throw new Error(`No ${suite} shard list in ${WORKFLOW}'s matrix`);
  return JSON.parse(list).length;
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
  const expected = shardCount(fs.readFileSync(WORKFLOW, 'utf8'), suite);
  const found = blobsIn(dir);
  const reasons = [];

  if (found !== expected) reasons.push(`${found} of ${expected} shards left a blob report`);
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
