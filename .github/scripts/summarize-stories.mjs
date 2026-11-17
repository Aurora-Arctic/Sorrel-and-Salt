// The story checklist tests/support/story-playwright-reporter.ts writes as
// JSON (STORIES_JSON), into the same two outputs summarize-playwright.mjs
// produces.
import fs from 'node:fs';
import { FLAKY_NOTE, formatFailures } from './lib/failure-list.mjs';
import { setOutput } from './lib/github-output.mjs';
import { collectFailures } from './lib/playwright-failures.mjs';
import { TEST_BUDGET_MS, collectTimings } from './lib/playwright-timings.mjs';
import { resultLine } from './lib/result-line.mjs';

const RESULTS_PATH = process.env.STORIES_JSON || '/app/stories.json';
// Playwright's own report of the same run, for each failure's spec file and error.
const PLAYWRIGHT_RESULTS_PATH =
  process.env.PLAYWRIGHT_JSON_OUTPUT_NAME || '/app/playwright-results.json';

// A shard ran some of the stories: its row counts those and leaves the rest to its siblings.
const SHARD = process.env.PLAYWRIGHT_SHARD === 'true';

const report = fs.existsSync(PLAYWRIGHT_RESULTS_PATH)
  ? JSON.parse(fs.readFileSync(PLAYWRIGHT_RESULTS_PATH, 'utf8'))
  : null;
const failures = report ? collectFailures(report, { includeFlaky: true }) : [];
const runMs = typeof report?.stats?.duration === 'number' ? report.stats.duration : undefined;
const overBudget = report
  ? collectTimings(report).filter(({ ms }) => ms > TEST_BUDGET_MS).length
  : 0;
const failureBlock = formatFailures(failures, {
  heading: 'Failing stories',
  tagPattern: /^@story-/,
});

// The run may have died before writing the file; job-summary's log tail says why.
if (!fs.existsSync(RESULTS_PATH)) {
  setOutput('summary', 'no checklist was written');
  setOutput('details', failureBlock);
  setOutput('flaky', failures.some((failure) => failure.flaky) ? 'true' : 'false');
  process.exit(0);
}

const checklist = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));
const { unknown, untagged = [] } = checklist;
const stories = SHARD
  ? checklist.stories.filter((story) => story.status !== 'untested')
  : checklist.stories;
const counts = SHARD
  ? {
      passed: stories.filter((story) => story.status === 'passed').length,
      failed: stories.filter((story) => story.status === 'failed').length,
      skipped: stories.filter((story) => story.status === 'skipped').length,
      untested: 0,
    }
  : checklist.counts;
const total = SHARD ? stories.length : checklist.total;

const parts = [`${counts.passed} of ${total} stories passing`];
if (counts.failed) parts.push(`${counts.failed} failing`);
if (counts.skipped) parts.push(`${counts.skipped} skipped`);
if (counts.untested) parts.push(`${counts.untested} without a test`);
// The merged coverage of both suites is the Coverage section's alone.
const summary = resultLine({
  counts: parts.join(', '),
  ms: runMs,
  over: overBudget,
  budget: 'test',
});

const SUFFIX = {
  passed: '',
  failed: ' — **failing**',
  skipped: ' — skipped',
  untested: ' — _no test yet_',
};

const lines = ['<details><summary>Story checklist</summary>', ''];
// Sections in name order, stories in §10 order within each.
const bySection = new Map();
for (const story of stories) {
  const section = story.section ?? 'Other';
  bySection.set(section, [...(bySection.get(section) ?? []), story]);
}
const sections = [...bySection].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
for (const [section, entries] of sections) {
  lines.push(`**${section}**`, '');
  for (const { id, title, status, flaky } of entries) {
    const box = status === 'passed' ? 'x' : ' ';
    const suffix = status === 'failed' && flaky ? FLAKY_NOTE : SUFFIX[status];
    lines.push(`- [${box}] Story ${id}: ${title}${suffix}`);
  }
  lines.push('');
}
if (unknown.length > 0 || untagged.length > 0) {
  lines.push('', '**Not a v1 story:**', '');
  // In code formatting, or GitHub would read the tag as a mention of a user.
  for (const { id, file } of unknown) {
    lines.push(`- \`${file}\` › \`@story-${id}\``);
  }
  for (const name of untagged) {
    lines.push(`- No story tag: \`${name}\``);
  }
}
lines.push('', '</details>');

const details = [failureBlock, lines.join('\n')].filter(Boolean).join('\n\n');

setOutput('summary', summary);
setOutput('details', details);
// Read by the report upload: a story that failed and then passed on retry has a trace worth keeping.
setOutput('flaky', stories.some((story) => story.flaky) ? 'true' : 'false');
