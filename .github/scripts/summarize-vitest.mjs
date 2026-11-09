// Vitest's JSON reporter output, into the `summary` stat and `details` block
// job-summary and pr-comment consume. With VITEST_PART=true it summarises one
// part job's results for its row: no coverage, because a part covers only its
// own share of src/, and no slowest-files block. The merged run instead writes
// the comment's final section (`final_*`: coverage, then the slowest files),
// the heading's test count (`heading_note`), and an `alert` for a failure of
// its own that no part's row shows.
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
// The merged run's log: Vitest reports a missed threshold only there.
const LOG_PATH = process.env.VITEST_LOG || '/app/output.log';
const REPO_ROOT = '/app';
const MAX_DETAILS = 15;
// Set by the merge job: the run step found a part with no blob, and whether
// every part job passed.
const BLOBS_MISSING = process.env.VITEST_BLOBS_MISSING === 'true';
const PARTS_PASSED = process.env.VITEST_PARTS_PASSED === 'true';

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

if (!PART && (BLOBS_MISSING || !fs.existsSync(RESULTS_PATH))) {
  setOutput('summary', 'No merged results.');
  setOutput('details', '');
  setOutput('heading_note', '');
  setOutput(
    'alert',
    BLOBS_MISSING
      ? "The merged run did not run, because a part left no results: see that part's row."
      : 'The merged run wrote no results: see the log.',
  );
  setOutput('final_summary', 'Not measured, because the merged run wrote no results.');
  setOutput('final_details', '');
  setOutput('final_outcome', 'skipped');
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

function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

// Each missed threshold, as Vitest's coverage provider words it.
const violations = (
  PART || !fs.existsSync(LOG_PATH) ? '' : stripAnsi(fs.readFileSync(LOG_PATH, 'utf8'))
)
  .split('\n')
  .map((line) => {
    const pct = line.match(
      /ERROR: Coverage for (\w+) \(([\d.]+)%\) does not meet .*threshold \(([\d.]+)%\)/,
    );
    if (pct) return `${pct[1]} ${pct[2]}% (needs ${pct[3]}%)`;
    const count = line.match(/ERROR: Uncovered (\w+) \((\d+)\) exceed .*threshold \((\d+)\)/);
    return count ? `${count[1]}: ${count[2]} uncovered (allows ${count[3]})` : null;
  })
  .filter(Boolean);

const runFailed = OUTCOME === 'failure';
const unexplained =
  runFailed && failures.length === 0 && violations.length === 0
    ? '; run failed with no failed test: see the log'
    : '';
const summary = `${testSummary}${PART ? runDuration() : ''}${overBudget}${unexplained}`;

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

setOutput('summary', summary);
setOutput('details', details);

if (!PART) {
  const missedByParts = PARTS_PASSED && failures.length > 0;
  let alert = '';
  if (missedByParts) {
    alert = `The merged run found ${failures.length} failed ${failures.length === 1 ? 'test' : 'tests'} that no part's row shows: see the log.`;
  } else if (unexplained) {
    alert = 'The merged run failed with no failed test and no missed threshold: see the log.';
  }
  let coverageSummary;
  let finalOutcome;
  if (coverage) {
    coverageSummary = violations.length
      ? `${coverage.stat}; below threshold: ${violations.join(', ')}`
      : `${coverage.stat}; every threshold met`;
    finalOutcome = violations.length ? 'failure' : 'success';
  } else if (failures.length > 0) {
    // Vitest's reportOnFailure is off, so a failed test means no report.
    coverageSummary = 'Not measured, because a test failed.';
    finalOutcome = 'skipped';
  } else {
    coverageSummary = 'No coverage report was written: see the log.';
    finalOutcome = 'failure';
  }
  const total = data.numTotalTests ?? numPassedTests + numFailedTests;
  setOutput('heading_note', `${total.toLocaleString('en-GB')} ${total === 1 ? 'test' : 'tests'}`);
  setOutput('alert', alert);
  setOutput('final_summary', `${coverageSummary}${overBudget}`);
  // The failing tests only when no part's row lists them.
  setOutput(
    'final_details',
    [missedByParts ? details : '', coverage?.table, slowest?.block].filter(Boolean).join('\n\n'),
  );
  setOutput('final_outcome', finalOutcome);
}
