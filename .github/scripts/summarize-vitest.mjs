// Vitest's JSON reporter output, into the `summary` stat and `details` block
// job-summary and pr-comment consume. With VITEST_PART=true it summarises one
// part job's results for its row of the Vitest comment: no coverage table,
// because a part covers only its own share of src/, and no slowest-files block.
import fs from 'node:fs';
import path from 'node:path';
import { buildCoverageSection } from './lib/coverage-table.mjs';
import { buildSlowestFilesSection } from './lib/slowest-files.mjs';

const RESULTS_PATH = process.env.VITEST_RESULTS || '/app/vitest-results.json';
const PART = process.env.VITEST_PART === 'true';
// The run step's outcome. The JSON reporter drops Vitest's unhandled errors, so
// a run that failed on one alone reports no failed test.
const OUTCOME = process.env.VITEST_OUTCOME ?? '';
const COVERAGE_SUMMARY_PATH = '/app/.reports/coverage/coverage-summary.json';
const REPO_ROOT = '/app';
const MAX_DETAILS = 15;

function setOutput(name, value) {
  const delim = `ghadelim_${Math.random().toString(36).slice(2)}`;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<${delim}\n${value}\n${delim}\n`);
}

// Vitest crashed before writing its results; the part's row says so and the
// comment still posts.
if (PART && !fs.existsSync(RESULTS_PATH)) {
  setOutput('summary', 'No results: Vitest stopped before writing them.');
  setOutput('details', '');
  process.exit(0);
}

const data = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));
const { numPassedTests, numFailedTests } = data;

const testSummary =
  numFailedTests === 0
    ? `${numPassedTests} passed`
    : `${numPassedTests} passed, ${numFailedTests} failed`;

const coverage = PART ? null : buildCoverageSection(COVERAGE_SUMMARY_PATH, REPO_ROOT);
// A file over the budget is named in the stat line too, so the warning is
// read without opening the block (MB.180); it never fails the job.
const slowest = buildSlowestFilesSection(data.testResults, REPO_ROOT);
const overBudget = slowest?.over.length ? `, ${slowest.over.length} over the file budget` : '';
// The run's wall-clock time, from its start to the last file's end.
function runDuration() {
  const ends = (data.testResults ?? []).map((r) => r.endTime).filter((t) => typeof t === 'number');
  if (typeof data.startTime !== 'number' || ends.length === 0) return '';
  const seconds = Math.round((Math.max(...ends) - data.startTime) / 1000);
  return seconds >= 60 ? ` in ${Math.floor(seconds / 60)}m ${seconds % 60}s` : ` in ${seconds}s`;
}

const failures = [];
for (const testResult of data.testResults ?? []) {
  const file = path.relative(REPO_ROOT, testResult.name);
  // A file that failed outside its tests: an import error or a failing hook.
  if (testResult.status === 'failed' && testResult.message) {
    failures.push({
      file,
      title: '(outside any test)',
      message: testResult.message.split('\n')[0],
    });
  }
  for (const assertion of testResult.assertionResults ?? []) {
    if (assertion.status !== 'failed') continue;
    const message = (assertion.failureMessages?.[0] ?? '').split('\n')[0];
    failures.push({ file, title: assertion.fullName, message });
  }
}

const unexplained =
  OUTCOME === 'failure' && failures.length === 0
    ? '; run failed with no failed test: see the log'
    : '';
const summary = PART
  ? `${testSummary}${runDuration()}${overBudget}${unexplained}`
  : `${coverage ? `${testSummary} — ${coverage.stat}` : testSummary}${overBudget}${unexplained}`;

let details = '';
if (failures.length > 0) {
  const lines = ['<details><summary>Failing tests</summary>', ''];
  for (const { file, title, message } of failures.slice(0, MAX_DETAILS)) {
    lines.push(`- \`${file}\` › ${title} — ${message}`);
  }
  if (failures.length > MAX_DETAILS) {
    lines.push('');
    lines.push(`*…and ${failures.length - MAX_DETAILS} more — see full output below.*`);
  }
  lines.push('');
  lines.push('</details>');
  details = lines.join('\n');
}

for (const block of PART ? [] : [coverage?.table, slowest?.block]) {
  if (block) details = details ? `${details}\n\n${block}` : block;
}

setOutput('summary', summary);
setOutput('details', details);
