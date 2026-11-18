// Playwright's JSON reporter output, into the `summary` stat and `details`
// block job-summary and pr-comment consume, and the `heading_note` test count. The report is the one
// `playwright merge-reports` writes from every shard's blob.
import fs from 'node:fs';
import { formatFailures } from './lib/failure-list.mjs';
import { setOutput } from './lib/github-output.mjs';
import { collectFailures } from './lib/playwright-failures.mjs';
import { collectTimings, overBudgetWarnings } from './lib/playwright-timings.mjs';
import { formatRun, resultLine } from './lib/result-line.mjs';

// Set by the job; the fallback is the same path.
const RESULTS_PATH = process.env.PLAYWRIGHT_JSON_OUTPUT_NAME || '/app/playwright-results.json';
// One shard's own run: the end job reports the flaky tests, so a shard does not repeat them.
const SHARD = process.env.PLAYWRIGHT_SHARD === 'true';
// The run step's outcome: a run can fail with every test passing, for example on a crashed worker.
const OUTCOME = process.env.PLAYWRIGHT_OUTCOME ?? '';

// A job that died before the report was written still gets a row.
if (!fs.existsSync(RESULTS_PATH)) {
  setOutput('summary', 'No results: Playwright stopped before writing them.');
  setOutput('details', '');
  setOutput('flaky', 'false');
  process.exit(0);
}

const data = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));
const { expected = 0, unexpected = 0, skipped = 0, flaky = 0, duration } = data.stats ?? {};

const summaryParts = [`${expected} passed`];
if (unexpected > 0) summaryParts.push(`${unexpected} failed`);
if (skipped > 0) summaryParts.push(`${skipped} skipped`);
if (flaky > 0) summaryParts.push(`${flaky} flaky`);
// The merged coverage of both suites is the Coverage section's alone.
const counts = summaryParts.join(', ');
const unexplained = OUTCOME === 'failure' && unexpected === 0;
let summary = resultLine({ counts, unexplained });

// A flaky test is named in the comment and annotated, and never fails the run.
const allFailures = collectFailures(data, { includeFlaky: true });
const failures = formatFailures(allFailures, { heading: 'Failing tests' });
const details = failures;

// One `::warning` workflow command per flaky test, which the step log turns into an annotation.
const escapeData = (text) => text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escapeProperty = (text) => escapeData(text).replace(/:/g, '%3A').replace(/,/g, '%2C');
for (const { file, title, message, flaky: isFlaky } of allFailures) {
  if (!isFlaky || SHARD) continue;
  console.log(
    `::warning file=${escapeProperty(file)},title=${escapeProperty(`Flaky test: ${title}`)}::${escapeData(`Failed, then passed on retry${message ? `: ${message}` : ''}`)}`,
  );
}

// Timing is added only when the report carries a duration, so a report without one reads as it always did.
// The slowest files and the tests over the budget are the final section's, from merge-playwright-coverage.mjs.
if (typeof duration === 'number') {
  summary = resultLine({
    counts,
    ms: duration,
    over: overBudgetWarnings(collectTimings(data)).length,
    budget: 'test',
    unexplained,
  });
  setOutput('duration', formatRun(duration));
}

setOutput('summary', summary);
setOutput('details', details);
// The heading's count of every test the suite ran, which a shard leaves to the end job.
const ran = expected + unexpected + skipped + flaky;
setOutput(
  'heading_note',
  SHARD ? '' : `${ran.toLocaleString('en-GB')} ${ran === 1 ? 'test' : 'tests'}`,
);
// Read by the report upload: a test that failed and then passed on retry has a trace worth keeping.
setOutput('flaky', flaky > 0 ? 'true' : 'false');
